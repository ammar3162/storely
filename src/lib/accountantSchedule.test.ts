import { describe, it, expect } from 'vitest'
import { latestPeriod, duePeriod, isFullMonth, periodLabel } from './accountantSchedule'

const M = { frequency: 'monthly' as const, weekday: 0, month_day: 2 }
const W = { frequency: 'weekly' as const, weekday: 0, month_day: 1 }   // الأحد
const D = { frequency: 'daily' as const, weekday: 0, month_day: 1 }

describe('accountant schedule', () => {
  it('daily = yesterday', () => expect(latestPeriod(D, '2026-10-05')).toEqual({ start: '2026-10-04', end: '2026-10-04' }))
  it('weekly on Sunday = previous Sun..Sat', () => {
    expect(latestPeriod(W, '2026-10-04')).toEqual({ start: '2026-09-27', end: '2026-10-03' })   // الأحد نفسه
    expect(latestPeriod(W, '2026-10-07')).toEqual({ start: '2026-09-27', end: '2026-10-03' })   // الأربعاء بعده
  })
  it('monthly on the 2nd = previous full month', () => {
    expect(latestPeriod(M, '2026-10-02')).toEqual({ start: '2026-09-01', end: '2026-09-30' })
    expect(latestPeriod(M, '2026-10-01')).toEqual({ start: '2026-08-01', end: '2026-08-31' })   // قبل الموعد
    expect(latestPeriod(M, '2026-01-05')).toEqual({ start: '2025-12-01', end: '2025-12-31' })   // بداية السنة
    expect(latestPeriod({ ...M, month_day: 1 }, '2026-03-01')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })
  it('never sends the same period twice', () => {
    expect(duePeriod({ ...M, last_period_end: '2026-09-30' }, '2026-10-20')).toBeNull()
    expect(duePeriod({ ...M, last_period_end: '2026-08-31' }, '2026-10-02')).toEqual({ start: '2026-09-01', end: '2026-09-30' })
    expect(duePeriod({ ...D, last_period_end: '2026-10-04' }, '2026-10-05')).toBeNull()
    expect(duePeriod({ ...D, last_period_end: '2026-10-04' }, '2026-10-06')).toEqual({ start: '2026-10-05', end: '2026-10-05' })
  })
  it('labels', () => {
    expect(isFullMonth({ start: '2026-09-01', end: '2026-09-30' })).toBe(true)
    expect(isFullMonth({ start: '2026-09-27', end: '2026-10-03' })).toBe(false)
    expect(periodLabel({ start: '2026-09-01', end: '2026-09-30' })).toBe('سبتمبر 2026')
    expect(periodLabel({ start: '2026-09-27', end: '2026-10-03' })).toBe('27 سبتمبر – 3 أكتوبر 2026')
    expect(periodLabel({ start: '2026-10-04', end: '2026-10-04' })).toBe('4 أكتوبر 2026')
  })
})

describe('next send', () => {
  const at = (iso: string) => Date.parse(iso)
  it('monthly: next is the configured day with the previous month', async () => {
    const { nextSend } = await import('./accountantSchedule')
    expect(nextSend(M, '2026-09-30', at('2026-10-05T10:00:00+03:00'))).toEqual({ date: '2026-11-02', period: { start: '2026-10-01', end: '2026-10-31' } })
  })
  it('daily before 8am is today, after 8am is tomorrow', async () => {
    const { nextSend } = await import('./accountantSchedule')
    expect(nextSend(D, '2026-10-03', at('2026-10-05T07:00:00+03:00')).date).toBe('2026-10-05')
    expect(nextSend(D, '2026-10-04', at('2026-10-05T09:00:00+03:00')).date).toBe('2026-10-06')
  })
  it('weekly Sunday', async () => {
    const { nextSend } = await import('./accountantSchedule')
    expect(nextSend(W, '2026-10-03', at('2026-10-05T10:00:00+03:00'))).toEqual({ date: '2026-10-11', period: { start: '2026-10-04', end: '2026-10-10' } })
  })
})

describe('owner-chosen send hour and send-now periods', () => {
  it('before the send hour, today does not count yet', async () => {
    const { scheduleToday, duePeriod } = await import('./accountantSchedule')
    const W8pm = { ...W, send_hour: 20 }
    const sun3pm = Date.parse('2026-10-04T15:00:00+03:00'), sun9pm = Date.parse('2026-10-04T21:00:00+03:00')
    expect(scheduleToday(W8pm, sun3pm)).toBe('2026-10-03')
    expect(duePeriod({ ...W8pm, last_period_end: '2026-09-26' }, scheduleToday(W8pm, sun3pm))).toBeNull()
    expect(duePeriod({ ...W8pm, last_period_end: '2026-09-26' }, scheduleToday(W8pm, sun9pm))).toEqual({ start: '2026-09-27', end: '2026-10-03' })
  })
  it('next send respects the chosen hour', async () => {
    const { nextSend } = await import('./accountantSchedule')
    expect(nextSend({ ...D, send_hour: 22 }, '2026-10-03', Date.parse('2026-10-05T21:00:00+03:00')).date).toBe('2026-10-05')
    expect(nextSend({ ...D, send_hour: 22 }, '2026-10-03', Date.parse('2026-10-05T23:00:00+03:00')).date).toBe('2026-10-06')
  })
  it('manual periods', async () => {
    const { manualPeriod } = await import('./accountantSchedule')
    expect(manualPeriod('this_month', M, '2026-10-06')).toEqual({ start: '2026-10-01', end: '2026-10-05' })
    expect(manualPeriod('this_month', M, '2026-10-01')).toBeNull()
    expect(manualPeriod('last_month', M, '2026-10-06')).toEqual({ start: '2026-09-01', end: '2026-09-30' })
    expect(manualPeriod('last_week', M, '2026-10-06')).toEqual({ start: '2026-09-29', end: '2026-10-05' })
  })
})
