import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { sendWhatsAppDocument } from '@/lib/whatsapp'
import { generateInvoicePdf } from '@/lib/generateInvoicePdf'

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

  const { orgId, orgName, phone, items } = await req.json()
  if (!orgId || !phone || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const cleanItems = items.filter((it: any) => it?.label && it?.amount != null).map((it: any) => ({ label: String(it.label), amount: Number(it.amount) }))
  if (cleanItems.length === 0) return NextResponse.json({ error: 'ما فيه بنود صالحة' }, { status: 400 })
  const total = cleanItems.reduce((s: number, it: any) => s + it.amount, 0)

  const { data: inv, error: insErr } = await supabase.from('invoices').insert({
    org_id: orgId, org_name: orgName || null, plan_label: cleanItems[0].label, amount: total,
    sent_to_phone: phone, items: cleanItems,
  } as any).select('invoice_number').single()

  if (insErr) return NextResponse.json({ error: 'فشل إنشاء الفاتورة' }, { status: 500 })

  const invoiceNumber = (inv as any)?.invoice_number
  const today = new Date().toLocaleDateString('ar-SA', { numberingSystem: 'latn', year: 'numeric', month: 'long', day: 'numeric' })

  // توليد ملف PDF احترافي مفصّل للفاتورة
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateInvoicePdf({ invoiceNumber, date: today, orgName: orgName || '—', items: cleanItems })
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

  const result = await sendWhatsAppDocument(phone, publicUrl, fileName, `🧾 فاتورة اشتراك #${invoiceNumber} — ${orgName || ''}`)
  if (!result.ok) return NextResponse.json({ error: 'فشل إرسال الفاتورة عبر واتساب' }, { status: 500 })

  await logAdminAction(admin, 'send_invoice', orgId, orgName || null, { invoice_number: invoiceNumber, amount: total, items: cleanItems })

  return NextResponse.json({ success: true, invoiceNumber })
}
