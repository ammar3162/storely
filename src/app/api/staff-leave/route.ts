import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// جلب طلبات الإجازة — للمالك (org_id) أو للموظف (توكن)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const orgIdParam = searchParams.get('org_id')
    const staffIdParam = searchParams.get('staff_id')
    const supabase = sb()

    let orgId: string
    let staffFilter: string | null = null

    if (orgIdParam) {
      const access = await verifyOrgAccess(orgIdParam)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
      orgId = orgIdParam
      staffFilter = staffIdParam
    } else {
      const auth = verifyStaffToken(extractStaffToken(req))
      if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
      orgId = auth.data!.org_id
      staffFilter = auth.data!.staff_id
    }

    let q = supabase.from('staff_leave_requests').select('*,staff_members(name,leave_balance_days)').eq('org_id', orgId).order('requested_at', { ascending: false })
    if (staffFilter) q = q.eq('staff_id', staffFilter)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    return NextResponse.json({ success: true, requests: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// الموظف يطلب إجازة
export async function POST(req: Request) {
  try {
    const { start_date, end_date, reason } = await req.json()
    if (!start_date || !end_date) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const auth = verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { org_id, staff_id, branch_id } = auth.data!

    const start = new Date(start_date)
    const end = new Date(end_date)
    if (end < start) return NextResponse.json({ error: 'تاريخ النهاية قبل تاريخ البداية' }, { status: 400 })
    const daysCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const supabase = sb()
    const { data: staffRow } = await supabase.from('staff_members').select('name,leave_balance_days').eq('id', staff_id).maybeSingle()
    const balance = Number((staffRow as any)?.leave_balance_days || 0)
    if (daysCount > balance) return NextResponse.json({ error: `رصيدك المتبقي ${balance} يوم فقط` }, { status: 400 })

    const { error } = await supabase.from('staff_leave_requests').insert({
      org_id, staff_id, start_date, end_date, days_count: daysCount, reason: reason || null, status: 'pending',
    } as any)
    if (error) return NextResponse.json({ error: 'فشل إرسال الطلب' }, { status: 500 })

    const staffName = (staffRow as any)?.name || 'موظف'
    await supabase.from('notifications').insert({
      org_id, branch_id: branch_id || null, type: 'info',
      title: 'طلب إجازة جديد',
      message: `${staffName} يطلب إجازة من ${start_date} إلى ${end_date} (${daysCount} يوم)${reason ? ` — السبب: ${reason}` : ''}`,
    } as any)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// المالك يوافق/يرفض طلب إجازة — عند الموافقة يُخصم من الرصيد
export async function PATCH(req: Request) {
  try {
    const { org_id, request_id, decision } = await req.json()
    if (!org_id || !request_id || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: reqRow } = await supabase.from('staff_leave_requests').select('id,status,staff_id,days_count').eq('id', request_id).eq('org_id', org_id).maybeSingle()
    if (!reqRow) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if ((reqRow as any).status !== 'pending') return NextResponse.json({ error: 'تم البت بهذا الطلب مسبقاً' }, { status: 400 })

    if (decision === 'approved') {
      const { data: staffRow } = await supabase.from('staff_members').select('leave_balance_days').eq('id', (reqRow as any).staff_id).maybeSingle()
      const balance = Number((staffRow as any)?.leave_balance_days || 0)
      const newBalance = Math.max(0, balance - Number((reqRow as any).days_count))
      await supabase.from('staff_members').update({ leave_balance_days: newBalance } as any).eq('id', (reqRow as any).staff_id)
    }

    const { error } = await supabase.from('staff_leave_requests').update({
      status: decision, reviewed_by: 'owner', reviewed_at: new Date().toISOString(),
    } as any).eq('id', request_id)
    if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
