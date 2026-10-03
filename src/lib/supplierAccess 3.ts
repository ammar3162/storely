import type { SupabaseClient } from '@supabase/supabase-js'
import { enforcedBranchId } from '@/lib/verifyOrgAccess'

/** يتأكد إن المورد تابع للمنشأة (ولفرع المدير لو كان مدير فرع) */
export async function loadOwnedSupplier(db: SupabaseClient, access: { role?: string | null; branchId?: string | null }, org_id: string, id: string) {
  const { data } = await db.from('suppliers').select('id,branch_id,marketplace_supplier_id').eq('id', id).eq('org_id', org_id).maybeSingle()
  if (!data) return null
  const bid = enforcedBranchId(access)
  if (bid && (data as any).branch_id && (data as any).branch_id !== bid) return null
  return data as any
}

/** يتأكد إن الصنف تابع للمنشأة (ولفرع المدير) */
export async function loadOwnedProduct(db: SupabaseClient, access: { role?: string | null; branchId?: string | null }, org_id: string, id: string) {
  const { data } = await db.from('products').select('id,branch_id').eq('id', id).eq('org_id', org_id).maybeSingle()
  if (!data) return null
  const bid = enforcedBranchId(access)
  if (bid && (data as any).branch_id !== bid) return null
  return data as any
}
