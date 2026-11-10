import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { markRenewalPaid } from '@/lib/renewal'

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
  return NextResponse.json({ success: true, renewals: out })
}

// action: paid (تم الدفع — بعد التفعيل من «العملاء») | cancel
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, action } = await req.json().catch(() => ({}))
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
