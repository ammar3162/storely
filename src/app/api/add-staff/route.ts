import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, branch_id, name, phone, pin, permissions, role, send_closing_whatsapp } = await req.json()
    if (!org_id || !name || !phone || !pin) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()

    // حد الموظفين الآن مستقل لكل فرع (مو رصيد مشترك للمؤسسة كلها) -- كل فرع له حد الباقة الأساسي
    // + أي إضافة "موظف إضافي" مخصصة له بالذات
    const PLAN_BASE_STAFF: Record<string, number> = { basic: 3, pro: 5, advanced: 999 }

    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', org_id)
      .single()

    const orgPlan = (org as any)?.plan || 'basic'
    const planBaseStaff = PLAN_BASE_STAFF[orgPlan] ?? 3

    if (role === 'cashier' && orgPlan === 'basic') {
      return NextResponse.json({
        error: 'ميزة الكاشير تتطلب الباقة المتوسطة فأعلى — يرجى ترقية الباقة'
      }, { status: 403 })
    }

    // إضافة "موظف إضافي" النشطة المخصصة لهذا الفرع بالذات (لو موجودة)
    const { data: extraStaffSub } = await supabase
      .from('org_addon_subscriptions')
      .select('id,quantity,marketplace_addons!inner(slug)')
      .eq('org_id', org_id)
      .eq('branch_id', branch_id || null)
      .eq('status', 'active')
      .eq('marketplace_addons.slug', 'extra_staff')
      .maybeSingle()
    const extraQty = extraStaffSub ? ((extraStaffSub as any).quantity || 0) : 0
    const branchLimit = planBaseStaff + extraQty

    // نعد الموظفين النشطين بنفس الفرع بس (مو كل المؤسسة)
    let countQ = supabase.from('staff_members').select('id', { count: 'exact', head: true }).eq('org_id', org_id).eq('is_active', true)
    countQ = branch_id ? countQ.eq('branch_id', branch_id) : countQ.is('branch_id', null)
    const { count } = await countQ

    if ((count || 0) >= branchLimit) {
      return NextResponse.json({
        error: `وصلت للحد الأقصى لهذا الفرع (${branchLimit} موظف) — يرجى ترقية الباقة أو شراء إضافة "موظف إضافي" لهذا الفرع`
      }, { status: 403 })
    }

    // تحقق من عدم تكرار رقم الجوال
    const { data: existing } = await supabase
      .from('staff_members')
      .select('id')
      .eq('org_id', org_id)
      .eq('phone', phone)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'رقم الجوال مسجل مسبقاً' }, { status: 409 })
    }

    // نحدد مصدر هذا الموظف: ضمن حد الباقة الأساسي لهذا الفرع، أو ضمن كمية إضافة "موظف إضافي" الخاصة به.
    // نعلّم الموظف بمعرّف الاشتراك فقط لو تجاوز حد الباقة الأصلي لنفس الفرع -- عشان الإلغاء لاحقاً
    // يعرف بالضبط أي موظف يوقفه، بدون أي تخمين بالتاريخ
    let addonSubscriptionId: string | null = null
    if (extraStaffSub && (count || 0) >= planBaseStaff) {
      addonSubscriptionId = (extraStaffSub as any).id
    }

    const { data: newStaff, error } = await supabase
      .from('staff_members')
      .insert({ org_id, branch_id: branch_id || null, name, phone, pin, is_active: true, permissions: permissions || {dispense:false,inventory:false,purchases:false,reports:false}, role: role === 'cashier' ? 'cashier' : 'staff', send_closing_whatsapp: send_closing_whatsapp !== false, addon_subscription_id: addonSubscriptionId })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الإضافة' }, { status: 500 })

    return NextResponse.json({ success: true, staff: newStaff })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
