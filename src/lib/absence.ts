// أيام الغياب بدون عذر + أيام الإجازة داخل الشهر (دوال صافية — يستخدمها lib/payroll)
//  - الغياب: يوم دوام (مو إجازة أسبوعية، ولا إجازة معتمدة، ولا يوم بديل، ولا من الرصيد الشهري) ما سجّل فيه حضور
//  - نحسب الأيام اللي خلصت بس (قبل اليوم)، وداخل فترة عمل الموظف (بداية العمل / آخر يوم)
//  - الموظف اللي ما سجّل ولا حضور بالشهر = المنشأة ما تستخدم الحضور معه → ما نحسب له غياب
//  - الخصم ما ينطبق تلقائياً: المالك يقرّه من بطاقة الموظف (خصم سببه يبدأ بـ ABSENCE_REASON_PREFIX)
import { offReason, monthlyOffDates, type OffConfig, type ApprovedLeave } from './daysOff'

export const ABSENCE_REASON_PREFIX = 'غياب بدون عذر'
const r2 = (n: number) => Math.round(n * 100) / 100
const DAY = 864e5
const dayNum = (d: string) => Date.parse(`${d}T00:00:00Z`) / DAY

export type LeaveRow = ApprovedLeave & { days_count?: number | string | null }

/** أيام الإجازة اللي تقع داخل الشهر — الإجازة الممتدة على شهرين تنقسم بينهم بنسبة أيامها */
export function leaveDaysInMonth(leaves: LeaveRow[], monthFirst: string, monthLast: string): number {
  let total = 0
  for (const l of leaves) {
    if (!l.start_date) continue
    const end = l.end_date || l.start_date
    const from = l.start_date > monthFirst ? l.start_date : monthFirst
    const to = end < monthLast ? end : monthLast
    if (from > to) continue
    const span = dayNum(end) - dayNum(l.start_date) + 1
    const overlap = dayNum(to) - dayNum(from) + 1
    const counted = l.days_count != null && Number.isFinite(Number(l.days_count)) ? Number(l.days_count) : span
    total += span > 0 ? counted * overlap / span : 0
  }
  return r2(total)
}

/** تواريخ موجودة بأسباب خصومات الغياب السابقة (عشان ما ينخصم نفس اليوم مرتين) */
export function deductedAbsenceDates(reasons: (string | null | undefined)[]): Set<string> {
  const out = new Set<string>()
  for (const r of reasons) {
    if (!r || !String(r).startsWith(ABSENCE_REASON_PREFIX)) continue
    for (const m of String(r).match(/\d{4}-\d{2}-\d{2}/g) || []) out.add(m)
  }
  return out
}

export function absenceDates(o: {
  month: string; lastDay: number; today: string
  cfg: OffConfig & { monthly_off_days?: number | null }
  workedDates: Set<string>; leaves: ApprovedLeave[]; compDates: string[]
  started: string | null; until: string | null
}): string[] {
  if (!o.workedDates.size) return []
  const first = `${o.month}-01`
  const days: string[] = []
  for (let d = 1; d <= o.lastDay; d++) days.push(`${o.month}-${String(d).padStart(2, '0')}`)
  const fixedOff = new Set(days.filter(d => offReason(d, o.cfg, o.leaves, o.compDates)))
  const monthly = o.cfg.days_off_mode === 'monthly' && Number(o.cfg.monthly_off_days) > 0
    ? monthlyOffDates(o.month, Number(o.cfg.monthly_off_days), o.workedDates, o.today, fixedOff) : new Set<string>()
  return days.filter(d =>
    d >= first && d < o.today
    && (!o.started || d >= o.started) && (!o.until || d <= o.until)
    && !o.workedDates.has(d) && !fixedOff.has(d) && !monthly.has(d))
}

/** ملخص الغياب للراتب: الأيام، أجر اليوم (الراتب الكامل ÷ 30)، والمقترح خصمه (اللي ما انخصم قبل) */
export function absenceSummary(dates: string[], fullMonthlyWage: number, deducted: Set<string>) {
  const dailyWage = r2(Math.max(0, fullMonthlyWage) / 30)
  const pendingDates = dates.filter(d => !deducted.has(d))
  return { dates, days: dates.length, dailyWage, pendingDates, pendingAmount: r2(pendingDates.length * dailyWage) }
}

/** نص سبب خصم الغياب (فيه التواريخ عشان ما تنخصم مرة ثانية) */
export const absenceReason = (dates: string[]) => `${ABSENCE_REASON_PREFIX}: ${dates.length} ${dates.length === 1 ? 'يوم' : dates.length === 2 ? 'يومان' : dates.length <= 10 ? 'أيام' : 'يوماً'} (${dates.join('، ')})`
