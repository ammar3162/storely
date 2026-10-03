import { nearestShiftStart } from './attendanceState'
import type { Shift } from './payroll'

// إجازات الموظف: أيام ثابتة بالأسبوع يحددها المالك + الإجازات المعتمدة (طلبات الإجازة).
// يوم الإجازة ما ينحسب غياب، ولو حضّر فيه ينحسب «دوام يوم إجازة» (يوم إضافي) بدون تأخير.

export const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const RIYADH = 3 * 3600e3

export type ApprovedLeave = { start_date: string; end_date: string }
export type OffReason = 'weekly' | 'leave' | 'comp' | 'monthly'

/** يوم الأسبوع لتاريخ 'YYYY-MM-DD' (0 = الأحد) */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

/** تاريخ الدوام الحالي (بتوقيت السعودية): يوم بداية الشفت الأقرب — الشفت الليلي بعد 12 يتبع يومه */
export function workDateFor(nowMs: number, shift: Shift): string {
  const start = nearestShiftStart(nowMs, shift)
  return new Date((start ?? nowMs) + RIYADH).toISOString().slice(0, 10)
}

/** يوم إجازة ثابت؟ (إجازة معتمدة، يوم بديل عن يوم إضافي، أو يوم الإجازة الأسبوعي) — الرصيد الشهري المرن يُحسب لحاله */
export function offReason(date: string, weeklyOff: number[] | null | undefined, leaves: ApprovedLeave[] = [], compDates: string[] = []): OffReason | null {
  if (leaves.some(l => l.start_date <= date && date <= l.end_date)) return 'leave'
  if (compDates.includes(date)) return 'comp'
  if ((weeklyOff || []).includes(weekdayOf(date))) return 'weekly'
  return null
}

const monthDays = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

/** الرصيد الشهري المرن: أول N أيام ما داوم فيها (قبل اليوم، ومو إجازة ثانية) تنحسب إجازة، والباقي غياب */
export function monthlyOffDates(month: string, allowance: number, worked: Set<string>, today: string, otherOff: Set<string> = new Set()): Set<string> {
  const out = new Set<string>()
  if (allowance <= 0) return out
  for (const d of monthDays(month)) {
    if (d >= today) break                       // اليوم لسا ما خلص — ما نستهلك منه الرصيد
    if (worked.has(d) || otherOff.has(d)) continue
    out.add(d)
    if (out.size >= allowance) break
  }
  return out
}

/** رصيد شهري: الحضور اليوم يوم إضافي؟ — لو أيام دوامه قبل اليوم وصلت عدد أيام الدوام المطلوبة (أيام الشهر − الرصيد − إجازات ثانية) */
export function isMonthlyExtraDay(month: string, allowance: number, workedBeforeToday: number, otherOffCount = 0): boolean {
  if (allowance <= 0) return false
  const required = monthDays(month).length - allowance - otherOffCount
  return workedBeforeToday >= required
}

/** عدد أيام الإجازة الأسبوعية بشهر 'YYYY-MM' */
export function weeklyOffCount(month: string, weeklyOff: number[] | null | undefined): number {
  const set = new Set(weeklyOff || [])
  if (!set.size) return 0
  const [y, m] = month.split('-').map(Number)
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  let n = 0
  for (let d = 1; d <= days; d++) if (set.has(new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay())) n++
  return n
}

export function normalizeOffDays(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null
  const nums = v.map(Number)
  if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 6)) return null
  const out = [...new Set(nums)].sort((a, b) => a - b)
  return out.length <= 6 ? out : null   // لازم يبقى يوم دوام واحد على الأقل
}
