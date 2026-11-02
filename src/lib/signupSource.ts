// مصدر العميل وقت التسجيل: «من وين سمعت عنا؟» + رابط الحملة (utm)
// دوال صافية تشتغل في المتصفح والخادم — الخادم يعيد التنظيف وما يثق بأي قيمة من المتصفح

export const SIGNUP_SOURCES = [
  { v: 'tiktok', ar: 'تيك توك', en: 'TikTok' },
  { v: 'snapchat', ar: 'سناب شات', en: 'Snapchat' },
  { v: 'instagram', ar: 'انستقرام', en: 'Instagram' },
  { v: 'x', ar: 'إكس (تويتر)', en: 'X (Twitter)' },
  { v: 'google', ar: 'بحث قوقل', en: 'Google search' },
  { v: 'friend', ar: 'صديق أو معرفة', en: 'A friend' },
  { v: 'agent', ar: 'ترشيح من سفير ستورلي', en: 'A Storely ambassador' },
  { v: 'other', ar: 'غير ذلك', en: 'Other' },
] as const

export type SignupSource = typeof SIGNUP_SOURCES[number]['v']

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
export type UtmKey = typeof UTM_KEYS[number]
export type Utm = Partial<Record<UtmKey, string>>

export const UTM_STORAGE_KEY = 'storely_utm'
const UTM_MAX = 100
const DETAIL_MAX = 100

/** يرجع المصدر لو من القائمة، وإلا null */
export function normalizeSignupSource(v: unknown): SignupSource | null {
  return SIGNUP_SOURCES.some(s => s.v === v) ? (v as SignupSource) : null
}

// يشيل رموز التحكم والمسافات الزائدة ويقص الطول
function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/[\u0000-\u001F\u007F​-‏‪-‮﻿]/g, '').trim().slice(0, max)
}

/** ينظف «غير ذلك» المكتوب يدوي — يُقبل بس مع المصدر other */
export function normalizeSourceDetail(source: SignupSource | null, detail: unknown): string | null {
  if (source !== 'other') return null
  return clean(detail, DETAIL_MAX) || null
}

/** يأخذ مفاتيح utm المعروفة بس، نص قصير، ويتجاهل أي شي ثاني */
export function sanitizeUtm(input: unknown): Utm {
  const out: Utm = {}
  if (!input || typeof input !== 'object') return out
  for (const k of UTM_KEYS) {
    const v = clean((input as Record<string, unknown>)[k], UTM_MAX)
    if (v) out[k] = v
  }
  return out
}

/** يقرأ utm من نص الرابط (?utm_source=...) */
export function utmFromSearch(search: string): Utm {
  const p = new URLSearchParams(search)
  const raw: Record<string, string> = {}
  for (const k of UTM_KEYS) { const v = p.get(k); if (v) raw[k] = v }
  return sanitizeUtm(raw)
}

export function hasUtm(u: Utm): boolean {
  return UTM_KEYS.some(k => !!u[k])
}

/** أول رابط حملة يفوز: لو فيه utm محفوظ من قبل نرجعه، وإلا نحفظ اللي في الرابط الحالي */
export function captureUtm(search: string, storage: Pick<Storage, 'getItem' | 'setItem'> | null): Utm {
  const fromUrl = utmFromSearch(search)
  if (!storage) return fromUrl
  try {
    const saved = sanitizeUtm(JSON.parse(storage.getItem(UTM_STORAGE_KEY) || 'null'))
    if (hasUtm(saved)) return saved
    if (hasUtm(fromUrl)) storage.setItem(UTM_STORAGE_KEY, JSON.stringify(fromUrl))
  } catch {}
  return fromUrl
}

/** صف جدول signup_attribution — كل الحقول منظفة */
export function buildAttributionRow(orgId: string, body: { signupSource?: unknown; signupSourceDetail?: unknown; utm?: unknown }) {
  const source = normalizeSignupSource(body.signupSource)
  const utm = sanitizeUtm(body.utm)
  return {
    org_id: orgId,
    source,
    source_detail: normalizeSourceDetail(source, body.signupSourceDetail),
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    utm_content: utm.utm_content ?? null,
    utm_term: utm.utm_term ?? null,
  }
}
