import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// حد الباقة الأساسي مستقل وصارم لكل فرع لحاله (ما تقدر تسحب من فرع فاضي لفرع ثاني).
// إضافة "موظف إضافي" رصيد مشترك للمؤسسة كلها، يُستخدم بأي فرع تحتاجه فيه.
const PLAN_BASE_STAFF: Record<string, number> = { basic: 3, pro: 5, advanced: 999 }

export async function POST(req: Request) {
  try {
    const { org_id, branch_id, name, phone, pin, permissions, role, send_closing_whatsapp } = await req.json()
    if (!org_id || !name || !phone || !pin) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()

    const { data: org } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    const orgPlan = (org as any)?.plan || 'basic'
    const baseLimit = PLAN_BASE_STAFF[orgPlan] ?? 3

    if (role === 'cashier' && orgPlan === 'basic') {
      return NextResponse.json({
        error: 'ميزة الكاشير تتطلب الباقة المتوسطة فأعلى — يرجى ترقية الباقة'
      }, { status: 403 })
    }

    // عدد الموظفين النشطين بنفس هذا الفرع بس (الحد الأساسي صارم لكل فرع لحاله)
    let branchCountQ = supabase.from('staff_members').select('id', { count: 'exact', head: true }).eq('org_id', org_id).eq('is_active', true)
    branchCountQ = branch_id ? branchCountQ.eq('branch_id', branch_id) : branchCountQ.is('branch_id', null)
    const { count: branchCount } = await branchCountQ

    let addonSubscriptionId: string | null = null

    if ((branchCount || 0) >= baseLimit) {
      // تجاوز حد الباقة الأساسي لهذا الفرع -- نحتاج رصيد من إضافة "موظف إضافي" المشتركة للمؤسسة
      const { data: extraStaffSub } = await supabase
        .from('org_addon_subscriptions')
        .select('id,quantity,marketplace_addons!inner(slug)')
        .eq('org_id', org_id)
        .eq('status', 'active')
        .eq('marketplace_addons.slug', 'extra_staff')
        .maybeSingle()

      if (!extraStaffSub) {
        return NextResponse.json({
          error: `هذا الفرع وصل حده الأساسي (${baseLimit} موظف) — يرجى ترقية الباقة أو شراء إضافة "موظف إضافي"`
        }, { status: 403 })
      }

      const addonQty = (extraStaffSub as any).quantity || 0
      const { count: usedAddonSlots } = await supabase
        .from('staff_members')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org_id)
        .eq('is_active', true)
        .eq('addon_subscription_id', (extraStaffSub as any).id)

      if ((usedAddonSlots || 0) >= addonQty) {
        return NextResponse.json({
          error: `هذا الفرع وصل حده الأساسي (${baseLimit} موظف)، ورصيد إضافة "موظف إضافي" (${addonQty}) مستهلك بالكامل — زوّد الكمية من صفحة الإضافات`
        }, { status: 403 })
      }

      addonSubscriptionId = (extraStaffSub as any).id
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
