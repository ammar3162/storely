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

// ── تفاصيل عرض السعر (وفاتورة الدفع لنفس العرض): كل اللي يحتاجه العميل ليعرف وش يدفع ──
export type QuoteLine = { label: string; amount: number }

/** بيانات المنشأة اللي ينبني عليها العرض (تُقرأ في الخادم: lib/offerQuoteServer) */
export type QuoteContext = {
  ownerName?: string | null
  planLabel: string
  branches: number          // فروع الباقة (الجديدة) أو الفروع الشغّالة (القديمة)
  branchNames: string[]
  cycle: 'monthly' | 'yearly'
  lines: QuoteLine[]        // سطور فاتورة المنشأة بدورتها: الباقة والإضافات والخصم الدائم
  total: number
}

export type QuoteDetails = {
  kind: 'manual' | 'renewal'
  ownerName: string | null
  planLabel: string
  branches: number
  branchNames: string[]
  months: number
  monthsLabel: string
  start: string             // بصيغة الفاتورة
  end: string
  startsLater: boolean      // تبدأ بعد نهاية الاشتراك الساري
  billTitle: string
  billLines: QuoteLine[]
  billTotal: number
  cycle: 'monthly' | 'yearly'
  monthly: number           // السعر الشهري (السنوي ÷ 12) — نفس حساب لوحة الإدارة
  list: number              // السعر العادي للمدة = الشهري × الأشهر
  amount: number            // المبلغ المتفق عليه
  discount: number          // السعر العادي − المتفق عليه (لو أقل)
  discountPct: number
  note: string | null
}

const CYCLE_SUFFIX = / \((شهرياً|سنوياً)\)$/
const r2 = (n: number) => Math.round(n * 100) / 100

export function buildQuoteDetails(ctx: QuoteContext, o: { months: number; amount: number; kind?: string | null; note?: string | null; start: Date; end: Date; now?: number }): QuoteDetails {
  const months = Math.max(1, Math.round(Number(o.months) || 1))
  const monthly = Math.max(0, ctx.cycle === 'yearly' ? Math.round(ctx.total / 12) : Math.round(ctx.total))
  const list = monthly * months
  const amount = r2(Number(o.amount) || 0)
  const discount = list > 0 && amount > 0 && amount < list ? r2(list - amount) : 0
  const note = String(o.note || '').trim().slice(0, 60)
  return {
    kind: o.kind === 'renewal' ? 'renewal' : 'manual',
    ownerName: String(ctx.ownerName || '').trim() || null,
    planLabel: ctx.planLabel,
    branches: Math.max(1, Math.round(Number(ctx.branches) || 1)),
    branchNames: ctx.branchNames.map(n => String(n).trim()).filter(Boolean).slice(0, 12),
    months, monthsLabel: offerMonthsLabel(months),
    start: arInvoiceDate(o.start), end: arInvoiceDate(o.end),
    startsLater: o.start.getTime() > (o.now ?? Date.now()) + 86400000,
    billTitle: ctx.cycle === 'yearly' ? 'اشتراكك السنوي الحالي' : 'الاشتراك الشهري',
    // الشهري: الجدول عنوانه «شهري» فنشيل «(شهرياً)» من آخر كل سطر
    billLines: ctx.lines.map(l => ({ label: ctx.cycle === 'monthly' ? l.label.replace(CYCLE_SUFFIX, '') : l.label, amount: r2(l.amount) })),
    billTotal: r2(ctx.total),
    cycle: ctx.cycle,
    monthly, list, amount, discount,
    discountPct: discount > 0 ? Math.round((discount / list) * 100) : 0,
    note: note || null,
  }
}

/** بنود الإيميل للعرض: السعر العادي ثم الخصم (مجموعها = المبلغ المستحق)، أو سطر واحد لو ما فيه خصم */
export function quoteEmailItems(q: QuoteDetails): QuoteLine[] {
  if (q.discount > 0) return [
    { label: `السعر العادي لمدة ${q.monthsLabel} (${q.monthly.toLocaleString('en-US')} ر.س شهرياً)`, amount: q.list },
    { label: `خصم العرض (${q.discountPct}%)`, amount: -q.discount },
  ]
  return [{ label: `${q.kind === 'renewal' ? 'تجديد اشتراك' : 'اشتراك'} Storely لمدة ${q.monthsLabel}`, amount: q.amount }]
}
