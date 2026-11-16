import { describe, it, expect } from 'vitest'
import { fixedExpenseAppliesTo } from './fixedExpenseMonth'

describe('fixedExpenseAppliesTo', () => {
  it('applies to creation month and after', () => {
    expect(fixedExpenseAppliesTo('2026-10-15T10:00:00Z', '2026-10-01')).toBe(true)
    expect(fixedExpenseAppliesTo('2026-10-15T10:00:00Z', '2026-11')).toBe(true)
  })
  it('does not apply to months before it was added', () => {
    expect(fixedExpenseAppliesTo('2026-10-15T10:00:00Z', '2026-09-01')).toBe(false)
  })
  it('uses Riyadh time at month edges', () => {
    // 30 سبتمبر 22:00 UTC = 1 أكتوبر 01:00 بالرياض
    expect(fixedExpenseAppliesTo('2026-09-30T22:00:00Z', '2026-09-01')).toBe(false)
  })
  it('missing date keeps old behaviour', () => {
    expect(fixedExpenseAppliesTo(null, '2020-01-01')).toBe(true)
  })
})
