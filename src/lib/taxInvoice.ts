import type { SupabaseClient } from '@supabase/supabase-js'
import { parseZatcaQr, zatcaFingerprint } from '@/lib/zatcaQr'

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

// ── باركود هيئة الزكاة: توثيق الفاتورة + كشف التكرار والتلاعب ──

export type PurchaseTax = TaxInfo & {
  invoice_group: string; qr_verified: boolean; qr_fingerprint: string | null; qr_total: number | null; qr_vat: number | null
  qr_issued_at: string | null; qr_mismatch: boolean
}
const TOL = 0.5   // سماحية التقريب بالريال

/**
 * يجهّز كل بيانات الفاتورة الضريبية قبل الحفظ.
 * enteredTotal = اللي بينسجل الحين من هالفاتورة (صنف واحد أو عدة أصناف).
 * - باركود صحيح: الرقم الضريبي منه (موقّع من المورد)، وأصناف نفس الفاتورة تنجمع بفاتورة وحدة
 * - الفاتورة مسجلة كاملة من قبل → رفض (تكرار)
 * - المسجّل يتجاوز مبلغ الفاتورة الأصلي → ينحفظ لكن يتعلّم ويتنبّه المالك
 */
export async function resolvePurchaseTax(db: SupabaseClient, orgId: string, supplierName: string | null,
  body: { invoice_number?: unknown; supplier_vat_number?: unknown; zatca_qr?: unknown }, hasVat: boolean, enteredTotal: number)
  : Promise<{ ok: true; tax: PurchaseTax; alert: string | null } | { ok: false; error: string; status: number }> {
  const qr = hasVat && typeof body.zatca_qr === 'string' ? parseZatcaQr(body.zatca_qr) : null
  const base = await resolveTaxInfo(db, orgId, supplierName, qr ? { ...body, supplier_vat_number: qr.vatNumber } : body, hasVat)
  if (!base.ok) return { ok: false, error: base.error, status: 400 }
  const tax: PurchaseTax = { ...base.info, invoice_group: crypto.randomUUID(), qr_verified: false, qr_fingerprint: null, qr_total: null, qr_vat: null, qr_issued_at: null, qr_mismatch: false }
  if (!qr) return { ok: true, tax, alert: null }

  const fp = zatcaFingerprint(qr)
  const { data: prev } = await db.from('purchases').select('invoice_group,total_amount,created_at,invoice_number')
    .eq('org_id', orgId).eq('qr_fingerprint', fp).is('deleted_at', null).limit(200)
  const rows = (prev || []) as any[]
  const already = Math.round(rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0) * 100) / 100
  if (rows.length && already >= qr.total - TOL) {
    const d = new Date(Date.parse(rows[0].created_at) + 3 * 3600e3).toISOString().slice(0, 10)
    return { ok: false, status: 409, error: `هذي الفاتورة مسجلة كاملة من قبل (${d}) — ما تنسجل مرتين` }
  }
  const mismatch = already + enteredTotal > qr.total + TOL
  Object.assign(tax, {
    invoice_group: rows[0]?.invoice_group || tax.invoice_group,
    invoice_number: tax.invoice_number || rows.find(r => r.invoice_number)?.invoice_number || null,
    qr_verified: true, qr_fingerprint: fp, qr_total: qr.total, qr_vat: qr.vat, qr_issued_at: qr.issuedAt, qr_mismatch: mismatch,
  })
  const alert = mismatch
    ? `المبلغ المسجّل (${(already + enteredTotal).toFixed(2)}) أكبر من مبلغ الفاتورة الأصلي في باركود الهيئة (${qr.total.toFixed(2)}) — فاتورة ${qr.sellerName}`
    : null
  return { ok: true, tax, alert }
}

/** تنبيه المالك: مبلغ فاتورة مسجّل أكبر من الأصلي */
export async function notifyQrMismatch(db: SupabaseClient, orgId: string, branchId: string | null, alert: string, by?: string) {
  await db.from('notifications').insert({
    org_id: orgId, branch_id: branchId, type: 'warning', read: false,
    title: '⚠️ فاتورة مبلغها أكبر من الأصلية', message: by ? `${alert} — سجّلها ${by}` : alert,
  } as any)
}
