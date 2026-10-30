import { describe, it, expect } from 'vitest'
import { manualCheckoutAt, manualCheckoutError } from './manualCheckout'

const at = (d: string, t: string) => Date.parse(`${d}T${t}:00+03:00`)
const iso = (d: string, t: string) => new Date(at(d, t)).toISOString()

describe('manualCheckoutAt', () => {
  it('same day when the time is after check-in', () => {
    expect(manualCheckoutAt(iso('2026-10-30', '15:13'), '21:00')).toBe(at('2026-10-30', '21:00'))
  })
  it('next day for a night shift', () => {
    expect(manualCheckoutAt(iso('2026-10-30', '16:00'), '01:30')).toBe(at('2026-10-31', '01:30'))
  })
  it('check-in after midnight Saudi time stays on that day', () => {
    expect(manualCheckoutAt(iso('2026-10-31', '00:20'), '04:00')).toBe(at('2026-10-31', '04:00'))
  })
  it('rejects bad times', () => {
    expect(manualCheckoutAt(iso('2026-10-30', '15:13'), '25:00')).toBeNull()
    expect(manualCheckoutAt(iso('2026-10-30', '15:13'), '9:00')).toBeNull()
    expect(manualCheckoutAt('x', '21:00')).toBeNull()
  })
})

describe('manualCheckoutError', () => {
  const ci = iso('2026-10-30', '15:13')
  it('accepts a past time after check-in', () => {
    expect(manualCheckoutError(ci, at('2026-10-30', '21:00'), at('2026-10-30', '22:00'))).toBeNull()
  })
  it('rejects future, too long, or before check-in', () => {
    expect(manualCheckoutError(ci, at('2026-10-30', '23:00'), at('2026-10-30', '22:00'))).toMatch('المستقبل')
    expect(manualCheckoutError(ci, at('2026-10-31', '12:00'), at('2026-11-01', '00:00'))).toMatch('أطول')
    expect(manualCheckoutError(ci, at('2026-10-30', '15:00'), at('2026-10-30', '22:00'))).toMatch('بعد وقت الحضور')
  })
})
