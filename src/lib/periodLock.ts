import type { SupabaseClient } from '@supabase/supabase-js'

// إقفال الشهر: المحاسب يقفل شهر خلص — قاعدة البيانات ترفض أي تعديل داخله (Trigger)، وهنا نطلّع رسالة واضحة قبلها
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
export const monthName = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`
export const monthOf = (d: string) => `${d.slice(0, 7)}-01`
export const lockedMessage = (m: string) => `شهر ${monthName(m)} مقفل من المحاسب — ما ينقدر يتعدّل. اطلب منه يفتحه لو تحتاج`
const saudiDate = (iso: string) => new Date(Date.parse(iso) + 3 * 3600e3).toISOString().slice(0, 10)

/** أي تاريخ من هذي التواريخ داخل شهر مقفل؟ يرجّع الرسالة أو null */
export async function lockedFor(db: SupabaseClient, orgId: string, days: (string | null | undefined)[]): Promise<string | null> {
  const months = [...new Set(days.filter(Boolean).map(d => monthOf(d!.length > 10 ? saudiDate(d!) : d!)))]
  if (!months.length) return null
  const { data } = await db.from('period_locks').select('month').eq('org_id', orgId).in('month', months).limit(1)
  const m = (data as any[])?.[0]?.month
  return m ? lockedMessage(m) : null
}

/** خطأ قاعدة البيانات «PERIOD_LOCKED:2026-09» → رسالة واضحة */
export function lockedFromError(err: { message?: string } | null | undefined): string | null {
  const m = /PERIOD_LOCKED:(\d{4}-\d{2})/.exec(err?.message || '')
  return m ? lockedMessage(`${m[1]}-01`) : null
}

/** الشهور اللي ينقدر تنقفل: اللي خلصت بس (قبل الشهر الحالي بتوقيت السعودية) */
export function closedMonths(count = 12, now = Date.now()): string[] {
  const t = new Date(now + 3 * 3600e3)
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1 - i, 1)).toISOString().slice(0, 10))
}
export const isClosedMonth = (m: string, now = Date.now()) => /^\d{4}-\d{2}-01$/.test(m) && m < monthOf(new Date(now + 3 * 3600e3).toISOString().slice(0, 10))
