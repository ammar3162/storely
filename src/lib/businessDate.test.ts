import { describe, it, expect } from 'vitest'
import { computeBusinessDate, normalizeStartHour } from './businessDate'

const at = (d: string, t: string) => new Date(`${d}T${t}:00+03:00`)

describe('computeBusinessDate', () => {
  it('counts a close before the start hour on the previous day', () => {
    expect(computeBusinessDate({ now: at('2026-10-04', '01:30'), startHour: 4 })).toBe('2026-10-03')
    expect(computeBusinessDate({ now: at('2026-10-04', '03:59'), startHour: 4 })).toBe('2026-10-03')
  })
  it('counts a close at or after the start hour on the same day', () => {
    expect(computeBusinessDate({ now: at('2026-10-04', '04:00'), startHour: 4 })).toBe('2026-10-04')
    expect(computeBusinessDate({ now: at('2026-10-04', '23:30'), startHour: 4 })).toBe('2026-10-04')
  })
  it('start hour 0 means plain calendar days', () => {
    expect(computeBusinessDate({ now: at('2026-10-04', '00:10'), startHour: 0 })).toBe('2026-10-04')
  })
  it('defaults to 4 AM and handles year boundaries', () => {
    expect(computeBusinessDate({ now: at('2027-01-01', '02:00') })).toBe('2026-12-31')
  })
  it('rejects out-of-range hours', () => {
    expect(normalizeStartHour(11)).toBe(4)
    expect(normalizeStartHour('6')).toBe(6)
    expect(normalizeStartHour(2.5)).toBe(4)
  })
})
