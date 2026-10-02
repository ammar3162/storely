import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { selectAll } from '@/lib/selectAll'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function pct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

/**
 * يقارن أداء الشهر الحالي بالشهر السابق: مبيعات، مشتريات، صافي، عدد عمليات صرف
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const fmt = (d: Date) => d.toISOString().slice(0, 10)

    async function periodStats(fromDate: string, toDate: string) {
      const withBranch = (q: any, col = 'branch_id') => branch_id ? q.eq(col, branch_id) : q
      // على دفعات — الشهر ممكن يتعدّى 1000 سجل؛ والصرف نحتاج عدده بس
      const [{ data: closings }, { data: purchases }, { count: dispenseCountRaw }] = await Promise.all([
        selectAll(() => withBranch(supabase.from('cashier_closings').select('total_sales').eq('org_id', org_id).gte('closing_date', fromDate).lte('closing_date', toDate)).order('id')),
        selectAll(() => withBranch(supabase.from('purchases').select('total_amount').eq('org_id', org_id).gte('created_at', fromDate).lte('created_at', toDate + 'T23:59:59')).order('id')),
        withBranch(supabase.from('stock_movements').select('id,products!inner(org_id,branch_id)', { count: 'exact', head: true }).eq('type', 'out').eq('products.org_id', org_id).gte('created_at', fromDate).lte('created_at', toDate + 'T23:59:59'), 'products.branch_id'),
      ])
      const sales = (closings || []).reduce((s: number, c: any) => s + Number(c.total_sales || 0), 0)
      const purchasesTotal = (purchases || []).reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0)
      const dispenseCount = dispenseCountRaw || 0
      return { sales, purchasesTotal, dispenseCount, net: sales - purchasesTotal }
    }

    const current = await periodStats(fmt(currentMonthStart), fmt(now))
    const previous = await periodStats(fmt(prevMonthStart), fmt(prevMonthEnd))

    return NextResponse.json({
      success: true,
      current,
      previous,
      changes: {
        sales: pct(current.sales, previous.sales),
        purchases: pct(current.purchasesTotal, previous.purchasesTotal),
        net: pct(current.net, previous.net),
        dispenseCount: pct(current.dispenseCount, previous.dispenseCount),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
