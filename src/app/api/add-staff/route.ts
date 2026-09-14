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

    // حد الموظفين مستقل لكل فرع، ومخزّن مباشرة بعمود branches.max_staff (يتحدث تلقائياً وقت شراء/إلغاء
    // إضافة "موظف إضافي" لهذا الفرع) -- بدون أي حساب ديناميكي وقت كل طلب
    const { data: org } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    const orgPlan = (org as any)?.plan || 'basic'

    if (role === 'cashier' && orgPlan === 'basic') {
      return NextResponse.json({
        error: 'ميزة الكاشير تتطلب الباقة المتوسطة فأعلى — يرجى ترقية الباقة'
      }, { status: 403 })
    }

    const { data: branchRow } = await supabase.from('branches').select('max_staff').eq('id', branch_id).maybeSingle()
    const branchLimit = (branchRow as any)?.max_staff ?? 3

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

    // نحدد مصدر هذا الموظف (باقة أساسية أو إضافة) بس لغرض التعليم -- عشان الإلغاء لاحقاً يعرف بالضبط
    // أي موظف يوقفه بدون تخمين. نستخدم حد الباقة الأصلي (بدون الإضافة) كخط فاصل
    const PLAN_BASE_STAFF: Record<string, number> = { basic: 3, pro: 5, advanced: 999 }
    const planBaseStaff = PLAN_BASE_STAFF[orgPlan] ?? 3
    let addonSubscriptionId: string | null = null
    if ((count || 0) >= planBaseStaff) {
      const { data: extraStaffSub } = await supabase
        .from('org_addon_subscriptions')
        .select('id,marketplace_addons!inner(slug)')
        .eq('org_id', org_id)
        .eq('branch_id', branch_id || null)
        .eq('status', 'active')
        .eq('marketplace_addons.slug', 'extra_staff')
        .maybeSingle()
      if (extraStaffSub) addonSubscriptionId = (extraStaffSub as any).id
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
