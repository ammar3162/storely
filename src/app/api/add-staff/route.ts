import { NextResponse } from 'next/server'
import { samePhone } from '@/lib/loginThrottle'
import { encryptPinSafe } from '@/lib/pinVault'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { checkStaffCapacity } from '@/lib/staffCapacity'

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
    if (!/^\d{4,8}$/.test(String(pin))) return NextResponse.json({ error: 'رمز PIN غير صالح' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    // مدير الفرع يضيف موظفين لفرعه فقط
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    const supabase = sb()

    const { data: org } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    if (role === 'cashier' && ((org as any)?.plan || 'basic') === 'basic') {
      return NextResponse.json({
        error: 'ميزة الكاشير تتطلب الباقة المتوسطة فأعلى — يرجى ترقية الباقة'
      }, { status: 403 })
    }

    const capacity = await checkStaffCapacity(supabase, org_id, effectiveBranchId)
    if (!capacity.ok) return NextResponse.json({ error: capacity.error }, { status: 403 })

    // تحقق من عدم تكرار رقم الجوال (بأي صيغة) — ونقول للمالك لمين الرقم بالضبط، حتى لو الموظف موقوف أو بفرع ثاني
    const { data: sameOrg } = await supabase
      .from('staff_members')
      .select('id,name,phone,is_active,hidden_from_list,branches(name)')
      .eq('org_id', org_id)
    const dup = ((sameOrg || []) as any[]).find(x => samePhone(String(x.phone || ''), String(phone)))
    if (dup) {
      const where = dup.branches?.name ? ` بفرع «${dup.branches.name}»` : ''
      const msg = dup.is_active
        ? `رقم الجوال مسجّل للموظف «${dup.name}»${where}.`
        : dup.hidden_from_list
          ? `رقم الجوال مسجّل للموظف «${dup.name}»${where}، وهو موقوف بسبب انتهاء إضافة «موظف إضافي».`
          : `رقم الجوال مسجّل للموظف «${dup.name}»${where}، وهو موقوف — فعّله من صفحة الموظفين بدل ما تضيفه من جديد، أو احذفه لو ما تحتاجه.`
      return NextResponse.json({ error: msg, duplicate: { id: dup.id, name: dup.name, is_active: dup.is_active } }, { status: 409 })
    }

    // الـ PIN يُحفظ مشفّر — المالك يشوفه مرة وحدة عند الإضافة (الواجهة تعرضه من الطلب نفسه)
    const pinHash = await bcrypt.hash(String(pin), 10)

    const { data: newStaff, error } = await supabase
      .from('staff_members')
      .insert({ org_id, branch_id: effectiveBranchId || null, name, phone, pin: pinHash, pin_enc: encryptPinSafe(String(pin)), is_active: true, permissions: permissions || {dispense:false,inventory:false,purchases:false,reports:false}, role: role === 'cashier' ? 'cashier' : 'staff', send_closing_whatsapp: send_closing_whatsapp !== false, addon_subscription_id: capacity.addonSubscriptionId })
      .select()
      .single()

    if (error) { console.error('ADD_STAFF_FAILED', error); return NextResponse.json({ error: 'حدث خطأ أثناء الإضافة' }, { status: 500 }) }

    const safeStaff = { ...(newStaff as any) }
    delete safeStaff.pin
    delete safeStaff.pin_enc
    return NextResponse.json({ success: true, staff: safeStaff })
  } catch (e) {
    console.error('ADD_STAFF_FAILED', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
