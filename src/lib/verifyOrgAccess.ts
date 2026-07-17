import { createClient } from '@/lib/supabase/server'

/**
 * يتحقق إن المستخدم المسجل دخوله (عبر جلسة Supabase) فعلاً يملك org_id
 * اللي أرسله بالطلب — يمنع أي شخص من التلاعب ببيانات حساب ثاني.
 *
 * الاستخدام بأي API route خاص بالمالك:
 *   const check = await verifyOrgAccess(org_id)
 *   if (!check.authorized) return NextResponse.json({error: check.error}, {status: check.status})
 */
export async function verifyOrgAccess(requestedOrgId: string) {
  if (!requestedOrgId) {
    return { authorized: false, error: 'org_id مطلوب', status: 400 as const }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false, error: 'غير مسجل دخول', status: 401 as const }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.org_id !== requestedOrgId) {
    return { authorized: false, error: 'غير مصرح بالوصول لهذا الحساب', status: 403 as const }
  }

  return { authorized: true, userId: user.id, orgId: profile.org_id }
}
