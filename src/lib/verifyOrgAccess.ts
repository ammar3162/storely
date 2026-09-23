import { createClient as createCookieClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import type { Database } from '@/lib/database.types'

/**
 * يرجّع المستخدم الحالي وملفه (المؤسسة، الدور، الفرع).
 * - الموقع: يعتمد على الكوكيز (نفس السلوك القديم بالضبط).
 * - تطبيق الجوال: يرسل "Authorization: Bearer <access_token>" بدل الكوكيز.
 * لو ما فيه هيدر Authorization، يشتغل بالكوكيز بدون أي تغيير.
 */
export async function getCurrentProfile() {
  const auth = (await headers()).get('authorization')
  const bearer = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  // توكن Supabase (JWT) من 3 أجزاء؛ توكن الموظف (staffAuth) من جزأين — نتجاهله ونرجع للكوكيز
  const token = bearer.split('.').length === 3 ? bearer : ''

  const supabase = token
    ? createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        }
      )
    : await createCookieClient()

  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, branch_id')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    email: user.email ?? null,
    orgId: (profile?.org_id as string | null) ?? null,
    role: ((profile as any)?.role as string | null) ?? null,
    branchId: ((profile as any)?.branch_id as string | null) ?? null,
  }
}

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

  const profile = await getCurrentProfile()

  if (!profile) {
    return { authorized: false, error: 'غير مسجل دخول', status: 401 as const }
  }

  if (!profile.orgId || profile.orgId !== requestedOrgId) {
    return { authorized: false, error: 'غير مصرح بالوصول لهذا الحساب', status: 403 as const }
  }

  return {
    authorized: true, userId: profile.userId, orgId: profile.orgId,
    role: profile.role,
    branchId: profile.branchId,
  }
}

/**
 * يرجّع الفرع اللي المستخدم مقيّد فيه — null لو "owner" (يشوف كل الفروع)،
 * أو معرّف الفرع الثابت له لو "manager" (مدير فرع مقيّد).
 * يُستخدم بأي API route عشان يفرض تصفية الفرع تلقائياً لمدير الفرع،
 * حتى لو الطلب نفسه أرسل branch_id مختلف.
 */
export function enforcedBranchId(access: { role?: string | null; branchId?: string | null }, requestedBranchId?: string | null) {
  if (access.role === 'manager') return access.branchId || null
  return requestedBranchId || null
}
