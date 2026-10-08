import type { SupabaseClient } from '@supabase/supabase-js'

// صلاحيات الموظف من قاعدة البيانات (مو من الجهاز) — الواجهة تخفي الأزرار، والسيرفر هو اللي يمنع
export async function staffHasPermission(db: SupabaseClient, staffId: string, orgId: string, key: 'purchases' | 'inventory' | 'dispense' | 'reports') {
  const { data } = await db.from('staff_members').select('permissions,is_active').eq('id', staffId).eq('org_id', orgId).maybeSingle()
  return !!(data as any)?.is_active && (data as any)?.permissions?.[key] === true
}
export const NO_PURCHASES = 'ما عندك صلاحية تسجيل المشتريات — اطلبها من المدير'
