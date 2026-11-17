// الفرع الإضافي في «باقتك المخصصة» (طلب المالك 2026-11-17): الفرع نفسه بدون رسوم، وتنحسب خدماته لكل فرع.
// هنا: وش يقدر يختار العميل للفرع الجديد، وكم يزيد اشتراكه الشهري — نفس الحساب بالمتصفح والخادم.
import { CUSTOM_MODULES, CUSTOM_MODULE_ORDER, customModuleAmount } from '@/lib/planPricing'

/** الخدمات اللي تنحسب لكل فرع (المساعد الذكي للمنشأة كلها، فما يتكرر مع الفروع) */
export const PER_BRANCH_SERVICES: string[] = CUSTOM_MODULE_ORDER.filter(s => CUSTOM_MODULES[s].perBranch)

export type ServiceSub = { slug: string; active: boolean; quantity?: number | null; branch_ids?: string[] | null; locked_price?: number | string | null }

/**
 * state: all = مشترك فيها لكل الفروع (تنضاف للفرع الجديد دايماً) · some = لفروع محددة (اختيارية، مختارة مبدئياً)
 * · none = غير مشترك (اختيارية). price = الزيادة الشهرية لو انضاف الفرع الجديد لها (بخصم الفروع من الثالث).
 */
export type BranchService = { slug: string; name: string; price: number; state: 'all' | 'some' | 'none' }

export function branchServices(subs: ServiceSub[], names: Record<string, string> = {}): BranchService[] {
  return PER_BRANCH_SERVICES.map(slug => {
    const sub = subs.find(s => s.slug === slug && s.active)
    const qty = sub ? Math.max(1, Number(sub.quantity) || 1) : 0
    const locked = sub && Number(sub.locked_price) > 0 ? Number(sub.locked_price) : null
    const price = qty ? customModuleAmount(slug, qty + 1, locked) - customModuleAmount(slug, qty, locked) : customModuleAmount(slug, 1, null)
    const state: BranchService['state'] = !sub ? 'none' : !sub.branch_ids || !sub.branch_ids.length ? 'all' : 'some'
    return { slug, name: names[slug] || slug, price: Math.max(0, Math.round(price)), state }
  })
}

/** المختار مبدئياً بالنافذة: كل اللي مشترك فيه */
export const defaultServices = (all: BranchService[]) => all.filter(s => s.state !== 'none').map(s => s.slug)

/** الخدمات المطلوبة فعلاً: المشتركة لكل الفروع تنضاف دايماً، والباقي حسب اختيار العميل */
export function chosenServices(all: BranchService[], picked: unknown): string[] {
  const want = new Set(Array.isArray(picked) ? picked.filter((x): x is string => typeof x === 'string') : [])
  return all.filter(s => s.state === 'all' || want.has(s.slug)).map(s => s.slug)
}

/** كم يزيد الاشتراك الشهري بالفرع الجديد وخدماته */
export const branchMonthly = (all: BranchService[], slugs: string[]) =>
  all.filter(s => slugs.includes(s.slug)).reduce((t, s) => t + s.price, 0)

export const cleanBranchName = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)
export const cleanBranchLocation = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) || null
