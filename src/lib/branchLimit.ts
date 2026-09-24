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
 * لو الفروع النشطة أكثر من الحد (إلغاء أو انتهاء إضافة، أو نزول باقة): نوقف الأحدث.
 * الإيقاف مؤقت — البيانات تبقى، والمالك يقدر يوقف فرع ثاني ويفعّل هذا بدلاً منه من صفحة الفروع.
 */
export async function enforceBranchLimit(db: SupabaseClient, org_id: string): Promise<number> {
  const { total } = await getBranchLimit(db, org_id)
  const { data: active } = await db.from('branches').select('id')
    .eq('org_id', org_id).eq('is_active', true).order('created_at', { ascending: true })
  const excess = (active || []).slice(total).map((b: any) => b.id)
  if (!excess.length) return 0
  await db.from('branches').update({ is_active: false } as any).in('id', excess).eq('org_id', org_id)
  await db.from('staff_members').update({ is_active: false } as any).in('branch_id', excess).eq('is_active', true)
  return excess.length
}
