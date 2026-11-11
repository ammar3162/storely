import { describe, it, expect } from 'vitest'
import { computeFoodCost, consumedQty, foodCostWindows, defaultTarget } from './foodCost'

const NOW = Date.parse('2026-11-12T09:00:00+03:00')   // أمس = 11، الأسبوع 5–11، اللي قبله 29/10–4/11
const meat = { id: 'p1', name: 'لحم', unit: 'كيلو', avg_cost: 40 }
const bread = { id: 'p2', name: 'خبز', unit: 'كيس', avg_cost: 5 }
const mv = (type: string, qty: number, day: string, product: any = meat, note: string | null = null) => ({ type, qty_change: qty, note, recorded_at: `${day}T12:00:00+03:00`, product })
const cl = (day: string, sales: number) => ({ closing_date: day, total_sales: sales })

describe('foodCost', () => {
  it('windows: last 7 complete KSA days and the week before', () => {
    expect(foodCostWindows(NOW)).toEqual({ from: '2026-11-05', to: '2026-11-11', prevFrom: '2026-10-29', prevTo: '2026-11-04' })
  })

  it('counts dispense, waste and count differences; ignores transfers, purchase reversal and imports', () => {
    expect(consumedQty({ type: 'out', qty_change: -3 })).toBe(3)
    expect(consumedQty({ type: 'waste', qty_change: -1 })).toBe(1)
    expect(consumedQty({ type: 'adjustment', qty_change: -2 })).toBe(2)
    expect(consumedQty({ type: 'adjustment', qty_change: 1 })).toBe(-1)
    expect(consumedQty({ type: 'out', qty_change: -5, note: 'إلغاء فاتورة شراء محذوفة (مورد)' })).toBe(0)
    expect(consumedQty({ type: 'adjustment', qty_change: -5, note: 'تسوية استيراد جماعي' })).toBe(0)
    expect(consumedQty({ type: 'in', qty_change: 4 })).toBe(0)
    expect(consumedQty({ type: 'in', qty_change: 2, note: 'تعديل يدوي بواسطة الموظف: علي' })).toBe(-2)
    expect(consumedQty({ type: 'transfer_out', qty_change: -9 })).toBe(0)
  })

  it('ratio = consumed cost / net sales, with previous week and top items', () => {
    const closings = [cl('2026-11-05', 1150), cl('2026-11-06', 1150), cl('2026-11-07', 1150), cl('2026-11-01', 1150), cl('2026-11-02', 1150), cl('2026-11-03', 2300)]
    const moves = [
      mv('out', -20, '2026-11-06'), mv('waste', -2, '2026-11-07'), mv('adjustment', -3, '2026-11-08'),   // 25 كيلو × 40 = 1000
      mv('out', -40, '2026-11-06', bread),                                                               // 200
      mv('out', -15, '2026-11-02'),                                                                      // الأسبوع السابق 600
      mv('out', -99, '2026-10-20'),                                                                      // خارج الفترتين
    ]
    const r = computeFoodCost(closings, moves as any, { vatRegistered: true, target: 32, now: NOW })
    expect(r.week).toEqual({ sales: 3000, cost: 1200, pct: 40, closingDays: 3 })
    expect(r.prev).toEqual({ sales: 4000, cost: 600, pct: 15, closingDays: 3 })
    expect(r.items[0]).toEqual({ name: 'لحم', unit: 'كيلو', qty: 25, cost: 1000, prevCost: 600 })
    expect(r.items[1].name).toBe('خبز')
  })

  it('no ratio with fewer than 3 closing days; flags items without a known cost', () => {
    const r = computeFoodCost([cl('2026-11-05', 500), cl('2026-11-06', 500)], [mv('out', -2, '2026-11-06', { ...meat, avg_cost: null })] as any, { vatRegistered: false, target: null, now: NOW })
    expect(r.week.pct).toBeNull()
    expect(r.missingCost).toBe(1)
    expect(r.items).toEqual([])
  })

  it('default targets by business type', () => {
    expect(defaultTarget('مطعم')).toBe(32)
    expect(defaultTarget('كوفي')).toBe(28)
    expect(defaultTarget('أخرى')).toBeNull()
  })
})
