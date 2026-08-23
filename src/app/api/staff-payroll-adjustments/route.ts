import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { sendWhatsAppMessage, formatPhone } from '@/lib/whatsapp'

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

    let q = supabase.from('staff_payroll_adjustments').select('*,staff_members(name)').eq('org_id', orgId).order('created_at', { ascending: false })
    if (staffFilter) q = q.eq('staff_id', staffFilter)
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

      const { data: orgCheck } = await supabase.from('organizations').select('plan').eq('id', body.org_id).single()
      if ((orgCheck as any)?.plan === 'basic') {
        return NextResponse.json({ error: 'ميزة الرواتب متاحة فقط بالباقة المتوسطة أو المتقدمة' }, { status: 403 })
      }

      const { error } = await supabase.from('staff_payroll_adjustments').insert({
        org_id: body.org_id, staff_id: body.staff_id, type, amount: amountNum, reason: reason || null,
        status: 'approved', requested_by: 'owner', reviewed_by: 'owner', reviewed_at: new Date().toISOString(),
      } as any)
      if (error) return NextResponse.json({ error: 'فشل الحفظ' }, { status: 500 })
      return NextResponse.json({ success: true })
    } else {
      // الموظف يطلب سلفة (بانتظار الموافقة) — نوع advance فقط
      if (type !== 'advance') return NextResponse.json({ error: 'الموظف يقدر يطلب سلفة فقط' }, { status: 400 })
      const auth = verifyStaffToken(extractStaffToken(req))
      if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
      const { org_id, staff_id } = auth.data!

      const { data: staffRow } = await supabase.from('staff_members').select('name,branch_id').eq('id', staff_id).maybeSingle()

      const { error } = await supabase.from('staff_payroll_adjustments').insert({
        org_id, staff_id, type: 'advance', amount: amountNum, reason: reason || null,
        status: 'pending', requested_by: 'staff',
      } as any)
      if (error) return NextResponse.json({ error: 'فشل إرسال الطلب' }, { status: 500 })

      // إشعار داخل النظام للمالك (يظهر بجرس الإشعارات)
      const staffName = (staffRow as any)?.name || 'موظف'
      const branchId = (staffRow as any)?.branch_id || null
      await supabase.from('notifications').insert({
        org_id, branch_id: branchId, type: 'info',
        title: 'طلب سلفة جديد',
        message: `${staffName} يطلب سلفة بمبلغ ${amountNum} ر.س${reason ? ` — السبب: ${reason}` : ''}`,
      } as any)

      // إشعار واتساب للمالك
      const { data: owner } = await supabase.from('profiles').select('phone').eq('org_id', org_id).eq('role', 'owner').maybeSingle()
      if ((owner as any)?.phone) {
        await sendWhatsAppMessage(formatPhone((owner as any).phone),
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

    const supabase = sb()
    const { data: adj } = await supabase.from('staff_payroll_adjustments').select('id,status,type,amount,staff_id').eq('id', adjustment_id).eq('org_id', org_id).maybeSingle()
    if (!adj) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if ((adj as any).status !== 'pending') return NextResponse.json({ error: 'تم البت بهذا الطلب مسبقاً' }, { status: 400 })

    const { error } = await supabase.from('staff_payroll_adjustments').update({
      status: decision, reviewed_by: 'owner', reviewed_at: new Date().toISOString(),
    } as any).eq('id', adjustment_id)
    if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })

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
