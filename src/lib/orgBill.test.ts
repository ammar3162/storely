import { describe, it, expect } from 'vitest'
import { computeOrgRevenue } from './orgBill'

const future = new Date(Date.now() + 10 * 86400000).toISOString()
const past = new Date(Date.now() - 86400000).toISOString()
const addons = [
  { id: 'a1', name: 'الحضور', slug: 'attendance', monthly_price: 39 },
  { id: 'a2', name: 'فرع إضافي', slug: 'extra_branch', monthly_price: 79 },
]

describe('computeOrgRevenue', () => {
  it('monthly: plan + active add-ons (expired ones ignored)', () => {
    const r = computeOrgRevenue([{ id: 'o1', plan: 'basic' }], addons, [
      { org_id: 'o1', addon_id: 'a1', status: 'active', expires_at: future },
      { org_id: 'o1', addon_id: 'a2', status: 'active', expires_at: past },
    ])
    expect(r.o1).toEqual({ total: 99 + 39, plan: 99, addons: 39, discount: 0 })
  })

  it('applies the admin discount', () => {
    const r = computeOrgRevenue([{ id: 'o1', plan: 'basic', discount_type: 'percent', discount_value: 50, discount_note: null, discount_until: null }], addons, [
      { org_id: 'o1', addon_id: 'a1', status: 'active', expires_at: future },
    ])
    expect(r.o1.total).toBe(69)
    expect(r.o1.discount).toBe(69)
    expect(r.o1.plan + r.o1.addons - r.o1.discount).toBe(r.o1.total)
  })

  it('yearly orgs count as their monthly equivalent', () => {
    const r = computeOrgRevenue([{ id: 'o1', plan: 'pro', billing_cycle: 'yearly' }], addons, [])
    expect(r.o1.total).toBe(Math.round(2390 / 12))
  })

  it('other orgs’ add-ons are not counted', () => {
    const r = computeOrgRevenue([{ id: 'o1', plan: 'basic' }, { id: 'o2', plan: 'basic' }], addons, [
      { org_id: 'o2', addon_id: 'a1', status: 'active', expires_at: future },
    ])
    expect(r.o1.total).toBe(99)
    expect(r.o2.total).toBe(138)
  })
})
