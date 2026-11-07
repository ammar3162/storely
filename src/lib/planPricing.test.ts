import { describe, it, expect } from 'vitest'
import { billLines, activeDiscount, planKeyOf, addonPeriodEnd, proratedCharge, staffBase, supplierBase, maxSelfServeBranches, branchPriceFor, planLabel, PLAN_CAPS, planPriceFor, addonPriceFor, addonIncludedIn, addonsForPlan, nextPlanOf, signupAddonsFor, signupAddonsMonthly } from './planPricing'

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

describe('org discount (from the admin panel)', () => {
  const cashier = { name: 'كاشير', slug: 'cashier_closing', monthly_price: 29, subscription: { isValid: true, quantity: 1 } }
  it('percent takes a share of the whole bill and shows as its own line', () => {
    const b = billLines('basic', 'monthly', [cashier], null, { discount_type: 'percent', discount_value: 20, discount_note: 'عميل مميز' })
    expect(b.lines.at(-1)).toEqual({ label: 'خصم "عميل مميز" (20%)', amount: -26 })
    expect(b.total).toBe(128 - 26)
  })
  it('a fixed amount is monthly, ×12 on yearly, and never makes the bill negative', () => {
    expect(billLines('pro', 'monthly', [], null, { discount_type: 'amount', discount_value: 50 }).total).toBe(199)
    expect(billLines('pro', 'yearly', [], null, { discount_type: 'amount', discount_value: 50 }).total).toBe(2390 - 600)
    expect(billLines('basic', 'monthly', [], null, { discount_type: 'amount', discount_value: 500 }).total).toBe(0)
  })
  it('stops after its end date (Saudi day) and ignores empty values', () => {
    const now = new Date('2026-11-10T22:00:00Z')   // 11 نوفمبر بتوقيت السعودية
    expect(activeDiscount({ discount_type: 'percent', discount_value: 10, discount_until: '2026-11-11' }, now)).not.toBeNull()
    expect(activeDiscount({ discount_type: 'percent', discount_value: 10, discount_until: '2026-11-10' }, now)).toBeNull()
    expect(activeDiscount({ discount_type: 'percent', discount_value: 0 })).toBeNull()
    expect(billLines('basic', 'monthly', [], null, null).total).toBe(99)
  })
})

describe('new plans (2026-11): price per branch', () => {
  it('first branch + extra branch × the rest, yearly −20%', () => {
    expect(planPriceFor('essential', null, 1).monthly).toBe(119)
    expect(planPriceFor('ops', null, 3).monthly).toBe(239)
    expect(planPriceFor('full', null, 3).monthly).toBe(329)
    expect(planPriceFor('full', null, 1).yearly).toBe(Math.round(219 * 12 * 0.8))
    expect(planPriceFor('ops', 500, 3).monthly).toBe(500)
  })
  it('legacy plans ignore the branch count', () => {
    expect(planPriceFor('pro', null, 3).monthly).toBe(249)
    expect(planPriceFor('basic', null, 2).monthly).toBe(99)
  })
  it('bill: plan line for N branches + per-branch add-ons × branches', () => {
    const cashier = { name: 'إقفال الكاشير', slug: 'cashier_closing', monthly_price: 29, subscription: { isValid: true, quantity: 2, locked_price: 40 } }
    const ai = { name: 'الذكاء', slug: 'ai_tools', monthly_price: 29, subscription: { isValid: true, quantity: 1, locked_price: 15 } }
    const { lines, total } = billLines('essential', 'monthly', [cashier, ai], null, null, 3)
    expect(lines[0]).toEqual({ label: 'اشتراك باقة "الأساسية" (3 فروع) (شهرياً)', amount: 179 })
    expect(lines[1]).toEqual({ label: 'إضافة "إقفال الكاشير" (2 فروع × 40 ر.س)', amount: 80 })
    expect(total).toBe(179 + 80 + 15)
  })
  it('full plan is 24 cheaper than essential + every add-on (1 branch)', () => {
    const add = (slug: string, p: number) => ({ name: slug, slug, monthly_price: p, subscription: { isValid: true, quantity: 1, locked_price: p } })
    const allAddons = billLines('essential', 'monthly', [add('cashier_closing', 40), add('hr_full', 69), add('ai_tools', 15)], null, null, 1).total
    expect(allAddons - billLines('full', 'monthly', [], null, null, 1).total).toBe(24)
  })
  it('staff 6 and suppliers 15 per branch', () => {
    expect(staffBase('ops', 6, 0, 3)).toBe(18)
    expect(staffBase('ops', 6, 2, 1)).toBe(18)
    expect(supplierBase('full', 15, 0, 2)).toBe(30)
    expect(staffBase('basic', 3, 1, 1)).toBe(6)   // القديمة بدون تغيير
  })
  it('add-on prices and inclusion per plan', () => {
    expect(addonPriceFor('essential', 'cashier_closing')).toBe(40)
    expect(addonPriceFor('ops', 'hr_full')).toBe(69)
    expect(addonPriceFor('ops', 'extra_branch')).toBe(40)
    expect(addonPriceFor('basic', 'cashier_closing')).toBeNull()
    expect(addonIncludedIn('ops', 'cashier_closing')).toBe(true)
    expect(addonIncludedIn('essential', 'cashier_closing')).toBe(false)
    expect(addonIncludedIn('pro', 'hr_full')).toBe(true)
    expect(addonIncludedIn('basic', 'hr_full')).toBe(false)
    const list = addonsForPlan('ops', [{ slug: 'cashier_closing', monthly_price: 29 }, { slug: 'hr_full', monthly_price: 59 }, { slug: 'extra_suppliers', monthly_price: 5 }])
    expect(list).toEqual([{ slug: 'hr_full', monthly_price: 69, per_branch: true }])
  })
  it('next plan follows the same family', () => {
    expect(nextPlanOf('essential')).toBe('ops')
    expect(nextPlanOf('full')).toBeNull()
    expect(nextPlanOf('basic')).toBe('pro')
    expect(planKeyOf('ops', 1)).toBe('ops')
  })
})

describe('add-ons chosen at signup', () => {
  it('offers only what the plan lacks and prices per branch', () => {
    expect(signupAddonsFor('essential')).toEqual(['cashier_closing', 'hr_full', 'ai_tools'])
    expect(signupAddonsFor('ops')).toEqual(['hr_full', 'ai_tools'])
    expect(signupAddonsFor('full')).toEqual([])
    // الأساسية بفرعين + كاشير (40×2) + ذكاء 15
    expect(signupAddonsMonthly('essential', ['cashier_closing', 'ai_tools'], 2)).toBe(95)
    // الكاشير مضمّن بالتشغيل فما ينحسب
    expect(signupAddonsMonthly('ops', ['cashier_closing', 'hr_full'], 1)).toBe(69)
  })
})
