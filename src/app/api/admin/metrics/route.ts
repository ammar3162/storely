import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function priceFor(maxBranches: number) {
  return maxBranches === 1 ? 149 : maxBranches <= 3 ? 249 : 399
}

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'view_metrics'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const supabase = sb()

    const { data: owners } = await supabase
      .from('profiles')
      .select('id,status,subscription_type,organizations(max_branches)')
      .eq('role', 'owner')

    const ownersList = owners || []
    const totalOwners = ownersList.length
    const paidActive = ownersList.filter((o: any) => o.subscription_type === 'paid' && o.status === 'active')
    const trialActive = ownersList.filter((o: any) => o.subscription_type === 'trial' && o.status === 'active')
    const suspended = ownersList.filter((o: any) => o.status === 'suspended')

    const mrr = paidActive.reduce((sum: number, o: any) => sum + priceFor(o.organizations?.max_branches || 1), 0)
    const arr = mrr * 12
    const conversionRate = totalOwners > 0 ? Math.round((paidActive.length / totalOwners) * 1000) / 10 : 0

    const { data: events } = await (supabase as any)
      .from('subscription_events')
      .select('id,org_id,event_type,plan,amount,created_at,organizations(name)')
      .order('created_at', { ascending: false })
      .limit(30)

    return NextResponse.json({
      success: true,
      mrr, arr, conversionRate,
      totalOwners, paidCount: paidActive.length, trialCount: trialActive.length, suspendedCount: suspended.length,
      recentEvents: (events || []).map((e: any) => ({ ...e, org_name: e.organizations?.name || '—' })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
