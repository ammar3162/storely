// مواعيد تقرير المحاسب — كل الحسابات بتاريخ السعودية 'YYYY-MM-DD'
//   daily  : كل يوم، عن أمس
//   weekly : بيوم weekday، عن الأسبوع اللي قبله (٧ أيام تنتهي أمس)
//   monthly: بتاريخ month_day، عن الشهر اللي فات كامل
export type AccFrequency = 'daily' | 'weekly' | 'monthly'
export type AccSchedule = { frequency: AccFrequency; weekday: number; month_day: number }
export type Period = { start: string; end: string }

const ms = (d: string) => Date.parse(`${d}T12:00:00Z`)
export const addDays = (d: string, n: number) => new Date(ms(d) + n * 86400e3).toISOString().slice(0, 10)
const weekday = (d: string) => new Date(ms(d)).getUTCDay()
const monthStart = (d: string) => `${d.slice(0, 7)}-01`
const prevMonthStart = (d: string) => { const [y, m] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10) }
export const saudiToday = (now = Date.now()) => new Date(now + 3 * 3600e3).toISOString().slice(0, 10)

/** آخر فترة موعد إرسالها اليوم أو قبله */
export function latestPeriod(s: AccSchedule, today: string): Period {
  if (s.frequency === 'daily') { const y = addDays(today, -1); return { start: y, end: y } }
  if (s.frequency === 'weekly') {
    const send = addDays(today, -((weekday(today) - s.weekday + 7) % 7))
    return { start: addDays(send, -7), end: addDays(send, -1) }
  }
  const day = Number(today.slice(8))
  const sendMonth = day >= s.month_day ? monthStart(today) : prevMonthStart(today)
  const start = prevMonthStart(sendMonth)
  return { start, end: addDays(sendMonth, -1) }
}

/** الفترة المستحقة الإرسال الحين، أو null — ما نرسل نفس الفترة مرتين، وما نعوض المتأخر (آخر فترة بس) */
export function duePeriod(s: AccSchedule & { last_period_end: string | null }, today: string): Period | null {
  const p = latestPeriod(s, today)
  return !s.last_period_end || p.end > s.last_period_end ? p : null
}

/** هل الفترة شهر كامل؟ (الرواتب تنحسب بالشهر بس) */
export const isFullMonth = (p: Period) => p.start === monthStart(p.start) && addDays(p.end, 1) === monthStart(addDays(p.end, 1)) && p.start.slice(0, 7) === p.end.slice(0, 7)

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const dayLabel = (d: string) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`
export function periodLabel(p: Period) {
  if (isFullMonth(p)) return `${MONTHS[Number(p.start.slice(5, 7)) - 1]} ${p.start.slice(0, 4)}`
  if (p.start === p.end) return `${dayLabel(p.start)} ${p.start.slice(0, 4)}`
  return `${dayLabel(p.start)} – ${dayLabel(p.end)} ${p.end.slice(0, 4)}`
}

/** متى يوصل التقرير الجاي (الإرسال الساعة ٨ الصبح بتوقيت السعودية) */
export const SEND_HOUR = 8
export function nextSend(s: AccSchedule, lastPeriodEnd: string | null, now = Date.now()): { date: string; period: Period } {
  const today = saudiToday(now)
  const hour = new Date(now + 3 * 3600e3).getUTCHours()
  for (let i = hour < SEND_HOUR ? 0 : 1; i < 70; i++) {
    const d = addDays(today, i), p = latestPeriod(s, d)
    if (!lastPeriodEnd || p.end > lastPeriodEnd) return { date: d, period: p }
  }
  const d = addDays(today, 1)
  return { date: d, period: latestPeriod(s, d) }
}
