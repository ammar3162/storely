import { nearestShiftStart } from './attendanceState'
import type { Shift } from './payroll'

// إجازات الموظف: أيام ثابتة بالأسبوع يحددها المالك + الإجازات المعتمدة (طلبات الإجازة).
// يوم الإجازة ما ينحسب غياب، ولو حضّر فيه ينحسب «دوام يوم إجازة» (يوم إضافي) بدون تأخير.

export const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const RIYADH = 3 * 3600e3

export type ApprovedLeave = { start_date: string; end_date: string }
export type OffReason = 'weekly' | 'leave'

/** يوم الأسبوع لتاريخ 'YYYY-MM-DD' (0 = الأحد) */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

/** تاريخ الدوام الحالي (بتوقيت السعودية): يوم بداية الشفت الأقرب — الشفت الليلي بعد 12 يتبع يومه */
export function workDateFor(nowMs: number, shift: Shift): string {
  const start = nearestShiftStart(nowMs, shift)
  return new Date((start ?? nowMs) + RIYADH).toISOString().slice(0, 10)
}

export function offReason(date: string, weeklyOff: number[] | null | undefined, leaves: ApprovedLeave[] = []): OffReason | null {
  if (leaves.some(l => l.start_date <= date && date <= l.end_date)) return 'leave'
  if ((weeklyOff || []).includes(weekdayOf(date))) return 'weekly'
  return null
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
