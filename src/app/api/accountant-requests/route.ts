import { NextResponse } from 'next/server'
import { lockedFor, lockedFromError } from '@/lib/periodLock'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { withTargets } from '@/lib/accountantRequests'
import { normalizeVat, isValidVat, normalizeInvoiceNumber } from '@/lib/taxInvoice'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'
import { siteUrl } from '@/lib/accountantSend'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UUID = /^[0-9a-f-]{36}$/i

// طلبات المحاسبين (جهة المالك): يشوفها ويرد ويكمّل بيانات الفاتورة مباشرة
async function ownerOnly(orgId: unknown) {
  if (typeof orgId !== 'string' || !UUID.test(orgId)) return { error: NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 }) }
  const access = await verifyOrgAccess(orgId)
  if (!access.authorized) return { error: NextResponse.json({ error: access.error }, { status: access.status }) }
  if (access.role !== 'owner') return { error: NextResponse.json({ error: 'طلبات المحاسب يرد عليها مالك الحساب' }, { status: 403 }) }
  return { ok: true as const }
}

export async function GET(req: Request) {
  try {
    const org_id = new URL(req.url).searchParams.get('org_id')
    const g = await ownerOnly(org_id); if (g.error) return g.error
    const db = sb()
    const { data } = await db.from('accountant_requests').select('id,invoice_group,purchase_id,closing_id,kind,message,status,owner_reply,created_at,answered_at,resolved_at,accountant_users(name,email)')
      .eq('org_id', org_id!).order('status').order('created_at', { ascending: false }).limit(100)
    return NextResponse.json({ success: true, requests: await withTargets(db, org_id!, (data || []) as any[]) })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// رد المالك: نص و/أو تكملة بيانات الفاتورة (رقم الفاتورة، الرقم الضريبي)
export async function PATCH(req: Request) {
  try {
    const b = await req.json()
    const g = await ownerOnly(b.org_id); if (g.error) return g.error
    if (!UUID.test(String(b.id || ''))) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const db = sb()
    const { data: r } = await db.from('accountant_requests').select('id,invoice_group,purchase_id,status,accountant_users(email,name)').eq('id', b.id).eq('org_id', b.org_id).maybeSingle()
    if (!r) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    const reply = String(b.reply || '').trim().slice(0, 500) || null

    // تكملة بيانات الفاتورة — تنطبق على كل أصنافها
    const fix: Record<string, string> = {}
    if (b.invoice_number !== undefined && String(b.invoice_number).trim()) fix.invoice_number = normalizeInvoiceNumber(b.invoice_number)!
    if (b.supplier_vat_number !== undefined && String(b.supplier_vat_number).trim()) {
      const v = normalizeVat(b.supplier_vat_number)
      if (!isValidVat(v)) return NextResponse.json({ error: 'الرقم الضريبي غير صحيح — ١٥ رقم يبدأ وينتهي بـ 3' }, { status: 400 })
      fix.supplier_vat_number = v!
    }
    if (Object.keys(fix).length) {
      if (!(r as any).invoice_group && !(r as any).purchase_id) return NextResponse.json({ error: 'هذا الطلب مو مربوط بفاتورة' }, { status: 400 })
      const { data: inv } = await db.from('purchases').select('created_at').eq('org_id', b.org_id).eq((r as any).invoice_group ? 'invoice_group' : 'id', (r as any).invoice_group || (r as any).purchase_id).limit(1).maybeSingle()
      const locked = await lockedFor(db, b.org_id, [(inv as any)?.created_at])
      if (locked) return NextResponse.json({ error: locked }, { status: 423 })
      let q = db.from('purchases').update(fix as any).eq('org_id', b.org_id)
      q = (r as any).invoice_group ? q.eq('invoice_group', (r as any).invoice_group) : q.eq('id', (r as any).purchase_id)
      const { error } = await q
      if (error) return NextResponse.json({ error: 'تعذر تحديث الفاتورة' }, { status: 500 })
      // الرقم الضريبي يتذكره المورد للمرات الجاية
      if (fix.supplier_vat_number) {
        const { data: p } = await db.from('purchases').select('supplier').eq('org_id', b.org_id).eq((r as any).invoice_group ? 'invoice_group' : 'id', (r as any).invoice_group || (r as any).purchase_id).limit(1).maybeSingle()
        if ((p as any)?.supplier) await db.from('suppliers').update({ vat_number: fix.supplier_vat_number } as any).eq('org_id', b.org_id).eq('name', (p as any).supplier).is('vat_number', null)
      }
    }
    if (!reply && !Object.keys(fix).length) return NextResponse.json({ error: 'اكتب ردك أو كمّل البيانات' }, { status: 400 })

    const done = [fix.invoice_number && `رقم الفاتورة: ${fix.invoice_number}`, fix.supplier_vat_number && `الرقم الضريبي: ${fix.supplier_vat_number}`].filter(Boolean).join(' · ')
    const ownerReply = [reply, done && `✓ تم تحديث ${done}`].filter(Boolean).join('\n')
    await db.from('accountant_requests').update({ owner_reply: ownerReply.slice(0, 500), status: (r as any).status === 'resolved' ? 'resolved' : 'answered', answered_at: new Date().toISOString() } as any).eq('id', b.id).eq('org_id', b.org_id)

    // نبلّغ المحاسب بالإيميل
    const acc = (r as any).accountant_users
    if (acc?.email) {
      const { data: org } = await db.from('organizations').select('name').eq('id', b.org_id).single()
      sendEmail({ to: acc.email, fromName: `${(org as any)?.name || 'منشأة'} عبر Storely`, subject: `ردّت ${(org as any)?.name || 'المنشأة'} على طلبك`,
        html: brandEmail({ title: 'رد على طلبك', greeting: acc.name ? `هلا ${acc.name}،` : 'هلا،', paragraphs: [ownerReply], button: { label: 'افتح بوابة المحاسب', url: `${siteUrl()}/accountant-portal` } }) }).catch(() => {})
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
