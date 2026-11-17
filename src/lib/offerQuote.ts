// عرض السعر الخاص (ملف العميل في لوحة الإدارة): مدة صلاحية العرض وتاريخها بصيغة الفاتورة
export const OFFER_VALID_DAYS = 7
// رابط ملف الفاتورة/العرض (مجلد خاص): موقّع وصالح سنة — يكفي للواتساب والإيميل، وما ينخمّن
export const INVOICE_LINK_TTL_SECONDS = 365 * 24 * 3600

export const arInvoiceDate = (d: Date) =>
  d.toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', year: 'numeric', month: 'long', day: 'numeric' })

export function offerValidUntil(from = new Date()): string {
  return arInvoiceDate(new Date(from.getTime() + OFFER_VALID_DAYS * 86400000))
}

/** بنود عرض/فاتورة من المتصفح: نص وقيمة رقمية موجبة فقط */
export function cleanInvoiceItems(items: unknown): { label: string; amount: number }[] {
  if (!Array.isArray(items)) return []
  return items
    .filter((it: any) => it?.label && Number.isFinite(Number(it?.amount)))
    .slice(0, 30)
    .map((it: any) => ({ label: String(it.label).slice(0, 200), amount: Math.round(Number(it.amount) * 100) / 100 }))
}

// ── سجل العروض والمتابعة وعروض التجديد ──
export const FOLLOWUP_AFTER_DAYS = 3        // عرض ما انْدفع بعد 3 أيام → يطلع للمتابعة
export const RENEWAL_WINDOW_DAYS = 14       // اشتراك ينتهي خلال 14 يوم → نقترح عرض تجديد
export const RENEWAL_DEFAULT = { months: 6, pct: 10 }
const DAY = 86400000

export type OfferRow = { status: 'sent' | 'paid' | 'cancelled'; created_at: string; valid_until: string }
export type OfferState = 'sent' | 'paid' | 'cancelled' | 'expired'

export function offerState(o: OfferRow, now = Date.now()): OfferState {
  if (o.status !== 'sent') return o.status
  return new Date(o.valid_until).getTime() < now ? 'expired' : 'sent'
}

/** عرض مرسل ما انْدفع ولا انلغى، عمره 3 أيام أو أكثر، وما مضى على انتهائه أكثر من أسبوع */
export function needsFollowup(o: OfferRow, now = Date.now()): boolean {
  if (o.status !== 'sent') return false
  const age = now - new Date(o.created_at).getTime()
  return age >= FOLLOWUP_AFTER_DAYS * DAY && new Date(o.valid_until).getTime() > now - 7 * DAY
}

/** عرض التجديد المقترح: الفاتورة الشهرية × الأشهر بخصم النسبة (مقرّب لأقرب 5 ريال للأسفل) */
export function suggestRenewal(monthlyBill: number, months = RENEWAL_DEFAULT.months, pct = RENEWAL_DEFAULT.pct) {
  const list = Math.max(0, Math.round(monthlyBill * months))
  const amount = Math.floor((list * (1 - pct / 100)) / 5) * 5
  return { months, pct, list, amount }
}

export const offerMonthsLabel = (m: number) => (m === 1 ? 'شهر' : m === 12 ? 'سنة' : `${m} أشهر`)
