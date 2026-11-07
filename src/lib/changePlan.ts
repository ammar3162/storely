// تغيير باقة منشأة — مكان واحد يستخدمه الأدمن (تغيير مباشر) والموافقة على طلب الترقية
import type { SupabaseClient } from '@supabase/supabase-js'
import { syncBranchesToLimit } from '@/lib/branchLimit'
import { syncStaffToLimit } from '@/lib/staffCapacity'
import { clearFeatureCache } from '@/lib/featureRoutes'
import { PLAN_CAPS, addonIncludedIn, planKeyOf, planPriceFor } from '@/lib/planPricing'

export { PLAN_CAPS }

// إضافات ممكن تكون مضمّنة بالباقة (حسب addonIncludedIn)
export const INCLUDED_FROM_STANDARD = ['hr_full', 'profitability', 'ai_tools', 'cashier_closing', 'mod_inventory', 'mod_purchases']

/** lockedMonthly = سعر شهري خاص (باقة المؤسسات) — يتثبّت للمنشأة */
/** staffIncluded = عدد موظفين «ابنِ باقتك» (يأثر على الفاتورة والحد) */
export async function changeOrgPlan(db: SupabaseClient, orgId: string, input: { planName: string; maxBranches: number; maxStaff?: number; maxSuppliers?: number; billingCycle?: string; lockedMonthly?: number | null; staffIncluded?: number | null }) {
  const { planName, maxBranches, maxStaff, maxSuppliers, billingCycle } = input
  const { data: oldOrg } = await db.from('organizations').select('max_branches,max_staff,max_suppliers,plan,locked_plan_monthly').eq('id', orgId).maybeSingle()
  const samePlan = (oldOrg as any)?.plan === planName
  const oldBranches = (oldOrg as any)?.max_branches || 1

  // تغيير الباقة ما يمسح وحدات اشتراها العميل كإضافات (موظف/مورد إضافي)
  const { data: extraSubs } = await db.from('org_addon_subscriptions')
    .select('quantity,expires_at,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'active').in('marketplace_addons.slug', ['extra_staff', 'extra_suppliers'])
  const live = ((extraSubs || []) as any[]).filter(s => !s.expires_at || new Date(s.expires_at) > new Date())
  const extraOf = (slug: string) => live.filter(s => s.marketplace_addons?.slug === slug).reduce((n, s) => n + (Number(s.quantity) || 0), 0)
  const updatePayload: any = { max_branches: maxBranches, plan: planName, max_staff: (Number(maxStaff) || 0) + extraOf('extra_staff'), max_suppliers: (Number(maxSuppliers) || 0) + extraOf('extra_suppliers') }
  // نفس الباقة (تغيير الدورة مثلاً): حدود المنشأة القديمة تبقى — عشان المشتركين قبل تغيير الأسعار ما تنقص حدودهم
  if (samePlan && maxStaff == null) updatePayload.max_staff = (oldOrg as any)?.max_staff
  if (samePlan && maxSuppliers == null) updatePayload.max_suppliers = (oldOrg as any)?.max_suppliers
  if (billingCycle === 'monthly' || billingCycle === 'yearly') updatePayload.billing_cycle = billingCycle
  // باقة مختلفة = سعرها الحالي؛ نفس الباقة = يبقى سعره المثبّت
  if (!samePlan) updatePayload.locked_plan_monthly = null
  if (Number(input.lockedMonthly) > 0) updatePayload.locked_plan_monthly = Number(input.lockedMonthly)
  if (input.staffIncluded !== undefined) updatePayload.staff_included = Number(input.staffIncluded) > 0 ? Math.min(500, Math.round(Number(input.staffIncluded))) : null

  // الفروع المشتراة اللي صارت داخل الباقة الجديدة (ترقية) ما تنحسب عليه بعد — نخلي بس اللي فوق فروع الباقة
  const { data: branchSub } = await db.from('org_addon_subscriptions')
    .select('id,quantity,expires_at,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'active').eq('marketplace_addons.slug', 'extra_branch').maybeSingle()
  const extraBranches = branchSub && (!(branchSub as any).expires_at || new Date((branchSub as any).expires_at) > new Date()) ? Math.max(1, Number((branchSub as any).quantity) || 1) : 0
  if (extraBranches && maxBranches > oldBranches) {
    const stillNeeded = Math.max(0, oldBranches + extraBranches - maxBranches)
    if (stillNeeded === 0) await db.from('org_addon_subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any).eq('id', (branchSub as any).id)
    else if (stillNeeded < extraBranches) await db.from('org_addon_subscriptions').update({ quantity: stillNeeded } as any).eq('id', (branchSub as any).id)
  }

  const { error } = await db.from('organizations').update(updatePayload).eq('id', orgId)
  if (error) return { ok: false as const, error: error.message }
  clearFeatureCache(orgId)

  // تخفيض: الفروع الزايدة تتوقف مؤقتاً (مع موظفينها). ترقية: ترجع تلقائياً
  const branchSync = await syncBranchesToLimit(db, orgId)
  const staffSync = await syncStaffToLimit(db, orgId)

  // الإضافات اللي صارت داخل الباقة الجديدة (مثلاً الكاشير بالتشغيل) نلغيها عشان ما تنحسب عليه
  // ولا تبقى مفتوحة بدون دفع لو رجع لباقة أقل لاحقاً
  const included = INCLUDED_FROM_STANDARD.filter(slug => addonIncludedIn(planKeyOf(planName, maxBranches), slug))
  if (included.length) {
    const { data: inc } = await db.from('marketplace_addons').select('id').in('slug', included)
    const ids = ((inc || []) as any[]).map(a => a.id)
    if (ids.length) await db.from('org_addon_subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any)
      .eq('org_id', orgId).eq('status', 'active').in('addon_id', ids)
  }

  if (maxBranches !== oldBranches || !samePlan) {
    const newAmount = planPriceFor(planKeyOf(planName, maxBranches), updatePayload.locked_plan_monthly, maxBranches).monthly
    const oldAmount = planPriceFor(planKeyOf((oldOrg as any)?.plan, oldBranches), (oldOrg as any)?.locked_plan_monthly, oldBranches).monthly
    if (newAmount !== oldAmount) try {
      await (db as any).from('subscription_events').insert({ org_id: orgId, event_type: newAmount > oldAmount ? 'upgraded' : 'downgraded', plan: planName, amount: newAmount })
    } catch {}
  }
  return { ok: true as const, ...branchSync, staffLocked: staffSync.locked, staffRestored: staffSync.restored }
}
