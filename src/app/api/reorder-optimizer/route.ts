import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * يحسب نقطة إعادة الطلب المثلى لكل منتج بناءً على:
 * - معدل الصرف الفعلي (آخر 30 يوم)
 * - مدة توريد المورد الأساسي المرتبط بالمنتج
 * - هامش أمان 20%
 */
export async function POST(req: Request) {
  try {
    const { org_id, branch_id } = await req.json()
    const db = sb()
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    let prodQ6 = db.from('products').select('id,name,unit,qty,reorder_point,supplier_id').eq('org_id', org_id).eq('is_active', true)
    if (branch_id) prodQ6 = prodQ6.eq('branch_id', branch_id)
    let movQ6 = db.from('stock_movements')
      .select('product_id,qty_change,products!inner(org_id,branch_id)')
      .eq('products.org_id', org_id)
      .eq('type', 'out')
      .gte('created_at', since30)
    if (branch_id) movQ6 = movQ6.eq('products.branch_id', branch_id)

    const [{ data: products }, { data: movements }, { data: productSuppliers }] = await Promise.all([
      prodQ6,
      movQ6,
      (db as any).from('product_suppliers').select('product_id,supplier_id').eq('priority', 1),
    ])

    const dispMap: Record<string, number> = {}
    for (const m of (movements || [])) {
      const pid = (m as any).product_id
      if (!pid) continue
      dispMap[pid] = (dispMap[pid] || 0) + Math.abs((m as any).qty_change)
    }

    const primarySupplierMap: Record<string, string> = {}
    for (const ps of (productSuppliers || [])) primarySupplierMap[(ps as any).product_id] = (ps as any).supplier_id

    const supplierIds = [...new Set(Object.values(primarySupplierMap))]
    const { data: suppliers } = supplierIds.length
      ? await db.from('suppliers').select('id,response_timeout_hours').in('id', supplierIds)
      : { data: [] as any[] }
    const timeoutMap: Record<string, number> = {}
    for (const s of (suppliers || [])) timeoutMap[(s as any).id] = (s as any).response_timeout_hours || 24

    const DEFAULT_LEAD_DAYS = 3
    const SAFETY_MARGIN = 1.2

    const suggestions = (products || [])
      .filter((p: any) => p.supplier_id) // بس المنتجات المرتبطة بمورد (وإلا ما نقدر نحسب مدة التوريد)
      .map((p: any) => {
        const dailyRate = (dispMap[p.id] || 0) / 30
        const supplierId = primarySupplierMap[p.id] || p.supplier_id
        const leadTimeHours = timeoutMap[supplierId]
        const leadTimeDays = leadTimeHours ? leadTimeHours / 24 : DEFAULT_LEAD_DAYS

        const suggestedReorderPoint = Math.max(Math.ceil(dailyRate * leadTimeDays * SAFETY_MARGIN), dailyRate > 0 ? 1 : 0)
        const currentReorderPoint = p.reorder_point || 0

        let status: 'low' | 'high' | 'ok' = 'ok'
        if (dailyRate > 0 && currentReorderPoint < suggestedReorderPoint * 0.7) status = 'low'
        else if (currentReorderPoint > suggestedReorderPoint * 1.5 && suggestedReorderPoint > 0) status = 'high'

        return {
          id: p.id,
          name: p.name,
          unit: p.unit,
          currentQty: p.qty,
          currentReorderPoint,
          suggestedReorderPoint,
          dailyRate: Math.round(dailyRate * 100) / 100,
          leadTimeDays: Math.round(leadTimeDays * 10) / 10,
          status,
        }
      })
      .filter((s: any) => s.dailyRate > 0 && s.status !== 'ok') // بس المنتجات اللي فيها فرق ملحوظ
      .sort((a: any, b: any) => {
        const order: Record<string, number> = { low: 0, high: 1 }
        return (order[a.status] ?? 2) - (order[b.status] ?? 2)
      })

    return NextResponse.json({ suggestions, totalChecked: (products || []).filter((p: any) => p.supplier_id).length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
