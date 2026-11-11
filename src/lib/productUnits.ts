import type { SupabaseClient } from '@supabase/supabase-js'
import { unitFor } from '@/lib/arabicCount'
// وحدات الشراء والتحويل لوحدة المخزون (2026-11-10).
// الصنف يُخزَّن ويُصرف بوحدة (unit)، ويُشترى بوحدة أو أكثر (product_units: كرتون = 12 كيس، شدة = 6 علب...).
// هنا: توحيد أسماء الوحدات (cartoon/كرتونة → كرتون) والتحويلات الثابتة (كيلو = 1000 غرام) وحساب المعامل.

/** الاسم الموحّد لكل وحدة ومرادفاتها (بالعربي والإنجليزي والأخطاء الشائعة) */
const SYNONYMS: Record<string, string[]> = {
  'كرتون': ['كرتونة', 'كراتين', 'كرتونه', 'carton', 'cartoon', 'cartons', 'ctn', 'ctns', 'case'],
  'كيس': ['أكياس', 'اكياس', 'كيسة', 'bag', 'bags', 'sack'],
  'شدة': ['شده', 'شدّة', 'شدات', 'pack', 'packs', 'six pack', 'shrink'],
  'صندوق': ['صناديق', 'بوكس', 'box', 'boxes', 'crate'],
  'علبة': ['علب', 'علبه', 'can', 'cans', 'tin', 'jar'],
  'زجاجة': ['زجاجات', 'زجاجه', 'قارورة', 'قاروره', 'bottle', 'bottles', 'btl'],
  'باكيت': ['باكت', 'بكت', 'باكيتات', 'packet', 'packets', 'pkt'],
  'ربطة': ['ربطه', 'ربطات', 'bundle', 'bunch'],
  'درزن': ['دزينة', 'دزينه', 'دستة', 'dozen', 'dz'],
  'رول': ['رولات', 'لفة', 'لفه', 'roll', 'rolls'],
  'جالون': ['جالونات', 'gallon', 'gal'],
  'حبة': ['حبه', 'حبات', 'قطعة', 'قطعه', 'قطع', 'pc', 'pcs', 'piece', 'pieces', 'unit', 'units', 'ea', 'each'],
  'كيلو': ['كيلوجرام', 'كيلوغرام', 'كجم', 'كغ', 'كغم', 'كلغ', 'kg', 'kgs', 'kilo', 'kilogram'],
  'غرام': ['جرام', 'غم', 'جم', 'g', 'gr', 'gram', 'grams'],
  'لتر': ['ليتر', 'لترات', 'l', 'ltr', 'liter', 'litre', 'liters'],
  'مل': ['ملي', 'مليلتر', 'ملليلتر', 'ml', 'milliliter'],
  'متر': ['m', 'meter', 'metre'],
}
const LOOKUP = new Map<string, string>()
for (const [canon, alts] of Object.entries(SYNONYMS)) {
  LOOKUP.set(canon, canon)
  for (const a of alts) LOOKUP.set(a.toLowerCase(), canon)
}

/** يوحّد اسم الوحدة: «cartoon» و«كرتونة» → «كرتون». وحدة غير معروفة ترجع كما هي (مقصوصة) */
export function normalizeUnit(raw: string | null | undefined): string {
  const t = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 30)
  if (!t) return ''
  return LOOKUP.get(t.toLowerCase()) || LOOKUP.get(t.replace(/^ال/, '')) || t
}

/** نفس الوحدة؟ (قطعة = حبة، كجم = كيلو...) */
export const sameUnit = (a?: string | null, b?: string | null) => !!normalizeUnit(a) && normalizeUnit(a) === normalizeUnit(b)

// تحويلات ثابتة ما تحتاج سؤال العميل: [من، إلى، كم]
const BUILTIN: [string, string, number][] = [
  ['كيلو', 'غرام', 1000], ['لتر', 'مل', 1000], ['درزن', 'حبة', 12],
]

