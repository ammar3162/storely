import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { orgHasHrFeature, orgHasAddon } from '@/lib/hrAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// بيانات عرض المنشأة لصفحات الموظفين (الشعار، العملة، الباقة) — المنشأة تُؤخذ من التوكن الموقّع
export async function GET(req: Request) {
  try {
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid || !auth.data) return NextResponse.json({ error: auth.error, reason: auth.reason }, { status: 401 })

    const db = sb()
    const { data: org, error } = await db.from('organizations').select('logo_url,currency,plan,staff_salary_visible,business_day_start_hour').eq('id', auth.data.org_id).single()
    if (error || !org) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    // الميزات المتاحة للموظف — من السيرفر (الموظف ما يقدر يقرأ متجر الإضافات حق المالك)
    const plan = (org as any).plan || 'basic'
    const [hr, cashier] = plan !== 'basic' ? [true, true] : await Promise.all([
      orgHasHrFeature(db, auth.data.org_id, plan), orgHasAddon(db, auth.data.org_id, 'cashier_closing'),
    ])

    return NextResponse.json({
      success: true,
      logo_url: (org as any).logo_url || null,
      currency: (org as any).currency || null,
      plan: (org as any).plan || null,
      staff_salary_visible: (org as any).staff_salary_visible === true,
      business_day_start_hour: (org as any).business_day_start_hour ?? null,
      hr_feature: hr, cashier_feature: cashier,
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
