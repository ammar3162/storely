import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ products: [], error: auth.error }, { status: auth.reason==='subscription_expired'?403:401 })
    const { org_id: orgId, staff_id: staffId } = auth.data!

    const { branchId } = await req.json()
    if (!orgId) return NextResponse.json({ products: [] })

    // جلب assigned_products للموظف
    let assignedProducts: string[] = []
    if (staffId) {
      const { data: staffData } = await sb().from('staff_members').select('assigned_products').eq('id', staffId).single()
      assignedProducts = (staffData as any)?.assigned_products || []
    }

    let q = sb().from('products').select('id,name,unit,qty,category,reorder_point').eq('org_id', orgId).eq('is_active', true)
    if (branchId) q = q.eq('branch_id', branchId)

    // لو عنده منتجات مخصصة استخدمها، وإلا أظهر كل منتجات الفرع
    if (assignedProducts.length > 0) {
      q = q.in('id', assignedProducts)
    } else {
      // ما عنده تخصيص صريح — نستثني المنتجات اللي تتطلب تحديد موظف صراحة (requires_staff_assignment)
      // المنتجات القديمة تبقى تظهر تلقائياً زي العادة، بس أي منتج جديد لازم يُحدَّد له موظف قبل ما يظهر
      q = q.eq('requires_staff_assignment', false)
    }

    const { data } = await q.order('name')
    return NextResponse.json({ products: data || [] })
  } catch {
    return NextResponse.json({ products: [] })
  }
}
