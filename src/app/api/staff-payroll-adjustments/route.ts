import { managerMay } from '@/lib/managerPerms'
import { NextResponse } from 'next/server'
import { notifyStaffDeduction } from '@/lib/staffDeductionNotice'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { markRefNotificationsRead } from '@/lib/requestRefs'
import { sendWhatsAppMessage, formatPhone } from '@/lib/whatsapp'
import { ownerWhatsapp } from '@/lib/ownerContact'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// جلب سجل الخصومات/السلف — للمالك (org_id بالـquery) أو للموظف (توكن)
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
    let q = supabase.from('staff_payroll_adjustments').select(forcedBranch ? '*,staff_members!inner(name,branch_id)' : '*,staff_members(name)').eq('org_id', orgId).order('created_at', { ascending: false })
    if (staffFilter) q = q.eq('staff_id', staffFilter)
    if (forcedBranch) q = q.eq('staff_members.branch_id', forcedBranch)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    return NextResponse.json({ success: true, adjustments: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إضافة خصم من المالك (موافق تلقائياً) أو طلب سلفة من الموظف (بانتظار الموافقة)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, amount, reason } = body
    if (!type || !['deduction', 'advance'].includes(type)) return NextResponse.json({ error: 'نوع غير صالح' }, { status: 400 })
    const amountNum = Number(amount)
    if (!(amountNum > 0)) return NextResponse.json({ error: 'مبلغ غير صالح' }, { status: 400 })

    const supabase = sb()

    if (body.org_id && body.staff_id) {
      // المالك يضيف خصم مباشر (موافق فوراً)
      const access = await verifyOrgAccess(body.org_id)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
      if (!managerMay(access as any, 'hr')) return NextResponse.json({ error: 'ما عندك صلاحية على الرواتب والإجازات — كلّم مالك المنشأة' }, { status: 403 })

      const { data: orgCheck } = await supabase.from('organizations').select('plan').eq('id', body.org_id).single()
      if ((orgCheck as any)?.plan === 'basic') {
        return NextResponse.json({ error: 'ميزة الرواتب متاحة فقط بالباقة المتوسطة أو المتقدمة' }, { status: 403 })
      }

      // الموظف لازم يكون من نفس المنشأة (ومن فرع المدير لو كان مدير فرع)
      const { data: target } = await supabase.from('staff_members').select('id,branch_id').eq('id', body.staff_id).eq('org_id', body.org_id).maybeSingle()
      const forced = enforcedBranchId(access)
      if (!target || (forced && (target as any).branch_id !== forced)) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })
      if (amountNum > 1_000_000) return NextResponse.json({ error: 'مبلغ غير صالح' }, { status: 400 })

      const { error } = await supabase.from('staff_payroll_adjustments').insert({
        org_id: body.org_id, staff_id: body.staff_id, type, amount: Math.round(amountNum * 100) / 100, reason: reason ? String(reason).trim().slice(0, 300) : null,
        status: 'approved', requested_by: 'owner', reviewed_by: 'owner', reviewed_at: new Date().toISOString(),
      } as any)
      if (error) return NextResponse.json({ error: 'فشل الحفظ' }, { status: 500 })
      // إشعار للموظف بصفحته
      if (type === 'deduction') await notifyStaffDeduction(supabase, body.org_id, body.staff_id, { kind: 'manual', amount: amountNum, reason: reason ? String(reason).trim().slice(0, 300) : null })
      return NextResponse.json({ success: true })
    } else {
      // الموظف يطلب سلفة (بانتظار الموافقة) — نوع advance فقط
      if (type !== 'advance') return NextResponse.json({ error: 'الموظف يقدر يطلب سلفة فقط' }, { status: 400 })
      const auth = await verifyStaffToken(extractStaffToken(req))
      if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.reason==='subscription_expired'?403:401 })
      const { org_id, staff_id } = auth.data!

      const { data: staffRow } = await supabase.from('staff_members').select('name,branch_id,monthly_salary,housing_allowance,transport_allowance,food_allowance').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
      if (!staffRow) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })
      if (amountNum > 1_000_000) return NextResponse.json({ error: 'مبلغ غير صالح' }, { status: 400 })
      const s = staffRow as any
      const monthly = Number(s.monthly_salary || 0) + Number(s.housing_allowance || 0) + Number(s.transport_allowance || 0) + Number(s.food_allowance || 0)
      if (monthly > 0 && amountNum > monthly) return NextResponse.json({ error: `السلفة أكبر من راتبك الشهري (${monthly} ر.س)` }, { status: 400 })
      // طلب واحد بانتظار الرد — يمنع تكرار الطلب ورسائل الواتساب للمالك
      const { data: pendingAdv } = await supabase.from('staff_payroll_adjustments').select('id').eq('org_id', org_id).eq('staff_id', staff_id).eq('type', 'advance').eq('status', 'pending').limit(1).maybeSingle()
      if (pendingAdv) return NextResponse.json({ error: 'عندك طلب سلفة بانتظار الرد — انتظر رد صاحب العمل' }, { status: 409 })

      const { data: created, error } = await supabase.from('staff_payroll_adjustments').insert({
        org_id, staff_id, type: 'advance', amount: Math.round(amountNum * 100) / 100, reason: reason ? String(reason).trim().slice(0, 300) : null,
        status: 'pending', requested_by: 'staff',
      } as any).select('id').single()
      if (error) return NextResponse.json({ error: 'فشل إرسال الطلب' }, { status: 500 })

      // إشعار داخل النظام للمالك (يظهر بجرس الإشعارات)
      const staffName = (staffRow as any)?.name || 'موظف'
      const branchId = (staffRow as any)?.branch_id || null
      await supabase.from('notifications').insert({
        org_id, branch_id: branchId, type: 'info',
        title: 'طلب سلفة جديد',
        message: `${staffName} يطلب سلفة بمبلغ ${amountNum} ر.س${reason ? ` — السبب: ${reason}` : ''}`,
        ref_type: 'advance_request', ref_id: (created as any)?.id,
      } as any)

      // إشعار واتساب للمالك
      const ownerWa = await ownerWhatsapp(supabase, org_id)   // رقم واتساب المنشأة اللي حدده المالك
      if (ownerWa) {
        await sendWhatsAppMessage(ownerWa!,
          `💰 *طلب سلفة جديد*\n\n${staffName} يطلب سلفة بمبلغ *${amountNum} ر.س*${reason ? `\nالسبب: ${reason}` : ''}\n\nراجع الطلب من لوحة "إدارة الموظفين" بحساب Storely.`
        )
      }

      return NextResponse.json({ success: true })
    }
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// المالك يوافق/يرفض طلب سلفة
export async function PATCH(req: Request) {
  try {
    const { org_id, adjustment_id, decision } = await req.json()
    if (!org_id || !adjustment_id || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!managerMay(access as any, 'hr')) return NextResponse.json({ error: 'ما عندك صلاحية على الرواتب والإجازات — كلّم مالك المنشأة' }, { status: 403 })

    const supabase = sb()
    const { data: adj } = await supabase.from('staff_payroll_adjustments').select('id,status,type,amount,staff_id,staff_members(branch_id)').eq('id', adjustment_id).eq('org_id', org_id).maybeSingle()
    // مدير الفرع يرد على طلبات موظفين فرعه بس
    const forced = enforcedBranchId(access)
    if (!adj || (forced && (adj as any).staff_members?.branch_id !== forced)) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if ((adj as any).status !== 'pending') return NextResponse.json({ error: 'تم البت بهذا الطلب مسبقاً' }, { status: 400 })

    // القرار مرة وحدة (شرط pending)
    const { data: updated, error } = await supabase.from('staff_payroll_adjustments').update({
      status: decision, reviewed_by: 'owner', reviewed_at: new Date().toISOString(),
    } as any).eq('id', adjustment_id).eq('status', 'pending').select('id').maybeSingle()
    if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
    if (!updated) return NextResponse.json({ error: 'تم البت بهذا الطلب مسبقاً' }, { status: 400 })
    await markRefNotificationsRead(supabase, org_id, 'advance_request', adjustment_id)

    // إشعار داخل النظام للموظف بالنتيجة (لو النوع سلفة) — بلغته المفضّلة
    if ((adj as any).type === 'advance') {
      const amount = (adj as any).amount
      const { data: staffRow } = await supabase.from('staff_members').select('preferred_lang').eq('id', (adj as any).staff_id).maybeSingle()
      const prefLang = (staffRow as any)?.preferred_lang === 'en' ? 'en' : 'ar'

      const titleMap = { ar: decision==='approved'?'تمت الموافقة على طلب السلفة':'تم رفض طلب السلفة', en: decision==='approved'?'Advance Request Approved':'Advance Request Rejected' }
      const messageMap = {
        ar: decision==='approved' ? `تمت الموافقة على سلفتك بمبلغ ${amount} ر.س — راجع صاحب العمل لاستلامها` : `تم رفض طلب السلفة بمبلغ ${amount} ر.س`,
        en: decision==='approved' ? `Your advance of ${amount} SAR was approved — check with your employer to collect it` : `Your advance request of ${amount} SAR was rejected`,
      }

      await supabase.from('staff_notifications').insert({
        org_id, staff_id: (adj as any).staff_id,
        type: decision === 'approved' ? 'success' : 'danger',
        title: titleMap[prefLang], message: messageMap[prefLang],
      } as any)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
