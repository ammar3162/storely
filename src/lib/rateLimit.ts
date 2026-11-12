import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { clientIp } from '@/lib/loginThrottle'

// حد عدد الطلبات: يمنع أحد يرسل آلاف الرسائل من رقمنا، أو يخمّن رموز التحقق، أو يرفع فاتورة الذكاء الاصطناعي.
// العدّاد في القاعدة (rate_limit_hit) عشان يكون واحد لكل نسخ الخادم.
// لو القاعدة ما ردّت نسمح بالطلب — الحد حماية إضافية، ما نبيه يوقف النظام لو تعطّل.

export type Limit = { key: string; max: number; windowSec: number }

const MIN = 60, HOUR = 3600, DAY = 86400

/** الحدود — سخية للاستخدام العادي، وتقفل التكرار الآلي */
export const LIMITS = {
  otpSendPhone:   { max: 3,   windowSec: 10 * MIN },  // رمز واتساب لنفس الرقم
  otpSendIp:      { max: 10,  windowSec: HOUR },
  otpVerifyPhone: { max: 8,   windowSec: 10 * MIN },  // محاولات إدخال الرمز
  otpVerifyIp:    { max: 30,  windowSec: 10 * MIN },
  resetTarget:    { max: 3,   windowSec: HOUR },      // رابط استعادة كلمة المرور لنفس الإيميل/الرقم
  resetIp:        { max: 10,  windowSec: HOUR },
  demoIp:         { max: 5,   windowSec: HOUR },
  welcomePhone:   { max: 2,   windowSec: HOUR },
  aiChatOrg:      { max: 60,  windowSec: 10 * MIN },  // المساعد الذكي
  aiChatOrgDay:   { max: 500, windowSec: DAY },
  aiScanOrg:      { max: 60,  windowSec: HOUR },      // قراءة الفواتير بالصور
  aiInsightsOrg:  { max: 30,  windowSec: HOUR },
  aiTranslateOrg: { max: 30,  windowSec: HOUR },
  supplierAddOrg: { max: 20,  windowSec: HOUR },
  supportTicketOrg: { max: 6, windowSec: HOUR },     // تذاكر الدعم الفني      // إضافة موردين (يمنع إضافة 100 مورد دفعة وحدة)
} as const satisfies Record<string, Omit<Limit, 'key'>>

export const limit = (name: keyof typeof LIMITS, id: string): Limit => ({ key: `${name}:${id}`, ...LIMITS[name] })
export const ipOf = (req: Request) => clientIp(req)

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/** يسجّل الطلب على كل الحدود — يرجّع 0 لو مسموح، أو عدد الثواني لين يقدر يحاول */
export async function hitLimits(limits: Limit[], db: SupabaseClient = admin()): Promise<number> {
  let wait = 0
  for (const l of limits) {
    try {
      const { data, error } = await db.rpc('rate_limit_hit', { p_key: l.key.toLowerCase().slice(0, 200), p_max: l.max, p_window_seconds: l.windowSec })
      if (!error) wait = Math.max(wait, Number(data) || 0)
    } catch { /* نسمح بالطلب */ }
  }
  return wait
}

// العدد مع التمييز الصحيح: دقيقة / دقيقتين / 3 دقائق / 11 دقيقة
function plural(n: number, one: string, two: string, few: string): string {
  if (n === 1) return one
  if (n === 2) return two
  return n <= 10 ? `${n} ${few}` : `${n} ${one}`
}

export function waitText(sec: number): string {
  if (sec < 90) return plural(Math.max(1, sec), 'ثانية', 'ثانيتين', 'ثوانٍ')
  const mins = Math.ceil(sec / 60)
  return mins >= 90 ? plural(Math.ceil(mins / 60), 'ساعة', 'ساعتين', 'ساعات') : plural(mins, 'دقيقة', 'دقيقتين', 'دقائق')
}

export function tooManyMessage(sec: number): string {
  return `طلبات كثيرة خلال وقت قصير — حاول مرة أخرى بعد ${waitText(sec)}`
}

/** رد 429 جاهز */
export function tooMany(sec: number) {
  return NextResponse.json({ error: tooManyMessage(sec), rate_limited: true, retry_after: sec }, { status: 429, headers: { 'Retry-After': String(sec) } })
}

/** اختصار: لو تعدّى الحد يرجّع رد 429، وإلا null */
export async function guard(limits: Limit[], db?: SupabaseClient) {
  const wait = await hitLimits(limits, db)
  return wait > 0 ? tooMany(wait) : null
}
