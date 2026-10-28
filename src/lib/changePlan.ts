// تغيير باقة منشأة — مكان واحد يستخدمه الأدمن (تغيير مباشر) والموافقة على طلب الترقية
import type { SupabaseClient } from '@supabase/supabase-js'
import { syncBranchesToLimit } from '@/lib/branchLimit'
import { PLAN_PRICING, planKeyOf, planPriceFor, type PlanKey } from '@/lib/planPricing'

// إضافات مضمّنة بالمتوسطة والمتقدمة
export const INCLUDED_FROM_STANDARD = ['hr_full', 'profitability', 'ai_tools', 'cashier_closing']

// حدود كل باقة (الإضافات تنضاف فوقها)
export const PLAN_CAPS: Record<PlanKey, { branches: number; staff: number; suppliers: number }> = {
  basic: { branches: 1, staff: 3, suppliers: 3 },
  pro: { branches: 3, staff: 10, suppliers: 10 },
  advanced: { branches: 10, staff: 999, suppliers: 999 },
}

export async function changeOrgPlan(db: SupabaseClient, orgId: string, input: { planName: string; maxBranches: number; maxStaff?: number; maxSuppliers?: number; billingCycle?: string }) {
  const { planName, maxBranches, maxStaff, maxSuppliers, billingCycle } = input
  const { data: oldOrg } = await db.from('organizations').select('max_branches,plan,locked_plan_monthly').eq('id', orgId).maybeSingle()
  const oldBranches = (oldOrg as any)?.max_branches || 1

  // تغيير الباقة ما يمسح وحدات اشتراها العميل كإضافات (موظف/مورد إضافي)
  const { data: extraSubs } = await db.from('org_addon_subscriptions')
    .select('quantity,expires_at,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'active').in('marketplace_addons.slug', ['extra_staff', 'extra_suppliers'])
  const live = ((extraSubs || []) as any[]).filter(s => !s.expires_at || new Date(s.expires_at) > new Date())
  const extraOf = (slug: string) => live.filter(s => s.marketplace_addons?.slug === slug).reduce((n, s) => n + (Number(s.quantity) || 0), 0)
  const updatePayload: any = { max_branches: maxBranches, plan: planName, max_staff: (Number(maxStaff) || 0) + extraOf('extra_staff'), max_suppliers: (Number(maxSuppliers) || 0) + extraOf('extra_suppliers') }
  if (billingCycle === 'monthly' || billingCycle === 'yearly') updatePayload.billing_cycle = billingCycle
  // باقة مختلفة = سعرها الحالي؛ نفس الباقة = يبقى سعره المثبّت
  if ((oldOrg as any)?.plan !== planName) updatePayload.locked_plan_monthly = null

  const { error } = await db.from('organizations').update(updatePayload).eq('id', orgId)
  if (error) return { ok: false as const, error: error.message }

  // تخفيض: الفروع الزايدة تتوقف مؤقتاً (مع موظفينها). ترقية: ترجع تلقائياً
  const branchSync = await syncBranchesToLimit(db, orgId)

  // المتوسطة فما فوق فيها الكاشير والموظفين والذكاء والربحية — نلغي إضافاتها عشان ما تنحسب عليه
  // ولا تبقى مفتوحة بدون دفع لو رجع للأساسية لاحقاً
  if (planKeyOf(planName, maxBranches) !== 'basic') {
    const { data: inc } = await db.from('marketplace_addons').select('id').in('slug', INCLUDED_FROM_STANDARD)
    const ids = ((inc || []) as any[]).map(a => a.id)
    if (ids.length) await db.from('org_addon_subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any)
      .eq('org_id', orgId).eq('status', 'active').in('addon_id', ids)
  }

  if (maxBranches !== oldBranches) {
    const newAmount = PLAN_PRICING[planKeyOf(planName, maxBranches)].monthly
    const oldAmount = planPriceFor(planKeyOf((oldOrg as any)?.plan, oldBranches), (oldOrg as any)?.locked_plan_monthly).monthly
    try {
      await (db as any).from('subscription_events').insert({ org_id: orgId, event_type: newAmount > oldAmount ? 'upgraded' : 'downgraded', plan: planName, amount: newAmount })
    } catch {}
  }
  return { ok: true as const, ...branchSync }
}
