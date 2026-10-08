import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { sendWhatsAppMessage, formatPhone } from '@/lib/whatsapp'
import { ownerWhatsapp } from '@/lib/ownerContact'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { markRefNotificationsRead } from '@/lib/requestRefs'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    // الموظف من توكن الدخول — ما نصدّق رقم الموظف أو المنشأة من الطلب
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid || !auth.data) return NextResponse.json({ error: auth.error, reason: auth.reason }, { status: 401 })
    const { org_id, staff_id } = auth.data
    const body = await req.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : ''

    const supabase = sb()
    const { data: staffRow } = await supabase.from('staff_members').select('name,branch_id,is_active').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    if (!staffRow || (staffRow as any).is_active === false) return NextResponse.json({ error: 'الحساب غير فعّال' }, { status: 403 })
    const staff_name: string = (staffRow as any).name
    const branch_id: string | null = (staffRow as any).branch_id ?? auth.data.branch_id ?? null

    // ما نسمح بأكثر من طلب معلّق بنفس الوقت لنفس الموظف
    const { data: pending } = await supabase.from('attendance_permission_requests')
      .select('id').eq('staff_id', staff_id).eq('status', 'pending').maybeSingle()
    if (pending) return NextResponse.json({ error: 'عندك طلب استئذان قيد الانتظار بالفعل' }, { status: 400 })

    const token = randomBytes(16).toString('hex')
    const { data: inserted, error } = await supabase.from('attendance_permission_requests').insert({
      org_id, branch_id, staff_id, staff_name: staff_name || null, reason: reason || null, token,
    } as any).select('id').single()
    if (error) return NextResponse.json({ error: 'فشل إرسال الطلب' }, { status: 500 })

    // إشعار داخل النظام للمالك (يظهر بجرس الإشعارات بلوحته)
    const name = staff_name || 'موظف'
    await supabase.from('notifications').insert({
      org_id, branch_id, type: 'info',
      title: 'طلب استئذان جديد',
      message: `${name} يطلب الانصراف قبل نهاية شفته${reason ? ` — السبب: ${reason}` : ''}`,
      ref_type: 'excuse_request', ref_id: (inserted as any)?.id,
    } as any)

    const ownerWa = await ownerWhatsapp(supabase, org_id)   // رقم واتساب المنشأة اللي حدده المالك
    if (ownerWa) {
      await sendWhatsAppMessage(ownerWa!,
        `🚪 *طلب استئذان جديد*\n\n${name} يطلب الانصراف قبل نهاية شفته${reason ? `\nالسبب: ${reason}` : ''}\n\nراجع الطلب من لوحة "إدارة الموظفين" بحساب Storely.`
      )
    }

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
      const access = await verifyOrgAccess(org_id)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
      const { data } = await supabase.from('attendance_permission_requests').select('id,status,org_id,staff_id,branch_id').eq('id', id).eq('org_id', org_id).maybeSingle()
      // مدير الفرع يرد على طلبات فرعه بس
      const forced = enforcedBranchId(access)
      reqRow = data && (!forced || (data as any).branch_id === forced) ? data : null
    }
    if (!reqRow) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if (reqRow.status !== 'pending') return NextResponse.json({ error: 'تم الرد على هذا الطلب مسبقاً' }, { status: 400 })

    // القرار مرة وحدة (شرط pending) — ضغطتين بنفس اللحظة ما يسجلون قرارين
    const { data: updated, error } = await supabase.from('attendance_permission_requests').update({
      status: action === 'approve' ? 'approved' : 'rejected', resolved_at: new Date().toISOString(),
    } as any).eq('id', reqRow.id).eq('status', 'pending').select('id').maybeSingle()
    if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
    if (!updated) return NextResponse.json({ error: 'تم الرد على هذا الطلب مسبقاً' }, { status: 400 })
    await markRefNotificationsRead(supabase, reqRow.org_id, 'excuse_request', reqRow.id)

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
      const access = await verifyOrgAccess(org_id)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
      let q = supabase.from('attendance_permission_requests')
        .select('id,org_id,branch_id,staff_id,staff_name,reason,status,requested_at,resolved_at').eq('org_id', org_id)
      const forced = enforcedBranchId(access)
      if (forced) q = q.eq('branch_id', forced)
      const { data } = await q.order('requested_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, requests: data || [] })
    }

    if (token) {
      const { data } = await supabase.from('attendance_permission_requests')
        .select('staff_name,reason,status,requested_at').eq('token', token).maybeSingle()
      if (!data) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
      return NextResponse.json({ success: true, request: data })
    }

    // طلبات الموظف نفسه — من توكن الدخول (ما نقبل staff_id من الرابط)
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid || !auth.data) return NextResponse.json({ error: auth.error, reason: auth.reason }, { status: 401 })
    void staff_id
    const myId = auth.data.staff_id

    // history=true يرجّع كل طلبات الموظف السابقة (للسجل) -- بدون هذا يرجّع بس آخر طلب اليوم (للحالة الحالية)
    if (searchParams.get('history') === 'true') {
      const { data: hist } = await supabase.from('attendance_permission_requests')
        .select('id,status,reason,requested_at,resolved_at')
        .eq('staff_id', myId).order('requested_at', { ascending: false }).limit(30)
      return NextResponse.json({ success: true, requests: hist || [] })
    }

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const { data } = await supabase.from('attendance_permission_requests')
      .select('id,status,reason,requested_at')
      .eq('staff_id', myId).gte('requested_at', todayStart.toISOString())
      .order('requested_at', { ascending: false }).limit(1).maybeSingle()

    return NextResponse.json({ success: true, request: data || null })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
