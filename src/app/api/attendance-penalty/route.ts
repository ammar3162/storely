import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// المالك يلغي غرامة تأخير يوم معيّن (أو يرجّعها) — غرامات التأخير تنخصم تلقائياً من الراتب
export async function POST(req: Request) {
  try {
    const { org_id, attendance_id, waived } = await req.json()
    if (!org_id || !attendance_id || typeof waived !== 'boolean') return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'إلغاء الغرامة للمالك فقط' }, { status: 403 })

    // الغرامات اللي انخصمت سابقاً كخصم مجمّع (penalty_applied) ما تتعدّل من هنا
    const { data, error } = await sb().from('staff_attendance')
      .update({ penalty_waived: waived } as any)
      .eq('id', attendance_id).eq('org_id', org_id).eq('type', 'check_in')
      .gt('penalty_amount', 0).eq('penalty_applied', false)
      .select('id').maybeSingle()
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'الغرامة غير موجودة أو انخصمت سابقاً' }, { status: 404 })
    return NextResponse.json({ success: true, waived })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
