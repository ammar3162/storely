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

export function makeSession(accountantId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ aid: accountantId, exp: now + SESSION_DAYS * 86400e3 })).toString('base64url')
  return `${payload}.${sign(payload)}`
}
export function readSession(token: string | null | undefined, now = Date.now()): string | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const { aid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof aid === 'string' && typeof exp === 'number' && exp > now ? aid : null
  } catch { return null }
}

export const sessionCookie = (token: string) => `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
export const clearCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

function cookieFrom(req: Request) {
  const m = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  return m ? decodeURIComponent(m[1]) : null
}

export type PortalAccountant = { id: string; email: string; name: string | null }
/** المحاسب الحالي من الكوكي (ويتأكد إنه موجود فعلاً) */
export async function currentAccountant(db: SupabaseClient, req: Request): Promise<PortalAccountant | null> {
  const aid = readSession(cookieFrom(req))
  if (!aid) return null
  const { data } = await db.from('accountant_users').select('id,email,name').eq('id', aid).maybeSingle()
  return (data as any) || null
}

/** إذن المحاسب على منشأة (مفعّل فقط) */
export async function accessFor(db: SupabaseClient, accountantId: string, orgId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return null
  const { data } = await db.from('accountant_access').select('id,org_id,branch_id,sections,vat_registered,status')
    .eq('accountant_id', accountantId).eq('org_id', orgId).eq('status', 'active').maybeSingle()
  return (data as any) || null
}
