import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// تأكيد كلمة مرور حساب المالك من الخادم (قبل تعديل/حذف إقفال الكاشير)
// نفس كلمة الدخول للنظام — ٥ محاولات غلط تقفل ١٥ دقيقة
export const PW_MAX_FAILS = 5
export const PW_LOCK_MINUTES = 15

export async function verifyOwnerPassword(db: SupabaseClient, orgId: string, userId: string, password: unknown): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const pw = String(password ?? '')
  if (!pw) return { ok: false, error: 'اكتب كلمة مرور حسابك', status: 400 }
  const { data: o } = await db.from('organizations').select('owner_pin_failed,owner_pin_locked_until').eq('id', orgId).maybeSingle()
  const lockedUntil = (o as any)?.owner_pin_locked_until
  if (lockedUntil && Date.parse(lockedUntil) > Date.now()) {
    return { ok: false, error: `محاولات كثيرة — جرّب بعد ${Math.ceil((Date.parse(lockedUntil) - Date.now()) / 60000)} دقيقة`, status: 429 }
  }
  const { data: u } = await db.auth.admin.getUserById(userId)
  const email = u?.user?.email
  if (!email) return { ok: false, error: 'تعذر التحقق من الحساب', status: 400 }
  // دخول مؤقت بالخادم بس للتحقق (ما ينحفظ أي جلسة)، وبعدها نطلع منه
  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await auth.auth.signInWithPassword({ email, password: pw })
  if (error || data.user?.id !== userId) {
    const fails = Number((o as any)?.owner_pin_failed || 0) + 1
    const lock = fails >= PW_MAX_FAILS
    await db.from('organizations').update({ owner_pin_failed: lock ? 0 : fails, owner_pin_locked_until: lock ? new Date(Date.now() + PW_LOCK_MINUTES * 60e3).toISOString() : null } as any).eq('id', orgId)
    return { ok: false, error: lock ? `كلمة المرور غلط — انقفل ${PW_LOCK_MINUTES} دقيقة` : `كلمة المرور غير صحيحة (باقي ${PW_MAX_FAILS - fails} محاولات)`, status: 403 }
  }
  await auth.auth.signOut().catch(() => {})
  if ((o as any)?.owner_pin_failed) await db.from('organizations').update({ owner_pin_failed: 0 } as any).eq('id', orgId)
  return { ok: true }
}
