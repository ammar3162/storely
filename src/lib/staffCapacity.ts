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
    db.from('organizations').select('plan,max_staff,staff_included').eq('id', org_id).single(),
    getBranchLimit(db, org_id),
  ])
  const baseLimit = staffBase((org as any)?.plan, (org as any)?.max_staff, branchLimit.extra, branchLimit.base, (org as any)?.staff_included)

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
    return { ok: false, error: `وصلت إلى حد الموظفين في باقتك (${baseLimit} موظف) — أضف "موظف إضافي" من صفحة الإضافات أو رقِّ باقتك` }
  }

  const addonQty = (extraStaffSub as any).quantity || 0
  const { count: usedAddonSlots } = await db
    .from('staff_members')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org_id)
    .eq('is_active', true)
    .eq('addon_subscription_id', (extraStaffSub as any).id)

  if ((usedAddonSlots || 0) >= addonQty) {
    return { ok: false, error: `وصلت إلى حد الموظفين في باقتك (${baseLimit} موظف)، ورصيد "موظف إضافي" (${addonQty}) مستهلك بالكامل — زِد الكمية من صفحة الإضافات` }
  }

  return { ok: true, addonSubscriptionId: (extraStaffSub as any).id }
}

/** الحد الكلي للموظفين النشطين = حد الباقة (مع فروعها الإضافية) + رصيد "موظف إضافي" الساري */
export async function staffLimitFor(db: SupabaseClient, org_id: string): Promise<number> {
  const [{ data: org }, branchLimit, { data: subs }] = await Promise.all([
    db.from('organizations').select('plan,max_staff,staff_included').eq('id', org_id).single(),
    getBranchLimit(db, org_id),
    db.from('org_addon_subscriptions').select('quantity,expires_at,marketplace_addons!inner(slug)')
      .eq('org_id', org_id).eq('status', 'active').eq('marketplace_addons.slug', 'extra_staff'),
  ])
  const now = Date.now()
  const extra = ((subs || []) as any[]).filter(s => !s.expires_at || new Date(s.expires_at).getTime() > now)
    .reduce((n, s) => n + Math.max(0, Number(s.quantity) || 0), 0)
  return staffBase((org as any)?.plan, (org as any)?.max_staff, branchLimit.extra, branchLimit.base, (org as any)?.staff_included) + extra
}

/**
 * يطابق الموظفين النشطين مع الحد (بعد إلغاء/تقليل "موظف إضافي"، أو تغيير الباقة، أو الفروع، أو التجديد):
 * - أكثر من الحد: نوقف الأحدث مؤقتاً ونعلّمهم plan_locked_at (بياناتهم تبقى)
 * - فيه مكان: نرجّع الموقوفين بسبب الحد (الأقدم أول) لين يمتلي — بشرط فرعهم شغّال
 * الموقوفين يدوياً من المالك ما نلمسهم.
 */
export async function syncStaffToLimit(db: SupabaseClient, org_id: string): Promise<{ locked: number; restored: number }> {
  const limit = await staffLimitFor(db, org_id)
  const { data: active } = await db.from('staff_members').select('id')
    .eq('org_id', org_id).eq('is_active', true).order('created_at', { ascending: true })
  const ids = ((active || []) as any[]).map(s => s.id)
  const now = new Date().toISOString()

  if (ids.length > limit) {
    const excess = ids.slice(limit)
    await db.from('staff_members').update({ is_active: false, plan_locked_at: now } as any).in('id', excess).eq('org_id', org_id)
    return { locked: excess.length, restored: 0 }
  }

  const room = limit - ids.length
  if (room <= 0) return { locked: 0, restored: 0 }
  const { data: branches } = await db.from('branches').select('id').eq('org_id', org_id).eq('is_active', true)
  const live = ((branches || []) as any[]).map(b => b.id)
  if (!live.length) return { locked: 0, restored: 0 }
  const { data: locked } = await db.from('staff_members').select('id')
    .eq('org_id', org_id).eq('is_active', false).not('plan_locked_at', 'is', null).in('branch_id', live)
    .order('created_at', { ascending: true }).limit(room)
  const back = ((locked || []) as any[]).map(s => s.id)
  if (!back.length) return { locked: 0, restored: 0 }
  await db.from('staff_members').update({ is_active: true, plan_locked_at: null } as any).in('id', back).eq('org_id', org_id)
  return { locked: 0, restored: back.length }
}
