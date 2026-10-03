import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { selectAll } from '@/lib/selectAll'
import { offReason, monthlyOffDates } from '@/lib/daysOff'
import { loadOvertimeSettings, overtimeMinutes, overtimeHourRate, type Shift } from '@/lib/payroll'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const round2 = (n: number) => Math.round(n * 100) / 100
// تاريخ اليوم بتوقيت السعودية
const saudiDate = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3600e3).toISOString().slice(0, 10)
const saudiToday = () => saudiDate(new Date().toISOString())

const monthEnd = (m: string) => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10) }
const nextMonth = (m: string) => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7) }

function dateRange(from: string, to: string): string[] {
  const dates: string[] = []
  const cur = new Date(from + 'T00:00:00Z')
  const end = new Date(to + 'T00:00:00Z')
  while (cur <= end && dates.length < 400) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

type Ev = { id: string; staff_id: string; on_day_off?: boolean | null; type: string; recorded_at: string; late_minutes: number | null; penalty_amount: number | null; penalty_waived?: boolean | null; penalty_applied?: boolean | null; overtime_minutes?: number | null; is_excused: boolean | null }

// كل حضور مع انصرافه (أول انصراف بعده وقبل الحضور التالي، خلال 20 ساعة) — يغطي الشفتات بعد منتصف الليل
function sessions(events: Ev[]) {
  const sorted = [...events].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
  const out: { date: string; checkIn: Ev; checkOut: Ev | null }[] = []
  sorted.forEach((e, i) => {
    if (e.type !== 'check_in') return
    let checkOut: Ev | null = null
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].type === 'check_in') break
      if (sorted[j].type === 'check_out' && Date.parse(sorted[j].recorded_at) - Date.parse(e.recorded_at) <= 20 * 3600e3) checkOut = sorted[j]
    }
    out.push({ date: saudiDate(e.recorded_at), checkIn: e, checkOut })
  })
  return out
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    const staff_id = searchParams.get('staff_id')
    const date = searchParams.get('date') // وضع يوم واحد
    const from = searchParams.get('from') // وضع فترة
    const to = searchParams.get('to')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    const supabase = sb()

    // القراءة متاحة دايماً حتى بدون اشتراك فعّال -- المالك يقدر يشوف سجلاته القديمة (قراءة فقط)،
    // الحماية الفعلية (منع تسجيل حضور جديد) موجودة بمسار POST /api/staff-attendance مو هنا
    let staffQ = supabase.from('staff_members').select('id,name,branch_id,shift_id,monthly_salary,weekly_off_days,days_off_mode,monthly_off_days').eq('org_id', org_id).eq('is_active', true)
    if (effectiveBranchId) staffQ = staffQ.eq('branch_id', effectiveBranchId)
    if (staff_id) staffQ = staffQ.eq('id', staff_id)
    const { data: staffList } = await staffQ.order('name')
    const staff = (staffList || []) as any[]

    // الشفتات وإعدادات الأوفر تايم (نفس حساب «راتبي» وتقرير الموظفين)
    const shiftIds = [...new Set(staff.map(s => s.shift_id).filter(Boolean))]
    const [{ data: shiftRows }, otSettings] = await Promise.all([
      shiftIds.length ? supabase.from('shifts').select('id,start_time,end_time,is_24h').in('id', shiftIds) : Promise.resolve({ data: [] as any[] }),
      loadOvertimeSettings(supabase, org_id),
    ])
    const shiftOf = (s: any): Shift => ((shiftRows || []) as any[]).find(r => r.id === s.shift_id) || null
    // بدون شفت (أو شفت 24 ساعة) = ما ينحسب تأخير ولا أوفر تايم — نبلّغ الواجهة عشان تنبّه المالك
    const shiftWarning = (s: any): 'none' | '24h' | null => { const sh = shiftOf(s); return !sh ? 'none' : sh.is_24h ? '24h' : null }
    const overtimeFor = (s: any, checkOut: Ev | null) => {
      if (!checkOut || otSettings.mode === 'off') return { minutes: 0, pay: 0 }
      const shift = shiftOf(s)
      // المثبّت وقت الانصراف أولاً (على شفت ذاك اليوم)، والسجلات القديمة على الشفت الحالي
      const minutes = checkOut.overtime_minutes != null ? Number(checkOut.overtime_minutes) : overtimeMinutes(checkOut.recorded_at, shift, otSettings.minMinutes)
      return { minutes, pay: round2((minutes / 60) * overtimeHourRate(Number(s.monthly_salary || 0), shift, otSettings)) }
    }
    const autoFrom = otSettings.lateAutoFrom ? Date.parse(otSettings.lateAutoFrom) : null
    const isLegacy = (c?: Ev | null) => !!c && autoFrom != null && !c.penalty_applied && Number(c.penalty_amount || 0) > 0 && Date.parse(c.recorded_at) < autoFrom
    // الإجازات المعتمدة للموظفين بالفترة — يوم الإجازة ما ينحسب غياب
    let leaves: { staff_id: string; start_date: string; end_date: string }[] = []
    let comps: { staff_id: string; comp_date: string }[] = []
    // رصيد الشهر المرن: أيام الإجازة المحسوبة لكل موظف (أول N أيام ما داوم فيها)
    const monthlyOff = new Map<string, Set<string>>()
    const loadLeaves = async (startDay: string, endDay: string) => {
      const ids = staff.map((x: any) => x.id)
      if (!ids.length) return
      const [{ data: lv }, { data: cp }] = await Promise.all([
        supabase.from('staff_leave_requests').select('staff_id,start_date,end_date')
          .eq('org_id', org_id).eq('status', 'approved').in('staff_id', ids).lte('start_date', endDay).gte('end_date', startDay),
        supabase.from('staff_extra_days').select('staff_id,comp_date')
          .eq('org_id', org_id).eq('status', 'comp').in('staff_id', ids).gte('comp_date', startDay).lte('comp_date', endDay),
      ])
      leaves = (lv || []) as any[]
      comps = (cp || []) as any[]

      const monthlyStaff = staff.filter((x: any) => x.days_off_mode === 'monthly' && Number(x.monthly_off_days) > 0)
      if (monthlyStaff.length) {
        const monthStart = `${startDay.slice(0, 7)}-01`
        const { data: ins } = await supabase.from('staff_attendance').select('staff_id,recorded_at')
          .eq('org_id', org_id).eq('type', 'check_in').in('staff_id', monthlyStaff.map((x: any) => x.id))
          .gte('recorded_at', `${monthStart}T00:00:00+03:00`).lte('recorded_at', `${endDay}T23:59:59+03:00`)
        const today = saudiToday()
        for (const st of monthlyStaff) {
          const worked = new Set(((ins || []) as any[]).filter(r => r.staff_id === st.id).map(r => saudiDate(r.recorded_at)))
          const set = new Set<string>()
          for (let m = startDay.slice(0, 7); m <= endDay.slice(0, 7); m = nextMonth(m)) {
            const fixed = new Set(dateRange(`${m}-01`, monthEnd(m)).filter(d => fixedOff(st, d)))
            for (const d of monthlyOffDates(m, Number(st.monthly_off_days), worked, today, fixed)) set.add(d)
          }
          monthlyOff.set(st.id, set)
        }
      }
    }
    const fixedOff = (s: any, d: string) => offReason(d, s.days_off_mode === 'monthly' ? [] : s.weekly_off_days,
      leaves.filter(l => l.staff_id === s.id), comps.filter(c => c.staff_id === s.id).map(c => c.comp_date))
    const offFor = (s: any, d: string) => fixedOff(s, d) || (monthlyOff.get(s.id)?.has(d) ? 'monthly' as const : null)

    const describe = (s: any, x: { checkIn: Ev; checkOut: Ev | null } | null, d?: string) => {
      const off = !x && d ? offFor(s, d) : null
      const ot = overtimeFor(s, x?.checkOut || null)
      const hours = x?.checkOut ? round2((Date.parse(x.checkOut.recorded_at) - Date.parse(x.checkIn.recorded_at)) / 3600e3) : null
      return {
        check_in: x?.checkIn.recorded_at || null,
        check_out: x?.checkOut?.recorded_at || null,
        hours_worked: hours !== null ? Math.round(hours * 10) / 10 : null,
        late_minutes: x?.checkIn.late_minutes ?? null,
        // الغرامة الملغاة من المالك، أو القديمة قبل تفعيل الخصم التلقائي، ما تنحسب
        penalty_amount: (x?.checkIn.penalty_waived || isLegacy(x?.checkIn)) ? null : (x?.checkIn.penalty_amount ?? null),
        penalty_legacy: isLegacy(x?.checkIn),
        penalty_original: x?.checkIn.penalty_amount ?? null,
        penalty_waived: !!x?.checkIn.penalty_waived,
        penalty_locked: !!x?.checkIn.penalty_applied,
        attendance_id: x?.checkIn.id ?? null,
        is_excused: !!x?.checkOut?.is_excused,
        overtime_minutes: ot.minutes,
        overtime_pay: ot.pay,
        status: x
          ? (x.checkIn.on_day_off ? (x.checkOut ? 'انصرف — يوم إضافي' : 'حاضر — يوم إضافي') : (x.checkOut ? 'انصرف' : 'حاضر'))
          : off === 'leave' ? 'إجازة معتمدة' : off === 'comp' ? 'إجازة بديلة' : off ? 'إجازة' : 'لم يحضر',
        day_off: off,
        extra_day: !!x?.checkIn.on_day_off,
      }
    }

    const loadEvents = async (startDay: string, endDay: string) => {
      // نهاية الفترة + 20 ساعة عشان انصراف آخر يوم بعد منتصف الليل
      const end = new Date(Date.parse(`${endDay}T23:59:59.999+03:00`) + 20 * 3600e3).toISOString()
      const { data } = await selectAll<Ev>(() => {
        let q = supabase.from('staff_attendance').select('id,staff_id,type,recorded_at,late_minutes,penalty_amount,penalty_waived,penalty_applied,overtime_minutes,is_excused,on_day_off')
          .eq('org_id', org_id).gte('recorded_at', `${startDay}T00:00:00+03:00`).lte('recorded_at', end).order('recorded_at').order('id')
        if (effectiveBranchId) q = q.eq('branch_id', effectiveBranchId)
        if (staff_id) q = q.eq('staff_id', staff_id)
        return q
      })
      return data
    }

    // ═══ وضع الفترة الزمنية — ملخّص لكل موظف، + سجل يومي لو انفلتر موظف واحد ═══
    if (from && to) {
      if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to) return NextResponse.json({ error: 'الفترة غير صالحة' }, { status: 400 })
      const days = dateRange(from, to)
      const [events] = await Promise.all([loadEvents(from, to), loadLeaves(from, to)])
      const today = saudiToday()

      const rows = staff.map((s: any) => {
        const mine = sessions(events.filter(e => e.staff_id === s.id)).filter(x => x.date >= from && x.date <= to)
        const byDay = new Map<string, typeof mine[number]>()
        for (const x of mine) if (!byDay.has(x.date)) byDay.set(x.date, x)   // أول حضور باليوم
        let totalLateMinutes = 0, totalPenalty = 0, daysExcused = 0, otMinutes = 0, otPay = 0
        const dayRows = days.map(d => {
          const r = describe(s, byDay.get(d) || null, d)
          totalLateMinutes += Number(r.late_minutes || 0)
          totalPenalty += Number(r.penalty_amount || 0)
          if (r.is_excused) daysExcused++
          otMinutes += r.overtime_minutes; otPay += r.overtime_pay
          return { date: d, ...r }
        })
        return {
          staff_id: s.id,
          name: s.name,
          shift_warning: shiftWarning(s),
          days_present: byDay.size,
          // الغياب: أيام دوام فاتت بدون حضور (ما نحسب الإجازات ولا الأيام الجاية)
          days_absent: dayRows.filter(r => !r.check_in && !r.day_off && r.date <= today).length,
          days_off: dayRows.filter(r => !r.check_in && r.day_off).length,
          extra_days: dayRows.filter(r => r.extra_day).length,
          total_late_minutes: totalLateMinutes,
          total_penalty: round2(totalPenalty),
          days_excused: daysExcused,
          total_overtime_minutes: otMinutes,
          total_overtime_pay: round2(otPay),
          ...(staff_id ? { days: dayRows } : {}),
        }
      })

      return NextResponse.json({ success: true, mode: 'range', from, to, totalDays: days.length, rows, overtime_mode: otSettings.mode })
    }

    // ═══ وضع اليوم الواحد — الوضع الافتراضي ═══
    const targetDate = date && DAY_RE.test(date) ? date : saudiToday()
    const [events] = await Promise.all([loadEvents(targetDate, targetDate), loadLeaves(targetDate, targetDate)])
    const rows = staff.map((s: any) => {
      const x = sessions(events.filter(e => e.staff_id === s.id)).find(v => v.date === targetDate) || null
      return { staff_id: s.id, name: s.name, shift_warning: shiftWarning(s), ...describe(s, x, targetDate) }
    })

    return NextResponse.json({ success: true, mode: 'day', date: targetDate, rows, overtime_mode: otSettings.mode })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
