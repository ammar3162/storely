import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// بيانات المستخدم الحالي ومؤسسته — بديل استعلامات profiles/organizations المباشرة من الصفحات
export async function GET() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 })
    if (!profile.orgId) return NextResponse.json({ error: 'لا توجد مؤسسة مرتبطة بالحساب' }, { status: 404 })

    const { data: org } = await sb().from('organizations').select('id,name,plan,currency').eq('id', profile.orgId).single()

    return NextResponse.json({
      success: true,
      user_id: profile.userId,
      org_id: profile.orgId,
      role: profile.role,
      branch_id: profile.branchId,
      org: org ? { name: (org as any).name || '', plan: (org as any).plan || '', currency: (org as any).currency || null } : null,
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
