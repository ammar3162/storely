import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * تقرير تقدير إنتاج الوصفات — يعتمد بالكامل على الاستهلاك الفعلي للمواد الخام
 * (حركات الصرف الحقيقية اللي يسجّلها الموظفون يدوياً)، مقارنةً بمكونات كل وصفة معرّفة،
 * ليقدّر "كم وحدة من كل وصفة تم تحضيرها تقريباً" — بدون أي تسجيل مبيعات مباشر.
 * كمان يحسب تكلفة الإنتاج التقديرية: تكلفة الوحدة الواحدة (من متوسط سعر شراء كل مكوّن)
 * × عدد الوحدات المُقدّرة = التكلفة الإجمالية لإنتاج الفترة.
 */
export async function POST(req: Request) {
  try {
    const { org_id, branch_id, from, to } = await req.json()
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    // لو ما تحدد نطاق تاريخ، افتراضياً آخر 30 يوم. لو تحدد، نطاق مخصص (تشمل اليوم كامل بالنهاية)
    const since30 = from ? new Date(from + 'T00:00:00').toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const untilDate = to ? new Date(to + 'T23:59:59').toISOString() : null

    // الوصفات مشتركة على مستوى الشركة كاملة — نجيبها كلها بغض النظر عن الفرع المختار حالياً
    let recipesQ = (db as any).from('recipes').select('id,name').eq('org_id', org_id)
    const { data: recipes } = await recipesQ

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({ hasData: false, recipes: [] })
    }

    const recipeIds = recipes.map((r: any) => r.id)
    const { data: recipeItems } = await (db as any).from('recipe_items').select('recipe_id,component_product_id,qty').in('recipe_id', recipeIds)

    if (!recipeItems || recipeItems.length === 0) {
      return NextResponse.json({ hasData: true, recipes: recipes.map((r: any) => ({ id: r.id, name: r.name, estimatedProduced: 0, costPerUnit: null, totalCost: null, components: [] })) })
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
    if (untilDate) movesQ = movesQ.lte('created_at', untilDate)
    if (branch_id) movesQ = movesQ.eq('products.branch_id', branch_id)
    const { data: moves } = await movesQ

    const consumed: Record<string, number> = {}
    for (const m of (moves || [])) {
      const r = m as any
      consumed[r.product_id] = (consumed[r.product_id] || 0) + Math.abs(r.qty_change)
    }

    // متوسط سعر الوحدة لكل مكوّن (من سجل المشتريات، بنفس منهج تقرير الهدر وحاسبة التكلفة بنافذة الوصفة)
    let purQ = db.from('purchases').select('name,qty,total_amount').eq('org_id', org_id).not('total_amount', 'is', null).not('qty', 'is', null)
    if (branch_id) purQ = purQ.eq('branch_id', branch_id)
    const { data: purchases } = await purQ
    const priceTotals: Record<string, { total: number; qty: number }> = {}
    for (const p of (purchases || []) as any[]) {
      const nm = p.name; const qty = Number(p.qty) || 0; const amt = Number(p.total_amount) || 0
      if (!nm || qty <= 0) continue
      if (!priceTotals[nm]) priceTotals[nm] = { total: 0, qty: 0 }
      priceTotals[nm].total += amt; priceTotals[nm].qty += qty
    }
    const priceMap: Record<string, number> = {}
    for (const nm in priceTotals) priceMap[nm] = priceTotals[nm].qty > 0 ? priceTotals[nm].total / priceTotals[nm].qty : 0

    const report = recipes.map((r: any) => {
      const items = recipeItems.filter((ri: any) => ri.recipe_id === r.id)
      const components = items.map((ri: any) => {
        const comp = compMap[ri.component_product_id]
        const totalConsumed = consumed[ri.component_product_id] || 0
        const impliedCount = ri.qty > 0 ? Math.round((totalConsumed / ri.qty) * 10) / 10 : 0
        const unitPrice = comp ? (priceMap[comp.name] || 0) : 0
        return {
          name: comp?.name || '—',
          unit: comp?.unit || '',
          consumed: Math.round(totalConsumed * 100) / 100,
          qtyPerUnit: ri.qty,
          impliedCount,
          costPerUnit: Math.round(unitPrice * ri.qty * 100) / 100,
        }
      })
      const allCounts = components.map((c: any) => c.impliedCount)
      // الرقم الصحيح = أقل مكوّن متوفر (العنق الزجاجي) — ما تقدر تسوي وصفات أكتر من أضعف مكوّن عندك
      const min = allCounts.length ? Math.min(...allCounts) : 0
      const avg = allCounts.length ? Math.round((allCounts.reduce((s: number, n: number) => s + n, 0) / allCounts.length) * 10) / 10 : 0
      const max = allCounts.length ? Math.max(...allCounts) : 0
      const bottleneck = components.find((c: any) => c.impliedCount === min)

      // تكلفة الوحدة = مجموع تكلفة كل مكوّن بمكونات الوصفة (بغض النظر عن الاستهلاك الفعلي)
      const costPerUnit = components.reduce((s: number, c: any) => s + c.costPerUnit, 0)
      const hasCostData = costPerUnit > 0
      const totalCost = hasCostData ? Math.round(costPerUnit * min * 100) / 100 : null

      return {
        id: r.id, name: r.name, estimatedProduced: min, avgEstimate: avg, maxEstimate: max,
        bottleneckName: bottleneck?.name || null, components,
        costPerUnit: hasCostData ? Math.round(costPerUnit * 100) / 100 : null,
        totalCost,
      }
    })

    return NextResponse.json({ hasData: true, recipes: report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
