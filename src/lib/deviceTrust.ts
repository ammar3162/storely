// التحقق من الجهاز (المالك ومدير الفرع): الجهاز الجديد يحتاج رمز على الإيميل مرة وحدة، وبعدها يدخل بدون رمز.
// معرّف الجهاز عشوائي بكوكي httpOnly (أو هيدر في تطبيق الجوال)، والقاعدة تحفظ بصمته بس.
// الفحص يصير بالخادم مع كل طلب (verifyOrgAccess / getCurrentProfile) — كلمة المرور لحالها ما تكفي لقراءة أو تعديل أي بيانات.
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const DEVICE_COOKIE = 'storely_device'
export const DEVICE_HEADER = 'x-storely-device'
export const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 3600   // أقصى عمر تسمح فيه المتصفحات — يتجدد مع كل دخول
export const CODE_TTL_MS = 10 * 60 * 1000
export const CODE_MAX_ATTEMPTS = 5
export const RESEND_AFTER_MS = 60 * 1000
export const MAX_CODES_PER_DAY = 10
// الأدوار اللي تحتاج جهاز موثوق — الموظف (PIN) والمورد والمحاسب لهم دخول منفصل
export const VERIFIED_ROLES = ['owner', 'manager']

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const newDeviceId = () => randomBytes(32).toString('base64url')
export const validDeviceId = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{43}$/.test(s)
export const hashDevice = (id: string) => createHash('sha256').update(`device:${id}`).digest('hex')
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')
export const hashCode = (userId: string, code: string) => createHash('sha256').update(`code:${userId}:${code}`).digest('hex')

export function sameHash(a: string, b: string) {
  const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex')
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y)
}

/** الرمز المكتوب: أرقام عربية أو إنجليزية، ويتجاهل المسافات */
export function normalizeCode(raw: unknown): string {
  return String(raw ?? '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '')
}

/** a***@gmail.com — يبين للمستخدم وين راح الرمز بدون كشف الإيميل كامل */
export function maskEmail(email: string | null | undefined): string {
  const [name, domain] = String(email || '').split('@')
  if (!name || !domain) return ''
  return `${name[0]}${'*'.repeat(Math.min(5, Math.max(2, name.length - 1)))}@${domain}`
}

/** اسم مفهوم للجهاز من الـ User-Agent: «Chrome على Windows» */
export function deviceLabel(ua: string | null | undefined): string {
  const u = String(ua || '')
  const os = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android'
    : /Windows/.test(u) ? 'Windows' : /Mac OS X|Macintosh/.test(u) ? 'Mac' : /Linux/.test(u) ? 'Linux' : ''
  const br = /Edg\//.test(u) ? 'Edge' : /SamsungBrowser/.test(u) ? 'Samsung Internet' : /OPR\//.test(u) ? 'Opera'
    : /CriOS|Chrome\//.test(u) ? 'Chrome' : /FxiOS|Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : ''
  if (br && os) return `${br} على ${os}`
  return br || os || 'جهاز غير معروف'
}

/** معرّف الجهاز من الكوكي (الموقع) أو الهيدر (تطبيق الجوال) */
export async function readDeviceId(): Promise<string | null> {
  const fromCookie = (await cookies()).get(DEVICE_COOKIE)?.value
  if (validDeviceId(fromCookie)) return fromCookie
  const fromHeader = (await headers()).get(DEVICE_HEADER)
  return validDeviceId(fromHeader) ? fromHeader : null
}

// مفتاح التشغيل يتقرا مرة بالدقيقة بس
let flagCache: { on: boolean; at: number } | null = null
export async function verificationEnabled(db: SupabaseClient = sb()): Promise<boolean> {
  if (flagCache && Date.now() - flagCache.at < 60_000) return flagCache.on
  const { data, error } = await db.from('platform_settings').select('device_verification').limit(1).maybeSingle()
  // لو العمود مو موجود (الكود انرفع قبل ملف القاعدة) نوقف الفحص بدل ما نقفل الكل
  const on = !error && (data as { device_verification?: boolean } | null)?.device_verification !== false
  if (error) console.error('device_verification flag read failed:', error.message)
  flagCache = { on, at: Date.now() }
  return on
}

// الجهاز الموثوق يتذكره الخادم دقيقة — عشان ما نقرأ القاعدة مع كل طلب
const trustCache = new Map<string, number>()
export const forgetTrust = (userId: string) => { for (const k of trustCache.keys()) if (k.startsWith(`${userId}:`)) trustCache.delete(k) }

export async function isDeviceTrusted(userId: string, deviceId: string | null, db: SupabaseClient = sb()): Promise<boolean> {
  if (!deviceId) return false
  const deviceHash = hashDevice(deviceId)
  const key = `${userId}:${deviceHash}`
  const cached = trustCache.get(key)
  if (cached && Date.now() - cached < 60_000) return true
  const { data } = await db.from('trusted_devices').select('id,last_seen_at')
    .eq('user_id', userId).eq('device_hash', deviceHash).is('revoked_at', null).maybeSingle()
  if (!data) return false
  trustCache.set(key, Date.now())
  if (Date.now() - new Date((data as { last_seen_at: string }).last_seen_at).getTime() > 6 * 3600 * 1000)
    db.from('trusted_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', (data as { id: string }).id).then(() => {}, () => {})
  return true
}

/** الجهاز الحالي مسموح لهذا المستخدم؟ (الأدوار الثانية ما تحتاج تحقق) */
export async function currentDeviceAllowed(userId: string, role: string | null): Promise<boolean> {
  if (!role || !VERIFIED_ROLES.includes(role)) return true
  const db = sb()
  if (!(await verificationEnabled(db))) return true
  return isDeviceTrusted(userId, await readDeviceId(), db)
}

/** يسجّل الجهاز موثوق (بعد رمز صحيح أو دخول قوقل أول مرة) */
export async function trustDevice(db: SupabaseClient, userId: string, deviceId: string, ua: string | null) {
  const { error } = await db.from('trusted_devices').upsert({
    user_id: userId, device_hash: hashDevice(deviceId), label: deviceLabel(ua),
    revoked_at: null, last_seen_at: new Date().toISOString(),
  }, { onConflict: 'user_id,device_hash' })
  if (error) throw new Error(error.message)
  forgetTrust(userId)
}

export const deviceCookie = (deviceId: string) => ({
  name: DEVICE_COOKIE, value: deviceId, httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, path: '/', maxAge: DEVICE_COOKIE_MAX_AGE,
})
