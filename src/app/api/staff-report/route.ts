import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { computeStaffPayroll } from '@/lib/payroll'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const month = searchParams.get('month') // YYYY-MM
    if (!org_id || !month) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: orgCheck } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    if ((orgCheck as any)?.plan === 'basic') {
      return NextResponse.json({ error: 'ميزة تقرير الموظفين متاحة فقط بالباقة المتوسطة أو المتقدمة' }, { status: 403 })
    }

    const [year, monthNum] = month.split('-').map(Number)
    const monthStartTs = `${month}-01T00:00:00.000+03:00`
    const lastDay = new Date(year, monthNum, 0).getDate()
    const monthEndTs = `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999+03:00`
    const daysInMonth = lastDay

    const { data: staffList } = await supabase
      .from('staff_members')
      .select('id,name,monthly_salary,housing_allowance,transport_allowance,food_allowance,leave_balance_days,is_active,shift_id')
      .eq('org_id', org_id)
      .eq('is_active', true)

    const report = []
    for (const s of (staffList || []) as any[]) {
      // الراتب والخصومات والسلف والأوفر تايم من نفس حساب صفحة «راتبي» للموظف
      const pay = await computeStaffPayroll(supabase, s, month)
      const { grossSalary, deductionsTotal, advancesTotal, netSalary } = pay
      const deductions = pay.deductions
      const daysPresent = pay.attendance.daysPresent
      const lateCount = pay.attendance.lateCount
      const attendanceRate = daysInMonth > 0 ? Math.min(1, daysPresent / daysInMonth) : 0

      const { data: leaveThisMonth } = await supabase
        .from('staff_leave_requests')
        .select('days_count')
        .eq('staff_id', s.id)
        .eq('status', 'approved')
        .gte('start_date', `${month}-01`)
        .lte('start_date', `${month}-${String(lastDay).padStart(2, '0')}`)
      const leaveDaysTaken = (leaveThisMonth || []).reduce((sum: number, l: any) => sum + Number(l.days_count), 0)

      const { data: tasks } = await supabase
        .from('staff_tasks')
        .select('status')
        .eq('staff_id', s.id)
        .gte('created_at', monthStartTs)
        .lte('created_at', monthEndTs)
      const tasksTotal = (tasks || []).length
      const tasksConfirmed = (tasks || []).filter((t: any) => t.status === 'confirmed').length
      const taskCompletionRate = tasksTotal > 0 ? tasksConfirmed / tasksTotal : 1

      // صيغة التقييم: حضور 35 + مهام 30 + تأخير 20 (خصم 5 لكل مرة) + خصومات 15 (خصم 5 لكل خصم)
      const attendanceScore = attendanceRate * 35
      const taskScore = taskCompletionRate * 30
      const lateScore = Math.max(0, 20 - lateCount * 5)
      const deductionScore = Math.max(0, 15 - deductions.length * 5)
      const rating = Math.round(attendanceScore + taskScore + lateScore + deductionScore)

      report.push({
        staffId: s.id, name: s.name,
        grossSalary, deductionsTotal, advancesTotal, netSalary,
        overtimeMinutes: pay.overtime.minutes, overtimePay: pay.overtime.pay,
        daysPresent, daysInMonth, attendanceRate: Math.round(attendanceRate * 100),
        lateCount, leaveDaysTaken, leaveBalance: Number(s.leave_balance_days || 0),
        tasksTotal, tasksConfirmed, taskCompletionRate: Math.round(taskCompletionRate * 100),
        rating,
      })
    }

    return NextResponse.json({ success: true, month, report })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
