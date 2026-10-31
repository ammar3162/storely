// «الطلب الذكي»: يدمج أربع أدوات تجاوب نفس السؤال (وش أطلب، وكم، ومتى) في صف واحد لكل صنف:
// توقع النفاد (stock-forecast) + توقيت الطلب (smart-reorder-timing) + اقتراح الكميات (purchase-suggestion) + حد إعادة الطلب (reorder-optimizer).

export type SmartOrderRow = {
  name: string
  unit: string
  productId: string | null
  currentQty: number | null
  dailyRate: number
  daysLeft: number | null          // متى يخلص (null = ما يخلص قريب / ما فيه صرف)
  suggestedQty: number | null      // كم تطلب
  weeklyNeed: number | null
  orderInDays: number | null       // متى تطلب (السالب = متأخر)
  leadDays: number | null          // مدة التوريد المعتادة
  reorder: { current: number; suggested: number } | null   // حد إعادة الطلب المقترح (لو يختلف)
  urgent: boolean
}

type Any = Record<string, any>
const num = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

export function mergeSmartOrder(input: { forecast?: Any[]; timing?: Any[]; buy?: Any[]; reorder?: Any[] }): { rows: SmartOrderRow[]; safeCount: number } {
  const by = new Map<string, SmartOrderRow>()
  const row = (x: Any): SmartOrderRow => {
    const key = String(x.name || '')
    if (!by.has(key)) by.set(key, { name: key, unit: x.unit || '', productId: x.id || null, currentQty: num(x.currentQty), dailyRate: 0,
      daysLeft: null, suggestedQty: null, weeklyNeed: null, orderInDays: null, leadDays: null, reorder: null, urgent: false })
    const r = by.get(key)!
    if (!r.productId && x.id) r.productId = x.id
    if (r.currentQty == null) r.currentQty = num(x.currentQty)
    if (!r.dailyRate && num(x.dailyRate)) r.dailyRate = Number(x.dailyRate)
    return r
  }
  for (const f of input.forecast || []) { if (!f?.name) continue; const r = row(f); r.daysLeft = num(f.daysLeft) }
  for (const t of input.timing || []) { if (!t?.name) continue; const r = row(t); r.orderInDays = num(t.suggestedOrderInDays); r.leadDays = num(t.avgLeadTimeDays) }
  for (const b of input.buy || []) { if (!b?.name) continue; const r = row(b); r.suggestedQty = num(b.suggestedQty); r.weeklyNeed = num(b.weeklyNeed); if (b.urgency === 'urgent') r.urgent = true }
  for (const o of input.reorder || []) {
    if (!o?.name) continue
    const r = row(o), cur = num(o.currentReorderPoint), sug = num(o.suggestedReorderPoint)
    if (cur != null && sug != null && cur !== sug) r.reorder = { current: cur, suggested: sug }
  }
  const all = [...by.values()].filter(r => r.name)
  for (const r of all) if ((r.daysLeft != null && r.daysLeft <= 2) || (r.orderInDays != null && r.orderInDays <= 0)) r.urgent = true
  // يحتاج انتباه: يخلص خلال أسبوعين، أو وقت طلبه خلال أسبوع، أو له كمية مقترحة، أو حده يحتاج تعديل
  const needs = (r: SmartOrderRow) => r.urgent || (r.daysLeft != null && r.daysLeft <= 14) || (r.orderInDays != null && r.orderInDays <= 7) || (r.suggestedQty ?? 0) > 0 || !!r.reorder
  const rank = (r: SmartOrderRow) => Math.min(r.daysLeft ?? 999, r.orderInDays ?? 999)
  const rows = all.filter(needs).sort((a, b) => Number(b.urgent) - Number(a.urgent) || rank(a) - rank(b) || a.name.localeCompare(b.name, 'ar'))
  return { rows, safeCount: all.length - rows.length }
}
