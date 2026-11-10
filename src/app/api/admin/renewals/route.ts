import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { markRenewalPaid } from '@/lib/renewal'
import { sendRenewalReminder } from '@/lib/subscriptionNotice'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const NONE = ['00000000-0000-0000-0000-000000000000']

// طلبات تجديد الاشتراك (زر «تجديد الاشتراك» عند العميل) — المعلّقة أول
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = sb()
  if (new URL(req.url).searchParams.get('count')) {
    const { count } = await db.from('subscription_renewals').select('id', { count: 'exact', head: true }).eq('status', 'pending_payment')
    return NextResponse.json({ success: true, pending: count || 0 })
  }
  const { data: rows } = await db.from('subscription_renewals')
    .select('id,org_id,status,previous_ends_at,grace_until,amount,payment_method,payment_ref,created_at,decided_at,decided_by_name,organizations(name,whatsapp_number)')
    .order('created_at', { ascending: false }).limit(100)
  const list = (rows || []) as any[]
  const ids = [...new Set(list.map(r => r.org_id))]
  const { data: owners } = await db.from('profiles').select('id,org_id,full_name,phone,subscription_ends_at,subscription_type').eq('role', 'owner').in('org_id', ids.length ? ids : NONE)
  const out = list.map(r => {
    const o = ((owners || []) as any[]).find(x => x.org_id === r.org_id)
    return { ...r, org_name: r.organizations?.name || '—', owner_id: o?.id || null, owner_name: o?.full_name || null, phone: r.organizations?.whatsapp_number || o?.phone || null,
      ends_at: o?.subscription_ends_at || null, sub_type: o?.subscription_type || null }
  }).sort((a, b) => (a.status === 'pending_payment' ? 0 : 1) - (b.status === 'pending_payment' ? 0 : 1))
  // اشتراكات منتهية (آخر 60 يوم) — للتواصل وإرسال تذكير يدوي
  const expired = await expiredList(db, list)
  return NextResponse.json({ success: true, renewals: out, expired })
}

/** المنتهية اشتراكاتهم آخر 60 يوم + آخر تذكير يدوي (من سجل الإدارة) */
async function expiredList(db: ReturnType<typeof sb>, renewals: any[]) {
  const since = new Date(Date.now() - 60 * 86400e3).toISOString()
  const { data: exp } = await db.from('profiles').select('org_id,full_name,phone,subscription_type,subscription_ends_at,expiry_notice_sent,renewal_reminder_at,organizations(name,whatsapp_number)')
    .eq('role', 'owner').eq('status', 'active').lt('subscription_ends_at', new Date().toISOString()).gte('subscription_ends_at', since).order('subscription_ends_at', { ascending: false })
  const rows = (exp || []) as any[]
  const { data: logs } = rows.length ? await (db as any).from('admin_audit_log').select('target_org_id,created_at').eq('action', 'renewal_reminder_sent')
    .in('target_org_id', rows.map(r => r.org_id)).order('created_at', { ascending: false }) : { data: [] }
  return rows.map(e => ({ org_id: e.org_id, org_name: e.organizations?.name || '—', owner_name: e.full_name, phone: e.organizations?.whatsapp_number || e.phone || null,
    sub_type: e.subscription_type, ends_at: e.subscription_ends_at, auto_at: e.expiry_notice_sent ? e.renewal_reminder_at : null,
    manual_at: ((logs || []) as any[]).find(l => l.target_org_id === e.org_id)?.created_at || null,
    pending: renewals.some(r => r.org_id === e.org_id && r.status === 'pending_payment') }))
}

// action: paid (تم الدفع — بعد التفعيل من «العملاء») | cancel
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { id, action } = body
  // تذكير يدوي (واتساب + إيميل) لمنشأة، أو لكل المنتهية اشتراكاتهم — الرسائل التلقائية تبقى كما هي
  if (action === 'remind' || action === 'remind_all') {
    const db = sb()
    let orgIds: string[]
    if (action === 'remind') {
      const orgId = String(body.org_id || '')
      if (!/^[0-9a-f-]{36}$/i.test(orgId)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
      orgIds = [orgId]
    } else {
      const { data: rs } = await db.from('subscription_renewals').select('org_id,status').eq('status', 'pending_payment')
      orgIds = (await expiredList(db, (rs || []) as any[])).filter(e => !e.pending).map(e => e.org_id)
      if (body.expected != null && Number(body.expected) !== orgIds.length) return NextResponse.json({ error: 'تغيّر عدد المستلمين — حدّث الصفحة وحاول مرة أخرى' }, { status: 409 })
    }
    let sent = 0, wa = 0, mail = 0
    const failed: string[] = []
    for (const orgId of orgIds) {
      const r = await sendRenewalReminder(db, orgId)
      if (r.ok && (r.wa || r.mail)) { sent++; if (r.wa) wa++; if (r.mail) mail++; await logAdminAction(admin, 'renewal_reminder_sent', orgId, null, { wa: r.wa, mail: r.mail }) }
      else failed.push(orgId)
    }
    if (!sent) return NextResponse.json({ error: action === 'remind' ? 'تعذّر الإرسال — لا يوجد واتساب أو بريد صالح، أو الاشتراك ساري' : 'لم يُرسل أي تذكير' }, { status: 409 })
    return NextResponse.json({ success: true, sent, wa, mail, failed: failed.length })
  }
  if (!id || !['paid', 'cancel'].includes(action)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  const db = sb()
  const { data: r } = await db.from('subscription_renewals').select('id,org_id,status,organizations(name)').eq('id', id).maybeSingle()
  if (!r) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
  if ((r as any).status !== 'pending_payment') return NextResponse.json({ error: 'الطلب ما عاد معلّق' }, { status: 409 })
  if (action === 'paid') await markRenewalPaid(db, (r as any).org_id, admin.full_name, 'manual')
  else await db.from('subscription_renewals').update({ status: 'cancelled', decided_at: new Date().toISOString(), decided_by_name: admin.full_name } as any).eq('id', id).eq('status', 'pending_payment')
  await logAdminAction(admin, action === 'paid' ? 'renewal_paid' : 'renewal_cancelled', (r as any).org_id, (r as any).organizations?.name || null, { renewal_id: id })
  return NextResponse.json({ success: true })
}
