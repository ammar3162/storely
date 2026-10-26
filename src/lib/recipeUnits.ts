// الوحدات الدقيقة للوصفات: المكوّن يُخزَّن بوحدة المخزون (كيلو، لتر، كرتون...)
// والوصفة تُكتب بالوحدة الأصغر (جرام، مل، حبة). هنا التحويل بين الاثنين بمكان واحد.

type Unitful = { unit?: string | null; recipe_unit?: string | null; recipe_unit_factor?: number | string | null }
export type SubUnit = { label: string; factor: number }

const KILO = ['كيلو', 'كجم', 'كغ', 'كيلوجرام', 'كيلو جرام', 'كيلوغرام']
const GRAM = ['جرام', 'غرام', 'جم', 'غ']
const LITER = ['لتر', 'ليتر']
const ML = ['مل', 'ملي', 'مليلتر']
const DOZEN = ['درزن', 'دزينة']

const norm = (u?: string | null) => (u || '').trim()

/** الوحدات المتاحة لكتابة كمية المكوّن — الأولى هي الأدق. factor = كم وحدة صغيرة بوحدة المخزون */
export function subUnitOptions(p?: Unitful | null): SubUnit[] {
  const u = norm(p?.unit)
  const custom = Number(p?.recipe_unit_factor) > 0 ? { label: norm(p?.recipe_unit) || 'وحدة', factor: Number(p!.recipe_unit_factor) } : null
  const base = { label: u || 'وحدة', factor: 1 }
  let opts: SubUnit[]
  if (KILO.includes(u)) opts = [{ label: 'جرام', factor: 1000 }, base]
  else if (LITER.includes(u)) opts = [{ label: 'مل', factor: 1000 }, base]
  else if (DOZEN.includes(u)) opts = [{ label: 'حبة', factor: 12 }, base]
  else opts = [base]
  if (custom && !opts.some(o => o.label === custom.label)) opts = [custom, ...opts]
  return opts
}

/** هل نعرف نحوّل هالمنتج لوحدة أصغر؟ (الجرام والمل والقطعة أصلاً أصغر وحدة) */
export function hasKnownConversion(p?: Unitful | null) {
  const u = norm(p?.unit)
  return KILO.includes(u) || LITER.includes(u) || DOZEN.includes(u) || GRAM.includes(u) || ML.includes(u)
    || ['قطعة', 'حبة'].includes(u) || Number(p?.recipe_unit_factor) > 0
}

/** يحتاج المالك يحدد له تحويل؟ — للتنبيه بصفحة المخزون */
export function needsConversion(p?: Unitful | null) {
  return !hasKnownConversion(p)
}

/** تقريب لعرض الأرقام بدون كسور طويلة (0.333333 → 0.33) */
export function roundQty(n: number, digits = 2) {
  if (!isFinite(n)) return 0
  const f = 10 ** digits
  return Math.round(n * f) / f
}

/** عرض كمية مخزّنة بوحدة المخزون بأوضح وحدة: 0.018 كيلو → "18 جرام"، 2.5 كيلو → "2.5 كيلو" */
export function formatQty(baseQty: number, p?: Unitful | null): string {
  const opts = subUnitOptions(p)
  const base = opts.find(o => o.factor === 1)!
  const small = opts.find(o => o.factor > 1)
  if (small && Math.abs(baseQty) < 1) return `${roundQty(baseQty * small.factor)} ${small.label}`
  return `${roundQty(baseQty, 3)} ${base.label}`
}
