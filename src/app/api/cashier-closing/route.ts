import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, branch_id, staff_id, staff_name, total_sales, network_amount, cash_amount, purchases } = await req.json()

    if (!org_id || !staff_id || !staff_name) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const sales = Number(total_sales) || 0
    const network = Number(network_amount) || 0
    const cash = Number(cash_amount) || 0
    const purchasesList = Array.isArray(purchases) ? purchases.filter((p: any) => p && Number(p.amount) > 0) : []
    const totalPurchases = purchasesList.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

    const expectedCash = sales - network
    const cashAfterWithdrawal = cash - totalPurchases
    const difference = cashAfterWithdrawal - expectedCash
    const status = Math.abs(difference) < 0.01 ? 'balanced' : (difference < 0 ? 'deficit' : 'surplus')

    const supabase = sb()
    const { data, error } = await supabase
      .from('cashier_closings')
      .insert({
        org_id,
        branch_id: branch_id || null,
        staff_id,
        staff_name,
        closing_date: new Date().toISOString().slice(0, 10),
        total_sales: sales,
        network_amount: network,
        cash_amount: cash,
        purchases: purchasesList,
        total_purchases: totalPurchases,
        expected_cash: expectedCash,
        difference,
        status,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'حدث خطأ أثناء حفظ التقرير' }, { status: 500 })
    }

    return NextResponse.json({ success: true, closing: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!org_id) {
      return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })
    }

    const supabase = sb()
    let query = supabase
      .from('cashier_closings')
      .select('*')
      .eq('org_id', org_id)
      .order('closing_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (from) query = query.gte('closing_date', from)
    if (to) query = query.lte('closing_date', to)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'حدث خطأ أثناء جلب التقارير' }, { status: 500 })
    }

    return NextResponse.json({ success: true, closings: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
