import type { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { lockedFromError } from '@/lib/periodLock'
import { periodGuard, type Fail, type EditSource } from '@/lib/cashierClosingEdit'

// تعديل فاتورة مشتريات (المحاسب أو المالك): المبلغ والضريبة لسطر الفاتورة، والرقم الضريبي ورقم الفاتورة لكل سطور نفس الفاتورة
// كل سطر يتغير ينحفظ بقيمه قبل وبعد في purchase_edits (batch_id يجمعهم) عشان المالك يقدر يرجّعه
const FIELDS = 'id,org_id,branch_id,created_at,deleted_at,invoice_group,supplier,name,amount,has_vat,invoice_number,supplier_vat_number,total_amount,vat_amount'
export const PURCHASE_AUDIT = ['amount', 'has_vat', 'invoice_number', 'supplier_vat_number'] as const
const pick = (o: any) => Object.fromEntries(PURCHASE_AUDIT.map(k => [k, o?.[k] ?? null]))
const saudiDate = (iso: string) => new Date(Date.parse(iso) + 3 * 3600e3).toISOString().slice(0, 10)

/** القيم الجديدة من الطلب — بس الحقول المسموحة، وأي قيمة غلط ترجع رسالة */
export function purchaseChanges(input: any): { line: Record<string, unknown>; invoice: Record<string, unknown> } | string {
  const line: Record<string, unknown> = {}, invoice: Record<string, unknown> = {}
  if (input?.amount !== undefined) {
    const n = Number(input.amount)
    if (!Number.isFinite(n) || n < 0 || n >= 1e9) return 'المبلغ غير صحيح'
    line.amount = Math.round(n * 100) / 100
  }
  if (input?.has_vat !== undefined) line.has_vat = input.has_vat === true
  if (input?.invoice_number !== undefined) {
    const v = String(input.invoice_number ?? '').trim()
    if (v.length > 60) return 'رقم الفاتورة طويل'
    invoice.invoice_number = v || null
  }
  if (input?.supplier_vat_number !== undefined) {
    const v = String(input.supplier_vat_number ?? '').replace(/\s/g, '')
    if (v && !/^3\d{13}3$/.test(v)) return 'يتكون الرقم الضريبي من 15 رقماً ويبدأ وينتهي بالرقم 3'
    invoice.supplier_vat_number = v || null
  }
  return Object.keys(line).length || Object.keys(invoice).length ? { line, invoice } : 'بيانات ناقصة'
}

export async function editPurchase(db: SupabaseClient, orgId: string, id: string, input: any, editor: string, by: EditSource = {}, branchId: string | null = null)
  : Promise<{ ok: true; batchId: string; changed: number; summary: string[] } | Fail> {
  const source = by.source || 'owner'
  const ch = purchaseChanges(input)
  if (typeof ch === 'string') return { ok: false, error: ch, status: 400 }
  const { data: cur } = await db.from('purchases').select(FIELDS).eq('id', id).eq('org_id', orgId).maybeSingle()
  const p = cur as any
  if (!p || p.deleted_at) return { ok: false, error: 'الفاتورة غير موجودة', status: 404 }
  if (branchId && p.branch_id !== branchId) return { ok: false, error: 'هذه الفاتورة من فرع آخر', status: 403 }

  // سطور نفس الفاتورة (الرقم الضريبي ورقم الفاتورة واحد للفاتورة كلها)
  let rows: any[] = [p]
  if (Object.keys(ch.invoice).length && p.invoice_group) {
    const { data } = await db.from('purchases').select(FIELDS).eq('org_id', orgId).eq('invoice_group', p.invoice_group).is('deleted_at', null)
    rows = ((data || []) as any[]).length ? (data as any[]) : [p]
  }
  const g = await periodGuard(db, orgId, p.branch_id, rows.map(r => saudiDate(r.created_at))); if (g) return g

  const batchId = crypto.randomUUID()
  const now = new Date().toISOString()
  const summary: string[] = []
  let changed = 0
  for (const r of rows) {
    const next = { ...ch.invoice, ...(r.id === p.id ? ch.line : {}) }
    const diff = Object.fromEntries(Object.entries(next).filter(([k, v]) => (r[k] ?? null) !== (v ?? null)))
    if (!Object.keys(diff).length) continue
    const { data: after, error } = await db.from('purchases').update({ ...diff, edited_at: now, edited_by: editor, edited_source: source } as any)
      .eq('id', r.id).eq('org_id', orgId).select(FIELDS).single()
    if (error) return { ok: false, error: lockedFromError(error) || 'تعذر حفظ التعديل', status: lockedFromError(error) ? 423 : 500 }
    await db.from('purchase_edits').insert({ org_id: orgId, purchase_id: r.id, batch_id: batchId, source, accountant_id: by.accountantId || null,
      before: pick(r), after: pick(after), edited_by: editor } as any)
    changed++
    for (const k of Object.keys(diff)) summary.push(`${LABEL[k] || k}: من ${show(r[k])} إلى ${show((after as any)[k])}`)
  }
  if (!changed) return { ok: false, error: 'لا يوجد تغيير', status: 400 }
  return { ok: true, batchId, changed, summary: [...new Set(summary)] }
}

const LABEL: Record<string, string> = { amount: 'المبلغ قبل الضريبة', has_vat: 'عليها ضريبة', invoice_number: 'رقم الفاتورة', supplier_vat_number: 'الرقم الضريبي للمورد' }
const show = (v: unknown) => v === true ? 'نعم' : v === false ? 'لا' : v == null || v === '' ? '—' : String(v)

/** المالك يرجّع تعديل (كل سطور نفس الدفعة) — بشرط ما يكون بعده تعديل ثاني على نفس السطر */
export async function revertPurchaseBatch(db: SupabaseClient, orgId: string, batchId: string, editor: string): Promise<{ ok: true } | Fail> {
  const { data: edits } = await db.from('purchase_edits').select('id,purchase_id,before,created_at,reverted_at').eq('org_id', orgId).eq('batch_id', batchId)
  const list = (edits || []) as any[]
  if (!list.length) return { ok: false, error: 'التعديل غير موجود', status: 404 }
  if (list.some(e => e.reverted_at)) return { ok: false, error: 'تم التراجع عن هذا التعديل مسبقاً', status: 409 }
  for (const e of list) {
    const { data: later } = await db.from('purchase_edits').select('id').eq('org_id', orgId).eq('purchase_id', e.purchase_id).is('reverted_at', null).gt('created_at', e.created_at).limit(1)
    if (later?.length) return { ok: false, error: 'يوجد تعديل أحدث على الفاتورة نفسها — تراجع عنه أولاً', status: 409 }
  }
  const { data: rows } = await db.from('purchases').select('id,branch_id,created_at').eq('org_id', orgId).in('id', list.map(e => e.purchase_id))
  const g = await periodGuard(db, orgId, (rows as any[])?.[0]?.branch_id ?? null, ((rows || []) as any[]).map(r => saudiDate(r.created_at))); if (g) return g
  const now = new Date().toISOString()
  for (const e of list) {
    const { error } = await db.from('purchases').update({ ...pick(e.before), edited_at: now, edited_by: editor, edited_source: 'owner' } as any).eq('id', e.purchase_id).eq('org_id', orgId)
    if (error) return { ok: false, error: lockedFromError(error) || 'تعذر الترجيع', status: lockedFromError(error) ? 423 : 500 }
  }
  await db.from('purchase_edits').update({ reverted_at: now, reverted_by: editor } as any).eq('org_id', orgId).eq('batch_id', batchId)
  return { ok: true }
}
