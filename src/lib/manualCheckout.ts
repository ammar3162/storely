// انصراف يسجّله المالك عن الموظف (طلع بدون ما يسجّل انصرافه).
// المالك يختار الساعة بس، والتاريخ يتحدد من وقت الحضور: لو الساعة قبل وقت الحضور = اليوم اللي بعده (الشفت الليلي).

import { MAX_SESSION_HOURS } from './attendanceState'

const RIYADH = 3 * 3600e3
const DAY = 24 * 3600e3

/** وقت الانصراف (ms) لساعة HH:MM بعد حضور معيّن، أو null لو الساعة غير صالحة */
export function manualCheckoutAt(checkInIso: string, hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm || ''))
  const checkIn = Date.parse(checkInIso)
  if (!m || Number.isNaN(checkIn)) return null
  const saudiMidnight = Math.floor((checkIn + RIYADH) / DAY) * DAY - RIYADH
  let at = saudiMidnight + (Number(m[1]) * 60 + Number(m[2])) * 60e3
  if (at <= checkIn) at += DAY
  return at
}

/** سبب الرفض (أو null لو الوقت مقبول): بعد الحضور، مو بالمستقبل، وخلال مدة الدوام القصوى */
export function manualCheckoutError(checkInIso: string, atMs: number, nowMs = Date.now()): string | null {
  const checkIn = Date.parse(checkInIso)
  if (atMs <= checkIn) return 'وقت الانصراف لازم يكون بعد وقت الحضور'
  if (atMs > nowMs) return 'وقت الانصراف ما يصير بالمستقبل'
  if (atMs - checkIn > MAX_SESSION_HOURS * 3600e3) return `مدة الدوام أطول من ${MAX_SESSION_HOURS} ساعة — اختر وقت أقرب`
  return null
}
