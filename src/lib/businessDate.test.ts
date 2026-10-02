import { describe, it, expect } from 'vitest'
import { computeBusinessDate } from './businessDate'

const at = (d: string, t: string) => new Date(`${d}T${t}:00+03:00`)

describe('computeBusinessDate', () => {
  it('uses the cashier check-in date for a close after midnight', () => {
    expect(computeBusinessDate({ now: at('2026-10-03', '01:30'), lastCheckInIso: at('2026-10-02', '16:00').toISOString() })).toBe('2026-10-02')
  })
  it('ignores a check-in older than 18 hours', () => {
    expect(computeBusinessDate({ now: at('2026-10-03', '15:00'), lastCheckInIso: at('2026-10-02', '08:00').toISOString() })).toBe('2026-10-03')
  })
  it('with shop hours: anything before opening belongs to the previous day', () => {
    const hours = { openTime: '08:00', closeTime: '23:00' }
    expect(computeBusinessDate({ now: at('2026-10-03', '00:40'), ...hours })).toBe('2026-10-02')
    expect(computeBusinessDate({ now: at('2026-10-03', '23:10'), ...hours })).toBe('2026-10-03')
    // محل يقفل 2 الفجر بس الكاشير تأخر لـ 2:30
    expect(computeBusinessDate({ now: at('2026-10-03', '02:30'), openTime: '16:00', closeTime: '02:00' })).toBe('2026-10-02')
  })
  it('without shop hours: before 6 AM belongs to the previous day', () => {
    expect(computeBusinessDate({ now: at('2026-10-03', '03:00') })).toBe('2026-10-02')
    expect(computeBusinessDate({ now: at('2026-10-03', '06:00') })).toBe('2026-10-03')
    expect(computeBusinessDate({ now: at('2026-10-03', '22:00') })).toBe('2026-10-03')
  })
  it('handles month and year boundaries', () => {
    expect(computeBusinessDate({ now: at('2027-01-01', '01:00') })).toBe('2026-12-31')
  })
})
