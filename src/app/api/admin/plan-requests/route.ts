import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { changeOrgPlan, PLAN_CAPS } from '@/lib/changePlan'
import { PLAN_PRICING } from '@/lib/planPricing'
import { sendPushToOrg } from '@/lib/push'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// طلبات الترقية — المعلّقة أول
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = sb()
  if (new URL(req.url).searchParams.get('count')) {
    const { count } = await db.from('plan_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    return NextResponse.json({ success: true, pending: count || 0 })
  }
  const { data } = await db.from('plan_requests')
    .select('id,org_id,current_plan,target_plan,bill_at_request,status,reason,decided_by_name,created_at,decided_at,organizations(name,billing_cycle)')
    .order('created_at', { ascending: false }).limit(50)
  const list = ((data || []) as any[]).sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1))
  return NextResponse.json({ success: true, requests: list })
}

// action: approve | reject
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, action, reason } = await req.json().catch(() => ({}))
  if (!id || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  const db = sb()
  const { data: r } = await db.from('plan_requests').select('id,org_id,target_plan,status,organizations(name,billing_cycle)').eq('id', id).maybeSingle()
  if (!r) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
  const q = r as any
  if (q.status !== 'pending') return NextResponse.json({ error: 'الطلب ما عاد معلّق' }, { status: 409 })
  const orgName = q.organizations?.name || null
  const label = PLAN_PRICING[q.target_plan as 'pro' | 'advanced'].label
  const now = new Date().toISOString()

  if (action === 'reject') {
    const why = typeof reason === 'string' ? reason.trim().slice(0, 300) : ''
    await db.from('plan_requests').update({ status: 'rejected', reason: why || null, decided_at: now, decided_by_name: admin.full_name } as any).eq('id', id).eq('status', 'pending')
    await db.from('notifications').insert({ org_id: q.org_id, title: `طلب الترقية للباقة ${label}`, message: why ? `ما تمت الموافقة: ${why}` : 'ما تمت الموافقة على الطلب — تواصل معنا لو عندك استفسار', type: 'warning', read: false } as any)
    await logAdminAction(admin, 'reject_plan_request', q.org_id, orgName, { request_id: id, target_plan: q.target_plan, reason: why })
    return NextResponse.json({ success: true })
  }

  const caps = PLAN_CAPS[q.target_plan as 'pro' | 'advanced']
  const res = await changeOrgPlan(db, q.org_id, { planName: q.target_plan, maxBranches: caps.branches, maxStaff: caps.staff, maxSuppliers: caps.suppliers, billingCycle: q.organizations?.billing_cycle })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 })
  await db.from('plan_requests').update({ status: 'approved', decided_at: now, decided_by_name: admin.full_name } as any).eq('id', id)
  await db.from('notifications').insert({ org_id: q.org_id, title: `تمت ترقيتك للباقة ${label}`, message: 'كل ميزات الباقة الجديدة صارت مفتوحة لك الحين', type: 'success', read: false } as any)
  sendPushToOrg(q.org_id, `تمت ترقيتك للباقة ${label}`, 'كل ميزات الباقة الجديدة صارت مفتوحة لك الحين', '/addons-market').catch(() => {})
  await logAdminAction(admin, 'approve_plan_request', q.org_id, orgName, { request_id: id, target_plan: q.target_plan })
  return NextResponse.json({ success: true })
}
