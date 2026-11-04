// حد وقت لكل اتصال بخدمة خارجية (الذكاء الاصطناعي، الواتساب، الإيميل).
// بدونه: لو علق المزود يعلق الطلب كله لين تنتهي مهلة الخادم، والمستخدم يشوف الصفحة تحمّل بدون نهاية.
// انتهاء الوقت يرمي خطأ مثل انقطاع الشبكة بالضبط، فكل مكان يتعامل مع الفشل أصلاً يكمل بنفس الطريقة.

// قراءة الفاتورة بالصور تاخذ وقت — نعطي الذكاء الاصطناعي 90 ثانية، والباقي 15
export const EXTERNAL_TIMEOUT_MS = { ai: 90_000, messaging: 15_000 } as const

export function timeoutFor(url: string): number {
  return /api\.anthropic\.com/.test(url) ? EXTERNAL_TIMEOUT_MS.ai : EXTERNAL_TIMEOUT_MS.messaging
}

/** fetch لخدمة خارجية مع حد وقت حسب الخدمة (يحترم signal لو موجود) */
export function fetchExternal(url: string, init: RequestInit = {}, ms = timeoutFor(url)): Promise<Response> {
  const timeout = AbortSignal.timeout(ms)
  return fetch(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout })
}

/** حد وقت لوعد من مكتبة خارجية ما تقبل signal (مثل Resend) */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}: انتهى الوقت بعد ${ms / 1000} ثانية`)), ms) }),
  ])
}
