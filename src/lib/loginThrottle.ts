import type { SupabaseClient } from '@supabase/supabase-js'

// حماية رمز PIN من التخمين — العدّاد بقاعدة البيانات (دوال staff_login_*) عشان يشتغل صح
// مهما كان عدد نسخ السيرفر. 5 محاولات غلط خلال 15 دقيقة = قفل 15 دقيقة، ويتضاعف مع التكرار.
// عنوان الـIP له حد أعلى (30) — يمنع تجربة رموز على أرقام كثيرة من نفس الجهاز.
export const PER_ACCOUNT_MAX = 5
export const PER_IP_MAX = 30

export function normalizePhone(raw: string): string {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('966')) d = d.slice(3)
  return d.replace(/^0+/, '')
}

/** نفس الرقم؟ — مطابقة كاملة، أو رقم دولي مكتوب مع/بدون رمز الدولة (آخر 9 أرقام على الأقل) */
export function samePhone(a: string, b: string): boolean {
  const x = normalizePhone(a), y = normalizePhone(b)
  if (!x || !y) return false
  if (x === y) return true
  const [short, long] = x.length <= y.length ? [x, y] : [y, x]
  return short.length >= 9 && long.length - short.length <= 3 && long.endsWith(short)
}

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}

export function lockedMessage(until: string | Date): string {
  const mins = Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 60000))
  const human = mins >= 60 ? `${Math.ceil(mins / 60)} ساعة` : `${mins} دقيقة`
  return `تم إيقاف الدخول مؤقتاً بسبب محاولات خاطئة متكررة — حاول بعد ${human}`
}

/** أول قفل فعّال من المفاتيح (أو null) */
export async function lockedUntil(db: SupabaseClient, keys: string[]): Promise<string | null> {
  for (const k of keys) {
    const { data } = await db.rpc('staff_login_locked', { p_key: k })
    if (data) return data as unknown as string
  }
  return null
}

/** يسجّل محاولة غلط — يرجّع القفل لو صار، وjustLocked لو هذي المحاولة اللي قفلته */
export async function recordFailure(db: SupabaseClient, key: string, max = PER_ACCOUNT_MAX): Promise<{ lockedUntil: string | null; justLocked: boolean }> {
  const { data } = await db.rpc('staff_login_fail', { p_key: key, p_max: max, p_window_minutes: 15 })
  const row = Array.isArray(data) ? data[0] : data
  return { lockedUntil: row?.locked_until ?? null, justLocked: !!row?.just_locked }
}

export async function recordSuccess(db: SupabaseClient, key: string) {
  await db.rpc('staff_login_ok', { p_key: key })
}

/** تنبيه المالك لما يتقفل حساب موظف بسبب محاولات خاطئة */
export async function notifyLocked(db: SupabaseClient, staff: { org_id: string; branch_id: string | null; name: string }[]) {
  for (const s of staff) {
    await db.from('notifications').insert({
      org_id: s.org_id, branch_id: s.branch_id || null, type: 'warning', read: false,
      title: `محاولات دخول خاطئة: ${s.name}`,
      message: `انكتب رمز PIN غلط ${PER_ACCOUNT_MAX} مرات متتالية على حساب ${s.name}، وانقفل الدخول مؤقتاً. لو مو هو، غيّر رمزه من صفحة الموظفين.`,
    } as any)
  }
}
