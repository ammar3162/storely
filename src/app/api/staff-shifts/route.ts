import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { normalizeOffDays, parseDateOnly } from '@/lib/daysOff'
import { normalizeWeekdayShifts, normalizeDateShifts } from '@/lib/shiftSchedule'

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

    let q = sb().from('staff_members').select('id,name,shift_id,weekday_shifts,date_shifts,weekly_off_days,days_off_mode,monthly_off_days,biweekly_anchor,off_dates').eq('org_id', org_id).eq('is_active', true)
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
    const body = await req.json()
    const { org_id, staff_id, shift_id } = body
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

    // شفت مختلف لأيام أسبوع معيّنة أو تواريخ محددة — كل شفت لازم يكون من نفس المنشأة
    if ('weekday_shifts' in body || 'date_shifts' in body) {
      const upd: Record<string, unknown> = {}
      if ('weekday_shifts' in body) {
        const w = normalizeWeekdayShifts(body.weekday_shifts)
        if (!w) return NextResponse.json({ error: 'شفتات أيام الأسبوع غير صالحة' }, { status: 400 })
        upd.weekday_shifts = w
      }
      if ('date_shifts' in body) {
        const d = normalizeDateShifts(body.date_shifts)
        if (!d) return NextResponse.json({ error: 'شفتات التواريخ غير صالحة (حد أقصى 400 تاريخ)' }, { status: 400 })
        upd.date_shifts = d
      }
      const ids = [...new Set([...Object.values((upd.weekday_shifts || {}) as Record<string, string>), ...Object.values((upd.date_shifts || {}) as Record<string, string>)])]
      if (ids.length) {
        const { data: found } = await supabase.from('shifts').select('id,branch_id').eq('org_id', org_id).in('id', ids)
        if ((found || []).length !== ids.length) return NextResponse.json({ error: 'الشفت غير موجود' }, { status: 404 })
        const staffBranch = (staff as any).branch_id
        if (staffBranch && ((found || []) as any[]).some(f => f.branch_id && f.branch_id !== staffBranch)) return NextResponse.json({ error: 'الشفت من فرع ثاني — اختر شفت من فرع الموظف' }, { status: 400 })
      }
      const { error } = await supabase.from('staff_members').update(upd as any).eq('id', staff_id).eq('org_id', org_id)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true, ...upd })
    }

    // نوع الإجازة: أيام ثابتة بالأسبوع أو رصيد أيام بالشهر
    if ('days_off_mode' in body || 'monthly_off_days' in body || 'biweekly_anchor' in body || 'off_dates' in body) {
      const upd: Record<string, unknown> = {}
      if ('biweekly_anchor' in body) {
        const d = parseDateOnly(body.biweekly_anchor)
        if (!d) return NextResponse.json({ error: 'تاريخ بداية الأسبوع غير صالح' }, { status: 400 })
        upd.biweekly_anchor = d
      }
      if ('off_dates' in body) {
        const arr = Array.isArray(body.off_dates) ? body.off_dates.map(parseDateOnly) : null
        if (!arr || arr.some((d: string | null) => !d) || arr.length > 400) return NextResponse.json({ error: 'تواريخ الإجازة غير صالحة' }, { status: 400 })
        upd.off_dates = [...new Set(arr as string[])].sort()
      }
      if ('days_off_mode' in body) {
        if (!['weekly', 'biweekly', 'dates', 'monthly'].includes(body.days_off_mode)) return NextResponse.json({ error: 'نوع إجازة غير صالح' }, { status: 400 })
        upd.days_off_mode = body.days_off_mode
      }
      if ('monthly_off_days' in body) {
        const n = Number(body.monthly_off_days)
        if (!Number.isInteger(n) || n < 0 || n > 15) return NextResponse.json({ error: 'عدد أيام الإجازة بالشهر من 0 إلى 15' }, { status: 400 })
        upd.monthly_off_days = n
      }
      const { error } = await supabase.from('staff_members').update(upd as any).eq('id', staff_id).eq('org_id', org_id)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    // أيام الإجازة الأسبوعية (لو انرسلت) — بدون ما نلمس الشفت
    if ('weekly_off_days' in body) {
      const days = normalizeOffDays(body.weekly_off_days)
      if (!days) return NextResponse.json({ error: 'أيام الإجازة غير صالحة — لازم يبقى يوم دوام واحد على الأقل' }, { status: 400 })
      const { error } = await supabase.from('staff_members').update({ weekly_off_days: days } as any).eq('id', staff_id).eq('org_id', org_id)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true, weekly_off_days: days })
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
