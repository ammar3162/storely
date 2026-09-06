import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { sendWhatsAppDocument, formatPhone } from '@/lib/whatsapp'
import { generateInvoicePdf } from '@/lib/generateInvoicePdf'
import { sendEmail } from '@/lib/email'

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

  const { orgId, orgName, phone: rawPhone, items } = await req.json()
  if (!orgId || !rawPhone || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  const phone = formatPhone(rawPhone)
  if (!/^\d{10,15}$/.test(phone)) {
    return NextResponse.json({ error: `رقم جوال غير صالح: ${rawPhone}` }, { status: 400 })
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
        const itemsHtml = cleanItems.map((it: any) => `<tr><td style="padding:8px 0">${it.label}</td><td style="padding:8px 0;text-align:left">${it.amount} ر.س</td></tr>`).join('')
        const html = `
          <div style="font-family:sans-serif;direction:rtl;text-align:right;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#029FA2">🧾 فاتورة اشتراك #${invoiceNumber}</h2>
            <p>مرحباً،</p>
            <p>فاتورة اشتراكك بمنشأة "${orgName || ''}" جاهزة:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              ${itemsHtml}
              <tr style="border-top:2px solid #029FA2;font-weight:700"><td style="padding:8px 0">الإجمالي</td><td style="padding:8px 0;text-align:left">${total} ر.س</td></tr>
            </table>
            <a href="${publicUrl}" style="display:inline-block;padding:12px 28px;background:#029FA2;color:white;border-radius:10px;text-decoration:none;font-weight:700">تحميل الفاتورة (PDF)</a>
          </div>
        `
        await sendEmail({ to: ownerEmail, subject: `فاتورة اشتراك #${invoiceNumber} — Storely`, html })
      }
    }
  } catch (emailErr) {
    console.error('SEND_INVOICE_EMAIL_FAILED (non-fatal):', emailErr)
  }

  await logAdminAction(admin, 'send_invoice', orgId, orgName || null, { invoice_number: invoiceNumber, amount: total, items: cleanItems })

  return NextResponse.json({ success: true, invoiceNumber })
}
