// تطبيقات التوصيل في إقفال الكاشير — المالك يختار تطبيقاته، والكاشير يكتب مبلغ كل تطبيق
// فلوس التطبيقات ما تدخل الدرج، فتنخصم من الكاش المتوقع مثل الشبكة
export const DELIVERY_APP_PRESETS = ['هنقرستيشن', 'جاهز', 'كيتا', 'مرسول', 'ذا شفز', 'تويو'] as const
export const MAX_DELIVERY_APPS = 12
const MAX_NAME = 40

export type DeliveryEntry = { name: string; amount: number }

/** قائمة تطبيقات المنشأة: أسماء نظيفة بدون تكرار — null لو القيمة مو قائمة */
export function cleanAppList(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const out: string[] = []
  for (const x of v) {
    const name = String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
    if (name && !out.includes(name)) out.push(name)
  }
  return out.length > MAX_DELIVERY_APPS ? null : out
}

/** مبالغ التوصيل من الطلب: بس التطبيقات المسموحة، ومبلغ موجب — NaN بالمبلغ يعني قيمة غلط */
export function deliveryFromInput(v: unknown, allowed: string[]): DeliveryEntry[] {
  const byName = new Map<string, number>()
  for (const e of Array.isArray(v) ? v.slice(0, MAX_DELIVERY_APPS * 2) : []) {
    const name = String((e as any)?.name ?? '').replace(/\s+/g, ' ').trim()
    if (!allowed.includes(name)) continue
    const n = Number((e as any)?.amount ?? 0)
    const amount = Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n * 100) / 100 : NaN
    byName.set(name, Number.isNaN(amount) ? NaN : (byName.get(name) || 0) + amount)
  }
  return [...byName].map(([name, amount]) => ({ name, amount })).filter(e => Number.isNaN(e.amount) || e.amount > 0)
}

/** أسماء التطبيقات المسجّلة بإقفال محفوظ (للتعديل لو المالك شال التطبيق من قائمته بعدين) */
export function deliveryNames(v: unknown): string[] {
  return (Array.isArray(v) ? v : []).map((e: any) => String(e?.name ?? '').trim()).filter(Boolean)
}
