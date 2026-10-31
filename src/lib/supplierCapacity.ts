import type { SupabaseClient } from '@supabase/supabase-js'
import { supplierBase } from '@/lib/planPricing'
import { getBranchLimit } from '@/lib/branchLimit'

// حد الموردين للمنشأة كلها: حد الباقة + موردين كل فرع إضافي (lib/planPricing).
// إضافة "مورد إضافي" رصيد فوقه — المورد اللي ياخذ منها ينربط فيها (addon_subscription_id) عشان يتوقف لو انلغت.
export async function checkSupplierCapacity(db: SupabaseClient, org_id: string):
  Promise<{ ok: true; addonSubscriptionId: string | null } | { ok: false; error: string }> {
  const [{ data: org }, branchLimit] = await Promise.all([
    db.from('organizations').select('plan,max_suppliers').eq('id', org_id).single(),
    getBranchLimit(db, org_id),
  ])
  const baseLimit = supplierBase((org as any)?.plan, (org as any)?.max_suppliers, branchLimit.extra)

  const { count: baseUsed } = await db.from('suppliers').select('id', { count: 'exact', head: true })
    .eq('org_id', org_id).eq('is_active', true).is('addon_subscription_id', null)
  if ((baseUsed || 0) < baseLimit) return { ok: true, addonSubscriptionId: null }

  const { data: extraSupSub } = await db
    .from('org_addon_subscriptions')
    .select('id,quantity,marketplace_addons!inner(slug)')
    .eq('org_id', org_id)
    .eq('status', 'active')
    .eq('marketplace_addons.slug', 'extra_suppliers')
    .gt('expires_at', new Date().toISOString())   // الإضافة المنتهية ما تعطي رصيد
    .maybeSingle()

  if (!extraSupSub) {
    return { ok: false, error: `وصلت حد موردين باقتك (${baseLimit} مورد) — أضف "مورد إضافي" من صفحة الإضافات أو رقّ باقتك` }
  }

  const addonQty = (extraSupSub as any).quantity || 0
  const { count: usedAddonSlots } = await db.from('suppliers').select('id', { count: 'exact', head: true })
    .eq('org_id', org_id).eq('is_active', true).eq('addon_subscription_id', (extraSupSub as any).id)

  if ((usedAddonSlots || 0) >= addonQty) {
    return { ok: false, error: `وصلت حد موردين باقتك (${baseLimit} مورد)، ورصيد "مورد إضافي" (${addonQty}) مستهلك بالكامل — زوّد الكمية من صفحة الإضافات` }
  }

  return { ok: true, addonSubscriptionId: (extraSupSub as any).id }
}
