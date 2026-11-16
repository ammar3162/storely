import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/adminAuth'
import { buildInvoiceHtml } from '@/lib/generateInvoicePdf'
import { arInvoiceDate, offerValidUntil, cleanInvoiceItems } from '@/lib/offerQuote'

// معاينة الفاتورة أو عرض السعر قبل الإرسال — نفس قالب الـ PDF، بدون حفظ ولا رقم فاتورة
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { orgName, items, status: rawStatus } = await req.json().catch(() => ({}))
  const clean = cleanInvoiceItems(items)
  if (!clean.length) return NextResponse.json({ error: 'لا توجد بنود' }, { status: 400 })
  const status: 'paid' | 'due' = rawStatus === 'due' ? 'due' : 'paid'
  const html = buildInvoiceHtml({
    invoiceNumber: 'معاينة', date: arInvoiceDate(new Date()), orgName: String(orgName || '—').slice(0, 120), items: clean, status,
    validUntil: status === 'due' ? offerValidUntil() : undefined,
  })
  return NextResponse.json({ success: true, html })
}
