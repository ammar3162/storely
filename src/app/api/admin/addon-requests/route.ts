import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { activateAddon } from '@/lib/addonActivation'
import { targetForRequest } from '@/lib/addonRequests'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// طلبات الإضافات من العملاء — المعلّقة أول، وبعدها آخر القرارات
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = sb()
  const { data: rows } = await db.from('addon_requests')
    .select('id,org_id,addon_id,quantity,branch_ids,note,status,reason,prorated_amount,decided_by_name,created_at,decided_at,organizations(name),marketplace_addons(name,slug,monthly_price)')
    .order('created_at', { ascending: false }).limit(100)
  const list = (rows || []) as any[]
  const orgIds = [...new Set(list.map(r => r.org_id))]
  const [{ data: owners }, { data: branches }, { data: subs }] = await Promise.all([
    db.from('profiles').select('org_id,full_name,phone').eq('role', 'owner').in('org_id', orgIds.length ? orgIds : ['00000000-0000-0000-0000-000000000000']),
    db.from('branches').select('id,name').in('org_id', orgIds.length ? orgIds : ['00000000-0000-0000-0000-000000000000']),
    db.from('org_addon_subscriptions').select('org_id,addon_id,status,quantity,branch_ids,expires_at').in('org_id', orgIds.length ? orgIds : ['00000000-0000-0000-0000-000000000000']),
  ])
  const bName = new Map((branches || []).map((b: any) => [b.id, b.name]))
  const out = list.map(r => {
    const sub = (subs || []).find((s: any) => s.org_id === r.org_id && s.addon_id === r.addon_id && s.status === 'active' && new Date(s.expires_at) > new Date())
    const owner = (owners || []).find((o: any) => o.org_id === r.org_id)
    return {
      ...r, owner_name: owner?.full_name || null, owner_phone: owner?.phone || null,
      branch_names: (r.branch_ids || []).map((id: string) => bName.get(id) || '—'),
      current: sub ? { quantity: sub.quantity, branch_names: (sub.branch_ids || []).map((id: string) => bName.get(id) || '—') } : null,
    }
  })
  out.sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1))
  return NextResponse.json({ success: true, requests: out })
}

// action: approve | reject
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, action, reason } = await req.json().catch(() => ({}))
  if (!id || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  const db = sb()
  const { data: r } = await db.from('addon_requests').select('id,org_id,addon_id,quantity,branch_ids,status,organizations(name),marketplace_addons(name,slug)').eq('id', id).maybeSingle()
  if (!r) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
  if ((r as any).status !== 'pending') return NextResponse.json({ error: 'الطلب ما عاد معلّق' }, { status: 409 })
  const req0 = r as any, addonName = req0.marketplace_addons?.name || 'الإضافة', orgName = req0.organizations?.name || null
  const now = new Date().toISOString()

  if (action === 'reject') {
    const why = typeof reason === 'string' ? reason.trim().slice(0, 300) : ''
    await db.from('addon_requests').update({ status: 'rejected', reason: why || null, decided_at: now, decided_by_name: admin.full_name } as any).eq('id', id).eq('status', 'pending')
    await db.from('notifications').insert({ org_id: req0.org_id, title: `طلب «${addonName}»`, message: why ? `ما تمت الموافقة على الطلب: ${why}` : 'ما تمت الموافقة على الطلب — تواصل معنا لو عندك استفسار', type: 'warning', read: false } as any)
    await logAdminAction(admin, 'reject_addon_request', req0.org_id, orgName, { request_id: id, addon_name: addonName, reason: why })
    return NextResponse.json({ success: true })
  }

  // الموافقة: الكمية الجديدة = الحالية + المطلوبة (والمنيو: الفروع الحالية + المطلوبة)
  const { data: sub } = await db.from('org_addon_subscriptions').select('status,quantity,branch_ids,expires_at').eq('org_id', req0.org_id).eq('addon_id', req0.addon_id).maybeSingle()
  const t = targetForRequest(req0.marketplace_addons?.slug, sub as any, { quantity: req0.quantity, branch_ids: req0.branch_ids })
  const res = await activateAddon(db, { orgId: req0.org_id, addonId: req0.addon_id, quantity: t.quantity, branchIds: t.branchIds })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })
  await db.from('addon_requests').update({ status: 'approved', decided_at: now, decided_by_name: admin.full_name, prorated_amount: res.proratedAmount } as any).eq('id', id)
  await db.from('notifications').insert({ org_id: req0.org_id, title: `تم تفعيل «${addonName}»`, message: res.proratedAmount > 0 ? `تفعّلت الإضافة — المستحق ${res.proratedAmount} ⃁ عن الأيام الباقية لين تجديد باقتك` : 'تفعّلت الإضافة وتقدر تستخدمها الحين', type: 'success', read: false } as any)
  await logAdminAction(admin, 'approve_addon_request', req0.org_id, orgName, { request_id: id, addon_name: addonName, quantity: res.quantity, prorated_amount: res.proratedAmount })
  return NextResponse.json({ success: true, proratedAmount: res.proratedAmount, proratedDays: res.proratedDays, quantity: res.quantity })
}
