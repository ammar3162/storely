import type { SupabaseClient } from '@supabase/supabase-js'

// حد الفروع = فروع الباقة (organizations.max_branches) + الفروع المشتراة من إضافة "فرع إضافي".
// max_branches يمثّل الباقة فقط — الإضافة ما تعدّله، تنحسب هنا وقت الطلب
// (عشان انتهاء الاشتراك أو تغيير الباقة من لوحة الإدارة ما يخرب العدد).
export const PLAN_BASE_BRANCHES: Record<string, number> = { basic: 1, pro: 3, advanced: 10 }
export const EXTRA_BRANCH_SLUG = 'extra_branch'

export type BranchLimit = { base: number; extra: number; total: number }

export function combineBranchLimit(base: number | null | undefined, subs: { quantity?: number | null; expires_at?: string | null }[], now = new Date()): BranchLimit {
  const b = Math.max(1, Number(base) || 1)
  const extra = subs
    .filter(s => !s.expires_at || new Date(s.expires_at) > now)
    .reduce((sum, s) => sum + Math.max(1, Number(s.quantity) || 1), 0)
  return { base: b, extra, total: b + extra }
}

export async function getBranchLimit(db: SupabaseClient, org_id: string): Promise<BranchLimit> {
  const [{ data: org }, { data: subs }] = await Promise.all([
    db.from('organizations').select('max_branches').eq('id', org_id).single(),
    db.from('org_addon_subscriptions')
      .select('quantity,expires_at,marketplace_addons!inner(slug)')
      .eq('org_id', org_id)
      .eq('status', 'active')
      .eq('marketplace_addons.slug', EXTRA_BRANCH_SLUG),
  ])
  return combineBranchLimit((org as any)?.max_branches, (subs || []) as any[])
}

/**
 * يطابق الفروع النشطة مع الحد (بعد تغيير الباقة، أو تفعيل/إلغاء/انتهاء إضافة "فرع إضافي"):
 * - أكثر من الحد: نوقف الأحدث مع موظفينه ونعلّمهم plan_locked_at (البيانات تبقى)
 * - أقل من الحد: لو كل الفروع الموقوفة بسبب الحد تتسع نرجّعها كلها مع موظفينها.
 *   لو ما تتسع كلها (مثلاً اشترى فرع واحد وعنده 5 موقوفة) نخليها — المالك يختار أي فرع يفعّل من صفحة الفروع
 * الفروع اللي أوقفها المالك بنفسه ما نلمسها.
 */
export async function syncBranchesToLimit(db: SupabaseClient, org_id: string): Promise<{ locked: number; restored: number }> {
  const { total } = await getBranchLimit(db, org_id)
  const { data: active } = await db.from('branches').select('id')
    .eq('org_id', org_id).eq('is_active', true).order('created_at', { ascending: true })
  const activeIds = (active || []).map((b: any) => b.id)
  const now = new Date().toISOString()

  if (activeIds.length > total) {
    const excess = activeIds.slice(total)
    await db.from('branches').update({ is_active: false, plan_locked_at: now } as any).in('id', excess).eq('org_id', org_id)
    await db.from('staff_members').update({ is_active: false, plan_locked_at: now } as any).in('branch_id', excess).eq('is_active', true)
    return { locked: excess.length, restored: 0 }
  }

  const room = total - activeIds.length
  if (room <= 0) return { locked: 0, restored: 0 }
  const { data: locked } = await db.from('branches').select('id')
    .eq('org_id', org_id).eq('is_active', false).not('plan_locked_at', 'is', null)
  const back = (locked || []).map((b: any) => b.id)
  if (!back.length || back.length > room) return { locked: 0, restored: 0 }
  await restoreLockedBranches(db, org_id, back)
  return { locked: 0, restored: back.length }
}

/** يرجّع فروع موقوفة بسبب الحد مع موظفينها اللي توقفوا معها */
export async function restoreLockedBranches(db: SupabaseClient, org_id: string, ids: string[]) {
  await db.from('branches').update({ is_active: true, plan_locked_at: null } as any).in('id', ids).eq('org_id', org_id)
  await db.from('staff_members').update({ is_active: true, plan_locked_at: null } as any)
    .in('branch_id', ids).eq('org_id', org_id).not('plan_locked_at', 'is', null)
}
