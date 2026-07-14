import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type AdminSession = { id: string; email: string; full_name: string; role: string; permissions?: Record<string,boolean> }

/** يتحقق من صلاحية جلسة الأدمن، ويرجع بياناته لو صحيحة */
export async function verifyAdminSession(token: string | null): Promise<AdminSession | null> {
  if (!token) return null
  const db = sb()
  const { data: session } = await (db as any)
    .from('admin_sessions')
    .select('admin_id,expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!session) return null
  if (new Date(session.expires_at) < new Date()) return null

  const { data: admin } = await db
    .from('admin_users')
    .select('id,email,full_name,role,is_active,permissions')
    .eq('id', session.admin_id)
    .maybeSingle()

  if (!admin || !(admin as any).is_active) return null
  return { id: admin.id, email: (admin as any).email, full_name: (admin as any).full_name, role: (admin as any).role, permissions: (admin as any).permissions || {} }
}

/** يسجّل إجراء بسجل التدقيق — فشله لا يوقف العملية الأساسية أبداً */
export async function logAdminAction(
  admin: AdminSession,
  action: string,
  targetOrgId?: string | null,
  targetOrgName?: string | null,
  details?: Record<string, any>
) {
  try {
    const db = sb()
    await (db as any).from('admin_audit_log').insert({
      admin_id: admin.id,
      admin_name: admin.full_name,
      action,
      target_org_id: targetOrgId || null,
      target_org_name: targetOrgName || null,
      details: details || null,
    })
  } catch {}
}

/**
 * يتحقق من مفتاح الأدمن المُرسل بهيدر x-admin-key — يقبل الاثنين:
 * كلمة مرور الأدمن القديمة الثابتة (للتوافق)، أو رمز جلسة صالح من نظام تسجيل الدخول الجديد.
 */
export async function isValidAdminKey(key: string | null): Promise<boolean> {
  if (!key) return false
  const legacyPassword = process.env.ADMIN_PASSWORD || 'storely@2026'
  if (key === legacyPassword) return true
  const session = await verifyAdminSession(key)
  return !!session
}

/**
 * يتحقق من صلاحية محددة (زي manage_users، manage_suppliers...).
 * يقبل: كلمة مرور الأدمن القديمة الثابتة (تعتبر صلاحية كاملة دائماً، للتوافق مع أدوات قديمة)،
 * أو رمز جلسة لمشرف super_admin (كل الصلاحيات تلقائياً)، أو مشرف عادي عنده هذي الصلاحية بالتحديد.
 * يرجع بيانات المشرف لو مصرّح له، أو null لو لا.
 */
export async function requirePermission(key: string | null, permission: string): Promise<AdminSession | null> {
  if (!key) return null
  const legacyPassword = process.env.ADMIN_PASSWORD || 'storely@2026'
  if (key === legacyPassword) {
    return { id: 'legacy', email: 'legacy@storely.dev', full_name: 'مفتاح النظام القديم', role: 'super_admin' }
  }
  const session = await verifyAdminSession(key)
  if (!session) return null
  if (session.role === 'super_admin') return session
  if (session.permissions?.[permission]) return session
  return null
}
