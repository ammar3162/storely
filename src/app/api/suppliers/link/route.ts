import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { loadOwnedSupplier, loadOwnedProduct } from '@/lib/supplierAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ربط صنف بمورد (المورد الأساسي = الأولوية 1 بسلسلة التصعيد)
export async function POST(req: Request) {
  try {
    const { org_id, supplier_id, product_id, reorder_point, order_qty, notes, catalog_item_id } = await req.json()
    const rp = Number(reorder_point)
    if (!org_id || !supplier_id || !product_id || !(rp >= 0) || reorder_point === '' || reorder_point == null) {
      return NextResponse.json({ error: 'اختر منتج وأدخل الحد الأدنى' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    if (!(await loadOwnedSupplier(db, access, org_id, supplier_id))) return NextResponse.json({ error: 'المورد غير موجود' }, { status: 404 })
    if (!(await loadOwnedProduct(db, access, org_id, product_id))) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })

    const qty = Number(order_qty) || rp
    const cleanNotes = String(notes || '').trim() || null
    const { error: prodErr } = await db.from('products').update({
      supplier_id, supplier_reorder_point: rp, supplier_order_qty: qty, supplier_notes: cleanNotes,
      marketplace_catalog_item_id: catalog_item_id || null,
    } as any).eq('id', product_id).eq('org_id', org_id)
    if (prodErr) return NextResponse.json({ error: 'فشل ربط المنتج بالمورد' }, { status: 500 })

    const { error: chainErr } = await db.from('product_suppliers').upsert({
      product_id, supplier_id, priority: 1, reorder_point: rp, order_qty: qty, notes: cleanNotes,
    } as any, { onConflict: 'product_id,priority' })
    return NextResponse.json({ success: true, chain_failed: !!chainErr })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// فك ارتباط صنف بمورده (وحذف سلسلة التصعيد حقته)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const product_id = searchParams.get('product_id')
    if (!org_id || !product_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    if (!(await loadOwnedProduct(db, access, org_id, product_id))) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })

    const { error } = await db.from('products').update({ supplier_id: null, supplier_reorder_point: null, supplier_order_qty: 0, supplier_notes: null } as any).eq('id', product_id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'فشل فك الارتباط' }, { status: 500 })
    await db.from('product_suppliers').delete().eq('product_id', product_id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
