import { describe, it, expect } from 'vitest'
import { shiftIdForDate, scheduleShiftIds, resolveShiftAt, lateMinutesFor, normalizeWeekdayShifts, normalizeDateShifts, withoutShift } from './shiftSchedule'
import { attendanceState, currentShiftStart, lateMinutesAt } from './attendanceState'

const at = (d: string, t: string) => Date.parse(`${d}T${t}:00+03:00`)
const SHIFTS: Record<string, any> = {
  eve: { start_time: '16:00', end_time: '01:00', is_24h: false },     // كل الأيام 4 العصر → 1 الليل
  fri: { start_time: '18:00', end_time: '02:00', is_24h: false },     // الجمعة 6 المغرب → 2 الليل
  morning: { start_time: '08:00', end_time: '16:00', is_24h: false },
  allday: { start_time: '00:00', end_time: '23:59', is_24h: true },
}
const of = (id: string) => SHIFTS[id] || null
// 2026-11-06 جمعة، 2026-11-05 خميس، 2026-11-07 سبت
const staff = { shift_id: 'eve', weekday_shifts: { '5': 'fri' }, date_shifts: { '2026-11-12': 'morning' } }

describe('shiftIdForDate', () => {
  it('date beats weekday beats default', () => {
    expect(shiftIdForDate(staff, '2026-11-05')).toBe('eve')
    expect(shiftIdForDate(staff, '2026-11-06')).toBe('fri')
    expect(shiftIdForDate(staff, '2026-11-12')).toBe('morning')
    expect(shiftIdForDate({ shift_id: null }, '2026-11-06')).toBeNull()
  })
  it('collects all used shift ids once', () => {
    expect(scheduleShiftIds({ ...staff, date_shifts: { '2026-11-12': 'morning', '2026-11-13': 'eve' } }).sort()).toEqual(['eve', 'fri', 'morning'])
  })
})

describe('resolveShiftAt', () => {
  it('Friday uses the Friday shift and late counts from 18:00', () => {
    const r = resolveShiftAt(at('2026-11-06', '18:20'), staff, of)
    expect(r.shift).toBe(SHIFTS.fri)
    expect(r.date).toBe('2026-11-06')
    expect(lateMinutesFor(at('2026-11-06', '18:20'), r.startMs)).toBe(20)
  })
  it('Thursday night after midnight still belongs to Thursday', () => {
    const r = resolveShiftAt(at('2026-11-06', '00:30'), staff, of)
    expect(r.shift).toBe(SHIFTS.eve)
    expect(r.date).toBe('2026-11-05')
  })
  it('Friday night after midnight belongs to Friday (until 02:00)', () => {
    const r = resolveShiftAt(at('2026-11-07', '01:30'), staff, of)
    expect(r.shift).toBe(SHIFTS.fri)
    expect(r.date).toBe('2026-11-06')
  })
  it('Friday morning shows the upcoming Friday shift, not Thursday', () => {
    const r = resolveShiftAt(at('2026-11-06', '12:00'), staff, of)
    expect(r.shift).toBe(SHIFTS.fri)
    expect(lateMinutesFor(at('2026-11-06', '12:00'), r.startMs)).toBe(0)
  })
  it('a specific date overrides the weekday', () => {
    const r = resolveShiftAt(at('2026-11-12', '08:10'), staff, of)
    expect(r.shift).toBe(SHIFTS.morning)
    expect(lateMinutesFor(at('2026-11-12', '08:10'), r.startMs)).toBe(10)
  })
  it('a 24h day has no lateness', () => {
    const r = resolveShiftAt(at('2026-11-06', '10:00'), { shift_id: 'allday' }, of)
    expect(r.shift).toBe(SHIFTS.allday)
    expect(r.startMs).toBeNull()
    expect(r.dutyStartMs).toBeNull()
  })
  it('late evening without a shift stays on the same day', () => {
    expect(resolveShiftAt(at('2026-11-06', '23:30'), { shift_id: null }, of).date).toBe('2026-11-06')
    expect(resolveShiftAt(at('2026-11-06', '23:30'), { shift_id: 'allday' }, of).date).toBe('2026-11-06')
  })
  it('no shift at all keeps the old day rule', () => {
    const r = resolveShiftAt(at('2026-11-06', '10:00'), { shift_id: null }, of)
    expect(r.shift).toBeNull()
    expect(r.dutyStartMs).toBeNull()
  })

  it('a single shift matches the old behaviour exactly', () => {
    const one = { shift_id: 'eve' }
    for (const [d, t] of [['2026-11-06', '00:30'], ['2026-11-06', '10:00'], ['2026-11-06', '15:10'], ['2026-11-06', '16:45'], ['2026-11-06', '23:59'], ['2026-11-07', '03:00']]) {
      const ms = at(d, t)
      const r = resolveShiftAt(ms, one, of)
      expect(r.shift).toBe(SHIFTS.eve)
      expect(r.dutyStartMs).toBe(currentShiftStart(ms, SHIFTS.eve))
      expect(lateMinutesFor(ms, r.startMs)).toBe(lateMinutesAt(ms, SHIFTS.eve))
    }
  })

  it('after Thursday checkout, Friday check-in opens one hour before 18:00', () => {
    const events = [
      { type: 'check_out', recorded_at: new Date(at('2026-11-06', '01:05')).toISOString() },
      { type: 'check_in', recorded_at: new Date(at('2026-11-05', '16:00')).toISOString() },
    ]
    const state = (d: string, t: string) => {
      const r = resolveShiftAt(at(d, t), staff, of)
      return attendanceState({ now: new Date(at(d, t)), events, shift: r.shift, shiftStartMs: r.dutyStartMs })
    }
    expect(state('2026-11-06', '16:30').canCheckIn).toBe(false)   // 4 العصر عادةً — بس الجمعة شفته 6
    expect(state('2026-11-06', '17:00').canCheckIn).toBe(true)
  })
})

describe('normalize', () => {
  it('weekday map', () => {
    expect(normalizeWeekdayShifts({ '5': 'fri', '1': '' })).toEqual({ '5': 'fri' })
    expect(normalizeWeekdayShifts({ '7': 'x' })).toBeNull()
    expect(normalizeWeekdayShifts([])).toBeNull()
  })
  it('date map', () => {
    expect(normalizeDateShifts({ '2026-11-12': 'm', '2026-11-01': 'e' })).toEqual({ '2026-11-01': 'e', '2026-11-12': 'm' })
    expect(normalizeDateShifts({ '2026-13-40': 'm' })).toBeNull()
    expect(normalizeDateShifts({ 'x': 'm' })).toBeNull()
  })
  it('removing a deleted shift', () => {
    expect(withoutShift(staff, 'fri')).toEqual({ weekday_shifts: {}, date_shifts: { '2026-11-12': 'morning' } })
    expect(withoutShift(staff, 'nope')).toBeNull()
  })
})
