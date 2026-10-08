import type { SupabaseClient } from '@supabase/supabase-js'
import { selectAll } from '@/lib/selectAll'
import { mapLimit } from '@/lib/mapLimit'
import { orgHasHrFeature } from '@/lib/hrAccess'
import { computeStaffPayroll, loadOvertimeSettings } from '@/lib/payroll'
import { isFullMonth, periodLabel, type Period } from '@/lib/accountantSchedule'
import type { AccountantReport, AccSection } from '@/lib/accountantExport'

const saudiDate = (iso: string) => new Date(Date.parse(iso) + 3 * 3600e3).toISOString().slice(0, 10)
const n = (v: unknown) => Number(v) || 0

// يجمع بيانات تقرير المحاسب لفترة — بس الأقسام المطلوبة (ما نقرأ الرواتب لو المالك ما اختارها)
export async function loadAccountantReport(db: SupabaseClient, o: {
  orgId: string; branchId: string | null; period: Period; sections: AccSection[]; vatRegistered: boolean
}): Promise<AccountantReport> {
  const { orgId, branchId, period, sections } = o
  const has = (...s: AccSection[]) => s.some(x => sections.includes(x))
  const withBranch = (q: any) => branchId ? q.eq('branch_id', branchId) : q
  const start = `${period.start}T00:00:00.000+03:00`, end = `${period.end}T23:59:59.999+03:00`

  const [{ data: org }, { data: branches }] = await Promise.all([
    db.from('organizations').select('name,plan,currency').eq('id', orgId).single(),
    db.from('branches').select('id,name').eq('org_id', orgId),
  ])
  const branchName = new Map(((branches || []) as any[]).map(b => [b.id, b.name]))
  const bn = (id: string | null) => (id && branchName.get(id)) || '—'
  const empty = { data: [] as any[], error: null }

  const [pur, clo, prods, unpaid] = await Promise.all([
    has('purchases', 'vat') ? selectAll(() => withBranch(db.from('purchases').select('id,created_at,branch_id,supplier,name,category,qty,unit,amount,vat_amount,total_amount,payment_status,invoice_image,invoice_number,supplier_vat_number,invoice_group,qr_verified,qr_mismatch')
      .eq('org_id', orgId).is('deleted_at', null).gte('created_at', start).lte('created_at', end)).order('created_at').order('id')) : empty,
    has('sales', 'vat', 'expenses', 'cash_diff') ? selectAll(() => withBranch(db.from('cashier_closings').select('id,closing_date,branch_id,staff_name,total_sales,mada_amount,visa_amount,mastercard_amount,network_amount,cash_amount,total_purchases,difference,status,deficit_reason,deficit_decision,purchases')
      .eq('org_id', orgId).gte('closing_date', period.start).lte('closing_date', period.end)).order('closing_date').order('id')) : empty,
    has('stock') ? selectAll(() => withBranch(db.from('products').select('id,name,category,qty,unit,avg_cost,branch_id').eq('org_id', orgId).eq('is_active', true)).order('name').order('id')) : empty,
    // الآجل: كل الفواتير غير المدفوعة لين نهاية الفترة (مو بس فواتير الفترة)
    has('payables') ? selectAll(() => withBranch(db.from('purchases').select('id,created_at,supplier,total_amount,due_date')
      .eq('org_id', orgId).is('deleted_at', null).eq('payment_status', 'unpaid').lte('created_at', end)).order('created_at').order('id')) : empty,
  ])
  if (pur.error || clo.error || prods.error || unpaid.error) throw new Error('ACCOUNTANT_DATA_FAILED')

  // الرواتب: شهر كامل + عنده إدارة الموظفين
  let payroll: AccountantReport['payroll'] = null
  if (has('payroll') && isFullMonth(period) && await orgHasHrFeature(db, orgId, (org as any)?.plan)) {
    let sq = db.from('staff_members').select('id,org_id,name,monthly_salary,housing_allowance,transport_allowance,food_allowance,shift_id,weekly_off_days,days_off_mode,monthly_off_days,biweekly_anchor,off_dates')
      .eq('org_id', orgId).eq('is_active', true)
    if (branchId) sq = sq.eq('branch_id', branchId)
    const { data: staff } = await sq
    const settings = await loadOvertimeSettings(db, orgId)
    const month = period.start.slice(0, 7)
    payroll = await mapLimit(((staff || []) as any[]).sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar')), 6, async s => {
      const p = await computeStaffPayroll(db, s, month, settings)
      return { name: s.name, basic: p.basic, housing: p.allowances.housing, transport: p.allowances.transport, food: p.allowances.food, gross: p.grossSalary,
        overtime: p.overtime.pay, bonuses: p.bonusesTotal, deductions: p.deductionsTotal, latePenalties: p.latePenaltiesTotal, advances: p.advancesTotal, net: p.netSalary }
    })
  }

  const payables = new Map<string, { supplier: string; invoices: number; oldest: string; nextDue: string | null; total: number }>()
  for (const p of unpaid.data as any[]) {
    const key = (p.supplier || '').trim() || 'بدون مورد'
    const e = payables.get(key) || { supplier: key, invoices: 0, oldest: saudiDate(p.created_at), nextDue: null, total: 0 }
    e.invoices++; e.total = Math.round((e.total + n(p.total_amount)) * 100) / 100
    if (p.due_date && (!e.nextDue || p.due_date < e.nextDue)) e.nextDue = p.due_date
    payables.set(key, e)
  }

  const closings = clo.data as any[]
  const onlyBranch = branchId ? bn(branchId) : ((branches || []).length <= 1 ? bn((branches as any[])?.[0]?.id || null) : null)
  return {
    orgName: (org as any)?.name || '', branchName: onlyBranch === '—' ? null : onlyBranch, currency: (org as any)?.currency || 'SAR',
    period, label: periodLabel(period), sections, vatRegistered: o.vatRegistered,
    purchases: (pur.data as any[]).map(p => ({ date: saudiDate(p.created_at), branch: bn(p.branch_id), supplier: p.supplier, name: p.name, category: p.category,
      qty: p.qty, unit: p.unit, net: n(p.amount), vat: n(p.vat_amount), total: n(p.total_amount), paid: p.payment_status !== 'unpaid', invoiceUrl: p.invoice_image || null,
      id: p.id, invoiceNumber: p.invoice_number || null, supplierVat: p.supplier_vat_number || null, group: p.invoice_group || null, verified: !!p.qr_verified, mismatch: !!p.qr_mismatch })),
    closings: closings.map(c => ({ date: c.closing_date, branch: bn(c.branch_id), staff: c.staff_name, sales: n(c.total_sales), mada: n(c.mada_amount), visa: n(c.visa_amount),
      mastercard: n(c.mastercard_amount), network: n(c.network_amount), cash: n(c.cash_amount), expenses: n(c.total_purchases), difference: n(c.difference),
      status: c.status, deficitReason: c.deficit_reason, deficitDecision: c.deficit_decision })),
    expenses: closings.flatMap(c => (Array.isArray(c.purchases) ? c.purchases : []).map((e: any) => ({ date: c.closing_date, branch: bn(c.branch_id), staff: c.staff_name,
      item: String(e?.reason || 'بدون وصف').slice(0, 200), amount: n(e?.amount) }))),
    payroll,
    stock: (prods.data as any[]).map(p => ({ name: p.name, category: p.category, qty: n(p.qty), unit: p.unit, avgCost: p.avg_cost == null ? null : n(p.avg_cost), branch: bn(p.branch_id) })),
    payables: [...payables.values()].sort((a, b) => b.total - a.total),
  }
}
