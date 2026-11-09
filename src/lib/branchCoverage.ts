// شرط «كل فرع عليه خدمة واحدة على الأقل» (قرار المالك 2026-11-09):
// مع اختيار الفروع لكل خدمة، ما ينفع فرع نشط يبقى بدون أي خدمة لكل فرع (المخزون/المشتريات/الكاشير/الحضور)،
// لأن الفرع يجيب معه 6 موظفين وأدوات الفروع — فما يصير فرع مجاني. الذكاء للمنشأة كلها فما يُحسب لفرع.
import { CUSTOM_MODULES } from '@/lib/planPricing'

/** خدمة مفعّلة: فروعها (null = كل الفروع) */
export type ServiceBranches = { slug: string; branchIds: string[] | null }

/** الفروع النشطة اللي ما عليها أي خدمة لكل فرع */
export function uncoveredBranches(activeIds: string[], services: ServiceBranches[]): string[] {
  const perBranch = services.filter(s => CUSTOM_MODULES[s.slug]?.perBranch)
  if (perBranch.some(s => !s.branchIds || s.branchIds.length === 0)) return []   // خدمة على كل الفروع تغطيها كلها
  const covered = new Set(perBranch.flatMap(s => s.branchIds || []))
  return activeIds.filter(id => !covered.has(id))
}

/** رسالة الشرط بأسماء الفروع */
export function uncoveredMessage(names: string[]): string {
  if (!names.length) return ''
  const list = names.join('، ')
  return names.length === 1
    ? `${list} بدون خدمات. اختر له خدمة واحدة على الأقل، أو أغلق الفرع من صفحة الفروع.`
    : `هذه الفروع بدون خدمات: ${list}. اختر لكل فرع خدمة واحدة على الأقل، أو أغلقه من صفحة الفروع.`
}
