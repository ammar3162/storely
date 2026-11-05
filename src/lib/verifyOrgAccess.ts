import { createClient as createCookieClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { managerApiAllowed } from '@/lib/managerPerms'
import { currentDeviceAllowed } from '@/lib/deviceTrust'
import { DEVICE_UNVERIFIED_ERROR, SUBSCRIPTION_BLOCKED_ERROR } from '@/lib/deviceMessages'
import { orgSubscriptionState } from '@/lib/subscription'
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

  // التحقق من الجلسة محلياً (توقيع ES256 + مفاتيح Supabase المحفوظة) بدل سؤال خادم الدخول مع كل طلب —
  // getUser كان رحلة لـ Supabase Auth لكل طلب، وتحت الضغط (~100 طلب بنفس اللحظة) يرفض الزايد فيطلع «غير مسجل دخول»
  const { data: cd } = token ? await supabase.auth.getClaims(token) : await supabase.auth.getClaims()
  const claims = cd?.claims
  if (!claims?.sub) return null
  const user = { id: String(claims.sub), email: typeof claims.email === 'string' ? claims.email : null }

  // permissions (صلاحيات مدير الفرع) مو بأنواع قاعدة البيانات المولّدة — نقرأها بدون أنواع
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('org_id, role, branch_id, status, permissions')
    .eq('id', user.id)
    .single()

  const role = ((profile as any)?.role as string | null) ?? null
  return {
    userId: user.id,
    // المالك ومدير الفرع: الجهاز لازم يكون موثوق (رمز الإيميل) — lib/deviceTrust
    deviceTrusted: await currentDeviceAllowed(user.id, role),
    status: ((profile as any)?.status as string | null) ?? null,
    email: user.email ?? null,
    orgId: (profile?.org_id as string | null) ?? null,
    role,
    branchId: ((profile as any)?.branch_id as string | null) ?? null,
    permissions: ((profile as any)?.permissions as Record<string, unknown> | null) ?? null,
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

  if (profile.deviceTrusted === false) {
    return { authorized: false, error: DEVICE_UNVERIFIED_ERROR, status: 403 as const }
  }

  if (!profile.orgId || profile.orgId !== requestedOrgId) {
    return { authorized: false, error: 'غير مصرح بالوصول لهذا الحساب', status: 403 as const }
  }

  // اشتراك المنشأة (من ملف المالك) منتهي أو موقوف: ما فيه وصول للبيانات لأي حساب فيها — المالك والمدراء
  const sub = await orgSubscriptionState(profile.orgId)
  if (sub.blocked) {
    return { authorized: false, error: SUBSCRIPTION_BLOCKED_ERROR, status: 403 as const }
  }

  // مدير الفرع: نفس صلاحيات صفحاته على مستوى الـ API (المسار يجي من proxy)
  if (profile.role === 'manager') {
    const h = await headers()
    const path = h.get('x-storely-path')
    if (path && !managerApiAllowed(path, h.get('x-storely-method') || 'GET', profile.permissions)) {
      return { authorized: false, error: 'ما عندك صلاحية على هالقسم — كلّم مالك المنشأة', status: 403 as const }
    }
  }

  return {
    authorized: true, userId: profile.userId, orgId: profile.orgId,
    role: profile.role,
    branchId: profile.branchId,
    permissions: profile.permissions,
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
