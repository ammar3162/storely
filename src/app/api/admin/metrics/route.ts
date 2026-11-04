import { NextResponse } from 'next/server'
import { orgRevenues } from '@/lib/orgBill'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'view_metrics'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const supabase = sb()

    const { data: owners } = await supabase
      .from('profiles')
      .select('id,org_id,status,subscription_type,organizations(max_branches,plan,locked_plan_monthly,billing_cycle,discount_type,discount_value,discount_until)')
      .eq('role', 'owner')

    const ownersList = owners || []
    const totalOwners = ownersList.length
    const paidActive = ownersList.filter((o: any) => o.subscription_type === 'paid' && o.status === 'active')
    const trialActive = ownersList.filter((o: any) => o.subscription_type === 'trial' && o.status === 'active')
    const suspended = ownersList.filter((o: any) => o.status === 'suspended')

    // نفس فاتورة العميل الفعلية: الباقة + الإضافات − الخصم (السنوي ÷ 12)
    const bills = await orgRevenues(supabase, paidActive.filter((o: any) => o.org_id).map((o: any) => ({ id: o.org_id, ...o.organizations })))
    const sum = (k: 'total' | 'plan' | 'addons' | 'discount') => Object.values(bills).reduce((s, b) => s + b[k], 0)
    const mrr = sum('total')
    const arr = mrr * 12
    const conversionRate = totalOwners > 0 ? Math.round((paidActive.length / totalOwners) * 1000) / 10 : 0

    const { data: events } = await (supabase as any)
      .from('subscription_events')
      .select('id,org_id,event_type,plan,amount,created_at,organizations(name)')
      .order('created_at', { ascending: false })
      .limit(30)

    return NextResponse.json({
      success: true,
      mrr, arr, conversionRate, mrrPlans: sum('plan'), mrrAddons: sum('addons'), mrrDiscount: sum('discount'),
      totalOwners, paidCount: paidActive.length, trialCount: trialActive.length, suspendedCount: suspended.length,
      recentEvents: (events || []).map((e: any) => ({ ...e, org_name: e.organizations?.name || '—' })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
