import { describe, it, expect } from 'vitest'
import { lockedFromError, closedMonths, isClosedMonth, monthName } from './periodLock'

describe('period lock helpers', () => {
  it('turns the DB error into a clear message', () => {
    expect(lockedFromError({ message: 'PERIOD_LOCKED:2026-09' })).toContain('سبتمبر 2026')
    expect(lockedFromError({ message: 'other' })).toBeNull()
  })
  it('only ended months can be locked', () => {
    const now = Date.parse('2026-10-06T12:00:00+03:00')
    expect(closedMonths(3, now)).toEqual(['2026-09-01', '2026-08-01', '2026-07-01'])
    expect(isClosedMonth('2026-09-01', now)).toBe(true)
    expect(isClosedMonth('2026-10-01', now)).toBe(false)
    expect(isClosedMonth('2026-09-15', now)).toBe(false)
    expect(monthName('2026-01-01')).toBe('يناير 2026')
  })
})
