// تطبيقات التوصيل في إقفال الكاشير — الكاشير يختار التطبيق ويكتب مبلغه وقت الإقفال
// فلوس التطبيقات ما تدخل الدرج، فتنخصم من الكاش المتوقع مثل الشبكة
export const DELIVERY_APP_PRESETS = ['هنقرستيشن', 'جاهز', 'كيتا', 'مرسول', 'ذا شفز', 'تويو'] as const
export const MAX_DELIVERY_APPS = 12
const MAX_NAME = 40

export type DeliveryEntry = { name: string; amount: number }

const cleanName = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)

/** قائمة أسماء نظيفة بدون تكرار — null لو القيمة مو قائمة أو أكثر من الحد */
export function cleanAppList(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const out: string[] = []
  for (const x of v) {
    const name = cleanName(x)
    if (name && !out.includes(name)) out.push(name)
  }
  return out.length > MAX_DELIVERY_APPS ? null : out
}

/** مبالغ التوصيل من الطلب: اسم التطبيق ومبلغ موجب — NaN بالمبلغ يعني قيمة غلط */
export function deliveryFromInput(v: unknown): DeliveryEntry[] {
  const byName = new Map<string, number>()
  for (const e of Array.isArray(v) ? v.slice(0, MAX_DELIVERY_APPS * 2) : []) {
    const name = cleanName((e as any)?.name)
    if (!name) continue
    const n = Number((e as any)?.amount ?? 0)
    const amount = Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n * 100) / 100 : NaN
    byName.set(name, Number.isNaN(amount) ? NaN : (byName.get(name) || 0) + amount)
  }
  return [...byName].map(([name, amount]) => ({ name, amount })).filter(e => Number.isNaN(e.amount) || e.amount > 0).slice(0, MAX_DELIVERY_APPS)
}

/** التطبيقات اللي تطلع للكاشير: الأشهر + اللي استخدمتها المنشأة قبل */
export function appChoices(remembered: unknown): string[] {
  return [...new Set([...DELIVERY_APP_PRESETS, ...(cleanAppList(remembered) || [])])]
}

/** نحفظ أي تطبيق جديد استخدمه الكاشير عشان يطلع له جاهز المرة الجاية (الأشهر ما تنحفظ — موجودة دايم) */
export function rememberApps(remembered: unknown, used: DeliveryEntry[]): string[] | null {
  const cur = cleanAppList(remembered) || []
  const fresh = used.map(e => e.name).filter(n => !cur.includes(n) && !(DELIVERY_APP_PRESETS as readonly string[]).includes(n))
  if (!fresh.length) return null
  return [...cur, ...fresh].slice(-MAX_DELIVERY_APPS)
}
