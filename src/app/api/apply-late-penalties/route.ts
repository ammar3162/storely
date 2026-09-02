import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// جلب إجمالي غرامات التأخير غير المطبّقة لكل موظف بالمنشأة — للعرض بإدارة الموظفين
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data, error } = await supabase
      .from('staff_attendance')
      .select('staff_id,penalty_amount')
      .eq('org_id', org_id)
      .eq('penalty_applied', false)
      .not('penalty_amount', 'is', null)
      .gt('penalty_amount', 0)

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, records: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// المالك يطبّق كل غرامات التأخير المعلّقة لموظف معيّن دفعة وحدة كخصم واحد
export async function POST(req: Request) {
  try {
    const { org_id, staff_id } = await req.json()
    if (!org_id || !staff_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()

    const { data: records, error: fetchErr } = await supabase
      .from('staff_attendance')
      .select('id,penalty_amount,late_minutes')
      .eq('org_id', org_id)
      .eq('staff_id', staff_id)
      .eq('penalty_applied', false)
      .not('penalty_amount', 'is', null)
      .gt('penalty_amount', 0)

    if (fetchErr) return NextResponse.json({ error: 'حدث خطأ أثناء الجلب' }, { status: 500 })
    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'ما فيه غرامات معلّقة لهذا الموظف' }, { status: 400 })
    }

    const total = records.reduce((sum: number, r: any) => sum + Number(r.penalty_amount || 0), 0)
    const recordIds = records.map((r: any) => r.id)

    const { error: insErr } = await supabase.from('staff_payroll_adjustments').insert({
      org_id, staff_id, type: 'deduction', amount: total,
      reason: `غرامات تأخير مجمّعة (${records.length} حضور متأخر)`,
      status: 'approved', requested_by: 'owner', reviewed_by: 'owner', reviewed_at: new Date().toISOString(),
    } as any)
    if (insErr) return NextResponse.json({ error: 'فشل إضافة الخصم: ' + insErr.message }, { status: 500 })

    const { error: updErr } = await supabase
      .from('staff_attendance')
      .update({ penalty_applied: true } as any)
      .in('id', recordIds)
    if (updErr) return NextResponse.json({ error: 'تم إضافة الخصم لكن فشل تحديث السجلات: ' + updErr.message }, { status: 500 })

    return NextResponse.json({ success: true, total, count: records.length })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
