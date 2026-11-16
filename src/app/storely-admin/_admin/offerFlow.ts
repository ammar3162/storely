// عرض السعر الخاص — نفس الخطوات من ملف العميل ومن «طلبات التجديد»
import { adminFetch, fmtDate } from './kit'
import { offerMonthsLabel } from '@/lib/offerQuote'

export const addMonths = (m: number, from = new Date()) => { const d = new Date(from); d.setMonth(d.getMonth() + m); return d }

/** بداية مدة العرض: مشترك مدفوع اشتراكه ساري → من نهاية اشتراكه (ما يخسر أيامه)، غير كذا من اليوم */
export function offerStart(sub?: { type?: string | null; ends?: string | null }) {
  const end = sub?.ends ? new Date(sub.ends) : null
  return sub?.type === 'paid' && end && end.getTime() > Date.now() ? end : new Date()
}

export function offerItems(months: number, amount: number, note = '', kind: 'manual' | 'renewal' = 'manual', from = new Date()) {
  const ends = addMonths(months, from)
  return [{ label: `${kind === 'renewal' ? 'تجديد اشتراك' : 'اشتراك'} Storely لمدة ${offerMonthsLabel(months)} (حتى ${fmtDate(ends.toISOString())})${note.trim() ? ` — ${note.trim()}` : ''}`, amount }]
}

/** يرسل عرض سعر مستحق (واتساب + إيميل) ويسجّله في سجل العروض */
export async function sendOffer(o: { orgId: string; orgName: string; phone: string; months: number; amount: number; list: number; note?: string; kind?: 'manual' | 'renewal'; from?: Date }) {
  return adminFetch('/api/admin/send-invoice', { method: 'POST', body: {
    orgId: o.orgId, orgName: o.orgName, phone: o.phone, status: 'due', items: offerItems(o.months, o.amount, o.note, o.kind, o.from),
    offer: { months: o.months, list_amount: o.list, note: o.note || '', kind: o.kind || 'manual' },
  } })
}

/** العميل دفع: تفعيل مدفوع حتى نهاية المدة + فاتورة مدفوعة + العرض «مدفوع» */
export async function activateOffer(o: { userId: string; orgId: string; orgName: string; phone?: string; months: number; amount: number; note?: string; kind?: 'manual' | 'renewal'; offerId?: string | null; from?: Date }) {
  const from = o.from || new Date()
  const ends = addMonths(o.months, from).toISOString()
  const a = await adminFetch('/api/admin/activate-user', { method: 'POST', body: { userId: o.userId, type: 'paid', ends } })
  if (!a.success) return { ok: false as const, error: a.error || 'تعذّر التفعيل' }
  await adminFetch('/api/notify-activation', { method: 'POST', body: { userId: o.userId, subscriptionType: 'paid', subscriptionEndsAt: ends } }).catch(() => null)
  let invoiceNumber: number | null = null, invoiceError: string | null = null
  if (o.phone) {
    const j = await adminFetch('/api/admin/send-invoice', { method: 'POST', body: { orgId: o.orgId, orgName: o.orgName, phone: o.phone, status: 'paid', items: offerItems(o.months, o.amount, o.note, o.kind, from), offerId: o.offerId || undefined } })
    if (j.success) invoiceNumber = j.invoiceNumber; else invoiceError = j.error || 'تعذّر إرسال الفاتورة'
  }
  // لو الفاتورة ما انرسلت (أو ما فيه جوال) نعلّم العرض مدفوع مباشرة
  if (o.offerId && !invoiceNumber) await adminFetch('/api/admin/offers', { method: 'POST', body: { id: o.offerId, action: 'paid' } }).catch(() => null)
  return { ok: true as const, ends, invoiceNumber, invoiceError }
}
