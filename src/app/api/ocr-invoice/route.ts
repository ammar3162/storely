import { NextResponse } from 'next/server'
import { normalizeVat, isValidVat, normalizeInvoiceNumber } from '@/lib/taxInvoice'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { staffHasPermission, NO_PURCHASES } from '@/lib/staffPermission'
import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
// قراءة فاتورة مفصّلة تاخذ أكثر من ١٠ ثواني — بدون هذا السيرفر يقطعها قبل ما تخلص
export const maxDuration = 60

/**
 * يستخرج بيانات فاتورة شراء من صورة باستخدام رؤية Claude (Vision).
 * يقبل إما جلسة مالك (Supabase session) أو توكن موظف — نفس نمط
 * notify-low-stock-instant المزدوج.
 */
export async function POST(req: Request) {
  try {
    const { image, mediaType, org_id } = await req.json()
    if (!image || !org_id) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // تحقق مزدوج: توكن موظف أو جلسة مالك
    const staffAuth = await verifyStaffToken(extractStaffToken(req))
    if (staffAuth.valid) {
      if (staffAuth.data!.org_id !== org_id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      // القراءة الذكية لها تكلفة — للموظف اللي عنده صلاحية المشتريات بس
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      if (!(await staffHasPermission(db, staffAuth.data!.staff_id, org_id, 'purchases'))) return NextResponse.json({ error: NO_PURCHASES }, { status: 403 })
    } else {
      const ownerAuth = await verifyOrgAccess(org_id)
      if (!ownerAuth.authorized) return NextResponse.json({ error: ownerAuth.error }, { status: ownerAuth.status })
    }

    const prompt = `أنت تحلل صورة فاتورة شراء (مشتريات) لمحل تجاري. استخرج المعلومات التالية بدقة:

1. اسم المورد أو المحل البائع (supplier)
2. تاريخ الفاتورة بصيغة YYYY-MM-DD (invoice_date) — إذا غير واضح استخدم null
3. الإجمالي الكلي شامل الضريبة إن وجدت (total_amount) — رقم فقط
4. هل الفاتورة تحتوي ضريبة قيمة مضافة 15% واضحة (has_vat) — true أو false
5. رقم الفاتورة كما هو مكتوب (invoice_number) — إذا غير موجود استخدم null
6. الرقم الضريبي للمورد/البائع (supplier_vat_number) — ١٥ رقم يبدأ بـ 3 وينتهي بـ 3، أرقام فقط. لا تخلطه برقم ضريبي للمشتري. إذا غير موجود استخدم null
7. قائمة الأصناف الظاهرة بالفاتورة (items) — لكل صنف: الاسم (name)، الكمية (qty) إن وجدت، الوحدة (unit) مثل "كيلو" أو "قطعة" أو "كرتون" إن وجدت، وإجمالي سطر الصنف كما هو مطبوع (line_total) رقم فقط أو null
8. هل أسعار الأصناف المطبوعة شاملة الضريبة (prices_include_vat) — true أو false (غالباً false لو الفاتورة فيها سطر ضريبة منفصل تحت)

أعطني فقط كائن JSON بهذا الشكل بدون أي شرح أو نص إضافي:
{
  "supplier": "اسم المورد",
  "invoice_date": "2026-07-18",
  "total_amount": 450.50,
  "has_vat": true,
  "invoice_number": "INV-1024",
  "supplier_vat_number": "300012345678903",
  "items": [
    {"name": "اسم الصنف", "qty": 10, "unit": "كيلو", "line_total": 120.00}
  ],
  "prices_include_vat": false
}

لو الصورة مو واضحة أو مو فاتورة أصلاً، أرجع: {"error": "لم يتم التعرف على فاتورة واضحة بالصورة"}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('OCR_FAILED', res.status, detail.slice(0, 300))
      return NextResponse.json({ error: res.status === 529 || res.status === 429 ? 'خدمة القراءة مشغولة — جرّب بعد دقيقة' : 'تعذر قراءة الصورة — جرّب صورة أوضح' }, { status: 502 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'تعذر استخراج بيانات من الصورة' }, { status: 422 })

    let extracted: any
    try { extracted = JSON.parse(jsonMatch[0]) } catch {
      console.error('OCR_BAD_JSON', data.stop_reason, text.slice(0, 200))
      return NextResponse.json({ error: 'تعذر قراءة كل الفاتورة — جرّب صورة أقرب أو عبّي يدوي' }, { status: 422 })
    }
    if (extracted.error) return NextResponse.json({ error: extracted.error }, { status: 422 })

    // نتأكد من الرقم الضريبي قبل ما يوصل للنموذج — الغلط أخطر من الفاضي
    const vat = normalizeVat(extracted.supplier_vat_number)
    extracted.supplier_vat_number = isValidVat(vat) ? vat : null
    extracted.invoice_number = normalizeInvoiceNumber(extracted.invoice_number)
    // سعر كل صنف شامل الضريبة (عشان يطابق طريقة الحفظ) — لو المطبوع قبل الضريبة نضيفها
    const addVat = extracted.has_vat && extracted.prices_include_vat === false
    if (Array.isArray(extracted.items)) extracted.items = extracted.items.slice(0, 60).map((it: any) => {
      const lt = Number(it?.line_total)
      return { name: String(it?.name || '').slice(0, 120), qty: Number(it?.qty) || null, unit: it?.unit ? String(it.unit).slice(0, 30) : null,
        total: lt > 0 ? Math.round(lt * (addVat ? 1.15 : 1) * 100) / 100 : null }
    })
    return NextResponse.json({ success: true, data: extracted })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة الصورة' }, { status: 500 })
  }
}
