import { describe, it, expect } from 'vitest'
import { weekdayOf, workDateFor, offReason, weeklyOffCount, normalizeOffDays, monthlyOffDates, isMonthlyExtraDay } from './daysOff'

describe('days off', () => {
  it('weekday of a Saudi date', () => {
    expect(weekdayOf('2026-10-02')).toBe(5)   // جمعة
    expect(weekdayOf('2026-10-04')).toBe(0)   // أحد
  })
  it('night shift after midnight belongs to the day it started', () => {
    const night = { start_time: '22:00', end_time: '06:00', is_24h: false }
    expect(workDateFor(Date.parse('2026-10-03T00:30:00+03:00'), night)).toBe('2026-10-02')
    expect(workDateFor(Date.parse('2026-10-03T10:00:00+03:00'), null)).toBe('2026-10-03')
  })
  it('weekly day off and approved leave', () => {
    expect(offReason('2026-10-02', [5])).toBe('weekly')
    expect(offReason('2026-10-03', [5])).toBeNull()
    expect(offReason('2026-10-03', [5], [{ start_date: '2026-10-03', end_date: '2026-10-05' }])).toBe('leave')
  })
  it('counts days off in a month', () => {
    expect(weeklyOffCount('2026-10', [5])).toBe(5)      // أكتوبر 2026 فيه 5 جمع
    expect(weeklyOffCount('2026-10', [5, 6])).toBe(10)
    expect(weeklyOffCount('2026-10', [])).toBe(0)
  })
  it('validates input', () => {
    expect(normalizeOffDays([5, 6])).toEqual([5, 6])
    expect(normalizeOffDays([7])).toBeNull()
    expect(normalizeOffDays('5')).toBeNull()
    expect(normalizeOffDays([])).toEqual([])
  })
})

describe('monthly flexible allowance', () => {
  it('first N missed past days are days off, the rest absences', () => {
    const worked = new Set(['2026-10-01', '2026-10-03', '2026-10-04'])
    const off = monthlyOffDates('2026-10', 2, worked, '2026-10-08')
    expect([...off]).toEqual(['2026-10-02', '2026-10-05'])   // 06 و07 غياب
  })
  it('does not consume today or future days', () => {
    expect([...monthlyOffDates('2026-10', 4, new Set(), '2026-10-02')]).toEqual(['2026-10-01'])
  })
  it('extra day once required working days are done', () => {
    // أكتوبر 31 يوم، رصيد 4 ← المطلوب 27 يوم دوام
    expect(isMonthlyExtraDay('2026-10', 4, 26)).toBe(false)
    expect(isMonthlyExtraDay('2026-10', 4, 27)).toBe(true)
    expect(isMonthlyExtraDay('2026-10', 0, 30)).toBe(false)
  })
  it('compensation day counts as off', () => {
    expect(offReason('2026-10-09', [], [], ['2026-10-09'])).toBe('comp')
  })
})
