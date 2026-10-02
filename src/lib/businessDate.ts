// «يوم العمل» لإقفال الكاشير — قاعدة وحدة يحددها المالك:
// أي تقفيل قبل ساعة بداية اليوم الجديد (بتوقيت السعودية) ينحسب على اليوم اللي قبل.
// مثال: البداية 4 الفجر → تقفيل الساعة 1:30 ص يوم الأحد يتسجّل على السبت.

export const DEFAULT_BUSINESS_DAY_START_HOUR = 4
export const MAX_BUSINESS_DAY_START_HOUR = 10
const RIYADH_OFFSET_MS = 3 * 3600e3

export function normalizeStartHour(v: unknown): number {
  const n = Number(v)
  return Number.isInteger(n) && n >= 0 && n <= MAX_BUSINESS_DAY_START_HOUR ? n : DEFAULT_BUSINESS_DAY_START_HOUR
}

export function computeBusinessDate(opts: { now?: Date; startHour?: number | null } = {}): string {
  const nowMs = (opts.now ?? new Date()).getTime()
  const startHour = opts.startHour == null ? DEFAULT_BUSINESS_DAY_START_HOUR : normalizeStartHour(opts.startHour)
  // نرجّع الوقت بمقدار ساعة البداية، فأي وقت قبلها يطيح على اليوم اللي قبل
  return new Date(nowMs + RIYADH_OFFSET_MS - startHour * 3600e3).toISOString().slice(0, 10)
}
