import { describe, it, expect } from 'vitest'
import { attendanceState, lateMinutesAt, activeShift, canCheckOutAt, shiftEndForCheckIn } from './attendanceState'

const at = (d: string, t: string) => `${d}T${t}:00+03:00`
const now = (d: string, t: string) => new Date(at(d, t))
const morning = { start_time: '08:00', end_time: '16:00', is_24h: false }
const evening = { start_time: '18:00', end_time: '23:00', is_24h: false }
const night = { start_time: '22:00', end_time: '06:00', is_24h: false }

describe('attendanceState', () => {
  it('first check-in of the day is allowed', () => {
    const s = attendanceState({ now: now('2026-10-04', '07:50'), events: [], shift: morning })
    expect(s).toMatchObject({ canCheckIn: true, checkedIn: false, canCheckOut: false })
  })
  it('while checked in: no second check-in, check-out allowed', () => {
    const s = attendanceState({ now: now('2026-10-04', '12:00'), events: [{ type: 'check_in', recorded_at: at('2026-10-04', '08:05') }], shift: morning })
    expect(s).toMatchObject({ canCheckIn: false, checkedIn: true, canCheckOut: true })
  })
  it('after check-out on the same shift: closed for the day', () => {
    const events = [{ type: 'check_in', recorded_at: at('2026-10-04', '08:00') }, { type: 'check_out', recorded_at: at('2026-10-04', '16:05') }]
    const s = attendanceState({ now: now('2026-10-04', '17:30'), events, shift: morning })
    expect(s.canCheckIn).toBe(false)
    expect(s.sessionOut?.recorded_at).toBe(at('2026-10-04', '16:05'))
  })
  it('shift changed to evening after check-out: reopens one hour before the new start', () => {
    const events = [{ type: 'check_in', recorded_at: at('2026-10-04', '08:00') }, { type: 'check_out', recorded_at: at('2026-10-04', '16:05') }]
    expect(attendanceState({ now: now('2026-10-04', '16:30'), events, shift: evening }).canCheckIn).toBe(false)
    expect(attendanceState({ now: now('2026-10-04', '17:00'), events, shift: evening }).canCheckIn).toBe(true)
  })
  it('next day reopens for the same shift', () => {
    const events = [{ type: 'check_in', recorded_at: at('2026-10-04', '08:00') }, { type: 'check_out', recorded_at: at('2026-10-04', '16:05') }]
    expect(attendanceState({ now: now('2026-10-05', '07:10'), events, shift: morning }).canCheckIn).toBe(true)
  })
  it('night shift: checked in at 22:00, still checked in after midnight', () => {
    const s = attendanceState({ now: now('2026-10-05', '02:00'), events: [{ type: 'check_in', recorded_at: at('2026-10-04', '22:00') }], shift: night })
    expect(s.checkedIn).toBe(true)
  })
  it('a forgotten check-in older than 20h does not block forever', () => {
    const s = attendanceState({ now: now('2026-10-05', '07:30'), events: [{ type: 'check_in', recorded_at: at('2026-10-04', '08:00') }], shift: morning })
    expect(s.canCheckIn).toBe(true)
  })
  it('no shift: one session per Saudi calendar day', () => {
    const events = [{ type: 'check_in', recorded_at: at('2026-10-04', '09:00') }, { type: 'check_out', recorded_at: at('2026-10-04', '17:00') }]
    expect(attendanceState({ now: now('2026-10-04', '20:00'), events, shift: null }).canCheckIn).toBe(false)
    expect(attendanceState({ now: now('2026-10-05', '00:30'), events, shift: null }).canCheckIn).toBe(true)
  })
})

