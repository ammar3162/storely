// «يوم العمل» لإقفال الكاشير — التقفيل بعد منتصف الليل ينحسب على اليوم اللي انفتح فيه الكاشير.
// الترتيب:
//   1) لو الكاشير سجّل حضور خلال آخر 18 ساعة → تاريخ ذاك الحضور (بتوقيت السعودية)
//   2) لو المالك محدّد ساعات المحل → أي تقفيل قبل ساعة الفتح يرجع لليوم السابق
//   3) بدون ساعات → أي تقفيل قبل الساعة 6 الفجر يرجع لليوم السابق

const RIYADH_OFFSET_MS = 3 * 3600e3
export const EARLY_MORNING_CUTOFF_HOUR = 6
const CHECKIN_WINDOW_MS = 18 * 3600e3

const riyadhDate = (ms: number) => new Date(ms + RIYADH_OFFSET_MS).toISOString().slice(0, 10)
const riyadhHour = (ms: number) => new Date(ms + RIYADH_OFFSET_MS).getUTCHours()

export function computeBusinessDate(opts: {
  now?: Date
  openTime?: string | null      // 'HH:MM'
  closeTime?: string | null
  lastCheckInIso?: string | null
}): string {
  const nowMs = (opts.now ?? new Date()).getTime()

  if (opts.lastCheckInIso) {
    const inMs = Date.parse(opts.lastCheckInIso)
    if (!Number.isNaN(inMs) && inMs <= nowMs && nowMs - inMs <= CHECKIN_WINDOW_MS) return riyadhDate(inMs)
  }

  const hour = riyadhHour(nowMs)
  const openHour = opts.openTime ? Number(String(opts.openTime).slice(0, 2)) : NaN
  const cutoff = Number.isFinite(openHour) && opts.closeTime ? openHour : EARLY_MORNING_CUTOFF_HOUR
  return hour < cutoff ? riyadhDate(nowMs - 24 * 3600e3) : riyadhDate(nowMs)
}
