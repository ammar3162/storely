import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { computeStaffPayroll, loadOvertimeSettings } from '@/lib/payroll'
import { orgHasHrFeature } from '@/lib/hrAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// «راتبي»: الموظف يشوف راتبه وخصوماته وأوفر تايمه لشهر — الموظف من التوكن الموقّع فقط،
// ويشتغل بس لو المالك فعّل staff_salary_visible والمنشأة عندها ميزة إدارة الموظفين
export async function GET(req: Request) {
  try {
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid || !auth.data) return NextResponse.json({ error: auth.error, reason: auth.reason }, { status: 401 })
    const { staff_id, org_id } = auth.data

    const month = new URL(req.url).searchParams.get('month') || ''
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: 'الشهر غير صالح' }, { status: 400 })

    const db = sb()
    const { data: org } = await db.from('organizations').select('plan,currency,staff_salary_visible').eq('id', org_id).single()
    if (!(org as any)?.staff_salary_visible || !(await orgHasHrFeature(db, org_id, (org as any)?.plan))) {
      return NextResponse.json({ error: 'صفحة الراتب غير مفعّلة', reason: 'disabled' }, { status: 403 })
    }

    const { data: staff } = await db.from('staff_members')
      .select('id,org_id,name,monthly_salary,housing_allowance,transport_allowance,food_allowance,shift_id,weekly_off_days,days_off_mode,monthly_off_days,biweekly_anchor,off_dates')
      .eq('id', staff_id).eq('org_id', org_id).single()
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const payroll = await computeStaffPayroll(db, staff, month, await loadOvertimeSettings(db, org_id))
    return NextResponse.json({ success: true, name: (staff as any).name, currency: (org as any)?.currency || null, payroll },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
