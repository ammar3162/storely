import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { accessExpired } from '@/lib/accountantPortalAuth'
import { monthName } from '@/lib/periodLock'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'
import { siteUrl } from '@/lib/accountantSend'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UUID = /^[0-9a-f-]{36}$/i

// الشهور المقفلة (جهة المالك): يشوفها، يطلب فتحها من المحاسب — ولو ما عنده محاسب مفعّل يفتحها بنفسه
async function ownerOnly(orgId: unknown) {
  if (typeof orgId !== 'string' || !UUID.test(orgId)) return { error: NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 }) }
  const access = await verifyOrgAccess(orgId)
  if (!access.authorized) return { error: NextResponse.json({ error: access.error }, { status: access.status }) }
  if (access.role !== 'owner') return { error: NextResponse.json({ error: 'لمالك الحساب بس' }, { status: 403 }) }
  return { ok: true as const }
}
async function activeAccountants(db: any, orgId: string) {
  const { data } = await db.from('accountant_access').select('email,name,expires_on').eq('org_id', orgId).eq('status', 'active')
  return ((data || []) as any[]).filter(a => !accessExpired(a.expires_on))
}

export async function GET(req: Request) {
  try {
    const org_id = new URL(req.url).searchParams.get('org_id')
    const g = await ownerOnly(org_id); if (g.error) return g.error
    const db = sb()
    const [{ data: locks }, { data: log }, accs] = await Promise.all([
      db.from('period_locks').select('month,locked_by_name,locked_at').eq('org_id', org_id!).order('month', { ascending: false }),
      db.from('period_lock_log').select('month,action,by_name,created_at').eq('org_id', org_id!).order('created_at', { ascending: false }).limit(10),
      activeAccountants(db, org_id!),
    ])
    return NextResponse.json({ success: true, locks: ((locks || []) as any[]).map(l => ({ ...l, label: monthName(l.month) })), log: log || [], hasAccountant: accs.length > 0 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json()
    const g = await ownerOnly(b.org_id); if (g.error) return g.error
    const month = String(b.month || '')
    if (!/^\d{4}-\d{2}-01$/.test(month)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const db = sb()
    const { data: lock } = await db.from('period_locks').select('month').eq('org_id', b.org_id).eq('month', month).maybeSingle()
    if (!lock) return NextResponse.json({ error: 'الشهر مو مقفل' }, { status: 404 })
    const accs = await activeAccountants(db, b.org_id)
    const label = monthName(month)

    if (b.action === 'request_unlock') {
      if (!accs.length) return NextResponse.json({ error: 'ما عندك محاسب مفعّل — تقدر تفتح الشهر بنفسك' }, { status: 400 })
      const { data: org } = await db.from('organizations').select('name').eq('id', b.org_id).single()
      const orgName = (org as any)?.name || 'المنشأة'
      const reason = String(b.reason || '').trim().slice(0, 300)
      await db.from('period_lock_log').insert({ org_id: b.org_id, month, action: 'request_unlock', by_name: 'المالك' } as any)
      await Promise.all(accs.map(a => sendEmail({ to: a.email, fromName: `${orgName} عبر Storely`, subject: `${orgName} تطلب فتح شهر ${label}`,
        html: brandEmail({ title: `طلب فتح شهر ${label}`, greeting: a.name ? `هلا ${a.name}،` : 'هلا،',
          paragraphs: [`${orgName} تطلب فتح شهر ${label} عشان تعدّل فيه.`, ...(reason ? [`السبب: ${reason}`] : [])],
          button: { label: 'افتح بوابة المحاسب', url: `${siteUrl()}/accountant-portal` } }) }).catch(() => null)))
      return NextResponse.json({ success: true })
    }
    if (b.action === 'unlock') {
      // صمام أمان: بس لو ما فيه محاسب مفعّل (عشان ما يعلق الشهر للأبد)
      if (accs.length) return NextResponse.json({ error: 'الشهر أقفله المحاسب — اطلب منه يفتحه' }, { status: 403 })
      await db.from('period_locks').delete().eq('org_id', b.org_id).eq('month', month)
      await db.from('period_lock_log').insert({ org_id: b.org_id, month, action: 'unlock', by_name: 'المالك' } as any)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
