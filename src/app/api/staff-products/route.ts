import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { orgId, branchId, staffId } = await req.json()
    if (!orgId) return NextResponse.json({ products: [] })

    // جلب assigned_products للموظف
    let assignedProducts: string[] = []
    if (staffId) {
      const { data: staffData } = await sb().from('staff_members').select('assigned_products').eq('id', staffId).single()
      assignedProducts = (staffData as any)?.assigned_products || []
    }

    let q = sb().from('products').select('id,name,unit,qty,category,reorder_point').eq('org_id', orgId).eq('is_active', true)
    if (branchId) q = q.eq('branch_id', branchId)

    // فلتر حسب المنتجات المخصصة إذا وجدت
    if (assignedProducts.length > 0) {
      q = q.in('id', assignedProducts)
    }

    const { data } = await q.order('name')
    return NextResponse.json({ products: data || [] })
  } catch {
    return NextResponse.json({ products: [] })
  }
}
