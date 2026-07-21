import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, product_id } = await req.json()
    if (!org_id || !product_id) return NextResponse.json({ success: false })

    // مسموح لطلبين: جلسة المالك (كوكيز) أو توكن موظف صالح (نداء سيرفر-لسيرفر بدون كوكيز)
    const staffAuth = verifyStaffToken(extractStaffToken(req))
    if (!staffAuth.valid || staffAuth.data!.org_id !== org_id) {
      const access = await verifyOrgAccess(org_id)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const supabase = sb()

    // جيب فرع المنتج — نزامن بس للموظفين بنفس فرع المنتج (يمنع تسريب صلاحية منتج فرع لموظف فرع ثاني)
    const { data: productRow } = await supabase.from('products').select('branch_id').eq('id', product_id).maybeSingle()
    const productBranchId = (productRow as any)?.branch_id || null

    let staffQ = supabase
      .from('staff_members')
      .select('id,assigned_products')
      .eq('org_id', org_id)
    if (productBranchId) staffQ = staffQ.eq('branch_id', productBranchId)
    const { data: staffList } = await staffQ

    for (const s of (staffList || [])) {
      const assigned = (s as any).assigned_products
      // نضيف بس للموظفين المقيّدين (عندهم قائمة مو فاضية) — اللي على "كل المنتجات" ما يحتاجون تحديث
      if (Array.isArray(assigned) && assigned.length > 0 && !assigned.includes(product_id)) {
        await supabase.from('staff_members')
          .update({ assigned_products: [...assigned, product_id] })
          .eq('id', (s as any).id)
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false })
  }
}
