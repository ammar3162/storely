import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// قائمة الموظفين النشطين مع الشفت المرتبط بكل واحد
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    let q = sb().from('staff_members').select('id,name,shift_id').eq('org_id', org_id).eq('is_active', true)
    if (effectiveBranchId) q = q.eq('branch_id', effectiveBranchId)
    const { data, error } = await q.order('name')

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, staff: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// ربط موظف بشفت (أو فكّه لو shift_id فاضي)
export async function PATCH(req: Request) {
  try {
    const { org_id, staff_id, shift_id } = await req.json()
    if (!org_id || !staff_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: staff } = await supabase.from('staff_members').select('id,branch_id').eq('id', staff_id).eq('org_id', org_id).single()
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    // مدير الفرع يعدّل موظفين فرعه فقط
    const effectiveBranchId = enforcedBranchId(access)
    if (effectiveBranchId && (staff as any).branch_id !== effectiveBranchId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    if (shift_id) {
      const { data: shift } = await supabase.from('shifts').select('id').eq('id', shift_id).eq('org_id', org_id).single()
      if (!shift) return NextResponse.json({ error: 'الشفت غير موجود' }, { status: 404 })
    }

    const { error } = await supabase.from('staff_members').update({ shift_id: shift_id || null } as any).eq('id', staff_id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
