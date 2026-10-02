import { describe, it, expect } from 'vitest'
import { payrollLedger } from './payrollLedger'

const pay = {
  basic: 3000, allowances: { housing: 500, transport: 0, food: 0 },
  overtime: { minutes: 90, pay: 28.13, hourRate: 18.75, days: [{ date: '2026-10-02', minutes: 90, pay: 28.13 }] },
  latePenalties: [{ date: '2026-10-03', minutes: 14, amount: 1.17 }],
  deductions: [
    { amount: 50, reason: 'عجز إقفال الكاشير 2026-10-01 — فاتورة ما تحاسبت', date: '2026-10-02T09:00:00Z', source: 'cashier_deficit' },
    { amount: 100, reason: 'كسر صحن', date: '2026-10-04T09:00:00Z', source: 'manual' },
  ],
  advances: [{ amount: 200, reason: null, date: '2026-10-01T09:00:00Z' }],
  pendingAdvances: [{ amount: 300, date: '2026-10-05T09:00:00Z' }],
  pendingDeficits: [],
}

describe('payrollLedger', () => {
  const rows = payrollLedger(pay)
  it('orders earnings, then deductions by date, then pending', () => {
    expect(rows.map(r => r.section)).toEqual(['earning', 'earning', 'earning', 'deduction', 'deduction', 'deduction', 'deduction', 'pending'])
    expect(rows.filter(r => r.section === 'deduction').map(r => r.date)).toEqual(['2026-10-01', '2026-10-01', '2026-10-03', '2026-10-04'])
  })
  it('shows the cashier deficit with its closing date and reason only', () => {
    const d = rows.find(r => r.label === 'عجز إقفال الكاشير')!
    expect(d).toMatchObject({ date: '2026-10-01', detail: 'فاتورة ما تحاسبت', amount: 50 })
  })
  it('deduction total matches the items', () => {
    expect(rows.filter(r => r.section === 'deduction').reduce((s, r) => s + r.amount, 0)).toBeCloseTo(351.17, 2)
  })
})