describe('lateMinutesAt', () => {
  it('counts lateness from the shift start', () => {
    expect(lateMinutesAt(Date.parse(at('2026-10-04', '08:25')), morning)).toBe(25)
    expect(lateMinutesAt(Date.parse(at('2026-10-04', '07:50')), morning)).toBe(0)
  })
  it('handles a night shift check-in after midnight', () => {
    expect(lateMinutesAt(Date.parse(at('2026-10-05', '00:10')), night)).toBe(130)
  })
  it('no shift or 24h means no lateness', () => {
    expect(lateMinutesAt(Date.now(), null)).toBe(0)
    expect(lateMinutesAt(Date.now(), { start_time: null, end_time: null, is_24h: true })).toBe(0)
  })
})

describe('activeShift (shift change mid-session)', () => {
  const evening = { start_time: '18:00', end_time: '23:00', is_24h: false }
  it('keeps the shift the employee checked in on while still checked in', () => {
    const open = { type: 'check_in', recorded_at: at('2026-10-04', '08:00'), shift_start_time: '08:00:00', shift_end_time: '16:00:00', shift_is_24h: false }
    expect(activeShift(open, evening)).toEqual({ start_time: '08:00:00', end_time: '16:00:00', is_24h: false })
  })
  it('uses the new shift when not checked in, or for old records without a snapshot', () => {
    expect(activeShift(null, evening)).toBe(evening)
    expect(activeShift({ type: 'check_in', recorded_at: at('2026-10-04', '08:00'), shift_is_24h: null }, evening)).toBe(evening)
  })
  it('checked in without a shift stays without a shift', () => {
    expect(activeShift({ type: 'check_in', recorded_at: at('2026-10-04', '08:00'), shift_start_time: null, shift_is_24h: false }, evening)).toBeNull()
  })
})

describe('canCheckOutAt (early check-out block)', () => {
  const t = (d: string, h: string) => Date.parse(at(d, h))
  const lateNight = { start_time: '23:00', end_time: '06:00', is_24h: false }
  it('night shift: checked in 16 min early cannot check out until 06:00 next morning (production bug)', () => {
    const inAt = t('2026-10-02', '22:44')
    expect(canCheckOutAt(t('2026-10-02', '22:44'), inAt, lateNight)).toBe(false)
    expect(canCheckOutAt(t('2026-10-03', '05:59'), inAt, lateNight)).toBe(false)
    expect(canCheckOutAt(t('2026-10-03', '06:00'), inAt, lateNight)).toBe(true)
  })
  it('night shift: checked in after midnight still ends at 06:00 that morning', () => {
    expect(new Date(shiftEndForCheckIn(t('2026-10-03', '00:30'), lateNight)!).toISOString()).toBe(new Date(at('2026-10-03', '06:00')).toISOString())
  })
  it('evening shift crossing midnight (15:50 → 02:00)', () => {
    const eve = { start_time: '15:50', end_time: '02:00', is_24h: false }
    const inAt = t('2026-10-02', '16:24')
    expect(canCheckOutAt(t('2026-10-02', '23:00'), inAt, eve)).toBe(false)
    expect(canCheckOutAt(t('2026-10-03', '02:00'), inAt, eve)).toBe(true)
  })
  it('day shift and early arrival', () => {
    expect(canCheckOutAt(t('2026-10-04', '15:59'), t('2026-10-04', '07:30'), morning)).toBe(false)
    expect(canCheckOutAt(t('2026-10-04', '16:00'), t('2026-10-04', '07:30'), morning)).toBe(true)
  })
  it('no shift or 24h: any time', () => {
    expect(canCheckOutAt(t('2026-10-04', '09:00'), t('2026-10-04', '08:59'), null)).toBe(true)
    expect(canCheckOutAt(t('2026-10-04', '09:00'), t('2026-10-04', '08:59'), { start_time: null, end_time: null, is_24h: true })).toBe(true)
  })
})

describe('lateMinutesAt early arrival', () => {
  it('arriving two hours before a night shift is not late', () => {
    const lateNight = { start_time: '23:00', end_time: '06:00', is_24h: false }
    expect(lateMinutesAt(Date.parse(at('2026-10-02', '21:00')), lateNight)).toBe(0)
    expect(lateMinutesAt(Date.parse(at('2026-10-02', '23:20')), lateNight)).toBe(20)
  })
})
