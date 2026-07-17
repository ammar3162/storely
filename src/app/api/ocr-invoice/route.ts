import { NextResponse } from 'next/server'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

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
    const staffAuth = verifyStaffToken(extractStaffToken(req))
    if (staffAuth.valid) {
      if (staffAuth.data!.org_id !== org_id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    } else {
      const ownerAuth = await verifyOrgAccess(org_id)
      if (!ownerAuth.authorized) return NextResponse.json({ error: ownerAuth.error }, { status: ownerAuth.status })
    }

    const prompt = `أنت تحلل صورة فاتورة شراء (مشتريات) لمحل تجاري. استخرج المعلومات التالية بدقة:

1. اسم المورد أو المحل البائع (supplier)
2. تاريخ الفاتورة بصيغة YYYY-MM-DD (invoice_date) — إذا غير واضح استخدم null
3. الإجمالي الكلي شامل الضريبة إن وجدت (total_amount) — رقم فقط
4. هل الفاتورة تحتوي ضريبة قيمة مضافة 15% واضحة (has_vat) — true أو false
5. قائمة الأصناف الظاهرة بالفاتورة (items) — لكل صنف: الاسم (name)، الكمية (qty) إن وجدت، الوحدة (unit) مثل "كيلو" أو "قطعة" أو "كرتون" إن وجدت

أعطني فقط كائن JSON بهذا الشكل بدون أي شرح أو نص إضافي:
{
  "supplier": "اسم المورد",
  "invoice_date": "2026-07-18",
  "total_amount": 450.50,
  "has_vat": true,
  "items": [
    {"name": "اسم الصنف", "qty": 10, "unit": "كيلو"}
  ]
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
        max_tokens: 1500,
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
      return NextResponse.json({ error: 'تعذر تحليل الصورة' }, { status: 500 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'تعذر استخراج بيانات من الصورة' }, { status: 422 })

    const extracted = JSON.parse(jsonMatch[0])
    if (extracted.error) return NextResponse.json({ error: extracted.error }, { status: 422 })

    return NextResponse.json({ success: true, data: extracted })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة الصورة' }, { status: 500 })
  }
}
