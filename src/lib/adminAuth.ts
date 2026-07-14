import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type AdminSession = { id: string; email: string; full_name: string; role: string }

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
    .select('id,email,full_name,role,is_active')
    .eq('id', session.admin_id)
    .maybeSingle()

  if (!admin || !(admin as any).is_active) return null
  return { id: admin.id, email: (admin as any).email, full_name: (admin as any).full_name, role: (admin as any).role }
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
