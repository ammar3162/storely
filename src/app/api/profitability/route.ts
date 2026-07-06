import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function ensureGenerated(supabase: any, org_id: string, month: string) {
  const { data: templates } = await supabase
    .from('fixed_expenses')
    .select('id,name,amount')
    .eq('org_id', org_id)
    .eq('is_active', true)

  const { data: existing } = await supabase
    .from('monthly_fixed_expenses')
    .select('fixed_expense_id')
    .eq('org_id', org_id)
    .eq('month', month)

  const existingIds = new Set((existing || []).map((e: any) => e.fixed_expense_id))
  const missing = (templates || []).filter((t: any) => !existingIds.has(t.id))

  if (missing.length > 0) {
    await supabase.from('monthly_fixed_expenses').insert(
      missing.map((t: any) => ({
        org_id, month, fixed_expense_id: t.id, name: t.name, amount: t.amount,
      }))
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const monthParam = searchParams.get('month') // format YYYY-MM
    if (!org_id || !monthParam) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const [year, monthNum] = monthParam.split('-').map(Number)
    const monthStart = `${monthParam}-01`
    const lastDay = new Date(year, monthNum, 0).getDate()
    const monthEndDate = `${monthParam}-${String(lastDay).padStart(2, '0')}`
    const monthStartTs = new Date(year, monthNum - 1, 1).toISOString()
    const monthEndTs = new Date(year, monthNum - 1, lastDay, 23, 59, 59, 999).toISOString()

    const supabase = sb()
    await ensureGenerated(supabase, org_id, monthStart)

    // 1) الإيرادات من إقفالات الكاشير
    const { data: closings } = await supabase
      .from('cashier_closings')
      .select('total_sales')
      .eq('org_id', org_id)
      .gte('closing_date', monthStart)
      .lte('closing_date', monthEndDate)

    const revenue = (closings || []).reduce((s: number, c: any) => s + Number(c.total_sales || 0), 0)
    const closingsCount = (closings || []).length

    // 2) المشتريات (مخزون + مصروفات متغيرة) خلال الشهر
    const { data: purchases } = await supabase
      .from('purchases')
      .select('category,amount,vat_amount,total_amount')
      .eq('org_id', org_id)
      .gte('created_at', monthStartTs)
      .lte('created_at', monthEndTs)

    const purchasesList = purchases || []
    const inventoryCost = purchasesList.filter((p: any) => p.category === 'مخزون').reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
    const variableExpenses = purchasesList.filter((p: any) => p.category !== 'مخزون').reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
    const inputVat = purchasesList.reduce((s: number, p: any) => s + Number(p.vat_amount || 0), 0)

    // 3) المصروفات الثابتة لهذا الشهر
    const { data: fixedExpensesData } = await supabase
      .from('monthly_fixed_expenses')
      .select('*')
      .eq('org_id', org_id)
      .eq('month', monthStart)
      .order('created_at', { ascending: true })

    const fixedExpensesList = fixedExpensesData || []
    const fixedExpensesTotal = fixedExpensesList.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)

    // 4) حساب الضريبة
    const revenueExVat = revenue / 1.15
    const outputVat = revenue - revenueExVat
    const netVatPayable = outputVat - inputVat

    // 5) صافي الربح
    const netProfit = revenueExVat - inventoryCost - variableExpenses - fixedExpensesTotal - netVatPayable

    return NextResponse.json({
      success: true,
      month: monthParam,
      revenue,
      revenueExVat,
      closingsCount,
      inventoryCost,
      variableExpenses,
      fixedExpensesTotal,
      fixedExpensesList,
      outputVat,
      inputVat,
      netVatPayable,
      netProfit,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
