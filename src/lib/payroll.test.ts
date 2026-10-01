import { describe, it, expect } from 'vitest'
import { overtimeMinutes, overtimeHourRate } from './payroll'

// أوقات الانصراف بتوقيت السعودية (+03:00)
const at = (t: string) => `2026-10-05T${t}:00+03:00`
const day = { start_time: '08:00', end_time: '16:00', is_24h: false }
const night = { start_time: '18:00', end_time: '02:00', is_24h: false }

describe('overtimeMinutes', () => {
  it('counts minutes after a day shift ends', () => {
    expect(overtimeMinutes(at('17:30'), day)).toBe(90)
  })
  it('ignores leaving on time or a few minutes late', () => {
    expect(overtimeMinutes(at('15:55'), day)).toBe(0)
    expect(overtimeMinutes(at('16:10'), day)).toBe(0)
  })
  it('handles a day shift checkout after midnight', () => {
    const late = { start_time: '15:00', end_time: '23:00', is_24h: false }
    expect(overtimeMinutes(at('00:30'), late)).toBe(90)
  })
  it('handles overnight shifts', () => {
    expect(overtimeMinutes(at('03:00'), night)).toBe(60)
    expect(overtimeMinutes(at('01:00'), night)).toBe(0)
  })
  it('caps a day at 6 hours and skips 24h / no shift', () => {
    expect(overtimeMinutes(at('23:59'), day)).toBe(360)
    expect(overtimeMinutes(at('20:00'), { start_time: null, end_time: null, is_24h: true })).toBe(0)
    expect(overtimeMinutes(at('20:00'), null)).toBe(0)
  })
})

describe('overtimeHourRate', () => {
  it('is 1.5x the basic hourly wage (basic / 240)', () => {
    expect(overtimeHourRate(4800)).toBe(30)
  })
})
