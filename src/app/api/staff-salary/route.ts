import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, staff_id, monthly_salary, housing_allowance, transport_allowance, food_allowance } = await req.json()
    if (!org_id || !staff_id || monthly_salary == null) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    const salary = Number(monthly_salary)
    const housing = Number(housing_allowance) || 0
    const transport = Number(transport_allowance) || 0
    const food = Number(food_allowance) || 0
    if (!(salary >= 0) || !(housing >= 0) || !(transport >= 0) || !(food >= 0)) {
      return NextResponse.json({ error: 'قيم غير صالحة' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()

    const { data: orgCheck } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    if ((orgCheck as any)?.plan === 'basic') {
      return NextResponse.json({ error: 'ميزة الرواتب متاحة فقط بالباقة المتوسطة أو المتقدمة — يرجى ترقية الباقة' }, { status: 403 })
    }

    const { data: staff } = await supabase.from('staff_members').select('id').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const { error } = await supabase.from('staff_members').update({
      monthly_salary: salary,
      housing_allowance: housing,
      transport_allowance: transport,
      food_allowance: food,
    } as any).eq('id', staff_id)
    if (error) { console.error('STAFF_SALARY_UPDATE_ERROR:', error.message, error.details, error.hint); return NextResponse.json({ error: 'فشل الحفظ: ' + error.message }, { status: 500 }) }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
