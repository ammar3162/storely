import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { selectAll } from '@/lib/selectAll'
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

type Ev = { id: string; staff_id: string; type: string; recorded_at: string; late_minutes: number | null; penalty_amount: number | null; penalty_waived?: boolean | null; penalty_applied?: boolean | null; overtime_minutes?: number | null; is_excused: boolean | null }

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
    let staffQ = supabase.from('staff_members').select('id,name,branch_id,shift_id,monthly_salary').eq('org_id', org_id).eq('is_active', true)
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
    const describe = (s: any, x: { checkIn: Ev; checkOut: Ev | null } | null) => {
      const ot = overtimeFor(s, x?.checkOut || null)
      const hours = x?.checkOut ? round2((Date.parse(x.checkOut.recorded_at) - Date.parse(x.checkIn.recorded_at)) / 3600e3) : null
      return {
        check_in: x?.checkIn.recorded_at || null,
        check_out: x?.checkOut?.recorded_at || null,
        hours_worked: hours !== null ? Math.round(hours * 10) / 10 : null,
        late_minutes: x?.checkIn.late_minutes ?? null,
        // الغرامة الملغاة من المالك ما تنحسب
        penalty_amount: x?.checkIn.penalty_waived ? null : (x?.checkIn.penalty_amount ?? null),
        penalty_original: x?.checkIn.penalty_amount ?? null,
        penalty_waived: !!x?.checkIn.penalty_waived,
        penalty_locked: !!x?.checkIn.penalty_applied,
        attendance_id: x?.checkIn.id ?? null,
        is_excused: !!x?.checkOut?.is_excused,
        overtime_minutes: ot.minutes,
        overtime_pay: ot.pay,
        status: x ? (x.checkOut ? 'انصرف' : 'حاضر') : 'لم يحضر',
      }
    }

    const loadEvents = async (startDay: string, endDay: string) => {
      // نهاية الفترة + 20 ساعة عشان انصراف آخر يوم بعد منتصف الليل
      const end = new Date(Date.parse(`${endDay}T23:59:59.999+03:00`) + 20 * 3600e3).toISOString()
      const { data } = await selectAll<Ev>(() => {
        let q = supabase.from('staff_attendance').select('id,staff_id,type,recorded_at,late_minutes,penalty_amount,penalty_waived,penalty_applied,overtime_minutes,is_excused')
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
      const events = await loadEvents(from, to)

      const rows = staff.map((s: any) => {
        const mine = sessions(events.filter(e => e.staff_id === s.id)).filter(x => x.date >= from && x.date <= to)
        const byDay = new Map<string, typeof mine[number]>()
        for (const x of mine) if (!byDay.has(x.date)) byDay.set(x.date, x)   // أول حضور باليوم
        let totalLateMinutes = 0, totalPenalty = 0, daysExcused = 0, otMinutes = 0, otPay = 0
        const dayRows = days.map(d => {
          const r = describe(s, byDay.get(d) || null)
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
          days_absent: days.length - byDay.size,
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
    const events = await loadEvents(targetDate, targetDate)
    const rows = staff.map((s: any) => {
      const x = sessions(events.filter(e => e.staff_id === s.id)).find(v => v.date === targetDate) || null
      return { staff_id: s.id, name: s.name, shift_warning: shiftWarning(s), ...describe(s, x) }
    })

    return NextResponse.json({ success: true, mode: 'day', date: targetDate, rows, overtime_mode: otSettings.mode })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
