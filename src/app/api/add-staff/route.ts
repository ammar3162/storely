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

    // تحقق من حد الباقة server-side
    const { data: org } = await supabase
      .from('organizations')
      .select('max_staff,plan')
      .eq('id', org_id)
      .single()

    const maxStaff = (org as any)?.max_staff || 1
    const orgPlan = (org as any)?.plan || 'basic'

    if (role === 'cashier' && orgPlan === 'basic') {
      return NextResponse.json({
        error: 'ميزة الكاشير تتطلب الباقة المتوسطة فأعلى — يرجى ترقية الباقة'
      }, { status: 403 })
    }

    const { count } = await supabase
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .eq('is_active', true)

    if ((count || 0) >= maxStaff) {
      return NextResponse.json({
        error: `وصلت للحد الأقصى (${maxStaff} موظف) — يرجى ترقية الباقة`
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

    // نحدد مصدر هذا الموظف: ضمن حد الباقة الأساسية، أو ضمن كمية إضافة "موظف إضافي" النشطة.
    // نحسب حد الباقة الأصلي = max_staff الكلي ناقص كل كمية الإضافات النشطة، ونعلّم الموظف بمعرّف الاشتراك
    // فقط لو تجاوز هذا الحد الأصلي -- عشان الإلغاء لاحقاً يعرف بالضبط أي موظف يوقفه، بدون أي تخمين بالتاريخ
    let addonSubscriptionId: string | null = null
    const { data: extraStaffSub } = await supabase
      .from('org_addon_subscriptions')
      .select('id,quantity,marketplace_addons!inner(slug)')
      .eq('org_id', org_id)
      .eq('status', 'active')
      .eq('marketplace_addons.slug', 'extra_staff')
      .maybeSingle()
    if (extraStaffSub) {
      const addonQty = (extraStaffSub as any).quantity || 0
      const baselineLimit = Math.max(0, maxStaff - addonQty)
      if ((count || 0) >= baselineLimit) {
        addonSubscriptionId = (extraStaffSub as any).id
      }
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
