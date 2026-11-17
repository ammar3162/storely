import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'
import { buildInvoiceHtml } from '@/lib/generateInvoicePdf'
import { arInvoiceDate, offerValidUntil, cleanInvoiceItems } from '@/lib/offerQuote'
import { offerQuoteDetails } from '@/lib/offerQuoteServer'

// معاينة الفاتورة أو عرض السعر قبل الإرسال — نفس قالب الـ PDF (ونفس تفاصيل العرض)، بدون حفظ ولا رقم فاتورة
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { orgId, orgName, items, status: rawStatus, offer } = await req.json().catch(() => ({}))
  const clean = cleanInvoiceItems(items)
  if (!clean.length) return NextResponse.json({ error: 'لا توجد بنود' }, { status: 400 })
  const status: 'paid' | 'due' = rawStatus === 'due' ? 'due' : 'paid'
  const total = clean.reduce((s, it) => s + it.amount, 0)
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const quote = typeof orgId === 'string' && orgId && offer && typeof offer === 'object'
    ? await offerQuoteDetails(db as any, orgId, offer, total).catch(() => null)
    : null
  const html = buildInvoiceHtml({
    invoiceNumber: 'معاينة', date: arInvoiceDate(new Date()), orgName: String(quote?.orgName || orgName || '—').slice(0, 120), items: clean, status,
    validUntil: status === 'due' ? offerValidUntil() : undefined, quote: quote?.details,
  })
  return NextResponse.json({ success: true, html })
}
