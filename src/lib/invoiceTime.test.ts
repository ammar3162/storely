import { describe, it, expect } from 'vitest'
import { invoiceTimestamp } from './invoiceTime'

const now = new Date('2026-10-03T03:12:00+03:00')   // 3:12 الفجر بتوقيت السعودية

describe('invoiceTimestamp', () => {
  it("today's invoice takes the current time, never the future", () => {
    expect(invoiceTimestamp('2026-10-03', now)).toBe(now.toISOString())
  })
  it('a past invoice sits at noon of its date', () => {
    expect(invoiceTimestamp('2026-09-30', now)).toBe(new Date('2026-09-30T12:00:00+03:00').toISOString())
  })
  it('missing or future dates fall back to now', () => {
    expect(invoiceTimestamp(undefined, now)).toBe(now.toISOString())
    expect(invoiceTimestamp('2026-12-01', now)).toBe(now.toISOString())
  })
})
