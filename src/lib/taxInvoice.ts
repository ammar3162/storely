import type { SupabaseClient } from '@supabase/supabase-js'

// بيانات الفاتورة الضريبية: رقم الفاتورة والرقم الضريبي للمورد (١٥ رقم يبدأ وينتهي بـ 3)

const AR_DIGITS: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' }
export const toLatinDigits = (s: string) => s.replace(/[٠-٩۰-۹]/g, d => AR_DIGITS[d] || d)

/** ينظّف الرقم الضريبي (أرقام عربية، مسافات، شرطات) — null لو فاضي */
export function normalizeVat(raw: unknown): string | null {
  const d = toLatinDigits(String(raw ?? '')).replace(/\D/g, '')
  return d || null
}
export const isValidVat = (v: string | null | undefined) => !!v && /^3\d{13}3$/.test(v)

export function normalizeInvoiceNumber(raw: unknown): string | null {
  const s = toLatinDigits(String(raw ?? '')).replace(/[\u0000-\u001f]/g, '').trim().slice(0, 50)
  return s || null
}

export type TaxInfo = { invoice_number: string | null; supplier_vat_number: string | null }

/**
 * يجهّز بيانات الفاتورة الضريبية قبل الحفظ:
 *  - الرقم الضريبي لو انكتب لازم يكون صحيح
 *  - لو ما انكتب والمورد محفوظ رقمه → يتعبى تلقائياً
 *  - لو انكتب والمورد ما عنده رقم → ينحفظ معه للمرات الجاية
 */
export async function resolveTaxInfo(db: SupabaseClient, orgId: string, supplierName: string | null, body: { invoice_number?: unknown; supplier_vat_number?: unknown }, hasVat: boolean)
  : Promise<{ ok: true; info: TaxInfo } | { ok: false; error: string }> {
  const invoice_number = normalizeInvoiceNumber(body.invoice_number)
  let vat = normalizeVat(body.supplier_vat_number)
  if (vat && !isValidVat(vat)) return { ok: false, error: 'الرقم الضريبي للمورد غير صحيح — لازم ١٥ رقم يبدأ وينتهي بـ 3' }
  if (!hasVat) return { ok: true, info: { invoice_number, supplier_vat_number: null } }

  const name = (supplierName || '').trim()
  if (name) {
    const { data: sup } = await db.from('suppliers').select('id,vat_number').eq('org_id', orgId).eq('name', name).limit(1)
    const s = (sup as any[])?.[0]
    if (!vat && s?.vat_number) vat = s.vat_number
    else if (vat && s && !s.vat_number) await db.from('suppliers').update({ vat_number: vat } as any).eq('id', s.id).eq('org_id', orgId)
  }
  return { ok: true, info: { invoice_number, supplier_vat_number: vat } }
}
