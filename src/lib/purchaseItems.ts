import type { SupabaseClient } from '@supabase/supabase-js'
import { netFromTotal } from '@/lib/vat'
import { bestMatch } from '@/lib/productMatch'
import type { PurchaseTax } from '@/lib/taxInvoice'
import { branchFeatureDenied } from '@/lib/featureRoutes'
import { conversionFactor, loadUnitMap, saveProductUnit, normalizeUnit } from '@/lib/productUnits'

// حفظ أصناف فاتورة وحدة (بعد قراءة الصورة): كل صنف سطر مشتريات، والمخزون:
//   صنف موجود (اختاره المستخدم أو تطابق قوي بالاسم) → تزيد كميته ويتحدّث متوسط التكلفة
//   «صنف جديد» أو ما فيه تطابق → ينضاف للمخزون
// product_id: 'new' = صنف جديد، 'expense' = مشتريات بدون مخزون — factor: كم وحدة مخزون في وحدة الفاتورة (من إجابة العميل)
export type InvoiceItem = { name: string; qty: number; unit: string; total: number; product_id?: string | null; factor?: number | null }
export type ItemResult = { name: string; product: string; action: 'added' | 'created' | 'no_stock' | 'expense' | 'failed'; productId?: string; stockQty?: number; stockUnit?: string }

const AUTO_MATCH = 0.85   // بدون اختيار من المستخدم نطابق بس لو التشابه قوي جداً

export function cleanItems(raw: unknown): InvoiceItem[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 100).map((it: any) => ({
    name: String(it?.name || '').trim().slice(0, 120), qty: Math.max(0, Number(it?.qty) || 0), unit: normalizeUnit(it?.unit) || 'حبة',
    total: Math.max(0, Number(it?.total) || 0), product_id: typeof it?.product_id === 'string' ? it.product_id : null,
    factor: Number(it?.factor) > 0 && Number(it?.factor) <= 100000 ? Number(it.factor) : null,
  })).filter(it => it.name && it.total > 0)
}

