import type { SupabaseClient } from '@supabase/supabase-js'

// حساب راتب موظف لشهر واحد — مشترك بين تقرير المالك (staff-report) وصفحة «راتبي» للموظف،
// عشان الرقمين يطلعون نفس الشي دايماً.

// الأوفر تايم — المالك يختار من صفحة الحضور والانصراف:
//   auto  : أجر الساعة = الراتب الأساسي ÷ 30 يوم ÷ ساعات شفت الموظف، × المضاعف (1.5 = نظام العمل م107)
//   fixed : مبلغ ثابت لكل ساعة إضافية
//   off   : بدون أوفر تايم
export type OvertimeSettings = { mode: 'auto' | 'fixed' | 'off'; multiplier: number; fixedRate: number | null; minMinutes: number }
export const DEFAULT_OVERTIME: OvertimeSettings = { mode: 'auto', multiplier: 1.5, fixedRate: null, minMinutes: 15 }
export const OVERTIME_MAX_MINUTES = 6 * 60  // حد أعلى باليوم (يحمي من نسيان تسجيل الانصراف)

export async function loadOvertimeSettings(db: SupabaseClient, orgId: string): Promise<OvertimeSettings> {
  const { data } = await db.from('organizations')
    .select('overtime_mode,overtime_multiplier,overtime_fixed_rate,overtime_min_minutes').eq('id', orgId).maybeSingle()
  const o: any = data || {}
  return {
    mode: ['auto', 'fixed', 'off'].includes(o.overtime_mode) ? o.overtime_mode : DEFAULT_OVERTIME.mode,
    multiplier: Number(o.overtime_multiplier) || DEFAULT_OVERTIME.multiplier,
    fixedRate: o.overtime_fixed_rate == null ? null : Number(o.overtime_fixed_rate),
    minMinutes: o.overtime_min_minutes == null ? DEFAULT_OVERTIME.minMinutes : Number(o.overtime_min_minutes),
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
const toMinutes = (t: string) => { const [h, m] = String(t || '00:00').slice(0, 5).split(':').map(Number); return h * 60 + m }
const saudi = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3600e3)

export function monthRange(month: string) {
  const [year, monthNum] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNum, 0).getDate()
  return {
    start: `${month}-01T00:00:00.000+03:00`,
    end: `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999+03:00`,
    lastDay,
  }
}

export type Shift = { start_time: string | null; end_time: string | null; is_24h: boolean | null } | null

// دقائق العمل بعد نهاية الشفت لكل انصراف (بتوقيت السعودية) — الشفتات اللي تمتد بعد منتصف الليل محسوبة
export function overtimeMinutes(checkOutIso: string, shift: Shift, minMinutes = DEFAULT_OVERTIME.minMinutes): number {
  if (!shift || shift.is_24h || !shift.end_time) return 0
  const d = saudi(checkOutIso)
  const m = d.getUTCHours() * 60 + d.getUTCMinutes()
  const E = toMinutes(shift.end_time), S = toMinutes(shift.start_time || '00:00')
  let ot = 0
  if (E <= S) {                       // شفت ليلي (مثل 18:00 → 02:00)
    if (m >= E && m < S) ot = m - E
  } else if (m >= E) {                // شفت عادي، انصراف بعد النهاية بنفس اليوم
    ot = m - E
  } else if (m < S) {                 // شفت عادي، انصراف بعد منتصف الليل
    ot = 1440 - E + m
  }
  if (ot <= 0 || ot < minMinutes) return 0
  return Math.min(ot, OVERTIME_MAX_MINUTES)
}

// مدة الشفت بالساعات (الشفت الليلي يعدّي منتصف الليل)
export function shiftHours(shift: Shift): number | null {
  if (!shift || shift.is_24h || !shift.end_time || !shift.start_time) return null
  const S = toMinutes(shift.start_time), E = toMinutes(shift.end_time)
  const mins = E > S ? E - S : 1440 - S + E
  return mins > 0 ? mins / 60 : null
}

// أجر ساعة الأوفر تايم للموظف حسب إعداد المنشأة
export function overtimeHourRate(monthlySalary: number, shift: Shift, settings: OvertimeSettings = DEFAULT_OVERTIME) {
  if (settings.mode === 'off') return 0
  if (settings.mode === 'fixed') return round2(Number(settings.fixedRate || 0))
  const hours = shiftHours(shift) || 8
  return round2((Number(monthlySalary || 0) / 30 / hours) * settings.multiplier)
}

