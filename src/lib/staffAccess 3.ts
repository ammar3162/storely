import type { SupabaseClient } from '@supabase/supabase-js'
import { enforcedBranchId } from '@/lib/verifyOrgAccess'

/** يتأكد إن الموظف تابع للمنشأة (ولفرع المدير لو كان مدير فرع) — يرجّع صف الموظف */
export async function loadOwnedStaff(db: SupabaseClient, access: { role?: string | null; branchId?: string | null }, org_id: string, id: string) {
  const { data } = await db.from('staff_members').select('*').eq('id', id).eq('org_id', org_id).maybeSingle()
  if (!data) return null
  const bid = enforcedBranchId(access)
  if (bid && (data as any).branch_id !== bid) return null
  return data as any
}
