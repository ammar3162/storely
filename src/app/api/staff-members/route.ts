import { NextResponse } from 'next/server'
import { samePhone } from '@/lib/loginThrottle'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { checkStaffCapacity } from '@/lib/staffCapacity'
import { loadOwnedStaff } from '@/lib/staffAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// الـ PIN المشفّر ما يطلع للمتصفح أبداً — بس علامة '$2' عشان الواجهة تعرف إنه مشفّر،
// و has_pin_enc لو فيه نسخة تنعرض بأيقونة العين (عبر /api/staff-members/reveal-pin).
// الرموز القديمة غير المشفّرة تطلع زي ما كانت (المالك/مدير الفرع يقدر يشوفها) لين تتجدد.
function maskPin(staff: any) {
  const { pin_enc, ...rest } = staff || {}
  const pin = rest.pin == null ? null : String(rest.pin)
  return { ...rest, pin: pin && pin.startsWith('$2') ? '$2' : pin, has_pin_enc: !!pin_enc }
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

    const db = sb()
    let q = db.from('staff_members').select('*,branches(name)').eq('org_id', org_id)
    if (effectiveBranchId) q = q.eq('branch_id', effectiveBranchId)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    // موظفين فروعهم موقوفة — ما يطلعون بأي فرع شغّال، فنعرضهم للمالك عشان ينقلهم أو يحذفهم (رقمهم محجوز)
    let orphans: any[] = []
    if (access.role === 'owner') {
      const { data: deadBranches } = await db.from('branches').select('id,name').eq('org_id', org_id).eq('is_active', false)
      const ids = ((deadBranches || []) as any[]).map(b => b.id)
      if (ids.length) {
        const { data: o } = await db.from('staff_members').select('*,branches(name)').eq('org_id', org_id).in('branch_id', ids).order('created_at', { ascending: false })
        orphans = ((o || []) as any[]).map(x => ({ ...maskPin(x), orphan_branch: x.branches?.name || null }))
      }
    }
    return NextResponse.json({ success: true, staff: (data || []).map(maskPin), orphans })
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
      // الرقم (بأي صيغة) لموظف ثاني بنفس المنشأة؟ نقول لمين بالضبط
      const { data: others } = await db.from('staff_members').select('id,name,phone,is_active,branches(name)').eq('org_id', org_id).neq('id', id)
      const dup = ((others || []) as any[]).find(x => samePhone(String(x.phone || ''), phone))
      if (dup) {
        const where = dup.branches?.name ? ` بفرع «${dup.branches.name}»` : ''
        return NextResponse.json({ error: `رقم الجوال مسجّل للموظف «${dup.name}»${where}${dup.is_active ? '' : ' (موقوف)'}.` }, { status: 409 })
      }
      update.phone = phone
    }
    // نقل لفرع ثاني (المالك فقط)
    const moveNotes: string[] = []
    if ('branch_id' in body) {
      if (access.role !== 'owner') return NextResponse.json({ error: 'نقل الموظفين بين الفروع للمالك فقط' }, { status: 403 })
      const { data: target } = await db.from('branches').select('id,name').eq('id', String(body.branch_id || '')).eq('org_id', org_id).eq('is_active', true).maybeSingle()
      if (!target) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })
      const targetId = (target as any).id
      if (targetId !== staff.branch_id) {
        // ما ننقله وهو داخل دوامه — حضوره وانصرافه لازم يكونون بنفس الفرع
        const { data: last } = await db.from('staff_attendance').select('type,recorded_at').eq('staff_id', id).eq('org_id', org_id)
          .order('recorded_at', { ascending: false }).limit(1).maybeSingle()
        if ((last as any)?.type === 'check_in' && Date.now() - Date.parse((last as any).recorded_at) < 20 * 3600e3) {
          return NextResponse.json({ error: 'الموظف داخل دوامه الحين — انقله بعد ما يسجّل انصرافه' }, { status: 409 })
        }
        // حد الموظفين بالفرع الجديد (لو الموظف فعّال)
        if (staff.is_active) {
          const capacity = await checkStaffCapacity(db, org_id, targetId)
          if (!capacity.ok) return NextResponse.json({ error: capacity.error }, { status: 403 })
        }
        update.branch_id = targetId
        // الشفت الخاص بالفرع القديم ينفك، والمنتجات المخصصة له (منتجات الفرع القديم) تنمسح
        if (staff.shift_id) {
          const { data: sh } = await db.from('shifts').select('branch_id').eq('id', staff.shift_id).maybeSingle()
          if ((sh as any)?.branch_id && (sh as any).branch_id !== targetId) { update.shift_id = null; moveNotes.push('انفك عن شفته القديم — حدد له شفت بالفرع الجديد') }
        }
        if (Array.isArray(staff.assigned_products) && staff.assigned_products.length) { update.assigned_products = []; moveNotes.push('انمسحت المنتجات المخصصة له (كانت من الفرع القديم)') }
      }
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
    return NextResponse.json({ success: true, notes: moveNotes })
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
