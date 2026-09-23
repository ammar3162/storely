import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { checkStaffCapacity } from '@/lib/staffCapacity'
import { loadOwnedStaff } from '@/lib/staffAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// الـ PIN المشفّر ما يطلع للمتصفح أبداً — بس علامة '$2' عشان الواجهة تعرف إنه مشفّر (تعرض "رمز جديد").
// الرموز القديمة غير المشفّرة تطلع زي ما كانت (المالك/مدير الفرع يقدر يشوفها) لين تتجدد.
function maskPin(staff: any) {
  const pin = staff?.pin == null ? null : String(staff.pin)
  return { ...staff, pin: pin && pin.startsWith('$2') ? '$2' : pin }
}

// كل موظفي المنشأة (أو فرع معيّن) مع اسم الفرع
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    let q = sb().from('staff_members').select('*,branches(name)').eq('org_id', org_id)
    if (effectiveBranchId) q = q.eq('branch_id', effectiveBranchId)
    const { data, error } = await q.order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, staff: (data || []).map(maskPin) })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تعديل موظف — الحقول المسموحة فقط: name, phone, permissions, send_closing_whatsapp, is_active
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { org_id, id } = body
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const staff = await loadOwnedStaff(db, access, org_id, id)
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const update: Record<string, unknown> = {}
    if ('name' in body) {
      const name = String(body.name || '').trim()
      if (!name) return NextResponse.json({ error: 'أدخل اسم الموظف' }, { status: 400 })
      update.name = name
    }
    if ('phone' in body) {
      const phone = String(body.phone || '').trim()
      if (!phone) return NextResponse.json({ error: 'أدخل رقم صحيح' }, { status: 400 })
      const { data: dup } = await db.from('staff_members').select('id').eq('org_id', org_id).eq('phone', phone).neq('id', id).limit(1)
      if (dup?.length) return NextResponse.json({ error: 'رقم الجوال مسجل مسبقاً' }, { status: 409 })
      update.phone = phone
    }
    if ('permissions' in body && body.permissions && typeof body.permissions === 'object') update.permissions = body.permissions
    if ('send_closing_whatsapp' in body) update.send_closing_whatsapp = !!body.send_closing_whatsapp

    if ('is_active' in body) {
      const activating = !!body.is_active
      if (activating && !staff.is_active) {
        if (staff.addon_subscription_id) {
          // مرتبط بإضافة "موظف إضافي" — لازم تكون سارية
          const { data: sub } = await db.from('org_addon_subscriptions').select('status,expires_at').eq('id', staff.addon_subscription_id).maybeSingle()
          const active = !!sub && (sub as any).status === 'active' && new Date((sub as any).expires_at) > new Date()
          if (!active) return NextResponse.json({ error: 'هذا الموظف مرتبط بإضافة "موظف إضافي" ملغاة — جدّد الاشتراك من صفحة الإضافات أول عشان تقدر تفعّله من جديد' }, { status: 403 })
        } else {
          // إعادة التفعيل تخضع لنفس حد الباقة مثل الإضافة
          const capacity = await checkStaffCapacity(db, org_id, staff.branch_id)
          if (!capacity.ok) return NextResponse.json({ error: capacity.error }, { status: 403 })
          if (capacity.addonSubscriptionId) update.addon_subscription_id = capacity.addonSubscriptionId
        }
      }
      update.is_active = activating
    }

    if (!Object.keys(update).length) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const { error } = await db.from('staff_members').update(update as any).eq('id', id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const id = searchParams.get('id')
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const staff = await loadOwnedStaff(db, access, org_id, id)
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const { error } = await db.from('staff_members').delete().eq('id', id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الحذف' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
