// الفواتير المرتجعة في إقفال الكاشير (طلب المالك 2026-11-17): صورة الفاتورة + رقمها + سبب اختياري
// للتوثيق فقط — ما تغيّر حساب الكاش. الهدف: المالك يشوف عدد المرتجعات وصورها، ويتأكد إنها طبيعية،
// ويلاحظ لو كثرت (رضا العملاء)، ويطلع له «مكرر» لو نفس الفاتورة انسجلت مرتجع قبل
import type { SupabaseClient } from '@supabase/supabase-js'

export const MAX_RETURNS = 20
export const RETURN_DUP_DAYS = 90

export const RETURN_REASONS = [
  { key: 'wrong_order', ar: 'خطأ في الطلب', en: 'Wrong order' },
  { key: 'unsatisfied', ar: 'العميل غير راضٍ', en: 'Customer not satisfied' },
  { key: 'cancelled', ar: 'العميل ألغى الطلب', en: 'Customer cancelled' },
  { key: 'other', ar: 'سبب آخر', en: 'Other reason' },
] as const
export type ReturnReason = typeof RETURN_REASONS[number]['key']

/** مرتجع محفوظ في cashier_closings.returns — dup_of = تاريخ إقفال سابق فيه نفس رقم الفاتورة */
export type ClosingReturn = { invoice_no: string; photo: string; reason: ReturnReason | null; dup_of?: string | null }

export const returnReasonAr = (k?: string | null) => RETURN_REASONS.find(r => r.key === k)?.ar || ''

/** رقم الفاتورة كما يكتبه الكاشير: الأرقام العربية والفارسية تصير إنجليزية، بدون مسافات زايدة، حتى 40 حرف */
export function cleanInvoiceNo(v: unknown): string {
  return String(v ?? '')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, ' ').trim().slice(0, 40)
}

/** مرتجعات الإقفال من الطلب: كل مرتجع لازم له صورة ورقم، وما يتكرر الرقم في نفس الإقفال */
export function returnsFromInput(v: unknown, safePhoto: (u: unknown) => string | null): { ok: true; returns: ClosingReturn[] } | { ok: false; error: string } {
  if (v == null) return { ok: true, returns: [] }
  if (!Array.isArray(v)) return { ok: false, error: 'بيانات المرتجعات غير صحيحة' }
  if (v.length > MAX_RETURNS) return { ok: false, error: `الحد الأقصى ${MAX_RETURNS} فاتورة مرتجعة في الإقفال الواحد` }
  const out: ClosingReturn[] = []
  for (const r of v as any[]) {
    const invoice_no = cleanInvoiceNo(r?.invoice_no)
    if (!invoice_no) return { ok: false, error: 'اكتب رقم كل فاتورة مرتجعة' }
    const photo = safePhoto(r?.photo)
    if (!photo) return { ok: false, error: `صوّر الفاتورة المرتجعة رقم ${invoice_no}` }
    if (out.some(x => x.invoice_no === invoice_no)) return { ok: false, error: `رقم الفاتورة ${invoice_no} مكرر في هذا الإقفال` }
    const reason = RETURN_REASONS.some(x => x.key === r?.reason) ? (r.reason as ReturnReason) : null
    out.push({ invoice_no, photo, reason })
  }
  return { ok: true, returns: out }
}

/** القائمة المحفوظة (قديمة أو فاضية = []) — للعرض في التقارير */
export function closingReturns(c: { returns?: unknown } | null | undefined): ClosingReturn[] {
  return Array.isArray(c?.returns) ? (c!.returns as ClosingReturn[]).filter(r => r && typeof r.invoice_no === 'string') : []
}

/**
 * أرقام فواتير سبق تسجيلها مرتجع بنفس الفرع آخر 90 يوم → { رقم: تاريخ أول إقفال }
 * (تنبيه للكاشير قبل الحفظ، وعلامة «مكرر» عند المالك — ما يمنع الحفظ لأن الفاتورة ممكن ترجع على دفعتين)
 */
export async function previousReturns(db: SupabaseClient, orgId: string, branchId: string | null, nos: string[], today: string): Promise<Record<string, string>> {
  const want = new Set(nos.filter(Boolean))
  if (!want.size) return {}
  const since = new Date(Date.parse(today + 'T00:00:00Z') - RETURN_DUP_DAYS * 86400000).toISOString().slice(0, 10)
  let q = db.from('cashier_closings').select('closing_date,returns').eq('org_id', orgId).gte('closing_date', since)
    .neq('returns', '[]').order('closing_date', { ascending: true }).limit(1000)
  q = branchId ? q.eq('branch_id', branchId) : q.is('branch_id', null)
  const { data } = await q
  const out: Record<string, string> = {}
  for (const c of (data || []) as any[]) for (const r of closingReturns(c)) {
    if (want.has(r.invoice_no) && !out[r.invoice_no]) out[r.invoice_no] = c.closing_date
  }
  return out
}

/** ملخص مرتجعات فترة: العدد، كم إقفال فيه مرتجعات، المكررة، وحسب السبب ('none' = بدون سبب) */
export function returnsStats(closings: { returns?: unknown }[]) {
  let total = 0, withReturns = 0, dups = 0
  const byReason: Record<string, number> = {}
  for (const c of closings) {
    const rs = closingReturns(c)
    if (rs.length) withReturns++
    total += rs.length
    for (const r of rs) {
      if (r.dup_of) dups++
      const k = r.reason || 'none'
      byReason[k] = (byReason[k] || 0) + 1
    }
  }
  return { total, withReturns, dups, byReason }
}
