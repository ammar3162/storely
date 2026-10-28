import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { monthlyBill } from '@/lib/orgBill'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// طلبات الترقية للمنشأة (آخرها أول)
export async function GET(req: Request) {
  const org_id = new URL(req.url).searchParams.get('org_id') || ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  const { data } = await sb().from('plan_requests').select('id,target_plan,status,reason,created_at,decided_at').eq('org_id', org_id).order('created_at', { ascending: false }).limit(5)
  return NextResponse.json({ success: true, requests: data || [] })
}

// طلب ترقية — يوصل للأدمن يوافق عليه
export async function POST(req: Request) {
  try {
    const { org_id, target_plan } = await req.json()
    if (!org_id || !['pro', 'advanced'].includes(target_plan)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role === 'manager') return NextResponse.json({ error: 'طلب الترقية لمالك المنشأة' }, { status: 403 })

    const db = sb()
    const { data: org } = await db.from('organizations').select('plan').eq('id', org_id).maybeSingle()
    const current = (org as any)?.plan || 'basic'
    const rank = { basic: 0, pro: 1, advanced: 2 } as Record<string, number>
    if ((rank[current] ?? 0) >= rank[target_plan]) return NextResponse.json({ error: 'باقتك الحالية نفسها أو أعلى' }, { status: 400 })

    const { data: pending } = await db.from('plan_requests').select('id').eq('org_id', org_id).eq('status', 'pending').maybeSingle()
    if (pending) return NextResponse.json({ error: 'عندك طلب ترقية قيد المراجعة' }, { status: 409 })
    const { error } = await db.from('plan_requests').insert({
      org_id, current_plan: current, target_plan, bill_at_request: await monthlyBill(db, org_id), requested_by: access.userId,
    } as any)
    if (error) return NextResponse.json({ error: 'فشل إرسال الطلب' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إلغاء طلب معلّق
export async function DELETE(req: Request) {
  const { org_id, id } = await req.json().catch(() => ({}))
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role === 'manager') return NextResponse.json({ error: 'طلب الترقية لمالك المنشأة' }, { status: 403 })
  const { data } = await sb().from('plan_requests').update({ status: 'cancelled', decided_at: new Date().toISOString() } as any)
    .eq('id', id).eq('org_id', org_id).eq('status', 'pending').select('id')
  if (!data?.length) return NextResponse.json({ error: 'ما فيه طلب معلّق' }, { status: 404 })
  return NextResponse.json({ success: true })
}
