import type { SupabaseClient } from '@supabase/supabase-js'
import { netFromTotal } from '@/lib/vat'
import { bestMatch } from '@/lib/productMatch'
import type { PurchaseTax } from '@/lib/taxInvoice'

// حفظ أصناف فاتورة وحدة (بعد قراءة الصورة): كل صنف سطر مشتريات، والمخزون:
//   صنف موجود (اختاره المستخدم أو تطابق قوي بالاسم) → تزيد كميته ويتحدّث متوسط التكلفة
//   «صنف جديد» أو ما فيه تطابق → ينضاف للمخزون
export type InvoiceItem = { name: string; qty: number; unit: string; total: number; product_id?: string | null }   // product_id: 'new' = صنف جديد
export type ItemResult = { name: string; product: string; action: 'added' | 'created' | 'no_stock' | 'failed'; productId?: string }

const AUTO_MATCH = 0.85   // بدون اختيار من المستخدم نطابق بس لو التشابه قوي جداً

export function cleanItems(raw: unknown): InvoiceItem[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 100).map((it: any) => ({
    name: String(it?.name || '').trim().slice(0, 120), qty: Math.max(0, Number(it?.qty) || 0), unit: String(it?.unit || 'قطعة').slice(0, 30),
    total: Math.max(0, Number(it?.total) || 0), product_id: typeof it?.product_id === 'string' ? it.product_id : null,
  })).filter(it => it.name && it.total > 0)
}

export async function saveInvoiceItems(db: SupabaseClient, o: {
  orgId: string; branchId: string | null; items: InvoiceItem[]; hasVat: boolean; supplier: string; invoiceImage: string | null
  tax: PurchaseTax; createdAt?: string; profileId?: string | null; staffName?: string; staffCreatesHidden?: boolean
}): Promise<ItemResult[]> {
  let pq = db.from('products').select('id,name,unit,qty,avg_cost').eq('org_id', o.orgId).eq('is_active', true)
  if (o.branchId) pq = pq.eq('branch_id', o.branchId)
  const { data: prods } = await pq.limit(2000)
  const stock = ((prods || []) as any[])
  const byId = new Map(stock.map(p => [p.id, p]))
  const by = o.staffName ? ` بواسطة: ${o.staffName}` : ''
  const results: ItemResult[] = []

  for (const it of o.items) {
    // الصنف المقصود: اختيار المستخدم (لازم يكون من نفس المنشأة والفرع) أو تطابق قوي
    let target: any = null
    if (it.product_id && it.product_id !== 'new') target = byId.get(it.product_id) || null
    else if (!it.product_id) target = bestMatch(it.name, stock, AUTO_MATCH)
    const name = target?.name || it.name
    const amount = netFromTotal(it.total, o.hasVat)

    const { error } = await db.from('purchases').insert({
      org_id: o.orgId, branch_id: o.branchId, profile_id: o.profileId ?? null, category: 'مخزون', name, qty: it.qty || null, unit: target?.unit || it.unit,
      reorder_point: 5, amount, has_vat: o.hasVat, supplier: o.supplier, note: o.staffName ? `تسجيل بواسطة الموظف: ${o.staffName}` : null,
      invoice_image: o.invoiceImage, payment_status: 'paid', ...(o.createdAt ? { created_at: o.createdAt } : {}), ...o.tax,
    } as any)
    if (error) { results.push({ name: it.name, product: name, action: 'failed' }); continue }
    if (!(it.qty > 0)) { results.push({ name: it.name, product: name, action: 'no_stock' }); continue }

    const unitCost = amount / it.qty
    if (target) {
      await db.from('stock_movements').insert({ product_id: target.id, org_id: o.orgId, profile_id: o.profileId ?? null, type: 'in', qty_change: it.qty,
        note: `شراء من: ${o.supplier}${by}`, ...(o.createdAt ? { created_at: o.createdAt } : {}) } as any)
      const oldQty = Number(target.qty) || 0, oldAvg = Number(target.avg_cost) || 0
      const newAvg = oldQty + it.qty > 0 ? (Math.max(0, oldQty) * oldAvg + it.qty * unitCost) / (Math.max(0, oldQty) + it.qty) : unitCost
      await db.from('products').update({ avg_cost: newAvg } as any).eq('id', target.id).eq('org_id', o.orgId)
      target.qty = oldQty + it.qty; target.avg_cost = newAvg
      results.push({ name: it.name, product: target.name, action: 'added', productId: target.id })
    } else {
      const { data: np } = await db.from('products').insert({ org_id: o.orgId, branch_id: o.branchId, name: it.name, unit: it.unit, qty: 0, reorder_point: 5,
        is_active: true, avg_cost: unitCost, ...(o.staffCreatesHidden ? { requires_staff_assignment: true } : {}) } as any).select('id,name,unit,qty,avg_cost').single()
      if (np) {
        await db.from('stock_movements').insert({ product_id: (np as any).id, org_id: o.orgId, profile_id: o.profileId ?? null, type: 'in', qty_change: it.qty,
          note: `شراء جديد من: ${o.supplier}${by}`, ...(o.createdAt ? { created_at: o.createdAt } : {}) } as any)
        // نفس الفاتورة فيها نفس الصنف مرتين؟ السطر الثاني يزيد على هذا بدل صنف ثالث
        stock.push({ ...(np as any), qty: it.qty }); byId.set((np as any).id, stock[stock.length - 1])
      }
      results.push({ name: it.name, product: it.name, action: np ? 'created' : 'no_stock', productId: (np as any)?.id })
    }
  }
  return results
}

/** ملخص للمستخدم: «زادت كمية ٢ أصناف موجودة · انضاف ١ صنف جديد» */
export function itemsSummary(r: ItemResult[]) {
  const added = r.filter(x => x.action === 'added').length, created = r.filter(x => x.action === 'created').length, failed = r.filter(x => x.action === 'failed').length
  return [added && `زادت كمية ${added} ${added === 1 ? 'صنف موجود' : 'أصناف موجودة'}`, created && `انضاف ${created} ${created === 1 ? 'صنف جديد' : 'أصناف جديدة'}`,
    failed && `ما انحفظ ${failed}`].filter(Boolean).join(' · ')
}
