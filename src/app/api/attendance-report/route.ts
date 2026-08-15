import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function dateRange(from: string, to: string): string[] {
  const dates: string[] = []
  const cur = new Date(from + 'T00:00:00Z')
  const end = new Date(to + 'T00:00:00Z')
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    const date = searchParams.get('date') // وضع يوم واحد
    const from = searchParams.get('from') // وضع فترة
    const to = searchParams.get('to')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    const supabase = sb()

    const { data: orgCheck } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    if ((orgCheck as any)?.plan === 'basic') {
      return NextResponse.json({ error: 'upgrade_required', message: 'ميزة الحضور والانصراف متاحة فقط بالباقة المتوسطة أو المتقدمة' }, { status: 403 })
    }

    let staffQ = supabase.from('staff_members').select('id,name,branch_id').eq('org_id', org_id).eq('is_active', true)
    if (effectiveBranchId) staffQ = staffQ.eq('branch_id', effectiveBranchId)
    const { data: staffList } = await staffQ.order('name')

    // ═══ وضع الفترة الزمنية — ملخّص إجمالي (حضور/غياب/تأخير/خصومات) ═══
    if (from && to) {
      const days = dateRange(from, to)
      const rangeStart = `${from}T00:00:00.000Z`
      const rangeEnd = `${to}T23:59:59.999Z`

      let attQ = supabase.from('staff_attendance').select('staff_id,type,recorded_at,late_minutes,penalty_amount')
        .eq('org_id', org_id).gte('recorded_at', rangeStart).lte('recorded_at', rangeEnd).order('recorded_at')
      if (effectiveBranchId) attQ = attQ.eq('branch_id', effectiveBranchId)
      const { data: events } = await attQ

      const rows = (staffList || []).map((s: any) => {
        const staffEvents = (events || []).filter((e: any) => e.staff_id === s.id)
        let daysPresent = 0
        let totalLateMinutes = 0
        let totalPenalty = 0
        for (const d of days) {
          const dayCheckIn = staffEvents.find((e: any) => e.type === 'check_in' && e.recorded_at.slice(0, 10) === d)
          if (dayCheckIn) {
            daysPresent++
            totalLateMinutes += Number(dayCheckIn.late_minutes || 0)
            totalPenalty += Number(dayCheckIn.penalty_amount || 0)
          }
        }
        return {
          staff_id: s.id,
          name: s.name,
          days_present: daysPresent,
          days_absent: days.length - daysPresent,
          total_late_minutes: totalLateMinutes,
          total_penalty: Math.round(totalPenalty * 100) / 100,
        }
      })

      return NextResponse.json({ success: true, mode: 'range', from, to, totalDays: days.length, rows })
    }

    // ═══ وضع اليوم الواحد — الوضع الافتراضي ═══
    const targetDate = date || new Date().toISOString().slice(0, 10)
    const dayStart = `${targetDate}T00:00:00.000Z`
    const dayEnd = `${targetDate}T23:59:59.999Z`

    let attQ = supabase.from('staff_attendance').select('staff_id,type,recorded_at,within_range,distance_m,late_minutes,penalty_amount')
      .eq('org_id', org_id).gte('recorded_at', dayStart).lte('recorded_at', dayEnd).order('recorded_at')
    if (effectiveBranchId) attQ = attQ.eq('branch_id', effectiveBranchId)
    const { data: events } = await attQ

    const rows = (staffList || []).map((s: any) => {
      const staffEvents = (events || []).filter((e: any) => e.staff_id === s.id)
      const checkIn = staffEvents.find((e: any) => e.type === 'check_in')
      const checkOut = [...staffEvents].reverse().find((e: any) => e.type === 'check_out')
      let hoursWorked: number | null = null
      if (checkIn && checkOut) {
        hoursWorked = (new Date(checkOut.recorded_at).getTime() - new Date(checkIn.recorded_at).getTime()) / (1000 * 60 * 60)
      }
      return {
        staff_id: s.id,
        name: s.name,
        check_in: checkIn?.recorded_at || null,
        check_out: checkOut?.recorded_at || null,
        hours_worked: hoursWorked !== null ? Math.round(hoursWorked * 10) / 10 : null,
        late_minutes: checkIn?.late_minutes ?? null,
        penalty_amount: checkIn?.penalty_amount ?? null,
        status: checkIn ? (checkOut ? 'انصرف' : 'حاضر') : 'لم يحضر',
      }
    })

    return NextResponse.json({ success: true, mode: 'day', date: targetDate, rows })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
