import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// بيانات المستخدم الحالي ومؤسسته وفروعه — بديل استعلامات profiles/organizations/branches المباشرة
// (تستخدمها لوحة التحكم الرئيسية وكل الصفحات عبر getMe)
export async function GET() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'غير مسجل دخول', reason: 'unauthenticated' }, { status: 401 })
    if (!profile.orgId) return NextResponse.json({ error: 'لا توجد مؤسسة مرتبطة بالحساب', reason: 'no_org' }, { status: 404 })

    const db = sb()
    let branchesQ = db.from('branches').select('id,name,location').eq('org_id', profile.orgId).eq('is_active', true)
    if (profile.role === 'manager' && profile.branchId) branchesQ = branchesQ.eq('id', profile.branchId)

    const [{ data: org }, { data: extra }, { data: branches }] = await Promise.all([
      db.from('organizations')
        .select('id,name,plan,currency,logo_url,deletion_scheduled_at,max_staff,max_suppliers,max_branches,country_code,business_type')
        .eq('id', profile.orgId).single(),
      db.from('profiles')
        .select('full_name,subscription_ends_at,permissions,whatsapp_consent,whatsapp_first_contact_confirmed,terms_version_accepted')
        .eq('id', profile.userId).single(),
      branchesQ.order('created_at'),
    ])
    const o: any = org || {}
    const e: any = extra || {}

    return NextResponse.json({
      success: true,
      user_id: profile.userId,
      org_id: profile.orgId,
      role: profile.role,
      branch_id: profile.branchId,
      full_name: e.full_name || '',
      subscription_ends_at: e.subscription_ends_at || null,
      permissions: e.permissions || {},
      whatsapp_consent: e.whatsapp_consent === true,
      whatsapp_first_contact_confirmed: e.whatsapp_first_contact_confirmed === true,
      terms_version_accepted: e.terms_version_accepted || null,
      org: org ? {
        name: o.name || '',
        plan: o.plan || '',
        currency: o.currency || null,
        logo_url: o.logo_url || null,
        deletion_scheduled_at: o.deletion_scheduled_at || null,
        max_staff: o.max_staff ?? 1,
        max_suppliers: o.max_suppliers ?? 1,
        max_branches: o.max_branches ?? 1,
        country_code: o.country_code || '+966',
        business_type: o.business_type || null,
      } : null,
      branches: branches || [],
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تحديثات المستخدم على حسابه — قائمة مسموحة فقط:
//   { whatsapp_consent: true } | { whatsapp_first_contact_confirmed: true } | { cancel_org_deletion: true }
export async function PATCH(req: Request) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 })

    const body = await req.json()
    const db = sb()
    const profileUpdate: Record<string, unknown> = {}
    if (body.whatsapp_consent === true) {
      profileUpdate.whatsapp_consent = true
      profileUpdate.whatsapp_consent_at = new Date().toISOString()
    }
    if (body.whatsapp_first_contact_confirmed === true) profileUpdate.whatsapp_first_contact_confirmed = true

    if (Object.keys(profileUpdate).length) {
      const { error } = await db.from('profiles').update(profileUpdate as any).eq('id', profile.userId)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    }

    // تسجيل الدخول يعتبر تراجع عن طلب حذف الحساب المجدول
    if (body.cancel_org_deletion === true && profile.orgId) {
      const { error } = await db.from('organizations').update({ deletion_scheduled_at: null } as any).eq('id', profile.orgId)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
