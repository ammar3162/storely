import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// بيانات عرض المنشأة لصفحات الموظفين (الشعار، العملة، الباقة) — المنشأة تُؤخذ من التوكن الموقّع
export async function GET(req: Request) {
  try {
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid || !auth.data) return NextResponse.json({ error: auth.error, reason: auth.reason }, { status: 401 })

    const { data: org, error } = await sb().from('organizations').select('logo_url,currency,plan').eq('id', auth.data.org_id).single()
    if (error || !org) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    return NextResponse.json({
      success: true,
      logo_url: (org as any).logo_url || null,
      currency: (org as any).currency || null,
      plan: (org as any).plan || null,
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
