import { api } from '@/lib/api-client'

/**
 * بيانات المستخدم الحالي ومؤسسته من /api/me — تُجلب مرة وحدة لكل تحميل صفحة.
 * (تسجيل الخروج يعيد تحميل الصفحة بالكامل، فما تنتقل البيانات لحساب ثاني)
 */
export type Me = {
  user_id: string
  org_id: string
  role: string | null
  branch_id: string | null
  full_name: string
  subscription_ends_at: string | null
  permissions: Record<string, boolean>
  whatsapp_consent: boolean
  whatsapp_first_contact_confirmed: boolean
  terms_version_accepted: string | null
  org: {
    name: string; plan: string; currency: string | null; logo_url: string | null
    deletion_scheduled_at: string | null; max_staff: number; max_suppliers: number
    max_branches: number; country_code: string; business_type: string | null
  } | null
  branches: { id: string; name: string; location: string | null }[]
}

export type MeResult = { me: Me | null; reason?: 'unauthenticated' | 'no_org' | 'error' }

let mePromise: Promise<MeResult> | null = null

/** مثل getMe لكن يوضح سبب الفشل (غير مسجل / بدون مؤسسة) — تستخدمه لوحة التحكم للتوجيه */
export function getMeResult(): Promise<MeResult> {
  if (!mePromise) {
    mePromise = api.get<Me & { reason?: MeResult['reason'] }>('/api/me').then(j => {
      if (!j.success || !j.org_id) {
        mePromise = null
        return { me: null, reason: j.reason || 'error' }
      }
      sessionStorage.setItem('s_org_id', j.org_id)
      return { me: j }
    })
  }
  return mePromise
}

export async function getMe(): Promise<Me | null> {
  return (await getMeResult()).me
}

/** معرّف المؤسسة — من الجلسة لو محفوظ (أسرع)، وإلا من /api/me */
export async function getOrgId(): Promise<string | null> {
  const cached = sessionStorage.getItem('s_org_id')
  if (cached) return cached
  return (await getMe())?.org_id ?? null
}

/** بيانات عرض المنشأة لصفحات الموظفين (دخول الـ PIN) — تُجلب مرة وحدة لكل تحميل صفحة */
export type StaffOrg = { logo_url: string | null; currency: string | null; plan: string | null }

let staffOrgPromise: Promise<StaffOrg | null> | null = null
let staffOrgToken: string | null = null

export function getStaffOrg(): Promise<StaffOrg | null> {
  const token = localStorage.getItem('staff_token')
  // الجهاز ممكن يتشارك بين أكثر من موظف — لو تغيّر التوكن نجيب البيانات من جديد
  if (!staffOrgPromise || token !== staffOrgToken) {
    staffOrgToken = token
    staffOrgPromise = api.get<StaffOrg>('/api/staff-org', undefined, token ? { Authorization: `Bearer ${token}` } : undefined)
      .then(j => {
        if (!j.success) { staffOrgPromise = null; return null }
        return j
      })
  }
  return staffOrgPromise
}
