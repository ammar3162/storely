import { managerMay } from '@/lib/managerPerms'
import { orgHasFeature, lockedMessage } from '@/lib/planFeatures'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { selectAll } from '@/lib/selectAll'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { computeProfit } from '@/lib/profitCalc'
import { computeStaffPayroll, loadOvertimeSettings, staffForPayrollMonth } from '@/lib/payroll'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// نفس حقول تقرير الرواتب (staff-report) عشان الرقمين يتطابقون
const PAYROLL_STAFF_FIELDS = 'id,org_id,name,monthly_salary,housing_allowance,transport_allowance,food_allowance,leave_balance_days,shift_id,weekly_off_days,days_off_mode,monthly_off_days,biweekly_anchor,off_dates'

async function ensureGenerated(supabase: any, org_id: string, month: string, branchId: string | null) {
  let tplQ = supabase.from('fixed_expenses').select('id,name,amount,branch_id').eq('org_id', org_id).eq('is_active', true)
  if (branchId) tplQ = tplQ.eq('branch_id', branchId)
  const { data: templates } = await tplQ

  let existQ = supabase.from('monthly_fixed_expenses').select('fixed_expense_id').eq('org_id', org_id).eq('month', month)
  if (branchId) existQ = existQ.eq('branch_id', branchId)
  const { data: existing } = await existQ

  const existingIds = new Set((existing || []).map((e: any) => e.fixed_expense_id))
  const missing = (templates || []).filter((t: any) => !existingIds.has(t.id))

  if (missing.length > 0) {
    await supabase.from('monthly_fixed_expenses').insert(
      missing.map((t: any) => ({
        org_id, month, fixed_expense_id: t.id, name: t.name, amount: t.amount, branch_id: t.branch_id,
      }))
    )
  }
}

