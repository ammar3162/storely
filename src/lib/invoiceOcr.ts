// قراءة فاتورة شراء (صورة أو PDF) بالذكاء الاصطناعي — مكان واحد لصفحة المشتريات ووكيل الفواتير
import { reportAiFailure, aiFailureKind } from '@/lib/aiAlert'
import { normalizeVat, isValidVat, normalizeInvoiceNumber } from '@/lib/taxInvoice'

export type OcrResult =
  | { ok: true; data: any }
  | { ok: false; status: number; error: string; unavailable?: boolean }

const PROMPT = `أنت تحلل فاتورة شراء (صورة أو ملف PDF) (مشتريات) لمحل تجاري. استخرج المعلومات التالية بدقة:

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

export async function readInvoice(image: string, type: string): Promise<OcrResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          type === 'application/pdf'
            ? { type: 'document', source: { type: 'base64', media_type: type, data: image } }
            : { type: 'image', source: { type: 'base64', media_type: type, data: image } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('OCR_FAILED', res.status, detail.slice(0, 300))
    await reportAiFailure(res.status, detail, 'قراءة الفواتير')
    if (aiFailureKind(res.status, detail)) return { ok: false, status: 503, error: 'القراءة التلقائية متوقفة مؤقتاً — عبّي بيانات الفاتورة يدوي', unavailable: true }
    return { ok: false, status: 502, error: res.status === 529 || res.status === 429 ? 'خدمة القراءة مشغولة — جرّب بعد دقيقة' : 'تعذر قراءة الفاتورة — جرّب صورة أوضح أو عبّي يدوي' }
  }

  const data = await res.json()
  const text = data.content?.[0]?.text || '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { ok: false, status: 422, error: 'تعذر استخراج بيانات من الصورة' }

  let extracted: any
  try { extracted = JSON.parse(jsonMatch[0]) } catch {
    console.error('OCR_BAD_JSON', data.stop_reason, text.slice(0, 200))
    return { ok: false, status: 422, error: 'تعذر قراءة كل الفاتورة — جرّب صورة أقرب أو عبّي يدوي' }
  }
  if (extracted.error) return { ok: false, status: 422, error: String(extracted.error) }

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
  return { ok: true, data: extracted }
}
