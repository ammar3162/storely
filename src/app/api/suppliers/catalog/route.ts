import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { loadOwnedSupplier } from '@/lib/supplierAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// أصناف كتالوج مورد السوق المرتبط بمورد المنشأة (المتاحة فقط)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const supplier_id = searchParams.get('supplier_id')
    if (!org_id || !supplier_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const supplier = await loadOwnedSupplier(db, access, org_id, supplier_id)
    if (!supplier) return NextResponse.json({ error: 'المورد غير موجود' }, { status: 404 })
    if (!supplier.marketplace_supplier_id) return NextResponse.json({ success: true, items: [] })

    const { data, error } = await db.from('supplier_catalog_items').select('id,name,unit,price')
      .eq('supplier_id', supplier.marketplace_supplier_id).eq('is_available', true)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, items: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
