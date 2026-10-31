import { describe, it, expect } from 'vitest'
import { mergeSmartOrder } from './smartOrder'

// نفس شكل ردود الـ APIs الحقيقية (من حساب تجريبي)
const forecast = [
  { name: 'لبنه', unit: 'علبة', currentQty: 1, dailyRate: 0.6, daysLeft: 1, status: 'critical' },
  { name: 'باستا', unit: 'كرتون', currentQty: 4, dailyRate: 0.5, daysLeft: 6, status: 'critical' },
  { name: 'water', unit: 'cartoon', currentQty: 5, dailyRate: 0.05, daysLeft: 93, status: 'safe' },
]
const timing = [{ id: 'p-pasta', name: 'باستا', unit: 'كرتون', currentQty: 4, dailyRate: 0.5, avgLeadTimeDays: 3, suggestedOrderInDays: -5, urgency: 'now' }]
const buy = [
  { name: 'حليب المراعي', unit: 'حبة', currentQty: 1, dailyRate: 3.3, weeklyNeed: 23, suggestedQty: 57, urgency: 'urgent' },
  { name: 'لبنه', unit: 'علبة', currentQty: 1, dailyRate: 0.6, weeklyNeed: 4, suggestedQty: 9, urgency: 'urgent' },
]
const reorder = [{ id: 'p-labneh', name: 'لبنه', unit: 'علبة', currentQty: 1, currentReorderPoint: 2, suggestedReorderPoint: 1 }]

describe('mergeSmartOrder', () => {
  const { rows, safeCount } = mergeSmartOrder({ forecast, timing, buy, reorder })
  it('one row per product, combining all four tools', () => {
    const l = rows.find(r => r.name === 'لبنه')!
    expect(l).toMatchObject({ daysLeft: 1, suggestedQty: 9, weeklyNeed: 4, reorder: { current: 2, suggested: 1 }, productId: 'p-labneh', urgent: true })
    const p = rows.find(r => r.name === 'باستا')!
    expect(p).toMatchObject({ daysLeft: 6, orderInDays: -5, leadDays: 3, urgent: true, productId: 'p-pasta' })
  })
  it('hides safe products and counts them', () => {
    expect(rows.map(r => r.name)).not.toContain('water')
    expect(safeCount).toBe(1)
  })
  it('urgent and soonest first', () => {
    expect(rows.map(r => r.name)).toEqual(['باستا', 'لبنه', 'حليب المراعي'])
  })
  it('handles empty / missing inputs', () => {
    expect(mergeSmartOrder({})).toEqual({ rows: [], safeCount: 0 })
    expect(mergeSmartOrder({ forecast: [{ name: '' }] as any }).rows).toEqual([])
  })
})
