import { createClient } from '@/lib/supabase/client'
import { setApiToken } from '@/lib/api-client'
import { DEVICE_STORAGE_KEY } from '@/lib/deviceMessages'

/**
 * جسر تطبيق الجوال — يشتغل فقط لو NEXT_PUBLIC_API_BASE_URL مضبوط (نسخة التطبيق).
 * على الموقع العادي (بدون المتغير) ما يسوي أي شي.
 *
 * في التطبيق، الواجهة تشتغل من داخل الجوال والسيرفر بعنوان ثاني، فـ:
 *   - أي fetch('/api/...') بالصفحات يتوجّه تلقائياً لـ BASE_URL (بدل تعديل مئات الطلبات يدوياً)
 *   - توكن دخول Supabase يُضاف كـ "Authorization: Bearer" (بدل الكوكيز اللي ما تنتقل بين الدومينات)
 *   - لو الطلب فيه Authorization أصلاً (توكن الموظف مثلاً) ما نغيّره
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

let token: string | null = null
let tokenReady: Promise<void> | null = null

/** يتابع توكن جلسة Supabase الحالية (ويحدّث api-client بنفس الوقت) */
function trackToken(): Promise<void> {
  if (!tokenReady) {
    const sb = createClient()
    const set = (t: string | null) => { token = t; setApiToken(t) }
    sb.auth.onAuthStateChange((_event, session) => set(session?.access_token ?? null))
    tokenReady = sb.auth.getSession().then(({ data }) => set(data.session?.access_token ?? null)).catch(() => {})
  }
  return tokenReady
}

export function installApiBridge() {
  if (typeof window === 'undefined' || !BASE_URL) return
  const w = window as any
  if (w.__storelyApiBridge) return
  w.__storelyApiBridge = true

  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : null
    if (!url || !url.startsWith('/api/')) return originalFetch(input, init)

    await trackToken()
    const headers = new Headers(init?.headers)
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
    // معرّف الجهاز الموثوق (الموقع يستخدم كوكي httpOnly بداله)
    let device: string | null = null
    try { device = localStorage.getItem(DEVICE_STORAGE_KEY) } catch {}
    if (device && !headers.has('x-storely-device')) headers.set('x-storely-device', device)
    return originalFetch(BASE_URL + url, { ...init, headers, credentials: 'omit' })
  }
  trackToken()
}

// التثبيت وقت تحميل الملف (قبل أي useEffect بالصفحات) — يُستورد من components/ApiBridge بالـ layout الرئيسي
installApiBridge()
