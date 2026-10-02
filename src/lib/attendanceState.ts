// حالة حضور الموظف — قاعدة وحدة يستخدمها السيرفر (يقبل/يرفض) والواجهة (أي زر يطلع).
// الحضور لكل «دوام» مو لكل يوم: بعد الانصراف يرجع زر الحضور لو بدأ دوام جديد —
// يعني شفت الموظف (حتى لو تغيّر) يبدأ بعد وقت انصرافه، ويفتح قبل البداية بساعة.

import type { Shift } from './payroll'

export const OPEN_BEFORE_START_MIN = 60     // زر الحضور يطلع قبل بداية الشفت بساعة
export const MAX_SESSION_HOURS = 20         // حضور بدون انصراف أقدم من كذا نعتبره منسي (ما يقفل الحضور للأبد)

const RIYADH = 3 * 3600e3
const DAY = 24 * 3600e3
const toMin = (t: string) => { const [h, m] = String(t).slice(0, 5).split(':').map(Number); return h * 60 + m }

export type AttEvent = {
  id?: string; type: 'check_in' | 'check_out' | string; recorded_at: string
  // الشفت اللي حضر عليه الموظف (يتثبّت وقت الحضور). shift_is_24h = null يعني سجل قديم قبل التثبيت
  shift_start_time?: string | null; shift_end_time?: string | null; shift_is_24h?: boolean | null
}

/** شفت الدوام الحالي: لو الموظف حاضر يكمل على الشفت اللي حضر عليه، وإلا شفته الحالي */
export function activeShift(openCheckIn: AttEvent | null, current: Shift): Shift {
  if (!openCheckIn || openCheckIn.shift_is_24h == null) return current
  if (!openCheckIn.shift_start_time && !openCheckIn.shift_is_24h) return null   // حضر وهو بدون شفت
  return { start_time: openCheckIn.shift_start_time ?? null, end_time: openCheckIn.shift_end_time ?? null, is_24h: !!openCheckIn.shift_is_24h }
}

/** بداية الشفت الأقرب: آخر بداية ≤ (الآن + ساعة). null لو ما فيه شفت محدد */
export function currentShiftStart(nowMs: number, shift: Shift): number | null {
  if (!shift || shift.is_24h || !shift.start_time) return null
  const saudiMidnight = Math.floor((nowMs + RIYADH) / DAY) * DAY - RIYADH
  let start = saudiMidnight + toMin(shift.start_time) * 60e3
  if (start > nowMs + OPEN_BEFORE_START_MIN * 60e3) start -= DAY
  return start
}

const saudiDayStart = (ms: number) => Math.floor((ms + RIYADH) / DAY) * DAY - RIYADH

export function attendanceState(opts: { now?: Date; events: AttEvent[]; shift: Shift }) {
  const nowMs = (opts.now ?? new Date()).getTime()
  const sorted = [...opts.events].sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at))
  const last = sorted[0]
  const lastMs = last ? Date.parse(last.recorded_at) : 0

  // حاضر الآن؟ (آخر حركة حضور، وما مرّ عليها أكثر من 20 ساعة)
  const openCheckIn = last && last.type === 'check_in' && nowMs - lastMs <= MAX_SESSION_HOURS * 3600e3 ? last : null
  const lastCheckOut = sorted.find(e => e.type === 'check_out') || null

  let canCheckIn = !openCheckIn
  const shiftStart = currentShiftStart(nowMs, opts.shift)
  if (canCheckIn && lastCheckOut) {
    const outMs = Date.parse(lastCheckOut.recorded_at)
    // دوام جديد: الشفت الحالي يبدأ بعد آخر انصراف. بدون شفت محدد: يوم جديد (بتوقيت السعودية)
    canCheckIn = shiftStart != null ? shiftStart > outMs : saudiDayStart(nowMs) > outMs
  }

  // آخر دوام للعرض: الحضور المفتوح، أو آخر حضور وانصرافه لو الدوام خلص ولسه ما بدأ دوام جديد
  let sessionIn: AttEvent | null = openCheckIn
  let sessionOut: AttEvent | null = null
  if (!openCheckIn && !canCheckIn && lastCheckOut) {
    sessionOut = lastCheckOut
    sessionIn = sorted.find(e => e.type === 'check_in' && Date.parse(e.recorded_at) <= Date.parse(lastCheckOut.recorded_at)) || null
  }

  return {
    checkedIn: !!openCheckIn,
    canCheckIn,
    canCheckOut: !!openCheckIn,
    sessionIn,
    sessionOut,
    shiftStartMs: shiftStart,
  }
}

/** دقائق التأخير على بداية الشفت الأقرب (يغطي الشفت الليلي) */
export function lateMinutesAt(nowMs: number, shift: Shift): number {
  const start = currentShiftStart(nowMs, shift)
  if (start == null) return 0
  return Math.max(0, Math.floor((nowMs - start) / 60e3))
}
