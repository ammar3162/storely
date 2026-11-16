import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { sendWhatsAppDocument, formatPhone } from '@/lib/whatsapp'
import { generateInvoicePdf } from '@/lib/generateInvoicePdf'
import { sendEmail } from '@/lib/email'
import { invoiceEmail } from '@/lib/emailTemplates'
import { offerValidUntil, OFFER_VALID_DAYS } from '@/lib/offerQuote'

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { orgId, orgName, phone: rawPhone, items, status: rawStatus, offer, offerId } = await req.json()
  // due = عرض سعر قبل الدفع (العرض الخاص من ملف العميل)، والافتراضي فاتورة مدفوعة
  const status: 'paid' | 'due' = rawStatus === 'due' ? 'due' : 'paid'
  if (!orgId || !rawPhone || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  const phone = formatPhone(rawPhone)
  if (!/^\d{10,15}$/.test(phone)) {
    return NextResponse.json({ error: `رقم جوال غير صالح: ${rawPhone}` }, { status: 400 })
  }

  const cleanItems = items.filter((it: any) => it?.label && it?.amount != null).map((it: any) => ({ label: String(it.label), amount: Number(it.amount) }))
  if (cleanItems.length === 0) return NextResponse.json({ error: 'لا توجد بنود صالحة' }, { status: 400 })
  const total = cleanItems.reduce((s: number, it: any) => s + it.amount, 0)

  const { data: inv, error: insErr } = await supabase.from('invoices').insert({
    org_id: orgId, org_name: orgName || null, plan_label: cleanItems[0].label, amount: total,
    sent_to_phone: phone, items: cleanItems,
  } as any).select('invoice_number').single()

  if (insErr) return NextResponse.json({ error: 'فشل إنشاء الفاتورة' }, { status: 500 })

  const invoiceNumber = (inv as any)?.invoice_number
  const today = new Date().toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', year: 'numeric', month: 'long', day: 'numeric' })

  // توليد ملف PDF احترافي مفصّل للفاتورة
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateInvoicePdf({ invoiceNumber, date: today, orgName: orgName || '—', items: cleanItems, status, validUntil: status === 'due' ? offerValidUntil() : undefined })
  } catch (err: any) {
    console.error('PDF_GENERATION_FAILED:', err?.message || err, err?.stack || '')
    return NextResponse.json({ error: 'فشل توليد ملف الفاتورة: ' + String(err?.message || err) }, { status: 500 })
  }

  // رفع الملف للتخزين وجلب رابط عام
  const fileName = `invoice-${invoiceNumber}.pdf`
  const { error: upErr } = await supabase.storage.from('invoice-pdfs').upload(fileName, pdfBuffer, {
    contentType: 'application/pdf', upsert: true,
  })
  if (upErr) return NextResponse.json({ error: 'فشل رفع ملف الفاتورة' }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('invoice-pdfs').getPublicUrl(fileName)

  const result = await sendWhatsAppDocument(phone, publicUrl, fileName, status === 'due' ? `عرض سعر #${invoiceNumber} — ${orgName || ''} — ${total} ر.س` : `فاتورة اشتراك #${invoiceNumber} — ${orgName || ''}`)
  if (!result.ok) {
    console.error('SEND_INVOICE_WA_FAILED:', JSON.stringify({ phone, status: result.status, data: result.data }))
    return NextResponse.json({ error: `فشل إرسال الفاتورة عبر واتساب: ${JSON.stringify(result.data || result.status || 'unknown')}` }, { status: 500 })
  }

  // نحاول نرسل إيميل كمان (أفضل جهد — لو فشل، ما نوقف العملية لأن واتساب نجح أصلاً)
  try {
    const { data: ownerProfile } = await supabase.from('profiles').select('id').eq('org_id', orgId).eq('role', 'owner').maybeSingle()
    if (ownerProfile) {
      const { data: authUser } = await supabase.auth.admin.getUserById((ownerProfile as any).id)
      const ownerEmail = authUser?.user?.email
      if (ownerEmail) {
        const mail = invoiceEmail({ invoiceNumber, orgName: orgName || '—', items: cleanItems, pdfUrl: publicUrl, status, date: today })
        await sendEmail({ to: ownerEmail, subject: mail.subject, html: mail.html })
      }
    }
  } catch (emailErr) {
    console.error('SEND_INVOICE_EMAIL_FAILED (non-fatal):', emailErr)
  }

  // سجل العروض: عرض سعر جديد (مستحق) أو تسجيل دفع عرض موجود (فاتورة مدفوعة)
  let savedOfferId: string | null = null
  if (status === 'due' && offer && typeof offer === 'object') {
    const months = Math.round(Number(offer.months))
    if (months >= 1 && months <= 24 && total > 0) {
      const { data: row } = await (supabase as any).from('subscription_offers').insert({
        org_id: orgId, kind: offer.kind === 'renewal' ? 'renewal' : 'manual', months, amount: total,
        list_amount: Number(offer.list_amount) > 0 ? Math.round(Number(offer.list_amount)) : null,
        note: typeof offer.note === 'string' ? offer.note.trim().slice(0, 60) || null : null,
        invoice_number: invoiceNumber, valid_until: new Date(Date.now() + OFFER_VALID_DAYS * 86400000).toISOString(), sent_by_name: admin.full_name || null,
      }).select('id').single()
      savedOfferId = row?.id || null
    }
  }
  if (status === 'paid' && typeof offerId === 'string' && offerId) {
    await (supabase as any).from('subscription_offers').update({ status: 'paid', paid_at: new Date().toISOString(), paid_invoice_number: invoiceNumber, decided_by_name: admin.full_name || null })
      .eq('id', offerId).eq('org_id', orgId).eq('status', 'sent')
  }

  await logAdminAction(admin, 'send_invoice', orgId, orgName || null, { invoice_number: invoiceNumber, amount: total, items: cleanItems, status })

  return NextResponse.json({ success: true, invoiceNumber, offerId: savedOfferId })
}
