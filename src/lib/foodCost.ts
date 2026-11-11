// نسبة تكلفة المواد من المبيعات (Food cost %) — بدون وصفات ولا ربط مع الكاشير
//  - المبيعات: إقفالات الكاشير (صافية من الضريبة للمنشأة المسجّلة)
//  - التكلفة: كل ما خرج من المخزون فعلاً (صرف + هدر + فروقات الجرد) × متوسط تكلفة الصنف
//    فروقات الجرد تلتقط الاستهلاك اللي ما تسجّل، فالرقم يقترب من «أول المدة + المشتريات − آخر المدة»
//  - ما نحسب: التحويل بين الفروع، إلغاء فاتورة شراء، تسوية الاستيراد الجماعي
import type { SupabaseClient } from '@supabase/supabase-js'
import { selectAll } from '@/lib/selectAll'

export type FoodCostMove = { type: string; qty_change: number; note?: string | null; recorded_at: string; product: { id: string; name: string; unit: string; avg_cost: number | null } }
export type FoodCostClosing = { closing_date: string; total_sales: number | null }
export type FoodCostPeriod = { sales: number; cost: number; pct: number | null; closingDays: number }
export type FoodCostItem = { name: string; unit: string; qty: number; cost: number; prevCost: number }
export type FoodCostResult = {
  from: string; to: string
  week: FoodCostPeriod; prev: FoodCostPeriod
  target: number | null
  items: FoodCostItem[]
  missingCost: number   // أصناف انصرفت بدون تكلفة معروفة (ما لها مشتريات)
}

const r2 = (n: number) => Math.round(n * 100) / 100
// أهداف شائعة بالقطاع — المطاعم 28–35٪ والكوفي 20–30٪
export function defaultTarget(businessType?: string | null): number | null {
  if (businessType === 'مطعم') return 32
  if (businessType === 'كوفي') return 28
  return null
}

/** هل الحركة استهلاك حقيقي؟ (يرجع الكمية المستهلكة: موجبة = خرجت، سالبة = رجعت بالجرد) */
export function consumedQty(m: Pick<FoodCostMove, 'type' | 'qty_change' | 'note'>): number {
  const q = Number(m.qty_change) || 0
  const note = m.note || ''
  if (m.type === 'out') return note.startsWith('إلغاء فاتورة شراء') ? 0 : -q
  if (m.type === 'waste') return -q
  if (m.type === 'adjustment') return note.startsWith('تسوية استيراد') ? 0 : -q
  if (m.type === 'in' && note.startsWith('تعديل يدوي')) return -q   // تصحيح الموظف للكمية = مثل فرق الجرد
  return 0
}

/** يوم بتوقيت السعودية (YYYY-MM-DD) */
export const ksaDay = (iso: string | number | Date) => new Date(new Date(iso).getTime() + 3 * 3600e3).toISOString().slice(0, 10)
const addDays = (day: string, n: number) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)

/** آخر 7 أيام مكتملة (حتى أمس) والأسبوع اللي قبلها */
export function foodCostWindows(now = Date.now()) {
  const to = addDays(ksaDay(now), -1)
  const from = addDays(to, -6)
  return { from, to, prevFrom: addDays(from, -7), prevTo: addDays(from, -1) }
}

export function computeFoodCost(
  closings: FoodCostClosing[], moves: FoodCostMove[],
  o: { vatRegistered: boolean; target: number | null; now?: number },
): FoodCostResult {
  const w = foodCostWindows(o.now)
  const inWeek = (d: string) => d >= w.from && d <= w.to
  const inPrev = (d: string) => d >= w.prevFrom && d <= w.prevTo
  const net = (s: number) => o.vatRegistered ? s / 1.15 : s

  const period = (pick: (d: string) => boolean): FoodCostPeriod => {
    const cs = closings.filter(c => pick(c.closing_date))
    const sales = r2(net(cs.reduce((s, c) => s + (Number(c.total_sales) || 0), 0)))
    let cost = 0
    for (const m of moves) if (pick(ksaDay(m.recorded_at))) cost += consumedQty(m) * (Number(m.product.avg_cost) || 0)
    cost = r2(Math.max(0, cost))
    const closingDays = new Set(cs.map(c => c.closing_date)).size
    // أقل من 3 أيام إقفال = النسبة مضللة
    return { sales, cost, pct: sales > 0 && closingDays >= 3 ? Math.round((cost / sales) * 1000) / 10 : null, closingDays }
  }

  const byItem = new Map<string, FoodCostItem>()
  const missing = new Set<string>()
  for (const m of moves) {
    const d = ksaDay(m.recorded_at)
    const wk = inWeek(d), pv = inPrev(d)
    if (!wk && !pv) continue
    const q = consumedQty(m)
    if (!q) continue
    const unitCost = Number(m.product.avg_cost) || 0
    if (!unitCost && wk && q > 0) missing.add(m.product.id)
    const it = byItem.get(m.product.id) || { name: m.product.name, unit: m.product.unit, qty: 0, cost: 0, prevCost: 0 }
    if (wk) { it.qty += q; it.cost += q * unitCost } else it.prevCost += q * unitCost
    byItem.set(m.product.id, it)
  }
  const items = [...byItem.values()]
    .map(i => ({ ...i, qty: r2(i.qty), cost: r2(i.cost), prevCost: r2(i.prevCost) }))
    .filter(i => i.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5)

  return { from: w.from, to: w.to, week: period(inWeek), prev: period(inPrev), target: o.target, items, missingCost: missing.size }
}

export async function loadFoodCost(db: SupabaseClient, orgId: string, branchId: string | null, now = Date.now()): Promise<FoodCostResult> {
  const w = foodCostWindows(now)
  const { data: org } = await db.from('organizations').select('vat_registered,business_type').eq('id', orgId).maybeSingle()
  const sinceTs = `${w.prevFrom}T00:00:00.000+03:00`
  const untilTs = `${w.to}T23:59:59.999+03:00`
  const [closings, moves] = await Promise.all([
    selectAll(() => {
      let q = db.from('cashier_closings').select('id,closing_date,total_sales').eq('org_id', orgId).gte('closing_date', w.prevFrom).lte('closing_date', w.to)
      if (branchId) q = q.eq('branch_id', branchId)
      return q.order('id')
    }),
    selectAll(() => {
      let q = db.from('stock_movements')
        .select('id,type,qty_change,note,recorded_at,products!inner(id,name,unit,avg_cost,org_id,branch_id)')
        .eq('products.org_id', orgId).in('type', ['out', 'waste', 'adjustment', 'in'])
        .gte('recorded_at', sinceTs).lte('recorded_at', untilTs)
      if (branchId) q = q.eq('products.branch_id', branchId)
      return q.order('id')
    }),
  ])
  const mv: FoodCostMove[] = ((moves.data || []) as any[]).map(m => ({ type: m.type, qty_change: Number(m.qty_change), note: m.note, recorded_at: m.recorded_at, product: m.products }))
  return computeFoodCost((closings.data || []) as any[], mv, {
    vatRegistered: !!(org as any)?.vat_registered,
    target: defaultTarget((org as any)?.business_type),
    now,
  })
}
