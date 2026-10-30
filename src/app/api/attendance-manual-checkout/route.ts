import { managerMay } from '@/lib/managerPerms'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { overtimeMinutes, loadOvertimeSettings, type Shift } from '@/lib/payroll'
import { manualCheckoutAt, manualCheckoutError } from '@/lib/manualCheckout'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// المالك يسجّل انصراف عن موظف طلع بدون ما يسجّله (زر الانصراف يحتاج الموظف داخل الفرع).
// السطر بدون موقع (latitude = null) — كذا التقرير يعرف إنه «سجّله المالك».
export async function POST(req: Request) {
  try {
    const { org_id, attendance_id, time, excused } = await req.json()
    if (!org_id || !attendance_id || !time) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!managerMay(access as any, 'attendance', 'hr')) return NextResponse.json({ error: 'ما عندك صلاحية على هالقسم — كلّم مالك المنشأة' }, { status: 403 })
    if (access.role !== 'owner') return NextResponse.json({ error: 'تسجيل الانصراف عن الموظف للمالك فقط' }, { status: 403 })

    const db = sb()
    const { data: ci } = await db.from('staff_attendance')
      .select('id,org_id,branch_id,staff_id,staff_name,recorded_at,shift_start_time,shift_end_time,shift_is_24h')
      .eq('id', attendance_id).eq('org_id', org_id).eq('type', 'check_in').maybeSingle()
    if (!ci) return NextResponse.json({ error: 'سجل الحضور غير موجود' }, { status: 404 })
    const checkIn = ci as any

    // لازم يكون آخر حركة للموظف: ما انصرف بعده ولا حضر دوام ثاني
    const { data: later } = await db.from('staff_attendance').select('id').eq('org_id', org_id).eq('staff_id', checkIn.staff_id)
      .gt('recorded_at', checkIn.recorded_at).limit(1)
    if ((later || []).length) return NextResponse.json({ error: 'الموظف مسجّل له انصراف أو حضور بعد هالحضور' }, { status: 409 })

    const atMs = manualCheckoutAt(checkIn.recorded_at, String(time))
    if (atMs == null) return NextResponse.json({ error: 'الوقت غير صالح' }, { status: 400 })
    const invalid = manualCheckoutError(checkIn.recorded_at, atMs)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    // الأوفر تايم على الشفت اللي حضر عليه (نفس الانصراف العادي). المستأذن ما له أوفر تايم
    const shift: Shift = checkIn.shift_is_24h == null || (!checkIn.shift_start_time && !checkIn.shift_is_24h) ? null
      : { start_time: checkIn.shift_start_time, end_time: checkIn.shift_end_time, is_24h: !!checkIn.shift_is_24h }
    const atIso = new Date(atMs).toISOString()
    const ot = excused ? 0 : overtimeMinutes(atIso, shift, (await loadOvertimeSettings(db, org_id)).minMinutes)

    const { data: row, error } = await db.from('staff_attendance').insert({
      org_id, branch_id: checkIn.branch_id, staff_id: checkIn.staff_id, staff_name: checkIn.staff_name,
      type: 'check_out', recorded_at: atIso, is_excused: !!excused, overtime_minutes: ot,
      latitude: null, longitude: null, within_range: false,
    } as any).select('id').single()
    if (error || !row) return NextResponse.json({ error: 'تعذر تسجيل الانصراف' }, { status: 500 })
    return NextResponse.json({ success: true, id: (row as any).id, recorded_at: atIso, overtime_minutes: ot })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
