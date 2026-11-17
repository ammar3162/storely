// دورة حياة الاشتراك — قاعدة واحدة يستخدمها كل النظام (تفعيل الأدمن، العروض، التجديد، الاستئناف):
//  - تجديد بنفس النوع والاشتراك لسا ساري → المدة الجديدة تبدأ من نهايته (ما يخسر العميل أيامه)
//  - تحويل من تجربة لمدفوع، أو اشتراك منتهي → تبدأ من اليوم
//  - يوم السماح (زر «تجديد الاشتراك») مو مدة مدفوعة → الدفع بعده يبدأ من اليوم
//  - الإيقاف ما يغيّر التاريخ، والاستئناف يكمل لنفس التاريخ (الأيام اللي مرّت وهو موقوف محسوبة عليه)
export type SubType = 'trial' | 'paid'
export type CurrentSub = { type?: string | null; endsAt?: string | null; status?: string | null }
const DAY = 86400000

/** بداية المدة الجديدة عند التفعيل/التجديد */
export function renewalStart(cur: CurrentSub, newType: SubType, now = Date.now(), graceUntil?: string | null): Date {
  const end = cur.endsAt ? Date.parse(cur.endsAt) : NaN
  const sameType = (cur.type || 'trial') === newType
  const onGrace = !!graceUntil && Number.isFinite(end) && end <= Date.parse(graceUntil) + 60000
  if (sameType && !onGrace && Number.isFinite(end) && end > now) return new Date(end)
  return new Date(now)
}

export function addDays(from: Date, days: number): Date { return new Date(from.getTime() + days * DAY) }
export function addMonths(from: Date, months: number): Date { const d = new Date(from); d.setMonth(d.getMonth() + months); return d }

/** نهاية المدة الجديدة: بالأيام (أزرار التفعيل) أو بالأشهر (العروض) */
export function renewalEnd(cur: CurrentSub, newType: SubType, length: { days?: number; months?: number }, now = Date.now(), graceUntil?: string | null): { start: Date; end: Date } {
  const start = renewalStart(cur, newType, now, graceUntil)
  const end = length.months ? addMonths(start, length.months) : addDays(start, length.days || 0)
  return { start, end }
}

export const daysLeftUntil = (endsAt?: string | null, now = Date.now()) =>
  endsAt ? Math.ceil((Date.parse(endsAt) - now) / DAY) : null

/** استئناف حساب موقوف: يرجع شغّال لنفس تاريخ الانتهاء — لو انتهى أثناء الإيقاف يرجع «منتهي» ويحتاج تجديد */
export function resumeOutcome(cur: CurrentSub, now = Date.now()): { endsAt: string | null; daysLeft: number | null; expired: boolean } {
  const left = daysLeftUntil(cur.endsAt, now)
  return { endsAt: cur.endsAt || null, daysLeft: left, expired: left !== null && left <= 0 }
}