export async function computeStaffPayroll(db: SupabaseClient, staff: any, month: string, settings: OvertimeSettings = DEFAULT_OVERTIME) {
  const { start, end, lastDay } = monthRange(month)

  const basic = Number(staff.monthly_salary || 0)
  const allowances = {
    housing: Number(staff.housing_allowance || 0),
    transport: Number(staff.transport_allowance || 0),
    food: Number(staff.food_allowance || 0),
  }
  const grossSalary = basic + allowances.housing + allowances.transport + allowances.food

  const [{ data: adjustments }, { data: attendance }, { data: shiftRow }, { data: leaves }] = await Promise.all([
    db.from('staff_payroll_adjustments').select('id,type,amount,status,reason,created_at')
      .eq('staff_id', staff.id).gte('created_at', start).lte('created_at', end).order('created_at'),
    db.from('staff_attendance').select('type,recorded_at,late_minutes')
      .eq('staff_id', staff.id).gte('recorded_at', start).lte('recorded_at', end).order('recorded_at'),
    staff.shift_id ? db.from('shifts').select('start_time,end_time,is_24h').eq('id', staff.shift_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('staff_leave_requests').select('days_count').eq('staff_id', staff.id).eq('status', 'approved')
      .gte('start_date', `${month}-01`).lte('start_date', `${month}-${String(lastDay).padStart(2, '0')}`),
  ])

  const adj = (adjustments || []) as any[]
  const deductions = adj.filter(a => a.type === 'deduction' && a.status === 'approved')
  const advances = adj.filter(a => a.type === 'advance' && a.status === 'approved')
  const pendingAdvances = adj.filter(a => a.type === 'advance' && a.status === 'pending')
  const deductionsTotal = round2(deductions.reduce((s, a) => s + Number(a.amount), 0))
  const advancesTotal = round2(advances.reduce((s, a) => s + Number(a.amount), 0))

  const rows = (attendance || []) as any[]
  const checkIns = rows.filter(r => r.type === 'check_in')
  const lateMinutes = checkIns.reduce((s, c) => s + Number(c.late_minutes || 0), 0)
  const lateCount = checkIns.filter(c => Number(c.late_minutes || 0) > 0).length

  // أوفر تايم: أعلى قيمة لكل يوم (لو فيه أكثر من انصراف بنفس اليوم)
  const perDay = new Map<string, number>()
  for (const r of rows.filter(r => r.type === 'check_out')) {
    if (settings.mode === 'off') break
    const ot = overtimeMinutes(r.recorded_at, shiftRow as Shift, settings.minMinutes)
    if (!ot) continue
    const day = saudi(r.recorded_at).toISOString().slice(0, 10)
    perDay.set(day, Math.max(perDay.get(day) || 0, ot))
  }
  const rate = overtimeHourRate(basic, shiftRow as Shift, settings)
  const overtimeDays = [...perDay.entries()].map(([date, minutes]) => ({ date, minutes, pay: round2((minutes / 60) * rate) }))
  const overtimeMinutesTotal = overtimeDays.reduce((s, d) => s + d.minutes, 0)
  const overtimePay = round2(overtimeDays.reduce((s, d) => s + d.pay, 0))

  const netSalary = Math.max(0, round2(grossSalary + overtimePay - deductionsTotal - advancesTotal))

  return {
    month,
    basic, allowances, grossSalary,
    overtime: { minutes: overtimeMinutesTotal, pay: overtimePay, hourRate: rate, mode: settings.mode, days: overtimeDays },
    deductions: deductions.map(a => ({ amount: Number(a.amount), reason: a.reason || null, date: a.created_at })),
    deductionsTotal,
    advances: advances.map(a => ({ amount: Number(a.amount), reason: a.reason || null, date: a.created_at })),
    advancesTotal,
    pendingAdvances: pendingAdvances.map(a => ({ amount: Number(a.amount), date: a.created_at })),
    netSalary,
    attendance: { daysPresent: checkIns.length, daysInMonth: lastDay, lateCount, lateMinutes },
    leaveDaysTaken: ((leaves || []) as any[]).reduce((s, l) => s + Number(l.days_count), 0),
  }
}
