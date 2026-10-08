import { describe, it, expect } from 'vitest'
import { saveInvoiceItems, itemsSummary, cleanItems } from './purchaseItems'

// قاعدة بيانات وهمية تسجّل الإضافات والتحديثات
function fakeDb(products: any[]) {
  const log: { table: string; op: string; row: any }[] = []
  let n = 0
  const q = (table: string) => {
    const st: any = { op: 'select', row: null }
    const o: any = {}
    o.select = () => o; o.eq = () => o; o.limit = () => o
    o.insert = (row: any) => { st.op = 'insert'; st.row = row; log.push({ table, op: 'insert', row }); return o }
    o.update = (row: any) => { st.op = 'update'; st.row = row; log.push({ table, op: 'update', row }); return o }
    o.single = () => o
    o.then = (r: any) => r(st.op === 'select' ? { data: products, error: null }
      : table === 'products' && st.op === 'insert' ? { data: { id: `new${++n}`, name: st.row.name, unit: st.row.unit, qty: 0, avg_cost: st.row.avg_cost }, error: null }
      : { data: null, error: null })
    return o
  }
  return { db: { from: q } as any, log }
}
const tax: any = { invoice_group: 'g', qr_verified: false }
const base = { orgId: 'o', branchId: 'b', hasVat: true, supplier: 'المراعي', invoiceImage: null, tax }

describe('saving invoice items', () => {
  it('existing item → stock in (no new product); unknown item → new product', async () => {
    const { db, log } = fakeDb([{ id: 'p1', name: 'دجاج', unit: 'كجم', qty: 10, avg_cost: 10 }])
    const r = await saveInvoiceItems(db, { ...base, items: cleanItems([{ name: 'دجاج كامل طازج', qty: 5, total: 115 }, { name: 'مناديل', qty: 3, total: 34.5 }]) })
    expect(r.map(x => x.action)).toEqual(['added', 'created'])
    expect(r[0]).toMatchObject({ product: 'دجاج', productId: 'p1' })
    const moves = log.filter(l => l.table === 'stock_movements')
    expect(moves.map(m => [m.row.product_id, m.row.qty_change])).toEqual([['p1', 5], ['new1', 3]])
    expect(log.filter(l => l.table === 'products' && l.op === 'insert').map(l => l.row.name)).toEqual(['مناديل'])
    // متوسط التكلفة: (10×10 + 5×20) ÷ 15
    expect(log.find(l => l.table === 'products' && l.op === 'update')!.row.avg_cost).toBeCloseTo(13.33, 2)
    expect(itemsSummary(r)).toBe('زادت كمية 1 صنف موجود · انضاف 1 صنف جديد')
  })
  it('the user choice wins: explicit product or explicit «new»', async () => {
    const { db } = fakeDb([{ id: 'p2', name: 'أغطية أكواب', qty: 0, avg_cost: 0 }, { id: 'p3', name: 'دجاج', qty: 0, avg_cost: 0 }])
    const r = await saveInvoiceItems(db, { ...base, items: cleanItems([{ name: 'غطاء كوب', qty: 100, total: 50, product_id: 'p2' }, { name: 'دجاج', qty: 1, total: 10, product_id: 'new' }]) })
    expect(r.map(x => [x.action, x.productId])).toEqual([['added', 'p2'], ['created', 'new1']])
  })
  it('a product id from another branch/org is ignored (no stock to a foreign product)', async () => {
    const { db } = fakeDb([{ id: 'p1', name: 'دجاج', qty: 0, avg_cost: 0 }])
    const r = await saveInvoiceItems(db, { ...base, items: cleanItems([{ name: 'زيت', qty: 2, total: 20, product_id: 'foreign' }]) })
    expect(r[0].action).toBe('created')
  })
  it('same new item twice on one invoice → one product, stock added twice', async () => {
    const { db, log } = fakeDb([])
    await saveInvoiceItems(db, { ...base, items: cleanItems([{ name: 'سكر', qty: 2, total: 20 }, { name: 'سكر', qty: 3, total: 30 }]) })
    expect(log.filter(l => l.table === 'products' && l.op === 'insert')).toHaveLength(1)
    expect(log.filter(l => l.table === 'stock_movements').map(m => m.row.qty_change)).toEqual([2, 3])
  })
})
