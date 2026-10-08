import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// دخول بوابة المحاسب: رمز ٦ أرقام على الإيميل → جلسة موقّعة بكوكي HttpOnly
// المفتاح مشتق من مفتاح النظام (ما نلمس مفتاح جلسات الموظفين نفسه)
const KEY = () => crypto.createHmac('sha256', process.env.STAFF_TOKEN_SECRET || '').update('accountant-portal-v1').digest()
const sign = (data: string) => crypto.createHmac('sha256', KEY()).update(data).digest('base64url')

export const SESSION_COOKIE = 'acc_session'
export const SESSION_DAYS = 14
export const CODE_MINUTES = 10
export const CODE_MAX_ATTEMPTS = 5

export const normalizeEmail = (e: unknown) => String(e ?? '').trim().toLowerCase()
export const isEmail = (e: string) => e.length <= 254 && /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(e)

export function newCode() { return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0') }
export const hashCode = (email: string, code: string) => sign(`code:${email}:${code}`)

// sid = رقم الجهاز (جدول accountant_sessions) — المحاسب يقدر يطلّع أي جهاز
export function makeSession(accountantId: string, sessionId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ aid: accountantId, sid: sessionId, exp: now + SESSION_DAYS * 86400e3 })).toString('base64url')
  return `${payload}.${sign(payload)}`
}
export function readSession(token: string | null | undefined, now = Date.now()): { aid: string; sid: string } | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const { aid, sid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof aid === 'string' && typeof sid === 'string' && typeof exp === 'number' && exp > now ? { aid, sid } : null
  } catch { return null }
}

export const sessionCookie = (token: string) => `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
export const clearCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

function cookieFrom(req: Request) {
  const m = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  return m ? decodeURIComponent(m[1]) : null
}

export type PortalAccountant = { id: string; email: string; name: string | null; sessionId: string }
/** المحاسب الحالي من الكوكي — والجهاز لازم يكون ما انطلّع */
export async function currentAccountant(db: SupabaseClient, req: Request): Promise<PortalAccountant | null> {
  const s = readSession(cookieFrom(req))
  if (!s) return null
  const [{ data: user }, { data: sess }] = await Promise.all([
    db.from('accountant_users').select('id,email,name').eq('id', s.aid).maybeSingle(),
    db.from('accountant_sessions').select('id,last_seen_at,revoked_at').eq('id', s.sid).eq('accountant_id', s.aid).maybeSingle(),
  ])
  if (!user || !sess || (sess as any).revoked_at) return null
  // آخر استخدام للجهاز (كل ٥ دقايق بس — ما نكتب مع كل طلب)
  if (Date.now() - Date.parse((sess as any).last_seen_at) > 5 * 60e3) await db.from('accountant_sessions').update({ last_seen_at: new Date().toISOString() } as any).eq('id', s.sid)
  return { ...(user as any), sessionId: s.sid }
}

/** وصف الجهاز للعرض: «آيفون · Safari» */
export function deviceLabel(ua: string | null | undefined) {
  const u = ua || ''
  const os = /iPhone/.test(u) ? 'آيفون' : /iPad/.test(u) ? 'آيباد' : /Android/.test(u) ? 'أندرويد' : /Mac OS X/.test(u) ? 'ماك' : /Windows/.test(u) ? 'ويندوز' : 'جهاز'
  const br = /Edg\//.test(u) ? 'Edge' : /CriOS|Chrome\//.test(u) ? 'Chrome' : /FxiOS|Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : ''
  return br ? `${os} · ${br}` : os
}

/** إذن المحاسب على منشأة (مفعّل فقط) */
export async function accessFor(db: SupabaseClient, accountantId: string, orgId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return null
  const { data } = await db.from('accountant_access').select('id,org_id,branch_id,sections,vat_registered,status,expires_on')
    .eq('accountant_id', accountantId).eq('org_id', orgId).eq('status', 'active').maybeSingle()
  const a = data as any
  return a && !accessExpired(a.expires_on) ? a : null
}

/** الإذن انتهى؟ (آخر يوم = expires_on نفسه) */
export const accessExpired = (expiresOn: string | null | undefined, now = Date.now()) =>
  !!expiresOn && new Date(now + 3 * 3600e3).toISOString().slice(0, 10) > expiresOn

// رابط قبول الدعوة (يوصل على إيميل المحاسب): موقّع، مربوط بالدعوة نفسها وإيميلها، وينتهي بعد INVITE_DAYS
export const INVITE_DAYS = 7
export function makeInviteToken(accessId: string, email: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ iid: accessId, em: email, exp: now + INVITE_DAYS * 86400e3 })).toString('base64url')
  return `${payload}.${sign(`invite:${payload}`)}`
}
export function readInviteToken(token: string | null | undefined, now = Date.now()): { iid: string; em: string } | 'expired' | null {
  if (!token || token.length > 600) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = sign(`invite:${payload}`)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const { iid, em, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof iid !== 'string' || typeof em !== 'string' || typeof exp !== 'number') return null
    return exp > now ? { iid, em } : 'expired'
  } catch { return null }
}
