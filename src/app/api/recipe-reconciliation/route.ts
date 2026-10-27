import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { componentPriceMap } from '@/lib/recipeCost'
import { usageFromCounts, type CountUsage } from '@/lib/countUsage'

// حدود الفترة بتوقيت السعودية (UTC+3)


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
    const { org_id, branch_id: requestedBranch, from, to, method } = await req.json()
    const byCount = method === 'count'
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const branch_id = enforcedBranchId(access, requestedBranch)   // مدير الفرع: فرعه بس مهما أرسل الطلب

    const db = sb()
    // لو ما تحدد نطاق تاريخ، افتراضياً آخر 30 يوم. لو تحدد، نطاق مخصص (تشمل اليوم كامل بالنهاية)
    const since30 = from ? new Date(from + 'T00:00:00+03:00').toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const untilDate = to ? new Date(to + 'T23:59:59.999+03:00').toISOString() : null

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
    const { data: componentProducts } = await db.from('products').select('id,name,unit,recipe_unit,recipe_unit_factor').in('id', componentIds as string[])
    const compMap: Record<string, any> = {}
    for (const c of (componentProducts || [])) compMap[(c as any).id] = c

    // كل فرع يقدّر إنتاجه من مخزونه الخاص — الوصفة مرتبطة بمنتج فرع معيّن وقت إنشائها،
    // فنحوّل كل مكوّن لصف المنتج المطابق بنفس الاسم بالفرع المختار حالياً (لو محدد فرع)
    const resolveMap: Record<string, string> = {}
    for (const id of componentIds as string[]) resolveMap[id] = id
    if (branch_id) {
      const compNames = [...new Set(Object.values(compMap).map((c: any) => c.name))]
      const { data: branchProducts } = await db.from('products').select('id,name').eq('org_id', org_id).eq('branch_id', branch_id).in('name', compNames as string[])
      const nameToBranchId: Record<string, string> = {}
      for (const bp of (branchProducts || []) as any[]) nameToBranchId[bp.name] = bp.id
      for (const id of componentIds as string[]) {
        const nm = compMap[id]?.name
        if (nm && nameToBranchId[nm]) resolveMap[id] = nameToBranchId[nm]
      }
    }
    const resolvedIds = [...new Set(Object.values(resolveMap))]

    let movesQ = (db as any).from('stock_movements')
      .select('product_id,qty_change,recorded_at,products!inner(org_id,branch_id)')
      .eq('type', 'out')
      .in('product_id', resolvedIds)
      .eq('products.org_id', org_id)
      .gte('recorded_at', since30)
    if (untilDate) movesQ = movesQ.lte('recorded_at', untilDate)
    if (branch_id) movesQ = movesQ.eq('products.branch_id', branch_id)
    const { data: moves } = await movesQ

    const consumed: Record<string, number> = {}
    for (const m of (moves || [])) {
      const r = m as any
      consumed[r.product_id] = (consumed[r.product_id] || 0) + Math.abs(r.qty_change)
    }

    // نفس منطق "العنق الزجاجي" بس محسوب لكل يوم لحاله — عشان نعرض جدول يومي بدل رقم مجمّع واحد
    // طريقة الجرد: الاستهلاك = الفرق بين جردين بعد الوارد والهدر، بدل مجموع الصرف المسجّل
    let countMap: Record<string, CountUsage> = {}
    if (byCount) {
      countMap = await usageFromCounts(db as any, org_id, resolvedIds as string[], since30, untilDate)
      for (const k in consumed) delete consumed[k]
      for (const pid in countMap) consumed[pid] = countMap[pid].used
    }

    const usedIn: Record<string, Set<string>> = {}
    for (const ri of recipeItems as any[]) (usedIn[ri.component_product_id] ??= new Set()).add(ri.recipe_id)
    const priceMap = await componentPriceMap(db as any, org_id, branch_id)

    const { data: stockRows } = await db.from('products').select('id,qty').in('id', resolvedIds as string[])
    const stockMap: Record<string, number> = {}
    for (const s of (stockRows || []) as any[]) stockMap[s.id] = Number(s.qty) || 0

    // مكوّن داخل أكثر من وصفة (مثل الحليب): استهلاكه موزّع بينها، فما يصلح نقدّر منه وصفة لحالها.
    // نعتمد على المكوّنات الخاصة بالوصفة لو موجودة، والمشتركة بس إذا ما فيه غيرها (ونوضح إنه تقدير أعلى)

    const report = recipes.map((r: any) => {
      const items = recipeItems.filter((ri: any) => ri.recipe_id === r.id)
      const components = items.map((ri: any) => {
        const comp = compMap[ri.component_product_id]
        const pid = resolveMap[ri.component_product_id] || ri.component_product_id
        const totalConsumed = consumed[pid] || 0
        const impliedCount = ri.qty > 0 ? Math.round((totalConsumed / ri.qty) * 10) / 10 : 0
        const unitPrice = comp ? (priceMap[comp.name] || 0) : 0
        const currentStock = stockMap[pid] ?? null
        const untracked = byCount ? !countMap[pid] : (totalConsumed === 0 && currentStock !== null && currentStock > 0)
        return {
          name: comp?.name || '—',
          unit: comp?.unit || '', recipe_unit: comp?.recipe_unit || null, recipe_unit_factor: comp?.recipe_unit_factor || null,
          shared: (usedIn[ri.component_product_id]?.size || 0) > 1,
          consumed: Math.round(totalConsumed * 100) / 100,
          qtyPerUnit: ri.qty,
          impliedCount,
          costPerUnit: Math.round(unitPrice * ri.qty * 100) / 100,
          untracked, countFrom: countMap[pid]?.from || null, countTo: countMap[pid]?.to || null,
        }
      })
      const tracked = components.filter((c: any) => !c.untracked)
      const exclusive = tracked.filter((c: any) => !c.shared)
      const trackedComponents = exclusive.length ? exclusive : tracked
      const basis = !tracked.length ? 'none' : exclusive.length ? 'exclusive' : 'shared'
      const allCounts = trackedComponents.map((c: any) => c.impliedCount)
      const min = allCounts.length ? Math.floor(Math.min(...allCounts) * 10) / 10 : 0
      const avg = allCounts.length ? Math.round((allCounts.reduce((s: number, n: number) => s + n, 0) / allCounts.length) * 10) / 10 : 0
      const max = allCounts.length ? Math.max(...allCounts) : 0
      const bottleneck = trackedComponents.find((c: any) => c.impliedCount === min)

      // تكلفة الوحدة = مجموع تكلفة كل مكوّن بمكونات الوصفة (بغض النظر عن الاستهلاك الفعلي)
      const costPerUnit = components.reduce((s: number, c: any) => s + c.costPerUnit, 0)
      const hasCostData = costPerUnit > 0
      const totalCost = hasCostData ? Math.round(costPerUnit * min * 100) / 100 : null

      return {
        id: r.id, name: r.name, estimatedProduced: min, avgEstimate: avg, maxEstimate: max,
        bottleneckName: bottleneck?.name || null, components, basis,
        costPerUnit: hasCostData ? Math.round(costPerUnit * 100) / 100 : null,
        totalCost,
      }
    })

    return NextResponse.json({ hasData: true, method: byCount ? 'count' : 'dispense', recipes: report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
