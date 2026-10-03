import { describe, it, expect } from 'vitest'
import { weekdayOf, workDateFor, offReason, weeklyOffCount, normalizeOffDays, monthlyOffDates, isMonthlyExtraDay, isScheduledOff, scheduledOffDates } from './daysOff'

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

describe('days-off patterns', () => {
  it('alternate weeks: Tuesday every other week from the anchor week', () => {
    const cfg = { days_off_mode: 'biweekly', weekly_off_days: [2], biweekly_anchor: '2026-10-06' }   // ثلاثاء 6 أكتوبر
    expect(scheduledOffDates('2026-10', cfg)).toEqual(['2026-10-06', '2026-10-20'])
    expect(isScheduledOff('2026-10-13', cfg)).toBe(false)
    expect(isScheduledOff('2026-11-03', cfg)).toBe(true)
  })
  it('any day in the anchor week sets the cycle', () => {
    const cfg = { days_off_mode: 'biweekly', weekly_off_days: [2], biweekly_anchor: '2026-10-08' }   // خميس نفس الأسبوع
    expect(scheduledOffDates('2026-10', cfg)).toEqual(['2026-10-06', '2026-10-20'])
  })
  it('owner-picked dates', () => {
    const cfg = { days_off_mode: 'dates', off_dates: ['2026-10-09', '2026-10-23'] }
    expect(scheduledOffDates('2026-10', cfg)).toEqual(['2026-10-09', '2026-10-23'])
    expect(offReason('2026-10-09', cfg)).toBe('weekly')
  })
  it('weekly and legacy array still work', () => {
    expect(scheduledOffDates('2026-10', [5]).length).toBe(5)
    expect(weeklyOffCount('2026-10', { days_off_mode: 'monthly', monthly_off_days: 4 } as any)).toBe(4)
  })
})
