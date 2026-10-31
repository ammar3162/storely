import { describe, it, expect } from 'vitest'
import { billLines, planKeyOf, addonPeriodEnd, proratedCharge, staffBase, supplierBase, maxSelfServeBranches, branchPriceFor, planLabel, PLAN_CAPS } from './planPricing'

const branch = (qty: number, isValid = true) => ({ name: 'فرع إضافي', slug: 'extra_branch', monthly_price: 49, subscription: { isValid, quantity: qty } })

describe('billLines', () => {
  it('charges extra branches by quantity', () => {
    const { lines, total } = billLines('advanced', 'monthly', [branch(2)])
    expect(lines[1]).toEqual({ label: 'إضافة "فرع إضافي" (2 × 49 ر.س)', amount: 98 })
    expect(total).toBe(499 + 98)
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

describe('locked prices (subscribed before the price change)', () => {
  it('uses the locked plan and addon prices, and the new ones otherwise', () => {
    expect(billLines('advanced', 'monthly', [], 399).total).toBe(399)
    expect(billLines('advanced', 'yearly', [], 399).total).toBe(3830)
    expect(billLines('advanced', 'monthly', []).total).toBe(499)
    const cashier = (locked: number | null) => ({ name: 'كاشير', slug: 'cashier_closing', monthly_price: 29, subscription: { isValid: true, quantity: 1, locked_price: locked } })
    expect(billLines('basic', 'monthly', [cashier(20)]).total).toBe(99 + 20)
    expect(billLines('basic', 'monthly', [cashier(null)]).total).toBe(99 + 29)
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

describe('new plans (الأساسية / الشاملة / المتقدمة / المؤسسات)', () => {
  it('staff and suppliers are for the whole org, plus each extra branch', () => {
    expect(staffBase('basic', 3, 0)).toBe(3)
    expect(staffBase('basic', 3, 1)).toBe(6)
    expect(staffBase('pro', 10, 0)).toBe(15)       // كان 10 — صار 15
    expect(staffBase('pro', 15, 2)).toBe(25)
    expect(staffBase('advanced', 50, 4)).toBe(70)
    expect(supplierBase('basic', 5, 1)).toBe(10)
    expect(supplierBase('pro', 20, 0)).toBe(20)
  })
  it('old unlimited orgs keep unlimited', () => {
    expect(staffBase('advanced', 999, 0)).toBe(999)
    expect(supplierBase('advanced', 999, 0)).toBe(999)
  })
  it('self-serve branch caps and prices per plan', () => {
    expect([maxSelfServeBranches('basic', 1), maxSelfServeBranches('pro', 3), maxSelfServeBranches('advanced', 6)]).toEqual([2, 5, 10])
    expect(maxSelfServeBranches('advanced', 10)).toBe(10)       // متقدمة قديمة بـ10 فروع
    expect(maxSelfServeBranches('advanced', 15)).toBe(15)       // مؤسسات
    expect([branchPriceFor('basic'), branchPriceFor('pro'), branchPriceFor('advanced')]).toEqual([79, 79, 59])
    expect(PLAN_CAPS.pro).toMatchObject({ branches: 3, staff: 15, suppliers: 20 })
  })
  it('labels: الشاملة, and المؤسسات above 10 branches', () => {
    expect(planLabel('pro', 3)).toBe('الشاملة')
    expect(planLabel('advanced', 10)).toBe('المتقدمة')
    expect(planLabel('advanced', 15)).toBe('المؤسسات')
  })
  it('yearly bill gives the extra branch the same 20% discount', () => {
    const br = { name: 'فرع إضافي', slug: 'extra_branch', monthly_price: 79, subscription: { isValid: true, quantity: 1 } }
    expect(billLines('pro', 'yearly', [br]).total).toBe(2390 + Math.round(79 * 12 * 0.8))
    expect(billLines('pro', 'monthly', [br]).total).toBe(249 + 79)
  })
})
