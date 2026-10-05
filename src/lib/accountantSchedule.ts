// مواعيد تقرير المحاسب — كل الحسابات بتاريخ السعودية 'YYYY-MM-DD'
//   daily  : كل يوم، عن أمس
//   weekly : بيوم weekday، عن الأسبوع اللي قبله (٧ أيام تنتهي أمس)
//   monthly: بتاريخ month_day، عن الشهر اللي فات كامل
export type AccFrequency = 'daily' | 'weekly' | 'monthly'
export type AccSchedule = { frequency: AccFrequency; weekday: number; month_day: number; send_hour?: number }
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

/** ساعة الإرسال اللي حددها المالك (افتراضي ٨ الصبح) */
export const SEND_HOUR = 8
export const sendHourOf = (s: AccSchedule) => Number.isInteger(s.send_hour) ? s.send_hour! : SEND_HOUR
const saudiHour = (now: number) => new Date(now + 3 * 3600e3).getUTCHours()

/** «اليوم» من ناحية الجدولة: قبل ساعة الإرسال نعتبره أمس (لسا ما جا موعد اليوم) */
export function scheduleToday(s: AccSchedule, now = Date.now()) {
  const today = saudiToday(now)
  return saudiHour(now) >= sendHourOf(s) ? today : addDays(today, -1)
}

/** متى يوصل التقرير الجاي */
export function nextSend(s: AccSchedule, lastPeriodEnd: string | null, now = Date.now()): { date: string; period: Period } {
  const today = saudiToday(now)
  for (let i = saudiHour(now) < sendHourOf(s) ? 0 : 1; i < 70; i++) {
    const d = addDays(today, i), p = latestPeriod(s, d)
    if (!lastPeriodEnd || p.end > lastPeriodEnd) return { date: d, period: p }
  }
  const d = addDays(today, 1)
  return { date: d, period: latestPeriod(s, d) }
}

/** «أرسل الحين»: الفترة اللي يختارها المالك */
export type ManualPeriodKey = 'scheduled' | 'last_month' | 'this_month' | 'last_week' | 'yesterday' | 'custom'
export function manualPeriod(key: ManualPeriodKey, s: AccSchedule, today: string): Period | null {
  const y = addDays(today, -1)
  if (key === 'yesterday') return { start: y, end: y }
  if (key === 'last_week') return { start: addDays(today, -7), end: y }
  if (key === 'last_month') { const end = addDays(monthStart(today), -1); return { start: monthStart(end), end } }
  if (key === 'this_month') return today === monthStart(today) ? null : { start: monthStart(today), end: y }
  if (key === 'custom') return null   // الفترة المخصصة تمر من customPeriod
  return latestPeriod(s, today)
}

/** فترة من تاريخ لتاريخ — لين اليوم، وسنة بالكثير */
export function customPeriod(from: string, to: string, today: string): Period | string {
  const ok = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d
  if (!ok(from) || !ok(to)) return 'اختر التاريخين'
  if (from > to) return 'تاريخ البداية بعد تاريخ النهاية'
  if (to > today) return 'تاريخ النهاية ما يكون بعد اليوم'
  if ((ms(to) - ms(from)) / 86400e3 > 366) return 'الفترة أطول من سنة'
  return { start: from, end: to }
}

/** وقت الإرسال بالعربي: 8 → «8:00 ص» */
export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`
