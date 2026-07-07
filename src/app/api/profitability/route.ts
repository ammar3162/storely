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
    // نبني حدود الشهر صراحة بتوقيت الرياض (+03:00) بدل الاعتماد على توقيت السيرفر
    const monthStartTs = `${monthParam}-01T00:00:00.000+03:00`
    const monthEndTs = `${monthParam}-${String(lastDay).padStart(2,'0')}T23:59:59.999+03:00`

    const supabase = sb()

    // قفل الميزة: متاحة فقط للباقة المتوسطة والمتقدمة
    const { data: org } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    const plan = (org as any)?.plan
    if (plan === 'basic') {
      return NextResponse.json({ error: 'upgrade_required', message: 'ميزة الربحية متاحة فقط بالباقة المتوسطة أو المتقدمة' }, { status: 403 })
    }

    await ensureGenerated(supabase, org_id, monthStart)

    // 1) دخلت — كل مبيعات إقفالات الكاشير هالشهر (شامل الضريبة، رقم حقيقي)
    const { data: closings } = await supabase
      .from('cashier_closings')
      .select('total_sales')
      .eq('org_id', org_id)
      .gte('closing_date', monthStart)
      .lte('closing_date', monthEndDate)

    const totalIn = (closings || []).reduce((s: number, c: any) => s + Number(c.total_sales || 0), 0)
    const closingsCount = (closings || []).length

    // 2) طلع مني — كل المشتريات (مخزون + غيرها) هالشهر (شامل الضريبة، رقم حقيقي)
    const { data: purchases } = await supabase
      .from('purchases')
      .select('category,total_amount')
      .eq('org_id', org_id)
      .gte('created_at', monthStartTs)
      .lte('created_at', monthEndTs)

    const purchasesList = purchases || []
    const inventoryPurchases = purchasesList.filter((p: any) => p.category === 'مخزون').reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0)
    const otherPurchases = purchasesList.filter((p: any) => p.category !== 'مخزون').reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0)
    const totalPurchases = inventoryPurchases + otherPurchases

    // 3) المصروفات الثابتة لهذا الشهر (رواتب، إيجار...)
    const { data: fixedExpensesData } = await supabase
      .from('monthly_fixed_expenses')
      .select('*')
      .eq('org_id', org_id)
      .eq('month', monthStart)
      .order('created_at', { ascending: true })

    const fixedExpensesList = fixedExpensesData || []
    const fixedExpensesTotal = fixedExpensesList.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)

    // 4) طلع مني (إجمالي) = المشتريات + المصروفات الثابتة
    const totalOut = totalPurchases + fixedExpensesTotal

    // 5) الصافي = دخلت − طلع مني
    const netProfit = totalIn - totalOut

    return NextResponse.json({
      success: true,
      month: monthParam,
      totalIn,
      closingsCount,
      inventoryPurchases,
      otherPurchases,
      totalPurchases,
      fixedExpensesTotal,
      fixedExpensesList,
      totalOut,
      netProfit,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
