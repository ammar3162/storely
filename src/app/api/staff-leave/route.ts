import { managerMay } from '@/lib/managerPerms'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { markRefNotificationsRead } from '@/lib/requestRefs'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { sendWhatsAppMessage, formatPhone } from '@/lib/whatsapp'
import { ownerWhatsapp } from '@/lib/ownerContact'

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
    let forcedBranch: string | null = null

    if (orgIdParam) {
      const access = await verifyOrgAccess(orgIdParam)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
      if (!managerMay(access as any, 'hr')) return NextResponse.json({ error: 'ما عندك صلاحية على الرواتب والإجازات — كلّم مالك المنشأة' }, { status: 403 })
      orgId = orgIdParam
      staffFilter = staffIdParam
      forcedBranch = enforcedBranchId(access)
    } else {
      const auth = await verifyStaffToken(extractStaffToken(req))
      if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.reason==='subscription_expired'?403:401 })
      orgId = auth.data!.org_id
      staffFilter = auth.data!.staff_id
    }

    // مدير الفرع يشوف موظفين فرعه بس
    let q = supabase.from('staff_leave_requests').select(forcedBranch ? '*,staff_members!inner(name,leave_balance_days,branch_id)' : '*,staff_members(name,leave_balance_days)').eq('org_id', orgId).order('requested_at', { ascending: false })
    if (staffFilter) q = q.eq('staff_id', staffFilter)
    if (forcedBranch) q = q.eq('staff_members.branch_id', forcedBranch)
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

    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.reason==='subscription_expired'?403:401 })
    const { org_id, staff_id, branch_id } = auth.data!

    const DAY = /^\d{4}-\d{2}-\d{2}$/
    const start = new Date(String(start_date) + 'T00:00:00Z')
    const end = new Date(String(end_date) + 'T00:00:00Z')
    if (!DAY.test(String(start_date)) || !DAY.test(String(end_date)) || isNaN(+start) || isNaN(+end)) return NextResponse.json({ error: 'تاريخ غير صالح' }, { status: 400 })
    if (end < start) return NextResponse.json({ error: 'تاريخ النهاية قبل تاريخ البداية' }, { status: 400 })
    const daysCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    if (daysCount > 365) return NextResponse.json({ error: 'مدة الإجازة طويلة جداً' }, { status: 400 })

    const supabase = sb()
    const { data: staffRow } = await supabase.from('staff_members').select('name,leave_balance_days').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    if (!staffRow) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })
    // الطلبات المعلّقة محسوبة من الرصيد — ما يقدر يقسّم إجازة أكبر من رصيده على كذا طلب
    const { data: pend } = await supabase.from('staff_leave_requests').select('days_count').eq('org_id', org_id).eq('staff_id', staff_id).eq('status', 'pending')
    const pendingDays = ((pend || []) as any[]).reduce((n, r) => n + Number(r.days_count || 0), 0)
    const balance = Number((staffRow as any)?.leave_balance_days || 0) - pendingDays
    if (daysCount > balance) return NextResponse.json({ error: pendingDays > 0 ? `رصيدك المتاح ${Math.max(0, balance)} يوم بعد طلباتك المعلّقة` : `رصيدك المتبقي ${balance} يوم فقط` }, { status: 400 })

    const { data: created, error } = await supabase.from('staff_leave_requests').insert({
      org_id, staff_id, start_date, end_date, days_count: daysCount, reason: reason ? String(reason).trim().slice(0, 300) : null, status: 'pending',
    } as any).select('id').single()
    if (error) return NextResponse.json({ error: 'فشل إرسال الطلب' }, { status: 500 })

    const staffName = (staffRow as any)?.name || 'موظف'
    await supabase.from('notifications').insert({
      org_id, branch_id: branch_id || null, type: 'info',
      title: 'طلب إجازة جديد',
      message: `${staffName} يطلب إجازة من ${start_date} إلى ${end_date} (${daysCount} يوم)${reason ? ` — السبب: ${reason}` : ''}`,
      ref_type: 'leave_request', ref_id: (created as any)?.id,
    } as any)

    const ownerWa = await ownerWhatsapp(supabase, org_id)   // رقم واتساب المنشأة اللي حدده المالك
    if (ownerWa) {
      await sendWhatsAppMessage(ownerWa!,
        `🏖️ *طلب إجازة جديد*\n\n${staffName} يطلب إجازة من ${start_date} إلى ${end_date} (${daysCount} يوم)${reason ? `\nالسبب: ${reason}` : ''}\n\nراجع الطلب من لوحة "إدارة الموظفين" بحساب Storely.`
      )
    }

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
    if (!managerMay(access as any, 'hr')) return NextResponse.json({ error: 'ما عندك صلاحية على الرواتب والإجازات — كلّم مالك المنشأة' }, { status: 403 })

    const supabase = sb()
    const { data: reqRow } = await supabase.from('staff_leave_requests').select('id,status,staff_id,days_count,staff_members(branch_id)').eq('id', request_id).eq('org_id', org_id).maybeSingle()
    const forced = enforcedBranchId(access)
    if (!reqRow || (forced && (reqRow as any).staff_members?.branch_id !== forced)) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if ((reqRow as any).status !== 'pending') return NextResponse.json({ error: 'تم البت بهذا الطلب مسبقاً' }, { status: 400 })
    const days = Number((reqRow as any).days_count || 0)
    if (decision === 'approved') {
      const { data: bal } = await supabase.from('staff_members').select('leave_balance_days').eq('id', (reqRow as any).staff_id).maybeSingle()
      const have = Number((bal as any)?.leave_balance_days || 0)
      if (days > have) return NextResponse.json({ error: `رصيد الموظف ${have} يوم والطلب ${days} يوم — زِد رصيده أول أو ارفض الطلب` }, { status: 400 })
    }

    // القرار مرة وحدة (شرط pending) — قبل خصم الرصيد عشان ما ينخصم مرتين
    const { data: updated, error } = await supabase.from('staff_leave_requests').update({
      status: decision, reviewed_by: 'owner', reviewed_at: new Date().toISOString(),
    } as any).eq('id', request_id).eq('status', 'pending').select('id').maybeSingle()
    if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
    if (!updated) return NextResponse.json({ error: 'تم البت بهذا الطلب مسبقاً' }, { status: 400 })
    await markRefNotificationsRead(supabase, org_id, 'leave_request', request_id)

    if (decision === 'approved') {
      // خصم الرصيد بشرط إنه ما تغيّر بيننا (موافقتين بنفس اللحظة ما يضيع خصم وحدة منهم)
      for (let i = 0; i < 4; i++) {
        const { data: staffRow } = await supabase.from('staff_members').select('leave_balance_days').eq('id', (reqRow as any).staff_id).maybeSingle()
        const balance = (staffRow as any)?.leave_balance_days
        let q = supabase.from('staff_members').update({ leave_balance_days: Math.max(0, Number(balance || 0) - days) } as any).eq('id', (reqRow as any).staff_id)
        q = balance == null ? q.is('leave_balance_days', null) : q.eq('leave_balance_days', balance)
        const { data: done } = await q.select('id').maybeSingle()
        if (done) break
      }
    }

    // إشعار داخل النظام للموظف بالنتيجة (كان ناقص تماماً قبل)
    const { data: staffRow2 } = await supabase.from('staff_members').select('preferred_lang').eq('id', (reqRow as any).staff_id).maybeSingle()
    const prefLang = (staffRow2 as any)?.preferred_lang === 'en' ? 'en' : 'ar'
    const titleMap = { ar: decision==='approved'?'تمت الموافقة على طلب الإجازة':'تم رفض طلب الإجازة', en: decision==='approved'?'Leave Request Approved':'Leave Request Rejected' }
    const messageMap = { ar: decision==='approved'?'استمتع بإجازتك 🌴':'طلبك مرفوض — راجع صاحب العمل لمزيد من التفاصيل', en: decision==='approved'?'Enjoy your leave 🌴':'Your request was rejected — check with your employer for details' }
    await supabase.from('staff_notifications').insert({
      org_id, staff_id: (reqRow as any).staff_id,
      type: decision === 'approved' ? 'success' : 'danger',
      title: titleMap[prefLang], message: messageMap[prefLang],
    } as any)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
