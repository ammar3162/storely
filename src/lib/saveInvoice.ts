// حفظ فاتورة متعددة الأصناف كمشتريات — مكان واحد لصفحة المشتريات (الأصناف المقروءة) ووكيل الفواتير:
// تحقق الفرع، الشهر المقفل، الضريبة والتكرار، ثم كل صنف سطر مشتريات وحركة مخزون
import type { SupabaseClient } from '@supabase/supabase-js'
import { isStoredInvoiceUrl } from '@/lib/invoiceUrl'
import { lockedFor } from '@/lib/periodLock'
import { invoiceTimestamp } from '@/lib/invoiceTime'
import { resolvePurchaseTax, notifyQrMismatch } from '@/lib/taxInvoice'
import { cleanItems, saveInvoiceItems, itemsSummary, type ItemResult } from '@/lib/purchaseItems'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type SaveInvoiceResult =
  | { ok: true; saved: number; results: ItemResult[]; summary: string }
  | { ok: false; status: number; error: string; duplicate?: boolean; results?: ItemResult[] }

/** body: نفس حقول /api/purchases/bulk (supplier, invoice_image, invoice_date, has_vat, items, invoice_number, supplier_vat_number, zatca_qr, allow_duplicate) */
export async function saveInvoice(db: SupabaseClient, o: { orgId: string; branchId: string | null; profileId: string | null; body: any }): Promise<SaveInvoiceResult> {
  const { body } = o
  const items = cleanItems(body.items)
  if (items.some(it => !Number.isInteger(it.qty))) return { ok: false, status: 400, error: 'الكمية لازم رقم صحيح — لو فيها كسور استخدم وحدة أصغر (غرام بدل كيلو مثلاً)' }
  if (!items.length) return { ok: false, status: 400, error: 'حدد صنف واحد على الأقل واكتب سعره' }
  if (!DATE_RE.test(String(body.invoice_date || ''))) return { ok: false, status: 400, error: 'تاريخ غير صالح' }
  if (o.branchId) {
    const { data: b } = await db.from('branches').select('id').eq('id', o.branchId).eq('org_id', o.orgId).maybeSingle()
    if (!b) return { ok: false, status: 404, error: 'الفرع غير موجود' }
  }
  const locked = await lockedFor(db, o.orgId, [body.invoice_date])
  if (locked) return { ok: false, status: 423, error: locked }
  const hasVat = body.has_vat !== false
  if (body.invoice_image && !isStoredInvoiceUrl(body.invoice_image)) return { ok: false, status: 400, error: 'رابط الفاتورة غير صالح — ارفع الصورة من جديد' }
  if (hasVat && !body.invoice_image) return { ok: false, status: 400, error: 'الفاتورة الضريبية لازم ترفق صورتها أو ملفها' }
  const sup = String(body.supplier || '').trim().slice(0, 120) || null
  const tax = await resolvePurchaseTax(db, o.orgId, sup, body, hasVat, items.reduce((s, it) => s + it.total, 0))   // كل الأصناف = فاتورة وحدة للمحاسب
  if (!tax.ok) return { ok: false, status: tax.status, error: tax.error, duplicate: tax.duplicate || undefined }

  const results = await saveInvoiceItems(db, { orgId: o.orgId, branchId: o.branchId, items, hasVat, supplier: sup || '—', invoiceImage: body.invoice_image || null,
    tax: tax.tax, createdAt: invoiceTimestamp(body.invoice_date), profileId: o.profileId })
  const saved = results.filter(r => r.action !== 'failed').length
  if (saved && tax.alert) await notifyQrMismatch(db, o.orgId, o.branchId, tax.alert)
  if (!saved) return { ok: false, status: 500, error: 'فشل حفظ الفاتورة', results }
  return { ok: true, saved, results, summary: itemsSummary(results) }
}
