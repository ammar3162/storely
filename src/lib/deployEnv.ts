// أي بيئة شغّالة؟ الإنتاج الحقيقي = المتصل بقاعدة Supabase الإنتاج (رابطها عام أصلاً — يطلع للمتصفح).
// مشروع Vercel «storely» (الاستيجنق والفروع) يبني نسخة إنتاج من main متصلة بقاعدة الاستيجنق —
// بدون هذا الحارس كانت مهامه المجدولة ورسائله تطلع من رقم ستورلي الحقيقي.
export const PROD_SUPABASE_REF = 'dozqwcczhaiqvoqcrrep'

type Env = Record<string, string | undefined>

export function isProductionDb(env: Env = process.env): boolean {
  return (env.NEXT_PUBLIC_SUPABASE_URL || '').includes(PROD_SUPABASE_REF)
}

/** رقم بصيغة دولية بدون + (9665xxxxxxxx) — يقبل 05… و5… و+966… و00966… و…@s.whatsapp.net */
export function normalizePhone(raw: unknown): string {
  let d = String(raw ?? '').split('@')[0].replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('05') && d.length === 10) d = '966' + d.slice(1)
  if (d.startsWith('5') && d.length === 9) d = '966' + d
  return d
}

/** أرقام تستقبل واتساب من خارج الإنتاج: STAGING_WA_ALLOWLIST (مفصولة بفواصل) + رقم تنبيهات الإدارة */
export function stagingWaAllowlist(env: Env = process.env): Set<string> {
  const list = (env.STAGING_WA_ALLOWLIST || '').split(/[,\s]+/).map(normalizePhone).filter(Boolean)
  list.push(normalizePhone(env.ADMIN_ALERT_PHONE || '966594351667'))
  return new Set(list)
}

/** الإنتاج: أي رقم. غير الإنتاج (استيجنق/لوكل): القائمة المسموحة فقط */
export function waRecipientAllowed(phone: unknown, env: Env = process.env): boolean {
  if (isProductionDb(env)) return true
  const p = normalizePhone(phone)
  return !!p && stagingWaAllowlist(env).has(p)
}

/** مستلم رسالة الواتساب من جسم الطلب (Wasender و Meta Cloud API كلهم يستخدمون to) */
export function waRecipientOf(body: unknown): string {
  if (typeof body !== 'string') return ''
  try { return String(JSON.parse(body)?.to ?? '') } catch { return '' }
}

export const WA_SEND_URL = /wasenderapi\.com\/api\/send-message|graph\.facebook\.com\/v[\d.]+\/[^/]+\/messages/

/** المهام المجدولة من Vercel (user-agent: vercel-cron) تشتغل على الإنتاج فقط — التشغيل اليدوي بالمفتاح يبقى متاح للتجربة */
export function skipScheduledCron(userAgent: string | null, env: Env = process.env): boolean {
  return /^vercel-cron\//i.test(userAgent || '') && !isProductionDb(env)
}
