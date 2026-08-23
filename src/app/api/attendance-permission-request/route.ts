import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, branch_id, staff_id, staff_name, reason } = await req.json()
    if (!org_id || !branch_id || !staff_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const supabase = sb()

    // ما نسمح بأكثر من طلب معلّق بنفس الوقت لنفس الموظف
    const { data: pending } = await supabase.from('attendance_permission_requests')
      .select('id').eq('staff_id', staff_id).eq('status', 'pending').maybeSingle()
    if (pending) return NextResponse.json({ error: 'عندك طلب استئذان قيد الانتظار بالفعل' }, { status: 400 })

    const token = randomBytes(16).toString('hex')
    const { data: inserted, error } = await supabase.from('attendance_permission_requests').insert({
      org_id, branch_id, staff_id, staff_name: staff_name || null, reason: reason?.trim() || null, token,
    } as any).select('id').single()
    if (error) return NextResponse.json({ error: 'فشل إرسال الطلب' }, { status: 500 })

    // إشعار داخل النظام للمالك (يظهر بجرس الإشعارات بلوحته)
    const name = staff_name || 'موظف'
    await supabase.from('notifications').insert({
      org_id, branch_id, type: 'info',
      title: 'طلب استئذان جديد',
      message: `${name} يطلب الانصراف قبل نهاية شفته${reason ? ` — السبب: ${reason}` : ''}`,
    } as any)

    return NextResponse.json({ success: true, id: (inserted as any)?.id })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { token, id, org_id, action } = body
    if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    if (!token && !(id && org_id)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const supabase = sb()

    let reqRow: any
    if (token) {
      const { data } = await supabase.from('attendance_permission_requests').select('id,status,org_id,staff_id').eq('token', token).maybeSingle()
      reqRow = data
    } else {
      const { verifyOrgAccess } = await import('@/lib/verifyOrgAccess')
      const access = await verifyOrgAccess(org_id)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
      const { data } = await supabase.from('attendance_permission_requests').select('id,status,org_id,staff_id').eq('id', id).eq('org_id', org_id).maybeSingle()
      reqRow = data
    }
    if (!reqRow) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if (reqRow.status !== 'pending') return NextResponse.json({ error: 'تم الرد على هذا الطلب مسبقاً' }, { status: 400 })

    const { error } = await supabase.from('attendance_permission_requests').update({
      status: action === 'approve' ? 'approved' : 'rejected', resolved_at: new Date().toISOString(),
    } as any).eq('id', reqRow.id)
    if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })

    // إشعار داخل النظام للموظف بالنتيجة
    const { data: staffRow } = await supabase.from('staff_members').select('preferred_lang').eq('id', (reqRow as any).staff_id).maybeSingle()
    const prefLang = (staffRow as any)?.preferred_lang === 'en' ? 'en' : 'ar'
    const titleMap = { ar: action==='approve'?'تمت الموافقة على طلب الاستئذان':'تم رفض طلب الاستئذان', en: action==='approve'?'Early Leave Request Approved':'Early Leave Request Rejected' }
    const messageMap = { ar: action==='approve'?'تقدر تنصرف الآن قبل نهاية شفتك':'طلبك مرفوض — لازم تكمل شفتك المحددة', en: action==='approve'?'You may leave now before your shift ends':'Your request was rejected — please complete your scheduled shift' }
    await supabase.from('staff_notifications').insert({
      org_id: (reqRow as any).org_id, staff_id: (reqRow as any).staff_id,
      type: action==='approve' ? 'success' : 'danger',
      title: titleMap[prefLang], message: messageMap[prefLang],
    } as any)

    return NextResponse.json({ success: true, status: action === 'approve' ? 'approved' : 'rejected' })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const staff_id = searchParams.get('staff_id')
    const token = searchParams.get('token')
    const org_id = searchParams.get('org_id')
    const supabase = sb()

    if (org_id) {
      const { verifyOrgAccess } = await import('@/lib/verifyOrgAccess')
      const access = await verifyOrgAccess(org_id)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
      const { data } = await supabase.from('attendance_permission_requests')
        .select('*').eq('org_id', org_id).order('requested_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, requests: data || [] })
    }

    if (token) {
      const { data } = await supabase.from('attendance_permission_requests')
        .select('staff_name,reason,status,requested_at').eq('token', token).maybeSingle()
      if (!data) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
      return NextResponse.json({ success: true, request: data })
    }

    if (!staff_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const { data } = await supabase.from('attendance_permission_requests')
      .select('id,status,reason,requested_at')
      .eq('staff_id', staff_id).gte('requested_at', todayStart.toISOString())
      .order('requested_at', { ascending: false }).limit(1).maybeSingle()

    return NextResponse.json({ success: true, request: data || null })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
