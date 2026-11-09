import { describe, it, expect } from 'vitest'
import { eligibleForSwitch, currentModules, projectSwitch, resolveBranchMap, compactBranchMap } from './pricingSwitch'
import { PLAN_PRICING } from './planPricing'

const addons = [
  { id: 'a-inv', name: 'المخزون', slug: 'mod_inventory', monthly_price: 59 },
  { id: 'a-pur', name: 'المشتريات', slug: 'mod_purchases', monthly_price: 35 },
  { id: 'a-csh', name: 'إقفال الكاشير', slug: 'cashier_closing', monthly_price: 29 },
  { id: 'a-hr', name: 'الحضور', slug: 'hr_full', monthly_price: 59 },
  { id: 'a-ai', name: 'الذكاء', slug: 'ai_tools', monthly_price: 29 },
  { id: 'a-st', name: 'موظف إضافي', slug: 'extra_staff', monthly_price: 10 },
]
const future = '2999-01-01T00:00:00Z'
const sub = (addon_id: string, quantity = 1, locked_price: number | null = null) => ({ org_id: 'o1', addon_id, status: 'active', expires_at: future, quantity, locked_price })
const ALL = ['mod_inventory', 'mod_purchases', 'cashier_closing', 'hr_full', 'ai_tools']

describe('pricing switch for existing subscribers', () => {
  it('shows only to paid owners on a fixed plan who have not chosen yet', () => {
    expect(eligibleForSwitch('pro', 'paid', false)).toBe(true)
    expect(eligibleForSwitch('essential', 'paid', false)).toBe(true)
    expect(eligibleForSwitch('custom', 'paid', false)).toBe(false)
    expect(eligibleForSwitch('pro', 'trial', false)).toBe(false)
    expect(eligibleForSwitch('pro', 'paid', true)).toBe(false)
  })
  it('pre-selects what they already have', () => {
    expect(currentModules('pro', addons, [])).toEqual(ALL)
    expect(currentModules('basic', addons, [sub('a-hr')])).toEqual(['mod_inventory', 'mod_purchases', 'hr_full'])
  })
  it('switches when the new bill is cheaper (pro, one active branch, all features = 227 < 249)', () => {
    const org = { id: 'o1', plan: 'pro', max_branches: 3, billing_cycle: 'monthly' }
    const p = projectSwitch({ org, addons, subs: [], modules: ALL, branches: 1, activeStaff: 6 })
    expect(p.current).toBe(PLAN_PRICING.pro.monthly)
    expect(p.projected).toBe(227)
    expect(p.outcome).toBe('switch')
  })
  it('never pays more: 3 active branches with every feature stays on the current plan', () => {
    const org = { id: 'o1', plan: 'pro', max_branches: 3, billing_cycle: 'monthly' }
    const p = projectSwitch({ org, addons, subs: [], modules: ALL, branches: 3, activeStaff: 10 })
    expect(p.projected).toBeGreaterThan(p.current)
    expect(p.outcome).toBe('keep')
  })
  it('dropping features lowers the bill and switches', () => {
    const org = { id: 'o1', plan: 'pro', max_branches: 3, billing_cycle: 'monthly' }
    const p = projectSwitch({ org, addons, subs: [], modules: ['mod_inventory', 'cashier_closing'], branches: 2, activeStaff: 8 })
    expect(p.projected).toBe((59 + 49) * 2)
    expect(p.outcome).toBe('switch')
  })
  it('counts active staff above 6 per branch as extra staff, minus units already bought', () => {
    const org = { id: 'o1', plan: 'pro', max_branches: 3, billing_cycle: 'monthly' }
    const p = projectSwitch({ org, addons, subs: [sub('a-st', 1)], modules: ['mod_inventory'], branches: 1, activeStaff: 9 })
    expect(p.extraStaffNeeded).toBe(2)
    expect(p.projected).toBe(59 + 3 * 10)
  })
  it('cancelled add-ons are not part of the current bill', () => {
    const org = { id: 'o1', plan: 'basic', max_branches: 1, billing_cycle: 'monthly' }
    const cancelled = { ...sub('a-hr'), status: 'cancelled' }
    const withCancelled = projectSwitch({ org, addons, subs: [sub('a-csh'), cancelled], modules: ['mod_inventory'], branches: 1, activeStaff: 2 })
    const without = projectSwitch({ org, addons, subs: [sub('a-csh')], modules: ['mod_inventory'], branches: 1, activeStaff: 2 })
    expect(withCancelled.current).toBe(without.current)
  })
  it('yearly subscribers are compared by their monthly equivalent', () => {
    const org = { id: 'o1', plan: 'pro', max_branches: 3, billing_cycle: 'yearly' }
    const p = projectSwitch({ org, addons, subs: [], modules: ['mod_inventory'], branches: 1, activeStaff: 4 })
    expect(p.current).toBe(Math.round(PLAN_PRICING.pro.yearly / 12))
    expect(p.projected).toBe(Math.round(Math.round(59 * 12 * 0.8) / 12))
  })
})

describe('each feature on chosen branches (multi-branch owners)', () => {
  const ids = ['b1', 'b2', 'b3']
  it('resolves the map: unknown/closed branches dropped, missing or empty = all branches, per-org features ignored', () => {
    const m = resolveBranchMap({ cashier_closing: ['b2', 'bX'], hr_full: [], ai_tools: ['b1'] }, ['mod_inventory', 'cashier_closing', 'hr_full', 'ai_tools'], ids)
    expect(m).toEqual({ mod_inventory: ids, cashier_closing: ['b2'], hr_full: ids })
    expect(resolveBranchMap('bad', ['cashier_closing'], ids)).toEqual({ cashier_closing: ids })
    expect(compactBranchMap(m, ids)).toEqual({ cashier_closing: ['b2'] })
    expect(compactBranchMap({ mod_inventory: ids }, ids)).toBeNull()
  })
  it('prices each feature on its branch count: 3 branches, inventory on all, cashier on 1, HR on 1', () => {
    const org = { id: 'o1', plan: 'pro', max_branches: 3, billing_cycle: 'monthly' }
    const all3 = projectSwitch({ org, addons, subs: [], modules: ['mod_inventory', 'cashier_closing', 'hr_full'], branches: 3, activeStaff: 10 })
    const some = projectSwitch({ org, addons, subs: [], modules: ['mod_inventory', 'cashier_closing', 'hr_full'], branches: 3, activeStaff: 10, counts: { mod_inventory: 3, cashier_closing: 1, hr_full: 1 } })
    // المخزون 59+59+47 + الكاشير 49 + الحضور 69 = 283 (بدل 482 لكل الفروع)
    expect(all3.projected).toBe(165 + 137 + 193)
    expect(some.projected).toBe(165 + 49 + 69)
  })
})
