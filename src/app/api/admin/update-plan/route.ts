import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { syncBranchesToLimit } from '@/lib/branchLimit'

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

  // تغيير الباقة ما يمسح وحدات اشتراها العميل كإضافات (موظف/مورد إضافي)
  const { data: extraSubs } = await supabase.from('org_addon_subscriptions')
    .select('quantity,expires_at,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'active').in('marketplace_addons.slug', ['extra_staff', 'extra_suppliers'])
  const live = ((extraSubs || []) as any[]).filter(s => !s.expires_at || new Date(s.expires_at) > new Date())
  const extraOf = (slug: string) => live.filter(s => s.marketplace_addons?.slug === slug).reduce((n, s) => n + (Number(s.quantity) || 0), 0)
  const updatePayload: any = { max_branches: maxBranches, plan: planName, max_staff: (Number(maxStaff) || 0) + extraOf('extra_staff'), max_suppliers: (Number(maxSuppliers) || 0) + extraOf('extra_suppliers') }
  if (billingCycle === 'monthly' || billingCycle === 'yearly') updatePayload.billing_cycle = billingCycle

  const { error } = await supabase
    .from('organizations')
    .update(updatePayload)
    .eq('id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // تخفيض: الفروع الزايدة تتوقف مؤقتاً (مع موظفينها). ترقية: ترجع تلقائياً
  const branchSync = await syncBranchesToLimit(supabase, orgId)

  await logAdminAction(admin, 'update_plan', orgId, orgName || null, { new_plan: planName, maxBranches })

  if (maxBranches !== oldBranches) {
    const newAmount = maxBranches===1?99:maxBranches<=3?249:399
    const oldAmount = oldBranches===1?99:oldBranches<=3?249:399
    try {
      await (supabase as any).from('subscription_events').insert({
        org_id: orgId,
        event_type: newAmount > oldAmount ? 'upgraded' : 'downgraded',
        plan: planName,
        amount: newAmount,
      })
    } catch {}
  }

  return NextResponse.json({ success: true, ...branchSync })
}
