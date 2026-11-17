import { describe, it, expect } from 'vitest'
import { cleanInvoiceItems, offerValidUntil } from './offerQuote'

describe('offer quote', () => {
  it('keeps only labelled numeric items', () => {
    expect(cleanInvoiceItems([{ label: 'a', amount: '900' }, { label: '', amount: 1 }, { label: 'b', amount: 'x' }, null])).toEqual([{ label: 'a', amount: 900 }])
    expect(cleanInvoiceItems('nope')).toEqual([])
  })
  it('valid-until is 7 days later', () => {
    expect(offerValidUntil(new Date(Date.UTC(2026, 10, 17, 12)))).toContain('24')
  })
})

import { offerState, needsFollowup, suggestRenewal } from './offerQuote'
describe('offers follow-up and renewal', () => {
  const now = Date.UTC(2026, 10, 17)
  const d = (days: number) => new Date(now + days * 86400000).toISOString()
  it('state: expired only when sent and past validity', () => {
    expect(offerState({ status: 'sent', created_at: d(-8), valid_until: d(-1) }, now)).toBe('expired')
    expect(offerState({ status: 'sent', created_at: d(-1), valid_until: d(6) }, now)).toBe('sent')
    expect(offerState({ status: 'paid', created_at: d(-8), valid_until: d(-1) }, now)).toBe('paid')
  })
  it('follow-up after 3 days, not for paid or long-expired', () => {
    expect(needsFollowup({ status: 'sent', created_at: d(-2), valid_until: d(5) }, now)).toBe(false)
    expect(needsFollowup({ status: 'sent', created_at: d(-3), valid_until: d(4) }, now)).toBe(true)
    expect(needsFollowup({ status: 'paid', created_at: d(-5), valid_until: d(2) }, now)).toBe(false)
    expect(needsFollowup({ status: 'sent', created_at: d(-20), valid_until: d(-13) }, now)).toBe(false)
  })
  it('renewal suggestion: 6 months −10% rounded down to 5', () => {
    expect(suggestRenewal(198)).toEqual({ months: 6, pct: 10, list: 1188, amount: 1065 })
    expect(suggestRenewal(0).amount).toBe(0)
  })
})

import { buildQuoteDetails, quoteEmailItems, type QuoteContext } from './offerQuote'
import { buildInvoiceHtml } from './generateInvoicePdf'
import { invoiceEmail } from './emailTemplates'
describe('offer quote details', () => {
  const now = Date.UTC(2026, 10, 17, 9)
  const ctx: QuoteContext = {
    ownerName: 'سارة', planLabel: 'الكاملة', branches: 2, branchNames: ['الرئيسي', 'العليا'], cycle: 'monthly',
    lines: [{ label: 'اشتراك باقة "الكاملة" (2 فروع) (شهرياً)', amount: 254 }, { label: 'إضافة "الحضور" (2 فروع × 35 ر.س)', amount: 70 }],
    total: 324,
  }
  const start = new Date(now), end = new Date(Date.UTC(2027, 4, 17, 9))
  it('list = monthly × months, discount and percent, monthly labels lose the cycle suffix', () => {
    const q = buildQuoteDetails(ctx, { months: 6, amount: 1750, start, end, now })
    expect(q.list).toBe(1944)
    expect(q.discount).toBe(194)
    expect(q.discountPct).toBe(10)
    expect(q.billLines[0].label).toBe('اشتراك باقة "الكاملة" (2 فروع)')
    expect(q.monthsLabel).toBe('6 أشهر')
    expect(q.startsLater).toBe(false)
  })
  it('no discount when the agreed price is equal or higher, or when there is no regular price', () => {
    expect(buildQuoteDetails(ctx, { months: 3, amount: 972, start, end, now }).discount).toBe(0)
    expect(buildQuoteDetails(ctx, { months: 3, amount: 1200, start, end, now }).discount).toBe(0)
    expect(buildQuoteDetails({ ...ctx, lines: [], total: 0 }, { months: 3, amount: 500, start, end, now }).discount).toBe(0)
  })
  it('yearly cycle: monthly = yearly ÷ 12 (same as the admin drawer)', () => {
    const q = buildQuoteDetails({ ...ctx, cycle: 'yearly', total: 3110 }, { months: 6, amount: 1400, start, end, now })
    expect(q.monthly).toBe(259)
    expect(q.list).toBe(1554)
    expect(q.billTitle).toContain('السنوي')
  })
  it('starts later when the current paid subscription is still running', () => {
    expect(buildQuoteDetails(ctx, { months: 1, amount: 300, start: new Date(now + 20 * 86400000), end, now }).startsLater).toBe(true)
  })
  it('email items always add up to the agreed amount', () => {
    for (const amount of [1750, 1944, 2100]) {
      const q = buildQuoteDetails(ctx, { months: 6, amount, start, end, now })
      expect(quoteEmailItems(q).reduce((s, it) => s + it.amount, 0)).toBe(amount)
    }
  })
  it('PDF shows org, owner, plan, branches, period, discount and total, and escapes names', () => {
    const q = buildQuoteDetails({ ...ctx, ownerName: '<b>x</b>' }, { months: 6, amount: 1750, note: 'عرض الافتتاح', start, end, now })
    const html = buildInvoiceHtml({ invoiceNumber: 12, date: 'اليوم', orgName: 'مطعم <script>', items: [{ label: 'اشتراك', amount: 1750 }], status: 'due', validUntil: '24 نوفمبر 2026', quote: q })
    for (const t of ['صاحب المنشأة', 'الكاملة', 'عدد الفروع', 'الرئيسي، العليا', 'فترة الاشتراك', 'خصم العرض (10%)', 'المبلغ المستحق', '1,750', '1,944', 'عرض الافتتاح', 'رقم العرض', '24 نوفمبر 2026'])
      expect(html).toContain(t)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>x</b>')
  })
  it('paid invoice for the offer: paid wording, no validity line', () => {
    const q = buildQuoteDetails(ctx, { months: 6, amount: 1750, start, end, now })
    const html = buildInvoiceHtml({ invoiceNumber: 13, date: 'اليوم', orgName: 'مطعم', items: [{ label: 'اشتراك', amount: 1750 }], status: 'paid', quote: q })
    expect(html).toContain('المبلغ المدفوع')
    expect(html).toContain('فاتورة اشتراك')
    expect(html).not.toContain('صالح حتى')
  })
  it('email: rows for plan/branches/period and the total equals the agreed amount', () => {
    const q = buildQuoteDetails(ctx, { months: 6, amount: 1750, start, end, now })
    const mail = invoiceEmail({ invoiceNumber: 12, orgName: 'مطعم', items: [{ label: 'اشتراك', amount: 1750 }], status: 'due', quote: q, validUntil: '24 نوفمبر 2026' })
    expect(mail.subject).toContain('1,750')
    for (const t of ['الباقة', 'عدد الفروع', 'فترة الاشتراك', 'صالح حتى', 'خصم العرض']) expect(mail.html).toContain(t)
  })
})
