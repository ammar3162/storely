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
  org: { name: string; plan: string; currency: string | null } | null
}

let mePromise: Promise<Me | null> | null = null

export function getMe(): Promise<Me | null> {
  if (!mePromise) {
    mePromise = api.get<Me>('/api/me').then(j => {
      if (!j.success || !j.org_id) { mePromise = null; return null }
      sessionStorage.setItem('s_org_id', j.org_id)
      return j
    })
  }
  return mePromise
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
