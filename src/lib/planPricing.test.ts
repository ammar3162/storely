import { describe, it, expect } from 'vitest'
import { billLines, planKeyOf, addonPeriodEnd, proratedCharge } from './planPricing'

const branch = (qty: number, isValid = true) => ({ name: 'فرع إضافي', slug: 'extra_branch', monthly_price: 49, subscription: { isValid, quantity: qty } })

describe('billLines', () => {
  it('charges extra branches by quantity', () => {
    const { lines, total } = billLines('advanced', 'monthly', [branch(2)])
    expect(lines[1]).toEqual({ label: 'إضافة "فرع إضافي" (2 × 49 ر.س)', amount: 98 })
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
    expect(billLines('pro', 'yearly', addons).total).toBe(2390 + 30 * 12 + 60 * 12)
  })
})

describe('planKeyOf', () => {
  it('prefers the stored plan and falls back to the branch count', () => {
    expect(planKeyOf('advanced', 1)).toBe('advanced')
    expect(planKeyOf(null, 3)).toBe('pro')
    expect(planKeyOf('', 10)).toBe('advanced')
  })
})

describe('proration', () => {
  const now = new Date('2026-09-21T00:00:00Z')

  it('ends the addon with the plan and charges only the days left', () => {
    const end = addonPeriodEnd('2026-10-01T00:00:00Z', now)
    expect(end.toISOString()).toBe('2026-10-01T00:00:00.000Z')
    expect(proratedCharge(49, 1, end, now)).toEqual({ days: 10, amount: 16 })
    expect(proratedCharge(49, 2, end, now).amount).toBe(33)
  })

  it('falls back to 30 days when the plan has expired or ends within a day', () => {
    expect(addonPeriodEnd('2026-09-01T00:00:00Z', now).toISOString()).toBe('2026-10-21T00:00:00.000Z')
    expect(addonPeriodEnd(null, now).toISOString()).toBe('2026-10-21T00:00:00.000Z')
    expect(proratedCharge(49, 1, addonPeriodEnd(null, now), now)).toEqual({ days: 30, amount: 49 })
  })
})
