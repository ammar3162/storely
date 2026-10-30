// شفتات حسب اليوم: لكل موظف شفت أساسي + شفت مختلف لأيام أسبوع معيّنة (مثل الجمعة) أو تواريخ محددة.
// الأولوية: التاريخ المحدد ← يوم الأسبوع ← الشفت الأساسي.
// «يوم الدوام» = يوم بداية الشفت، يعني الشفت الليلي بعد 12 يتبع اليوم اللي بدأ فيه.

import type { Shift } from './payroll'
import { weekdayOf } from './daysOff'
import { OPEN_BEFORE_START_MIN } from './attendanceState'

export type ShiftSchedule = {
  shift_id?: string | null
  weekday_shifts?: Record<string, string> | null
  date_shifts?: Record<string, string> | null
}

export const MAX_DATE_SHIFTS = 400

const RIYADH = 3 * 3600e3
const DAY = 24 * 3600e3
const toMin = (t: string) => { const [h, m] = String(t).slice(0, 5).split(':').map(Number); return h * 60 + m }
const saudiDate = (ms: number) => new Date(ms + RIYADH).toISOString().slice(0, 10)
const dayStart = (date: string) => Date.parse(`${date}T00:00:00+03:00`)

/** معرّف شفت الموظف لتاريخ معيّن (YYYY-MM-DD) */
export function shiftIdForDate(s: ShiftSchedule, date: string): string | null {
  return s.date_shifts?.[date] || s.weekday_shifts?.[String(weekdayOf(date))] || s.shift_id || null
}

/** كل الشفتات اللي يستخدمها الموظف (عشان نجيبها من القاعدة بطلب واحد) */
export function scheduleShiftIds(s: ShiftSchedule): string[] {
  return [...new Set([s.shift_id, ...Object.values(s.weekday_shifts || {}), ...Object.values(s.date_shifts || {})].filter(Boolean) as string[])]
}

type Candidate = { date: string; shift: Shift; start: number; end: number }

function candidate(s: ShiftSchedule, date: string, shiftOf: (id: string) => Shift): Candidate {
  const id = shiftIdForDate(s, date)
  const shift = id ? shiftOf(id) : null
  const midnight = dayStart(date)
  if (!shift || shift.is_24h || !shift.start_time || !shift.end_time) return { date, shift, start: midnight, end: midnight + DAY }
  const S = toMin(shift.start_time), E = toMin(shift.end_time)
  const start = midnight + S * 60e3
  return { date, shift, start, end: start + (E > S ? E - S : 1440 - S + E) * 60e3 }
}

/**
 * شفت الموظف لحظة معيّنة، من شفتات أمس واليوم وبكرة:
 * - shift/date/startMs: الشفت اللي الموظف داخله الحين (من قبل بدايته بساعة لين نهايته)، وإلا الأقرب بدايةً
 *   — هذا اللي ينحسب عليه التأخير ويتثبّت بالحضور.
 * - dutyStartMs: آخر بداية دوام ≤ الآن + ساعة — يقرر «دوام جديد» بعد الانصراف (null = بدون شفت محدد).
 */
export function resolveShiftAt(nowMs: number, s: ShiftSchedule, shiftOf: (id: string) => Shift) {
  const today = saudiDate(nowMs)
  const cands = [-1, 0, 1].map(k => candidate(s, saudiDate(dayStart(today) + k * DAY + 12 * 3600e3), shiftOf))

  const timed = (c?: Candidate) => !!c?.shift && !c.shift.is_24h && !!c.shift.start_time
  // الشفت المحدد يفتح قبل بدايته بساعة، واليوم بدون شفت (أو 24 ساعة) يبدأ من 12 الليل بالضبط
  const opensAt = (c: Candidate) => timed(c) ? c.start - OPEN_BEFORE_START_MIN * 60e3 : c.start
  const inWindow = cands.filter(c => opensAt(c) <= nowMs && nowMs < c.end)
  const chosen = inWindow.length
    ? inWindow[inWindow.length - 1]
    : cands.reduce((best, c) => Math.abs(c.start - nowMs) < Math.abs(best.start - nowMs) ? c : best)

  const opened = cands.filter(c => opensAt(c) <= nowMs)
  const duty = opened[opened.length - 1]
  // بدون أي شفت محدد = نفس القاعدة القديمة (يوم جديد بتوقيت السعودية)
  const anyTimed = cands.some(timed)

  return {
    shift: chosen.shift,
    date: chosen.date,
    startMs: timed(chosen) ? chosen.start : null,
    dutyStartMs: anyTimed && duty ? duty.start : null,
  }
}

/** دقائق التأخير عن بداية شفت ذاك الدوام — الحضور قبل البداية = صفر */
export function lateMinutesFor(nowMs: number, startMs: number | null): number {
  return startMs == null ? 0 : Math.max(0, Math.floor((nowMs - startMs) / 60e3))
}

/** تنظيف مدخلات الواجهة. يرجع null لو فيها شي غير صالح */
export function normalizeWeekdayShifts(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const out: Record<string, string> = {}
  for (const [k, id] of Object.entries(v as Record<string, unknown>)) {
    if (!/^[0-6]$/.test(k)) return null
    if (id == null || id === '') continue
    if (typeof id !== 'string') return null
    out[k] = id
  }
  return out
}

export function normalizeDateShifts(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const out: Record<string, string> = {}
  for (const [k, id] of Object.entries(v as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || Number.isNaN(Date.parse(`${k}T12:00:00Z`))) return null
    if (id == null || id === '') continue
    if (typeof id !== 'string') return null
    out[k] = id
  }
  if (Object.keys(out).length > MAX_DATE_SHIFTS) return null
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

/** يشيل شفت محذوف من جدول الموظف. يرجع null لو ما تغيّر شي */
export function withoutShift(s: ShiftSchedule, shiftId: string) {
  const strip = (o?: Record<string, string> | null) => Object.fromEntries(Object.entries(o || {}).filter(([, id]) => id !== shiftId))
  const w = strip(s.weekday_shifts), d = strip(s.date_shifts)
  const changed = Object.keys(w).length !== Object.keys(s.weekday_shifts || {}).length || Object.keys(d).length !== Object.keys(s.date_shifts || {}).length
  return changed ? { weekday_shifts: w, date_shifts: d } : null
}
