import type { SupabaseClient } from '@supabase/supabase-js'

// طلبات المحاسب للمنشأة
export const REQUEST_KINDS = {
  missing_vat: 'ناقص الرقم الضريبي أو رقم الفاتورة',
  unclear_image: 'صورة الفاتورة مو واضحة',
  amount: 'المبلغ ما يطابق الفاتورة',
  explain: 'وش هالمصروف؟',
  document: 'أرسلوا مستند',
  other: 'ملاحظة',
} as const
export type RequestKind = keyof typeof REQUEST_KINDS
export const isKind = (k: unknown): k is RequestKind => typeof k === 'string' && k in REQUEST_KINDS
export const MAX_OPEN_PER_ORG = 100
const UUID = /^[0-9a-f-]{36}$/i

/** الهدف (فاتورة أو إقفال) لازم يكون من نفس المنشأة */
export async function validateTarget(db: SupabaseClient, orgId: string, t: { invoice_group?: unknown; purchase_id?: unknown; closing_id?: unknown }) {
  const out: { invoice_group: string | null; purchase_id: string | null; closing_id: string | null } = { invoice_group: null, purchase_id: null, closing_id: null }
  if (t.invoice_group) {
    if (!UUID.test(String(t.invoice_group))) return null
    const { count } = await db.from('purchases').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('invoice_group', String(t.invoice_group))
    if (!count) return null
    out.invoice_group = String(t.invoice_group)
  } else if (t.purchase_id) {
    if (!UUID.test(String(t.purchase_id))) return null
    const { data } = await db.from('purchases').select('id').eq('org_id', orgId).eq('id', String(t.purchase_id)).maybeSingle()
    if (!data) return null
    out.purchase_id = String(t.purchase_id)
  }
  if (t.closing_id) {
    if (!UUID.test(String(t.closing_id))) return null
    const { data } = await db.from('cashier_closings').select('id').eq('org_id', orgId).eq('id', String(t.closing_id)).maybeSingle()
    if (!data) return null
    out.closing_id = String(t.closing_id)
  }
  return out
}

/** بيانات الفاتورة/الإقفال للعرض جنب كل طلب */
export async function withTargets(db: SupabaseClient, orgId: string, rows: any[]) {
  const groups = [...new Set(rows.map(r => r.invoice_group).filter(Boolean))]
  const ids = [...new Set(rows.map(r => r.purchase_id).filter(Boolean))]
  const closings = [...new Set(rows.map(r => r.closing_id).filter(Boolean))]
  const [g, p, c] = await Promise.all([
    groups.length ? db.from('purchases').select('id,invoice_group,created_at,supplier,total_amount,invoice_number,supplier_vat_number,invoice_image,has_vat').eq('org_id', orgId).in('invoice_group', groups) : { data: [] },
    ids.length ? db.from('purchases').select('id,invoice_group,created_at,supplier,total_amount,invoice_number,supplier_vat_number,invoice_image,has_vat').eq('org_id', orgId).in('id', ids) : { data: [] },
    closings.length ? db.from('cashier_closings').select('id,closing_date,staff_name,total_sales,difference').eq('org_id', orgId).in('id', closings) : { data: [] },
  ])
  const inv = (list: any[]) => list.length ? {
    date: new Date(Date.parse(list[0].created_at) + 3 * 3600e3).toISOString().slice(0, 10), supplier: list[0].supplier,
    total: Math.round(list.reduce((s, x) => s + (Number(x.total_amount) || 0), 0) * 100) / 100,
    invoice_number: list.find(x => x.invoice_number)?.invoice_number || null, supplier_vat_number: list.find(x => x.supplier_vat_number)?.supplier_vat_number || null,
    invoice_image: list.find(x => x.invoice_image)?.invoice_image || null, has_vat: list.some(x => x.has_vat),
  } : null
  return rows.map(r => ({
    ...r,
    invoice: r.invoice_group ? inv(((g.data || []) as any[]).filter(x => x.invoice_group === r.invoice_group)) : r.purchase_id ? inv(((p.data || []) as any[]).filter(x => x.id === r.purchase_id)) : null,
    closing: r.closing_id ? ((c.data || []) as any[]).find(x => x.id === r.closing_id) || null : null,
  }))
}
