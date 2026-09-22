/**
 * الطريقة الوحيدة اللي تكلم فيها الواجهة الباك اند.
 * الصفحات ما تستخدم Supabase مباشرة — كل قراءة/كتابة تمر من هنا إلى /api.
 *
 * - الموقع: نفس الدومين، والكوكيز تنرسل تلقائياً.
 * - تطبيق الجوال (لاحقاً): NEXT_PUBLIC_API_BASE_URL يشير للسيرفر،
 *   و setApiToken() يضيف توكن الدخول بهيدر Authorization.
 *
 * الاستخدام:
 *   const j = await api.get('/api/shifts', { org_id, branch_id })
 *   if (!j.success) toast(j.error, 'error')
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

let apiToken: string | null = null
export function setApiToken(token: string | null) { apiToken = token }

type Params = Record<string, string | number | boolean | null | undefined>
export type ApiResult<T = any> = T & { success?: boolean; error?: string }

function buildUrl(path: string, params?: Params) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== null && v !== undefined && v !== '') qs.set(k, String(v))
  }
  const q = qs.toString()
  return `${BASE_URL}${path}${q ? `?${q}` : ''}`
}

async function request<T>(method: string, path: string, params?: Params, body?: unknown): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`
  try {
    const res = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: BASE_URL ? 'include' : 'same-origin',
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok && !j.error) j.error = 'حدث خطأ'
    return j
  } catch {
    return { success: false, error: 'خطأ بالاتصال' } as ApiResult<T>
  }
}

export const api = {
  get:   <T = any>(path: string, params?: Params) => request<T>('GET', path, params),
  post:  <T = any>(path: string, body?: unknown, params?: Params) => request<T>('POST', path, params, body ?? {}),
  patch: <T = any>(path: string, body?: unknown, params?: Params) => request<T>('PATCH', path, params, body ?? {}),
  del:   <T = any>(path: string, params?: Params, body?: unknown) => request<T>('DELETE', path, params, body),
}
