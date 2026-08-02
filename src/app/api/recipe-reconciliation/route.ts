import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * تقرير مطابقة استهلاك الوصفات — يقارن "الاستهلاك المتوقع" (محسوب من مبيعات الوصفات × مكوناتها)
 * مقابل "الاستهلاك الفعلي" (حركات الصرف الفعلية للمواد الخام)، لكشف أي فرق غير مبرر
 * (هدر غير مسجّل، صرف مباشر غير محسوب بالوصفة، خطأ إدخال).
 */
export async function POST(req: Request) {
  try {
    const { org_id, branch_id } = await req.json()
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    let salesQ = (db as any).from('recipe_sales_log')
      .select('product_id,qty,created_at')
      .eq('org_id', org_id)
      .gte('created_at', since30)
    if (branch_id) salesQ = salesQ.eq('branch_id', branch_id)

    const { data: sales } = await salesQ
    if (!sales || sales.length === 0) {
      return NextResponse.json({ hasData: false, recipesSold: [], componentsReport: [] })
    }

    // إجمالي مبيعات كل وصفة
    const soldByProduct: Record<string, number> = {}
    for (const s of sales) soldByProduct[(s as any).product_id] = (soldByProduct[(s as any).product_id] || 0) + Number((s as any).qty)

    const recipeIds = Object.keys(soldByProduct)
    const { data: recipeProducts } = await db.from('products').select('id,name,unit').in('id', recipeIds)

    const recipesSold = (recipeProducts || []).map((p: any) => ({ id: p.id, name: p.name, unit: p.unit, qtySold: soldByProduct[p.id] || 0 })).sort((a, b) => b.qtySold - a.qtySold)

    const { data: recipeItems } = await (db as any).from('recipe_items').select('product_id,component_product_id,qty').in('product_id', recipeIds)

    const componentIds = [...new Set((recipeItems || []).map((r: any) => r.component_product_id))]
    if (componentIds.length === 0) {
      return NextResponse.json({ hasData: true, recipesSold, componentsReport: [] })
    }

    const { data: componentProducts } = await db.from('products').select('id,name,unit,recipe_unit,recipe_unit_factor').in('id', componentIds as string[])
    const compMap: Record<string, any> = {}
    for (const c of (componentProducts || [])) compMap[(c as any).id] = c

    // الاستهلاك المتوقع لكل مكوّن (بوحدة المخزون)
    const expected: Record<string, number> = {}
    for (const ri of (recipeItems || [])) {
      const r = ri as any
      const qtySold = soldByProduct[r.product_id] || 0
      if (qtySold === 0) continue
      const comp = compMap[r.component_product_id]
      const factor = comp?.recipe_unit_factor || 1
      const amount = (Number(r.qty) * qtySold) / factor
      expected[r.component_product_id] = (expected[r.component_product_id] || 0) + amount
    }

    // الاستهلاك الفعلي الحقيقي (كل حركات out لنفس المكونات بنفس الفترة)
    let actualQ = (db as any).from('stock_movements')
      .select('product_id,qty_change,products!inner(org_id,branch_id)')
      .eq('type', 'out')
      .in('product_id', componentIds as string[])
      .eq('products.org_id', org_id)
      .gte('created_at', since30)
    if (branch_id) actualQ = actualQ.eq('products.branch_id', branch_id)
    const { data: actualMoves } = await actualQ

    const actual: Record<string, number> = {}
    for (const m of (actualMoves || [])) {
      const r = m as any
      actual[r.product_id] = (actual[r.product_id] || 0) + Math.abs(r.qty_change)
    }

    const componentsReport = componentIds.map((id: any) => {
      const comp = compMap[id]
      const exp = expected[id] || 0
      const act = actual[id] || 0
      const variance = Math.round((act - exp) * 100) / 100
      return {
        id,
        name: comp?.name || '—',
        unit: comp?.unit || '',
        expected: Math.round(exp * 100) / 100,
        actual: Math.round(act * 100) / 100,
        variance,
        variancePercent: exp > 0 ? Math.round((variance / exp) * 1000) / 10 : null,
      }
    }).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))

    return NextResponse.json({ hasData: true, recipesSold, componentsReport })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
