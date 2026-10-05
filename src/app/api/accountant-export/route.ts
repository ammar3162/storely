import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { selectAll } from '@/lib/selectAll'
import { mapLimit } from '@/lib/mapLimit'
import { orgHasHrFeature } from '@/lib/hrAccess'
import { computeStaffPayroll, loadOvertimeSettings, monthRange } from '@/lib/payroll'
import { buildAccountantWorkbook, monthLabel } from '@/lib/accountantExport'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UUID_RE = /^[0-9a-f-]{36}$/i
const saudiDate = (iso: string) => new Date(Date.parse(iso) + 3 * 3600e3).toISOString().slice(0, 10)

// ملف المحاسب الشهري (إكسل) — للمالك بس لأنه فيه الرواتب
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const month = searchParams.get('month') || ''
    const branch_id = searchParams.get('branch_id') || null
    if (!org_id || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: 'اختر الشهر' }, { status: 400 })
    if (branch_id && !UUID_RE.test(branch_id)) return NextResponse.json({ error: 'الفرع غير صالح' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'ملف المحاسب متاح لمالك الحساب بس، لأنه فيه الرواتب' }, { status: 403 })

    const db = sb()
    const [{ data: org }, { data: branches }] = await Promise.all([
      db.from('organizations').select('name,plan,currency').eq('id', org_id).single(),
      db.from('branches').select('id,name').eq('org_id', org_id),
    ])
    if (!org) return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 })
    const branchName = new Map(((branches || []) as any[]).map(b => [b.id, b.name]))
    if (branch_id && !branchName.has(branch_id)) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })
    const bn = (id: string | null) => (id && branchName.get(id)) || '—'

    const { start, end } = monthRange(month)
    const firstDay = `${month}-01`, lastDay = end.slice(0, 10)
    const withBranch = (q: any) => branch_id ? q.eq('branch_id', branch_id) : q

    const [pur, clo, prods] = await Promise.all([
      selectAll(() => withBranch(db.from('purchases').select('id,created_at,branch_id,supplier,name,category,qty,unit,amount,vat_amount,total_amount,payment_status,invoice_image')
        .eq('org_id', org_id).is('deleted_at', null).gte('created_at', start).lte('created_at', end)).order('created_at').order('id')),
      selectAll(() => withBranch(db.from('cashier_closings').select('id,closing_date,branch_id,staff_name,total_sales,mada_amount,visa_amount,mastercard_amount,network_amount,cash_amount,total_purchases,difference,status,deficit_reason,deficit_decision,purchases')
        .eq('org_id', org_id).gte('closing_date', firstDay).lte('closing_date', lastDay)).order('closing_date').order('id')),
      selectAll(() => withBranch(db.from('products').select('id,name,category,qty,unit,avg_cost,branch_id').eq('org_id', org_id).eq('is_active', true)).order('name').order('id')),
    ])
    if (pur.error || clo.error || prods.error) return NextResponse.json({ error: 'تعذر تجهيز الملف، حاول مرة ثانية' }, { status: 500 })

    const closings = clo.data as any[]
    const n = (v: unknown) => Number(v) || 0

    // الرواتب — لو المنشأة عندها إدارة الموظفين
    let payroll = null
    if (await orgHasHrFeature(db, org_id, (org as any).plan)) {
      let sq = db.from('staff_members').select('id,org_id,name,monthly_salary,housing_allowance,transport_allowance,food_allowance,shift_id,weekly_off_days,days_off_mode,monthly_off_days,biweekly_anchor,off_dates')
        .eq('org_id', org_id).eq('is_active', true)
      if (branch_id) sq = sq.eq('branch_id', branch_id)
      const { data: staff } = await sq
      const settings = await loadOvertimeSettings(db, org_id)
      payroll = await mapLimit(((staff || []) as any[]).sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar')), 6, async s => {
        const p = await computeStaffPayroll(db, s, month, settings)
        return { name: s.name, basic: p.basic, housing: p.allowances.housing, transport: p.allowances.transport, food: p.allowances.food, gross: p.grossSalary,
          overtime: p.overtime.pay, bonuses: p.bonusesTotal, deductions: p.deductionsTotal, latePenalties: p.latePenaltiesTotal, advances: p.advancesTotal, net: p.netSalary }
      })
    }

    const buf = await buildAccountantWorkbook({
      orgName: (org as any).name || '', branchName: branch_id ? bn(branch_id) : ((branches || []).length <= 1 ? bn((branches as any[])?.[0]?.id || null) : null),
      month, currency: (org as any).currency || 'SAR',
      purchases: (pur.data as any[]).map(p => ({ date: saudiDate(p.created_at), branch: bn(p.branch_id), supplier: p.supplier, name: p.name, category: p.category,
        qty: p.qty, unit: p.unit, net: n(p.amount), vat: n(p.vat_amount), total: n(p.total_amount), paid: p.payment_status !== 'unpaid', invoiceUrl: p.invoice_image || null })),
      closings: closings.map(c => ({ date: c.closing_date, branch: bn(c.branch_id), staff: c.staff_name, sales: n(c.total_sales), mada: n(c.mada_amount), visa: n(c.visa_amount),
        mastercard: n(c.mastercard_amount), network: n(c.network_amount), cash: n(c.cash_amount), expenses: n(c.total_purchases), difference: n(c.difference),
        status: c.status, deficitReason: c.deficit_reason, deficitDecision: c.deficit_decision })),
      expenses: closings.flatMap(c => (Array.isArray(c.purchases) ? c.purchases : []).map((e: any) => ({ date: c.closing_date, branch: bn(c.branch_id), staff: c.staff_name,
        item: String(e?.reason || 'بدون وصف').slice(0, 200), amount: n(e?.amount) }))),
      payroll,
      stock: (prods.data as any[]).map(p => ({ name: p.name, category: p.category, qty: n(p.qty), unit: p.unit, avgCost: p.avg_cost == null ? null : n(p.avg_cost), branch: bn(p.branch_id) })),
    })

    const fileName = `ملف المحاسب - ${monthLabel(month)}.xlsx`
    return new NextResponse(new Uint8Array(buf), { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="accountant-${month}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store',
    } })
  } catch {
    return NextResponse.json({ error: 'تعذر تجهيز الملف، حاول مرة ثانية' }, { status: 500 })
  }
}
