import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, branch_id, staff_id } = await req.json()
    if (!org_id) return NextResponse.json({ mostUsed: [], todayCount: 0 })

    const supabase = sb()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    // الأكثر استخداماً (آخر 14 يوم، على مستوى الفرع/المنظمة)
    let mostUsedQuery = supabase
      .from('stock_movements')
      .select('product_id,qty_change,products!inner(id,name,unit,category,org_id,branch_id,qty)')
      .eq('type', 'out')
      .eq('products.org_id', org_id)
      .gte('created_at', since14.toISOString())
    if (branch_id) mostUsedQuery = mostUsedQuery.eq('products.branch_id', branch_id)
    const { data: movements } = await mostUsedQuery

    const freqMap: Record<string, { count: number; product: any }> = {}
    for (const m of (movements || [])) {
      const p = (m as any).products
      if (!p) continue
      if (!freqMap[p.id]) freqMap[p.id] = { count: 0, product: p }
      freqMap[p.id].count += 1
    }
    const mostUsed = Object.values(freqMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(f => f.product)

    // عدد عمليات الصرف اليوم لهذا الموظف
    let todayCount = 0
    if (staff_id) {
      const { count } = await supabase
        .from('stock_movements')
        .select('id', { count: 'exact', head: true })
        .eq('staff_id', staff_id)
        .eq('type', 'out')
        .gte('created_at', todayStart.toISOString())
      todayCount = count || 0
    }

    return NextResponse.json({ mostUsed, todayCount })
  } catch {
    return NextResponse.json({ mostUsed: [], todayCount: 0 })
  }
}
