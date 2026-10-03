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

// نمط إجازة الموظف: weekly (أيام ثابتة كل أسبوع) | biweekly (نفس الأيام أسبوع وأسبوع، يبدأ من أسبوع biweekly_anchor)
// | dates (تواريخ يحددها المالك) | monthly (رصيد مرن — يُحسب لحاله)
export type OffConfig = { days_off_mode?: string | null; weekly_off_days?: number[] | null; biweekly_anchor?: string | null; off_dates?: string[] | null }

const weekStartMs = (date: string) => { const t = Date.parse(`${date}T12:00:00Z`); return t - weekdayOf(date) * 86400e3 }   // بداية الأسبوع (الأحد)

/** يوم إجازة حسب نمط الموظف المجدول (بدون الإجازات المعتمدة والرصيد المرن) */
export function isScheduledOff(date: string, cfg: OffConfig | number[] | null | undefined): boolean {
  const c: OffConfig = Array.isArray(cfg) ? { days_off_mode: 'weekly', weekly_off_days: cfg } : (cfg || {})
  const mode = c.days_off_mode || 'weekly'
  if (mode === 'dates') return (c.off_dates || []).includes(date)
  if (mode === 'monthly') return false
  if (!(c.weekly_off_days || []).includes(weekdayOf(date))) return false
  if (mode === 'biweekly') {
    if (!c.biweekly_anchor) return false
    const weeks = Math.round((weekStartMs(date) - weekStartMs(c.biweekly_anchor)) / (7 * 86400e3))
    return weeks % 2 === 0
  }
  return true
}

/** يوم إجازة ثابت؟ (إجازة معتمدة، يوم بديل عن يوم إضافي، أو حسب نمط الموظف) — الرصيد الشهري المرن يُحسب لحاله */
export function offReason(date: string, cfg: OffConfig | number[] | null | undefined, leaves: ApprovedLeave[] = [], compDates: string[] = []): OffReason | null {
  if (leaves.some(l => l.start_date <= date && date <= l.end_date)) return 'leave'
  if (compDates.includes(date)) return 'comp'
  if (isScheduledOff(date, cfg)) return 'weekly'
  return null
}

/** تواريخ الإجازة المجدولة بشهر 'YYYY-MM' (للعرض والعدّ) */
export function scheduledOffDates(month: string, cfg: OffConfig | number[] | null | undefined): string[] {
  const [y, m] = month.split('-').map(Number)
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const out: string[] = []
  for (let d = 1; d <= n; d++) { const ds = `${month}-${String(d).padStart(2, '0')}`; if (isScheduledOff(ds, cfg)) out.push(ds) }
  return out
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

/** عدد أيام الإجازة المجدولة بشهر 'YYYY-MM' (للرصيد المرن = الرصيد نفسه) */
export function weeklyOffCount(month: string, cfg: OffConfig | number[] | null | undefined): number {
  const c = Array.isArray(cfg) ? null : cfg
  if (c?.days_off_mode === 'monthly') return Number((c as any).monthly_off_days || 0)
  return scheduledOffDates(month, cfg).length
}

export function normalizeOffDays(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null
  const nums = v.map(Number)
  if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 6)) return null
  const out = [...new Set(nums)].sort((a, b) => a - b)
  return out.length <= 6 ? out : null   // لازم يبقى يوم دوام واحد على الأقل
}

/** تاريخ 'YYYY-MM-DD' صالح فعلاً (مو 2026-02-31) وإلا null */
export function parseDateOnly(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const t = Date.parse(`${v}T12:00:00Z`)
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v ? v : null
}
