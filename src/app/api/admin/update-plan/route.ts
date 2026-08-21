import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { orgId, maxBranches, maxStaff, maxSuppliers, planName, orgName, billingCycle } = await req.json()
  if (!orgId || !maxBranches) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const { data: oldOrg } = await supabase.from('organizations').select('max_branches').eq('id', orgId).maybeSingle()
  const oldBranches = (oldOrg as any)?.max_branches || 1

  const updatePayload: any = { max_branches: maxBranches, plan: planName, max_staff: maxStaff, max_suppliers: maxSuppliers }
  if (billingCycle === 'monthly' || billingCycle === 'yearly') updatePayload.billing_cycle = billingCycle

  const { error } = await supabase
    .from('organizations')
    .update(updatePayload)
    .eq('id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminAction(admin, 'update_plan', orgId, orgName || null, { new_plan: planName, maxBranches })

  if (maxBranches !== oldBranches) {
    const newAmount = maxBranches===1?149:maxBranches<=3?249:399
    const oldAmount = oldBranches===1?149:oldBranches<=3?249:399
    try {
      await (supabase as any).from('subscription_events').insert({
        org_id: orgId,
        event_type: newAmount > oldAmount ? 'upgraded' : 'downgraded',
        plan: planName,
        amount: newAmount,
      })
    } catch {}
  }

  return NextResponse.json({ success: true })
}
