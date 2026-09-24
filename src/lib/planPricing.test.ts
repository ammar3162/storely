import { describe, it, expect } from 'vitest'
import { billLines, planKeyOf } from './planPricing'

const branch = (qty: number, isValid = true) => ({ name: 'فرع إضافي', slug: 'extra_branch', monthly_price: 49, subscription: { isValid, quantity: qty } })

describe('billLines', () => {
  it('charges extra branches by quantity', () => {
    const { lines, total } = billLines('advanced', 'monthly', [branch(2)])
    expect(lines[1]).toEqual({ label: 'إضافة "فرع إضافي" (2 × 49 ر.س/شهر)', amount: 98 })
    expect(total).toBe(399 + 98)
  })

  it('leaves out cancelled or expired addons', () => {
    expect(billLines('basic', 'monthly', [branch(3, false)]).total).toBe(99)
  })

  it('charges a regular addon once and sums per-branch staff addons', () => {
    const addons = [
      { name: 'ذكاء', slug: 'ai_tools', monthly_price: 30, subscription: { isValid: true, quantity: null } },
      { name: 'موظف إضافي', slug: 'extra_staff', monthly_price: 20, subscriptions: [{ isValid: true, quantity: 2 }, { isValid: true, quantity: 1 }] },
    ]
    expect(billLines('pro', 'yearly', addons).total).toBe(2390 + 30 + 60)
  })
})

describe('planKeyOf', () => {
  it('prefers the stored plan and falls back to the branch count', () => {
    expect(planKeyOf('advanced', 1)).toBe('advanced')
    expect(planKeyOf(null, 3)).toBe('pro')
    expect(planKeyOf('', 10)).toBe('advanced')
  })
})
