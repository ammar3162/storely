import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    const date = searchParams.get('date') // YYYY-MM-DD — افتراضي اليوم
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    const targetDate = date || new Date().toISOString().slice(0, 10)
    const dayStart = `${targetDate}T00:00:00.000Z`
    const dayEnd = `${targetDate}T23:59:59.999Z`

    const supabase = sb()

    // كل الموظفين النشطين بالفرع/المنشأة
    let staffQ = supabase.from('staff_members').select('id,name,branch_id').eq('org_id', org_id).eq('is_active', true)
    if (effectiveBranchId) staffQ = staffQ.eq('branch_id', effectiveBranchId)
    const { data: staffList } = await staffQ.order('name')

    // كل أحداث الحضور لليوم المحدد
    let attQ = supabase.from('staff_attendance').select('staff_id,type,recorded_at,within_range,distance_m')
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
        status: checkIn ? (checkOut ? 'انصرف' : 'حاضر') : 'لم يحضر',
      }
    })

    return NextResponse.json({ success: true, date: targetDate, rows })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
