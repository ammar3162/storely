import { managerMay } from '@/lib/managerPerms'
import { orgHasFeature, lockedMessage, branchFeatureError } from '@/lib/planFeatures'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { org_id, staff_id, monthly_salary, housing_allowance, transport_allowance, food_allowance } = body
    // تاريخ بداية العمل (اختياري): YYYY-MM-DD أو فاضي = موظف قديم (راتب كامل)
    const hasStart = Object.prototype.hasOwnProperty.call(body, 'employment_start')
    const start = body.employment_start ? String(body.employment_start) : null
    if (start && (!/^\d{4}-\d{2}-\d{2}$/.test(start) || Number.isNaN(Date.parse(start + 'T00:00:00Z')) || start < '2000-01-01' || start > '2100-01-01')) {
      return NextResponse.json({ error: 'تاريخ بداية العمل غير صالح' }, { status: 400 })
    }
    if (!org_id || !staff_id || monthly_salary == null) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    const salary = Number(monthly_salary)
    const housing = Number(housing_allowance) || 0
    const transport = Number(transport_allowance) || 0
    const food = Number(food_allowance) || 0
    if (!(salary >= 0) || salary > 1_000_000 || !(housing >= 0) || !(transport >= 0) || !(food >= 0)) {
      return NextResponse.json({ error: 'قيم غير صالحة' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!managerMay(access as any, 'hr')) return NextResponse.json({ error: 'ليست لديك صلاحية على هذا القسم — تواصل مع مالك المنشأة' }, { status: 403 })

    const supabase = sb()

    const { data: orgCheck } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    if (!(await orgHasFeature(supabase, org_id, 'hr', (orgCheck as any)?.plan))) {
      return NextResponse.json({ error: lockedMessage('hr') }, { status: 403 })
    }

    // مدير الفرع يعدّل رواتب موظفين فرعه بس
    const { data: staff } = await supabase.from('staff_members').select('id,branch_id').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    const forced = enforcedBranchId(access)
    if (!staff || (forced && (staff as any).branch_id !== forced)) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })
    const branchLocked = await branchFeatureError(supabase, org_id, 'hr', (orgCheck as any)?.plan, (staff as any).branch_id)
    if (branchLocked) return NextResponse.json({ error: branchLocked }, { status: 403 })

    const { error } = await supabase.from('staff_members').update({
      monthly_salary: salary,
      housing_allowance: housing,
      transport_allowance: transport,
      food_allowance: food,
      ...(hasStart ? { employment_start: start } : {}),
    } as any).eq('id', staff_id).eq('org_id', org_id)
    if (error) { console.error('STAFF_SALARY_UPDATE_ERROR:', error.message, error.details, error.hint); return NextResponse.json({ error: 'فشل الحفظ: ' + error.message }, { status: 500 }) }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
