import { describe, it, expect } from 'vitest'
import { computeProfit } from './profitCalc'

const base = { fixedExpensesTotal: 0, deliveryIncome: [], staff: [] }

describe('computeProfit', () => {
  it('delivery income already inside closings is not counted twice', () => {
    const r = computeProfit({ ...base, vatRegistered: false,
      closings: [{ total_sales: 1000, delivery: [{ name: 'هنقرستيشن', amount: 300 }] }],
      purchases: [], deliveryIncome: [{ platform: 'هنقرستيشن', amount: 300 }, { platform: 'جاهز', amount: 100 }] })
    expect(r.deliveryIncomeTotal).toBe(100)
    expect(r.deliveryDuplicateTotal).toBe(300)
    expect(r.netProfit).toBe(1100)
  })
  it('VAT registered: profit without VAT, VAT due = output − input', () => {
    const r = computeProfit({ ...base, vatRegistered: true,
      closings: [{ total_sales: 1150 }],
      purchases: [{ category: 'مخزون', amount: 400, total_amount: 460 }] })
    expect(r.revenue).toBe(1000)
    expect(r.inventoryPurchases).toBe(400)
    expect(r.vatAmount).toBe(90)       // 150 − 60
    expect(r.netProfit).toBe(600)
  })
  it('not registered: no VAT, purchases at full amount', () => {
    const r = computeProfit({ ...base, vatRegistered: false,
      closings: [{ total_sales: 1150 }],
      purchases: [{ category: 'مخزون', amount: 400, total_amount: 460 }] })
    expect(r.vatAmount).toBe(0)
    expect(r.netProfit).toBe(690)
  })
  it('cashier drawer withdrawals and real payroll are expenses', () => {
    const r = computeProfit({ ...base, vatRegistered: false,
      closings: [{ total_sales: 5000, total_purchases: 50 }],
      purchases: [],
      staff: [{ gross: 3000, overtime: 200, bonuses: 100, deductions: 300 }, { gross: 1500, overtime: 0, bonuses: 0, deductions: 0 }] })
    expect(r.drawerPurchases).toBe(50)
    expect(r.salaryExpenseTotal).toBe(4500)
    expect(r.netProfit).toBe(5000 - 50 - 4500)
  })
  it('drawer advances, owner draws and bank deposits are not expenses', () => {
    const r = computeProfit({ ...base, vatRegistered: false, purchases: [],
      closings: [{ total_sales: 1000, total_purchases: 650, purchases: [
        { amount: 50, reason: 'ثلج' }, { amount: 300, reason: 'سلفة أحمد' }, { amount: 200, reason: 'سحب المالك' }, { amount: 100, reason: 'إيداع بنك' } ] },
        { total_sales: 0, total_purchases: 30 }] })
    expect(r.drawerPurchases).toBe(80)
    expect(r.drawerExcluded).toBe(600)
    expect(r.netProfit).toBe(920)
  })
})
