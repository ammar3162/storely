import { describe, it, expect } from 'vitest'
import { attendanceState, lateMinutesAt } from './attendanceState'

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
