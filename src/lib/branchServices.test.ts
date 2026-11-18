import { describe, it, expect } from 'vitest'
import { branchServices, chosenServices, branchMonthly, defaultServices, cleanBranchName, cleanBranchLocation, PER_BRANCH_SERVICES } from './branchServices'

describe('custom plan: services of a new branch', () => {
  const subs = [
    { slug: 'mod_inventory', active: true, quantity: 1, branch_ids: null },          // لكل الفروع
    { slug: 'cashier_closing', active: true, quantity: 2, branch_ids: ['a', 'b'] },  // لفروع محددة (الثالث بخصم)
    { slug: 'hr_full', active: false, quantity: 1, branch_ids: null },              // منتهية = غير مشترك
  ]
  const list = branchServices(subs, { mod_inventory: 'المخزون', cashier_closing: 'إقفال الكاشير' })
  const by = Object.fromEntries(list.map(s => [s.slug, s]))
  it('lists only per-branch services, with state and the extra monthly price for one more branch', () => {
    expect(list.map(s => s.slug)).toEqual(PER_BRANCH_SERVICES)
    expect(PER_BRANCH_SERVICES).not.toContain('ai_tools')
    expect(by.mod_inventory).toMatchObject({ state: 'all', price: 59, name: 'المخزون' })
    expect(by.cashier_closing.state).toBe('some')
    expect(by.cashier_closing.price).toBeLessThan(49)            // الفرع الثالث بخصم الفروع
    expect(by.mod_purchases).toMatchObject({ state: 'none', price: 35 })
    expect(by.hr_full).toMatchObject({ state: 'none', price: 69 })
  })
  it('all-branches services are always included; the rest follow the pick', () => {
    expect(defaultServices(list)).toEqual(['mod_inventory', 'cashier_closing'])
    expect(chosenServices(list, [])).toEqual(['mod_inventory'])
    expect(chosenServices(list, ['mod_purchases', 'nope', 5])).toEqual(['mod_inventory', 'mod_purchases'])
    expect(branchMonthly(list, ['mod_inventory', 'mod_purchases'])).toBe(59 + 35)
  })
  it('cleans the branch name and location', () => {
    expect(cleanBranchName('  فرع   العليا ')).toBe('فرع العليا')
    expect(cleanBranchName('x'.repeat(80))).toHaveLength(60)
    expect(cleanBranchLocation('  ')).toBeNull()
  })
})
