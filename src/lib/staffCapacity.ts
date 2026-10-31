import type { SupabaseClient } from '@supabase/supabase-js'
import { staffBase } from '@/lib/planPricing'
import { getBranchLimit } from '@/lib/branchLimit'

// حد الموظفين للمنشأة كلها (يتوزّع على الفروع مثل ما يبي المالك): حد الباقة + موظفين كل فرع إضافي (lib/planPricing).
// إضافة "موظف إضافي" رصيد فوق هالحد — الموظف اللي ياخذ منها ينربط فيها (addon_subscription_id) عشان يتوقف لو انلغت.

/**
 * هل فيه مكان لموظف نشط إضافي بالمنشأة؟
 * - تحت حد الباقة: ok بدون إضافة
 * - فوقه: يحتاج رصيد من إضافة "موظف إضافي" — يرجّع addonSubscriptionId اللي لازم ينربط فيه الموظف
 * branch_id ما عاد يأثر على الحد (باقي بالتوقيع عشان المستدعين)
 */
export async function checkStaffCapacity(db: SupabaseClient, org_id: string, _branch_id?: string | null):
  Promise<{ ok: true; addonSubscriptionId: string | null } | { ok: false; error: string }> {
  const [{ data: org }, branchLimit] = await Promise.all([
    db.from('organizations').select('plan,max_staff').eq('id', org_id).single(),
    getBranchLimit(db, org_id),
  ])
  const baseLimit = staffBase((org as any)?.plan, (org as any)?.max_staff, branchLimit.extra)

  const { count: baseUsed } = await db.from('staff_members').select('id', { count: 'exact', head: true })
    .eq('org_id', org_id).eq('is_active', true).is('addon_subscription_id', null)
  if ((baseUsed || 0) < baseLimit) return { ok: true, addonSubscriptionId: null }

  const { data: extraStaffSub } = await db
    .from('org_addon_subscriptions')
    .select('id,quantity,marketplace_addons!inner(slug)')
    .eq('org_id', org_id)
    .eq('status', 'active')
    .eq('marketplace_addons.slug', 'extra_staff')
    .gt('expires_at', new Date().toISOString())   // الإضافة المنتهية ما تعطي رصيد (حالتها تبقى active لين يجددها)
    .maybeSingle()

  if (!extraStaffSub) {
    return { ok: false, error: `وصلت حد موظفين باقتك (${baseLimit} موظف) — أضف "موظف إضافي" من صفحة الإضافات أو رقّ باقتك` }
  }

  const addonQty = (extraStaffSub as any).quantity || 0
  const { count: usedAddonSlots } = await db
    .from('staff_members')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org_id)
    .eq('is_active', true)
    .eq('addon_subscription_id', (extraStaffSub as any).id)

  if ((usedAddonSlots || 0) >= addonQty) {
    return { ok: false, error: `وصلت حد موظفين باقتك (${baseLimit} موظف)، ورصيد "موظف إضافي" (${addonQty}) مستهلك بالكامل — زوّد الكمية من صفحة الإضافات` }
  }

  return { ok: true, addonSubscriptionId: (extraStaffSub as any).id }
}