export async function saveInvoiceItems(db: SupabaseClient, o: {
  orgId: string; branchId: string | null; items: InvoiceItem[]; hasVat: boolean; supplier: string; invoiceImage: string | null
  tax: PurchaseTax; createdAt?: string; profileId?: string | null; staffName?: string; staffCreatesHidden?: boolean
}): Promise<ItemResult[]> {
  // الفرع بدون المخزون («ابنِ باقتك»): كل الأصناف تنحفظ مشتريات (مصروف) بدون حركة مخزون
  const noInventory = !!(await branchFeatureDenied(o.orgId, ['inventory'], o.branchId, db))
  let pq = db.from('products').select('id,name,unit,qty,avg_cost').eq('org_id', o.orgId).eq('is_active', true)
  if (o.branchId) pq = pq.eq('branch_id', o.branchId)
  const { data: prods } = await pq.limit(2000)
  const stock = ((prods || []) as any[])
  const byId = new Map(stock.map(p => [p.id, p]))
  // وحدات الشراء المحفوظة (كرتون = 12 كيس...) للأصناف المختارة في الفاتورة
  const unitMap = await loadUnitMap(db, o.orgId, o.items.map(it => it.product_id || '').filter(id => byId.has(id)))
  const by = o.staffName ? ` بواسطة: ${o.staffName}` : ''
  const results: ItemResult[] = []

  for (const it of o.items) {
    // «مشتريات»: مصروف بدون مخزون (أدوات تنظيف، غاز، صيانة...) — سطر مشتريات بس
    if (it.product_id === 'expense' || noInventory) {
      const { error } = await db.from('purchases').insert({
        org_id: o.orgId, branch_id: o.branchId, profile_id: o.profileId ?? null, category: 'مشتريات', name: it.name, qty: it.qty || null, unit: it.unit,
        amount: netFromTotal(it.total, o.hasVat), has_vat: o.hasVat, supplier: o.supplier, note: o.staffName ? `تسجيل بواسطة الموظف: ${o.staffName}` : null,
        invoice_image: o.invoiceImage, payment_status: 'paid', ...(o.createdAt ? { created_at: o.createdAt } : {}), ...o.tax,
      } as any)
      results.push({ name: it.name, product: it.name, action: error ? 'failed' : 'expense' })
      continue
    }
    // الصنف المقصود: اختيار المستخدم (لازم يكون من نفس المنشأة والفرع) أو تطابق قوي
    let target: any = null
    if (it.product_id && it.product_id !== 'new') target = byId.get(it.product_id) || null
    else if (!it.product_id) target = bestMatch(it.name, stock, AUTO_MATCH)
    const name = target?.name || it.name
    const amount = netFromTotal(it.total, o.hasVat)
    // تحويل وحدة الفاتورة لوحدة المخزون: إجابة العميل، ثم المحفوظ للصنف، ثم الثابت (كيلو=1000 غرام)، وإلا 1 (السلوك القديم)
    let factor = 1
    if (target) {
      const known = conversionFactor(target.unit, it.unit, unitMap.get(target.id))
      factor = it.factor || known || 1
      if (it.factor && it.factor !== known) {
        await saveProductUnit(db, o.orgId, target.id, target.unit, it.unit, it.factor)
        unitMap.set(target.id, { ...(unitMap.get(target.id) || {}), [normalizeUnit(it.unit)]: it.factor })
      }
    }
    // المخزون بأعداد صحيحة (عمود qty عدد صحيح) — التحويل يُقرَّب لأقرب وحدة مخزون (بدون صفر)
    const stockQty = factor === 1 ? it.qty : Math.max(1, Math.round(it.qty * factor))

    const { error } = await db.from('purchases').insert({
      org_id: o.orgId, branch_id: o.branchId, profile_id: o.profileId ?? null, category: 'مخزون', name, qty: it.qty || null, unit: target?.unit || it.unit,
      reorder_point: 5, amount, has_vat: o.hasVat, supplier: o.supplier, note: o.staffName ? `تسجيل بواسطة الموظف: ${o.staffName}` : null,
      invoice_image: o.invoiceImage, payment_status: 'paid', ...(o.createdAt ? { created_at: o.createdAt } : {}), ...o.tax,
    } as any)
    if (error) { results.push({ name: it.name, product: name, action: 'failed' }); continue }
    if (!(it.qty > 0)) { results.push({ name: it.name, product: name, action: 'no_stock' }); continue }

    // التكلفة لكل وحدة مخزون (الكرتون بـ 240 وفيه 24 كيس → الكيس بـ 10)
    const unitCost = amount / stockQty
    if (target) {
      const conv = factor !== 1 ? ` (${it.qty} ${it.unit} = ${stockQty} ${target.unit})` : ''
      await db.from('stock_movements').insert({ product_id: target.id, org_id: o.orgId, profile_id: o.profileId ?? null, type: 'in', qty_change: stockQty,
        note: `شراء من: ${o.supplier}${conv}${by}`, ...(o.createdAt ? { created_at: o.createdAt } : {}) } as any)
      const oldQty = Number(target.qty) || 0, oldAvg = Number(target.avg_cost) || 0
      const newAvg = oldQty + stockQty > 0 ? (Math.max(0, oldQty) * oldAvg + stockQty * unitCost) / (Math.max(0, oldQty) + stockQty) : unitCost
      await db.from('products').update({ avg_cost: newAvg } as any).eq('id', target.id).eq('org_id', o.orgId)
      target.qty = oldQty + stockQty; target.avg_cost = newAvg
      results.push({ name: it.name, product: target.name, action: 'added', productId: target.id, stockQty, stockUnit: target.unit })
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
  const expense = r.filter(x => x.action === 'expense').length
  return [added && `زادت كمية ${added} ${added === 1 ? 'صنف موجود' : 'أصناف موجودة'}`, created && `أُضيف ${created} ${created === 1 ? 'صنف جديد' : 'أصناف جديدة'}`,
    expense && `${expense} مشتريات بدون مخزون`, failed && `لم يُحفظ ${failed}`].filter(Boolean).join(' · ')
}
