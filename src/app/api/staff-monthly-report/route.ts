import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { computeStaffPayroll, loadOvertimeSettings } from '@/lib/payroll'
import { orgHasHrFeature } from '@/lib/hrAccess'
import { payrollLedger } from '@/lib/payrollLedger'
import { mapLimit } from '@/lib/mapLimit'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const r2 = (n: number) => Math.round(n * 100) / 100

// تقرير الموظف الشهري — نفس حساب كشف راتب الموظف (computeStaffPayroll) لكل موظف بالشهر
// staff_id اختياري: موظف واحد مع كل البنود بالتفصيل
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const month = searchParams.get('month') || ''
    const staff_id = searchParams.get('staff_id')
    if (!org_id || !MONTH_RE.test(month)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const { data: org } = await db.from('organizations').select('plan').eq('id', org_id).single()
    if (!(await orgHasHrFeature(db, org_id, (org as any)?.plan))) {
      return NextResponse.json({ error: 'التقرير متاح بالباقة المتوسطة أو المتقدمة، أو بإضافة إدارة الموظفين الكاملة', reason: 'locked' }, { status: 403 })
    }

    // مدير الفرع: موظفين فرعه بس
    const branch = enforcedBranchId(access, searchParams.get('branch_id'))
    let q = db.from('staff_members')
      .select('id,org_id,name,role,branch_id,monthly_salary,housing_allowance,transport_allowance,food_allowance,shift_id,is_active,weekly_off_days,days_off_mode,monthly_off_days,biweekly_anchor,off_dates')
      .eq('org_id', org_id).order('name')
    if (branch) q = q.eq('branch_id', branch)
    if (staff_id) q = q.eq('id', staff_id)
    else q = q.eq('is_active', true)
    const { data: staffList } = await q
    if (staff_id && !(staffList || []).length) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const settings = await loadOvertimeSettings(db, org_id)
    // 6 موظفين بنفس الوقت — أسرع بكثير مع الفروع الكبيرة
    const rows: any[] = await mapLimit((staffList || []) as any[], 6, async (s) => {
      const p = await computeStaffPayroll(db, s, month, settings)
      const otherDeductions = r2(p.deductionsTotal - p.latePenaltiesTotal)
      return {
        staff_id: s.id, name: s.name, role: s.role,
        basic: p.basic, allowances: r2(p.allowances.housing + p.allowances.transport + p.allowances.food), gross: p.grossSalary,
        overtime_minutes: p.overtime.minutes, overtime_pay: p.overtime.pay, bonus_total: p.bonusesTotal,
        late_count: p.latePenalties.length, late_minutes: p.attendance.lateMinutes, late_total: p.latePenaltiesTotal,
        deductions_total: otherDeductions, advances_total: p.advancesTotal,
        pending_total: r2(p.pendingAdvances.reduce((a, x) => a + x.amount, 0) + p.pendingDeficits.reduce((a, x) => a + x.amount, 0)),
        net: p.netSalary,
        days_present: p.attendance.daysPresent, days_in_month: p.attendance.daysInMonth,
        extra_days: p.attendance.extraDays, weekly_off_days: p.attendance.weeklyOffDays,
        ...(staff_id ? { ledger: payrollLedger(p), hour_rate: p.overtime.hourRate, overtime_mode: p.overtime.mode } : {}),
      }
    })

    const sum = (k: string) => r2(rows.reduce((a: number, r: any) => a + Number(r[k] || 0), 0))
    return NextResponse.json({
      success: true, month, rows,
      totals: { gross: sum('gross'), overtime_pay: sum('overtime_pay'), bonus_total: sum('bonus_total'), late_total: sum('late_total'), deductions_total: sum('deductions_total'), advances_total: sum('advances_total'), net: sum('net'), pending_total: sum('pending_total') },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
