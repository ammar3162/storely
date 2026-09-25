import type { SupabaseClient } from '@supabase/supabase-js'

// حد الباقة الأساسي مستقل وصارم لكل فرع لحاله (ما تقدر تسحب من فرع فاضي لفرع ثاني).
// إضافة "موظف إضافي" رصيد مشترك للمؤسسة كلها، يُستخدم بأي فرع تحتاجه فيه.
export const PLAN_BASE_STAFF: Record<string, number> = { basic: 3, pro: 5, advanced: 999 }

/**
 * هل فيه مكان لموظف نشط إضافي بهذا الفرع؟
 * - تحت حد الباقة الأساسي: ok بدون إضافة
 * - فوقه: يحتاج رصيد من إضافة "موظف إضافي" — يرجّع addonSubscriptionId اللي لازم ينربط فيه الموظف
 */
export async function checkStaffCapacity(db: SupabaseClient, org_id: string, branch_id: string | null):
  Promise<{ ok: true; addonSubscriptionId: string | null } | { ok: false; error: string }> {
  const { data: org } = await db.from('organizations').select('plan').eq('id', org_id).single()
  const baseLimit = PLAN_BASE_STAFF[(org as any)?.plan || 'basic'] ?? 3

  let branchCountQ = db.from('staff_members').select('id', { count: 'exact', head: true }).eq('org_id', org_id).eq('is_active', true)
  branchCountQ = branch_id ? branchCountQ.eq('branch_id', branch_id) : branchCountQ.is('branch_id', null)
  const { count: branchCount } = await branchCountQ
  if ((branchCount || 0) < baseLimit) return { ok: true, addonSubscriptionId: null }

  const { data: extraStaffSub } = await db
    .from('org_addon_subscriptions')
    .select('id,quantity,marketplace_addons!inner(slug)')
    .eq('org_id', org_id)
    .eq('status', 'active')
    .eq('marketplace_addons.slug', 'extra_staff')
    .maybeSingle()

  if (!extraStaffSub) {
    return { ok: false, error: `هذا الفرع وصل حده الأساسي (${baseLimit} موظف) — يرجى ترقية الباقة أو شراء إضافة "موظف إضافي"` }
  }

  const addonQty = (extraStaffSub as any).quantity || 0
  const { count: usedAddonSlots } = await db
    .from('staff_members')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org_id)
    .eq('is_active', true)
    .eq('addon_subscription_id', (extraStaffSub as any).id)

  if ((usedAddonSlots || 0) >= addonQty) {
    return { ok: false, error: `هذا الفرع وصل حده الأساسي (${baseLimit} موظف)، ورصيد إضافة "موظف إضافي" (${addonQty}) مستهلك بالكامل — زوّد الكمية من صفحة الإضافات` }
  }

  return { ok: true, addonSubscriptionId: (extraStaffSub as any).id }
}