async function computeLive(supabase: any, org_id: string, monthParam: string, effectiveBranchId: string | null) {
  const [year, monthNum] = monthParam.split('-').map(Number)
  const monthStart = `${monthParam}-01`
  const lastDay = new Date(year, monthNum, 0).getDate()
  const monthEndDate = `${monthParam}-${String(lastDay).padStart(2, '0')}`
  const monthStartTs = `${monthParam}-01T00:00:00.000+03:00`
  const monthEndTs = `${monthParam}-${String(lastDay).padStart(2,'0')}T23:59:59.999+03:00`

  await ensureGenerated(supabase, org_id, monthStart, effectiveBranchId)

  const { data: closings } = await selectAll(() => {
    let closingsQ = supabase
      .from('cashier_closings')
      .select('total_sales,delivery,total_purchases,purchases')
      .eq('org_id', org_id)
      .gte('closing_date', monthStart)
      .lte('closing_date', monthEndDate)
    if (effectiveBranchId) closingsQ = (closingsQ as any).eq('branch_id', effectiveBranchId)
    return closingsQ.order('id')
  })

  const { data: purchases } = await selectAll(() => {
    let purchasesQ = supabase
      .from('purchases')
      .select('category,amount,total_amount')
      .eq('org_id', org_id)
      .gte('created_at', monthStartTs)
      .lte('created_at', monthEndTs)
    if (effectiveBranchId) purchasesQ = (purchasesQ as any).eq('branch_id', effectiveBranchId)
    return purchasesQ.order('id')
  })

  let fixedExpensesQ = supabase
    .from('monthly_fixed_expenses')
    .select('id,name,amount,fixed_expense_id,month,org_id,branch_id,created_at')
    .eq('org_id', org_id)
    .eq('month', monthStart)
    .order('created_at', { ascending: true })
  if (effectiveBranchId) fixedExpensesQ = fixedExpensesQ.eq('branch_id', effectiveBranchId)
  const { data: fixedExpensesData } = await fixedExpensesQ
  const fixedExpensesList = fixedExpensesData || []

  let deliveryQ = supabase
    .from('delivery_income')
    .select('id,platform,amount,created_at')
    .eq('org_id', org_id)
    .eq('month', monthStart)
    .order('created_at', { ascending: true })
  if (effectiveBranchId) deliveryQ = deliveryQ.eq('branch_id', effectiveBranchId)
  const { data: deliveryData } = await deliveryQ

  const [{ data: org }, settings, staffList] = await Promise.all([
    supabase.from('organizations').select('vat_registered').eq('id', org_id).maybeSingle(),
    loadOvertimeSettings(supabase, org_id),
    // موظفين ذاك الشهر (النشطين + اللي تركوا خلاله) — مو موظفين اليوم
    staffForPayrollMonth(supabase, { orgId: org_id, branchId: effectiveBranchId, month: monthParam, select: PAYROLL_STAFF_FIELDS }),
  ])

  // تكلفة الرواتب الفعلية من نفس حساب كشف الرواتب (نسبة الأيام لمن ترك، أوفر تايم، مكافآت، خصومات)
  const staff: { gross: number; overtime: number; bonuses: number; deductions: number }[] = []
  for (let i = 0; i < staffList.length; i += 8) {
    const chunk = await Promise.all(staffList.slice(i, i + 8).map((m: any) => computeStaffPayroll(supabase, m, monthParam, settings)))
    for (const p of chunk) staff.push({ gross: p.grossSalary, overtime: p.overtime.pay, bonuses: p.bonusesTotal, deductions: p.deductionsTotal })
  }

  const r = computeProfit({
    vatRegistered: !!(org as any)?.vat_registered,
    closings: (closings || []) as any[],
    purchases: (purchases || []) as any[],
    fixedExpensesTotal: fixedExpensesList.reduce((s: number, e: any) => s + Number(e.amount || 0), 0),
    deliveryIncome: (deliveryData || []) as any[],
    staff,
  })

  return { month: monthParam, ...r, fixedExpensesList }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    const monthParam = searchParams.get('month')
    if (!org_id || !monthParam) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!managerMay(access as any, 'profitability')) return NextResponse.json({ error: 'ليست لديك صلاحية على هذا القسم — تواصل مع مالك المنشأة' }, { status: 403 })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    const supabase = sb()

    const { data: org } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    const plan = (org as any)?.plan
    if (!(await orgHasFeature(supabase, org_id, 'profitability', plan))) {
      return NextResponse.json({ error: 'upgrade_required', message: lockedMessage('profitability') }, { status: 403 })
    }

    const monthStart = `${monthParam}-01`

    // تحقق أول: هل هذا الشهر مقفل مسبقاً؟ لو نعم رجّع اللقطة المحفوظة (رقم ثابت لا يتغيّر)
    let closedQ = supabase.from('profitability_closings').select('*').eq('org_id', org_id).eq('month', monthStart)
    closedQ = effectiveBranchId ? closedQ.eq('branch_id', effectiveBranchId) : closedQ.is('branch_id', null)
    const { data: closedRow } = await closedQ.maybeSingle()

    if (closedRow) {
      const { data: vatOrg } = await supabase.from('organizations').select('vat_registered').eq('id', org_id).maybeSingle()
      return NextResponse.json({
        vatRegistered: !!(vatOrg as any)?.vat_registered,
        success: true, closed: true, closedAt: (closedRow as any).closed_at,
        month: monthParam,
        totalIn: (closedRow as any).total_in,
        closingsCount: (closedRow as any).closings_count,
        inventoryPurchases: (closedRow as any).inventory_purchases,
        otherPurchases: (closedRow as any).other_purchases,
        totalPurchases: (closedRow as any).total_purchases,
        fixedExpensesTotal: (closedRow as any).fixed_expenses_total,
        fixedExpensesList: (closedRow as any).fixed_expenses_list,
        deliveryIncomeTotal: (closedRow as any).delivery_income_total,
        deliveryIncomeList: (closedRow as any).delivery_income_list,
        salaryExpenseTotal: (closedRow as any).salary_expense_total,
        totalOut: (closedRow as any).total_out,
        netProfit: (closedRow as any).net_profit,
        vatAmount: (closedRow as any).vat_amount,
      })
    }

    const live = await computeLive(supabase, org_id, monthParam, effectiveBranchId)
    return NextResponse.json({ success: true, closed: false, ...live })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { org_id, branch_id, month } = await req.json()
    if (!org_id || !month) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!managerMay(access as any, 'profitability')) return NextResponse.json({ error: 'ليست لديك صلاحية على هذا القسم — تواصل مع مالك المنشأة' }, { status: 403 })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    // تحقق من هوية المتصل الفعلية (لتسجيل مين قفل الشهر)
    const authClient = await createServerClient()
    const { data: { user: authedUser } } = await authClient.auth.getUser()
    if (!authedUser) return NextResponse.json({ error: 'غير مصرح — سجّل الدخول أولاً' }, { status: 401 })

    const supabase = sb()

    const { data: org } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    const plan = (org as any)?.plan
    if (!(await orgHasFeature(supabase, org_id, 'profitability', plan))) {
      return NextResponse.json({ error: 'upgrade_required', message: lockedMessage('profitability') }, { status: 403 })
    }

    const monthStart = `${month}-01`

    // امنع الإقفال المزدوج لنفس الشهر
    let existingQ = supabase.from('profitability_closings').select('id').eq('org_id', org_id).eq('month', monthStart)
    existingQ = effectiveBranchId ? existingQ.eq('branch_id', effectiveBranchId) : existingQ.is('branch_id', null)
    const { data: existing } = await existingQ.maybeSingle()
    if (existing) return NextResponse.json({ error: 'هذا الشهر مقفل مسبقاً' }, { status: 400 })

    const live = await computeLive(supabase, org_id, month, effectiveBranchId)

    const { data: inserted, error: insErr } = await supabase.from('profitability_closings').insert({
      org_id, branch_id: effectiveBranchId,
      month: monthStart,
      total_in: live.totalIn,
      closings_count: live.closingsCount,
      inventory_purchases: live.inventoryPurchases,
      other_purchases: live.otherPurchases,
      total_purchases: live.totalPurchases,
      fixed_expenses_total: live.fixedExpensesTotal,
      fixed_expenses_list: live.fixedExpensesList,
      delivery_income_total: live.deliveryIncomeTotal,
      delivery_income_list: live.deliveryIncomeList,
      salary_expense_total: live.salaryExpenseTotal,
      total_out: live.totalOut,
      net_profit: live.netProfit,
      vat_amount: live.vatAmount,
      closed_by: authedUser.id,
    } as any).select().single()

    if (insErr || !inserted) return NextResponse.json({ error: 'فشل إقفال الشهر — حاول مرة أخرى' }, { status: 500 })

    return NextResponse.json({
      success: true, closed: true, closedAt: (inserted as any).closed_at,
      ...live,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
