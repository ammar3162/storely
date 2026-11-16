import { describe, it, expect } from 'vitest'
import { absenceDates, absenceSummary, leaveDaysInMonth, deductedAbsenceDates, absenceReason } from './absence'

// نوفمبر 2026: 1 نوفمبر يوم أحد. إجازة الموظف الجمعة (5)
const base = { month: '2026-11', lastDay: 30, today: '2026-11-08', cfg: { weekly_off_days: [5] }, leaves: [], compDates: [], started: null, until: null }

describe('absenceDates', () => {
  it('work days without check-in before today, skipping weekly off', () => {
    const worked = new Set(['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-05'])
    // 3 غياب، 6 جمعة (إجازة)، 7 غياب، 8 اليوم (ما ينحسب)
    expect(absenceDates({ ...base, workedDates: worked })).toEqual(['2026-11-03', '2026-11-07'])
  })
  it('approved leave and comp day are not absence', () => {
    const worked = new Set(['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-05'])
    expect(absenceDates({ ...base, workedDates: worked, leaves: [{ start_date: '2026-11-03', end_date: '2026-11-03' }], compDates: ['2026-11-07'] })).toEqual([])
  })
  it('no check-ins at all = attendance not used → no absence', () => {
    expect(absenceDates({ ...base, workedDates: new Set() })).toEqual([])
  })
  it('respects employment start and last day', () => {
    const worked = new Set(['2026-11-05'])
    expect(absenceDates({ ...base, workedDates: worked, started: '2026-11-04', until: '2026-11-05' })).toEqual(['2026-11-04'])
  })
  it('monthly allowance absorbs the first missed days', () => {
    const worked = new Set(['2026-11-01', '2026-11-02', '2026-11-05', '2026-11-06'])
    // غاب 3 و4 و7 — رصيده يومين بالشهر → 3 و4 إجازة، 7 غياب
    expect(absenceDates({ ...base, cfg: { days_off_mode: 'monthly', monthly_off_days: 2 }, workedDates: worked })).toEqual(['2026-11-07'])
  })
})

describe('absenceSummary', () => {
  it('daily wage = full wage / 30, excludes already deducted days', () => {
    const s = absenceSummary(['2026-11-03', '2026-11-07'], 4500, new Set(['2026-11-03']))
    expect(s.dailyWage).toBe(150)
    expect(s.pendingDates).toEqual(['2026-11-07'])
    expect(s.pendingAmount).toBe(150)
  })
  it('reason round-trips the dates', () => {
    const r = absenceReason(['2026-11-03', '2026-11-07'])
    expect([...deductedAbsenceDates([r, 'خصم آخر 2026-11-09'])]).toEqual(['2026-11-03', '2026-11-07'])
  })
})

describe('leaveDaysInMonth', () => {
  it('leave spanning two months is split', () => {
    const l = [{ start_date: '2026-10-28', end_date: '2026-11-06', days_count: 10 }]
    expect(leaveDaysInMonth(l, '2026-10-01', '2026-10-31')).toBe(4)
    expect(leaveDaysInMonth(l, '2026-11-01', '2026-11-30')).toBe(6)
  })
  it('leave inside the month uses days_count', () => {
    expect(leaveDaysInMonth([{ start_date: '2026-11-10', end_date: '2026-11-14', days_count: 4 }], '2026-11-01', '2026-11-30')).toBe(4)
  })
})
