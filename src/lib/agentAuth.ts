import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// دخول المندوب: رمز ٦ أرقام على الإيميل → جلسة موقّعة بكوكي HttpOnly (نفس طريقة بوابة المحاسب، بمفتاح مستقل)
const KEY = () => crypto.createHmac('sha256', process.env.STAFF_TOKEN_SECRET || '').update('sales-agent-v1').digest()
const sign = (data: string) => crypto.createHmac('sha256', KEY()).update(data).digest('base64url')

export const AGENT_COOKIE = 'agent_session'
export const AGENT_SESSION_DAYS = 30
export const AGENT_CODE_MINUTES = 10
export const AGENT_CODE_MAX_ATTEMPTS = 5

export const hashAgentCode = (email: string, code: string) => sign(`code:${email}:${code}`)

export function makeAgentSession(agentId: string, sessionId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ gid: agentId, sid: sessionId, exp: now + AGENT_SESSION_DAYS * 86400e3 })).toString('base64url')
  return `${payload}.${sign(payload)}`
}
export function readAgentSession(token: string | null | undefined, now = Date.now()): { gid: string; sid: string } | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const { gid, sid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof gid === 'string' && typeof sid === 'string' && typeof exp === 'number' && exp > now ? { gid, sid } : null
  } catch { return null }
}
export const agentCookie = (token: string) => `${AGENT_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${AGENT_SESSION_DAYS * 86400}`
export const clearAgentCookie = () => `${AGENT_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

export function cookieValue(req: Request, name: string) {
  const m = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return m ? decodeURIComponent(m[1]) : null
}

export type SalesAgent = { id: string; code: string; name: string; email: string; phone: string; payout_method: string; iban_last4: string | null; status: string; sessionId: string }
/** المندوب الحالي من الكوكي — والجهاز لازم يكون ما انطلّع */
export async function currentAgent(db: SupabaseClient, req: Request): Promise<SalesAgent | null> {
  const s = readAgentSession(cookieValue(req, AGENT_COOKIE))
  if (!s) return null
  const [{ data: a }, { data: sess }] = await Promise.all([
    db.from('sales_agents').select('id,code,name,email,phone,payout_method,iban_last4,status').eq('id', s.gid).maybeSingle(),
    db.from('agent_sessions').select('id,last_seen_at,revoked_at').eq('id', s.sid).eq('agent_id', s.gid).maybeSingle(),
  ])
  if (!a || !sess || (sess as any).revoked_at) return null
  if (Date.now() - Date.parse((sess as any).last_seen_at) > 5 * 60e3) await db.from('agent_sessions').update({ last_seen_at: new Date().toISOString() } as any).eq('id', s.sid)
  return { ...(a as any), sessionId: s.sid }
}

// الآيبان مشفّر في قاعدة البيانات (AES-256-GCM) — مفتاح مشتق مستقل عن رموز الموظفين
function vaultKey() {
  const secret = process.env.STAFF_PIN_KEY || process.env.STAFF_TOKEN_SECRET
  if (!secret) throw new Error('VAULT_KEY_MISSING')
  return Buffer.from(crypto.hkdfSync('sha256', secret, 'storely', 'agent-iban-v1', 32))
}
export function encryptIban(iban: string) {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', vaultKey(), iv)
  const data = Buffer.concat([c.update(iban, 'utf8'), c.final()])
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join(':')
}
export function decryptIban(enc: string | null | undefined) {
  if (!enc) return null
  try {
    const [v, iv, tag, data] = enc.split(':')
    if (v !== 'v1') return null
    const d = crypto.createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(iv, 'base64'))
    d.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8')
  } catch { return null }
}
