import { managerMay } from '@/lib/managerPerms'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { withoutShift } from '@/lib/shiftSchedule'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!managerMay(access as any, 'attendance', 'hr')) return NextResponse.json({ error: 'ليست لديك صلاحية على هذا القسم — تواصل مع مالك المنشأة' }, { status: 403 })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    const supabase = sb()
    let q = supabase.from('shifts').select('*').eq('org_id', org_id).order('created_at')
    if (effectiveBranchId) q = q.eq('branch_id', effectiveBranchId)
    const { data, error } = await q

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, shifts: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { org_id, branch_id, name, start_time, end_time, is_24h } = await req.json()
    if (!org_id || !branch_id || !name) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!managerMay(access as any, 'attendance', 'hr')) return NextResponse.json({ error: 'ليست لديك صلاحية على هذا القسم — تواصل مع مالك المنشأة' }, { status: 403 })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذه الصلاحية للمالك فقط' }, { status: 403 })

    const supabase = sb()
    const { data, error } = await supabase.from('shifts').insert({
      org_id, branch_id, name,
      start_time: is_24h ? '00:00' : start_time,
      end_time: is_24h ? '23:59' : end_time,
      is_24h: !!is_24h,
    } as any).select().single()

    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الإضافة' }, { status: 500 })
    return NextResponse.json({ success: true, shift: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تعديل شفت موجود (الاسم والأوقات أو دوام 24 ساعة) — المالك فقط، مثل الإضافة والحذف.
// الحضور اللي انسجّل قبل التعديل ما يتغيّر: التأخير والغرامة ينحفظون وقت الحضور، والشفت المفتوح يكمّل على أوقاته القديمة.
export async function PATCH(req: Request) {
  try {
    const { id, name, start_time, end_time, is_24h } = await req.json()
    if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 })
    const cleanName = typeof name === 'string' ? name.trim() : ''
    if (!cleanName) return NextResponse.json({ error: 'اكتب اسم الوردية' }, { status: 400 })
    const isTime = (t: unknown) => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(t)
    if (!is_24h && (!isTime(start_time) || !isTime(end_time))) return NextResponse.json({ error: 'حدد وقت البداية والنهاية' }, { status: 400 })
    if (!is_24h && String(start_time).slice(0, 5) === String(end_time).slice(0, 5)) return NextResponse.json({ error: 'يجب أن يختلف وقت النهاية عن وقت البداية' }, { status: 400 })

    const supabase = sb()
    const { data: existing } = await supabase.from('shifts').select('org_id').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

    const access = await verifyOrgAccess((existing as any).org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!managerMay(access as any, 'attendance', 'hr')) return NextResponse.json({ error: 'ليست لديك صلاحية على هذا القسم — تواصل مع مالك المنشأة' }, { status: 403 })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذه الصلاحية للمالك فقط' }, { status: 403 })

    const { data, error } = await supabase.from('shifts').update({
      name: cleanName,
      start_time: is_24h ? '00:00' : start_time,
      end_time: is_24h ? '23:59' : end_time,
      is_24h: !!is_24h,
    } as any).eq('id', id).eq('org_id', (existing as any).org_id).select().single()

    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الحفظ' }, { status: 500 })
    return NextResponse.json({ success: true, shift: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 })

    const supabase = sb()
    const { data: existing } = await supabase.from('shifts').select('org_id').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

    const access = await verifyOrgAccess((existing as any).org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!managerMay(access as any, 'attendance', 'hr')) return NextResponse.json({ error: 'ليست لديك صلاحية على هذا القسم — تواصل مع مالك المنشأة' }, { status: 403 })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذه الصلاحية للمالك فقط' }, { status: 403 })

    // فكّ ربط أي موظف بهذا الشفت قبل الحذف
    await supabase.from('staff_members').update({ shift_id: null } as any).eq('shift_id', id)
    // ونشيله من شفتات الأيام والتواريخ (الأيام ترجع على الشفت الأساسي)
    const { data: scheduled } = await supabase.from('staff_members').select('id,weekday_shifts,date_shifts').eq('org_id', (existing as any).org_id)
    for (const st of (scheduled || []) as any[]) {
      const next = withoutShift(st, id)
      if (next) await supabase.from('staff_members').update(next as any).eq('id', st.id).eq('org_id', (existing as any).org_id)
    }
    const { error } = await supabase.from('shifts').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الحذف' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
