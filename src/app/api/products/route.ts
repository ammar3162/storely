import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// قائمة الأصناف النشطة لفرع معيّن (أو كل الفروع للمالك لو ما حدد فرع)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    let q = sb().from('products').select('id,name,sku,unit,qty,reorder_point,category,branch_id').eq('org_id', org_id).eq('is_active', true)
    if (effectiveBranchId) q = q.eq('branch_id', effectiveBranchId)
    const { data, error } = await q.order('name')

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, products: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