/**
 * كم وحدة مخزون في وحدة الشراء؟
 * - نفس الوحدة → 1
 * - محفوظة للصنف (saved: الوحدة الموحّدة → المعامل) → المعامل
 * - تحويل ثابت (كيلو→غرام...) → المعامل
 * - غير معروف → null (لازم يُسأل العميل)
 */
export function conversionFactor(stockUnit: string | null | undefined, purchaseUnit: string | null | undefined, saved?: Record<string, number> | null): number | null {
  const s = normalizeUnit(stockUnit), p = normalizeUnit(purchaseUnit)
  // المحفوظ للصنف أول — حتى لو بنفس الاسم (الفاتورة تكتب «حبة» وهي كرتون فيه 50): العميل علّمنا «كم يدخل المخزون»
  const f = p ? Number(saved?.[p]) : 0
  if (f > 0) return f
  if (!p || !s || p === s) return 1
  for (const [from, to, n] of BUILTIN) {
    if (p === from && s === to) return n
    if (p === to && s === from) return 1 / n
  }
  return null
}

/** «2 كرتون و6 كيس» — الكمية بأكبر وحدة شراء (فاضي لو أقل من وحدة شراء وحدة أو ما فيه وحدات) */
export function breakdownQty(qty: number, stockUnit: string, units: { unit: string; factor: number }[] | null | undefined): string {
  const big = [...(units || [])].filter(u => u.factor > 1 && !sameUnit(u.unit, stockUnit)).sort((a, b) => b.factor - a.factor)[0]
  if (!big || !(qty >= big.factor)) return ''
  const whole = Math.floor(qty / big.factor), rest = round(qty - whole * big.factor)
  return `${whole} ${unitFor(whole, big.unit)}${rest > 0 ? ` و${rest} ${unitFor(rest, stockUnit)}` : ''}`
}
/** «30 كيس (2 كرتون و6 كيس)» — عرض المخزون بأكبر وحدة شراء */
export function describeQty(qty: number, stockUnit: string, units: { unit: string; factor: number }[]): string {
  const b = breakdownQty(qty, stockUnit, units)
  return `${round(qty)} ${unitFor(round(qty), stockUnit)}${b ? ` (${b})` : ''}`
}
const round = (n: number) => Math.round(n * 1000) / 1000

// ── الخادم: قراءة وحفظ وحدات الشراء ──

/** وحدات الشراء المحفوظة لأصناف: product_id → { وحدة موحّدة: معامل } */
export async function loadUnitMap(db: SupabaseClient, orgId: string, productIds: string[]): Promise<Map<string, Record<string, number>>> {
  const out = new Map<string, Record<string, number>>()
  const ids = Array.from(new Set(productIds.filter(Boolean)))
  if (!ids.length) return out
  // قراءة فاشلة ما توقف حفظ الفاتورة — يرجع بدون تحويلات محفوظة (يُسأل العميل)
  let data: unknown[] | null = null
  try { data = (await db.from('product_units').select('product_id,unit,factor').eq('org_id', orgId).in('product_id', ids)).data } catch { data = null }
  for (const r of (data || []) as { product_id: string; unit: string; factor: number }[]) {
    const m = out.get(r.product_id) || {}
    m[normalizeUnit(r.unit)] = Number(r.factor)
    out.set(r.product_id, m)
  }
  return out
}

/** يحفظ (أو يحدّث) وحدة شراء لصنف — يتجاهل نفس وحدة المخزون والمعامل غير الصالح */
export async function saveProductUnit(db: SupabaseClient, orgId: string, productId: string, stockUnit: string | null | undefined, unit: string, factor: number) {
  const u = normalizeUnit(unit)
  // نفس اسم وحدة المخزون ينحفظ بس لو المعامل غير 1 (الفاتورة تكتب «حبة» والمخزون يزيد 50)
  if (!u || !(factor > 0) || factor > 100000 || (sameUnit(u, stockUnit) && factor === 1)) return false
  const { error } = await db.from('product_units').upsert({ org_id: orgId, product_id: productId, unit: u, factor: Math.round(factor * 10000) / 10000 } as any, { onConflict: 'product_id,unit' })
  return !error
}
