import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * تقرير تقدير إنتاج الوصفات — يعتمد بالكامل على الاستهلاك الفعلي للمواد الخام
 * (حركات الصرف الحقيقية اللي يسجّلها الموظفون يدوياً)، مقارنةً بمكونات كل وصفة معرّفة،
 * ليقدّر "كم وحدة من كل وصفة تم تحضيرها تقريباً" — بدون أي تسجيل مبيعات مباشر.
 */
export async function POST(req: Request) {
  try {
    const { org_id, branch_id } = await req.json()
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    let recipesQ = (db as any).from('recipes').select('id,name').eq('org_id', org_id)
    if (branch_id) recipesQ = recipesQ.eq('branch_id', branch_id)
    const { data: recipes } = await recipesQ

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({ hasData: false, recipes: [] })
    }

    const recipeIds = recipes.map((r: any) => r.id)
    const { data: recipeItems } = await (db as any).from('recipe_items').select('recipe_id,component_product_id,qty').in('recipe_id', recipeIds)

    if (!recipeItems || recipeItems.length === 0) {
      return NextResponse.json({ hasData: true, recipes: recipes.map((r: any) => ({ id: r.id, name: r.name, estimatedProduced: 0, components: [] })) })
    }

    const componentIds = [...new Set(recipeItems.map((r: any) => r.component_product_id))]
    const { data: componentProducts } = await db.from('products').select('id,name,unit').in('id', componentIds as string[])
    const compMap: Record<string, any> = {}
    for (const c of (componentProducts || [])) compMap[(c as any).id] = c

    let movesQ = (db as any).from('stock_movements')
      .select('product_id,qty_change,products!inner(org_id,branch_id)')
      .eq('type', 'out')
      .in('product_id', componentIds as string[])
      .eq('products.org_id', org_id)
      .gte('created_at', since30)
    if (branch_id) movesQ = movesQ.eq('products.branch_id', branch_id)
    const { data: moves } = await movesQ

    const consumed: Record<string, number> = {}
    for (const m of (moves || [])) {
      const r = m as any
      consumed[r.product_id] = (consumed[r.product_id] || 0) + Math.abs(r.qty_change)
    }

    const report = recipes.map((r: any) => {
      const items = recipeItems.filter((ri: any) => ri.recipe_id === r.id)
      const components = items.map((ri: any) => {
        const comp = compMap[ri.component_product_id]
        const totalConsumed = consumed[ri.component_product_id] || 0
        const impliedCount = ri.qty > 0 ? Math.round((totalConsumed / ri.qty) * 10) / 10 : 0
        return {
          name: comp?.name || '—',
          unit: comp?.unit || '',
          consumed: Math.round(totalConsumed * 100) / 100,
          qtyPerUnit: ri.qty,
          impliedCount,
        }
      })
      const validCounts = components.map((c: any) => c.impliedCount).filter((n: number) => n > 0)
      const avg = validCounts.length ? Math.round((validCounts.reduce((s: number, n: number) => s + n, 0) / validCounts.length) * 10) / 10 : 0
      const min = validCounts.length ? Math.min(...validCounts) : 0
      const max = validCounts.length ? Math.max(...validCounts) : 0
      return { id: r.id, name: r.name, estimatedProduced: avg, minEstimate: min, maxEstimate: max, components }
    })

    return NextResponse.json({ hasData: true, recipes: report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
