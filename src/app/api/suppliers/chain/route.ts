import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { loadOwnedSupplier, loadOwnedProduct } from '@/lib/supplierAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// الموردين الاحتياطيين لصنف (الأولوية 2 فأعلى) — لو ما رد المورد الأساسي ينتقل الطلب للي بعده
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const product_id = searchParams.get('product_id')
    if (!org_id || !product_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    if (!(await loadOwnedProduct(db, access, org_id, product_id))) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })

    const { data, error } = await db.from('product_suppliers').select('id,supplier_id,priority,suppliers(name)').eq('product_id', product_id).gt('priority', 1).order('priority')
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, chain: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إضافة مورد احتياطي بأولوية بعد آخر واحد
export async function POST(req: Request) {
  try {
    const { org_id, product_id, supplier_id } = await req.json()
    if (!org_id || !product_id || !supplier_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    if (!(await loadOwnedProduct(db, access, org_id, product_id))) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })
    if (!(await loadOwnedSupplier(db, access, org_id, supplier_id))) return NextResponse.json({ error: 'المورد غير موجود' }, { status: 404 })

    const { data: chain } = await db.from('product_suppliers').select('priority').eq('product_id', product_id).gt('priority', 1)
    const nextPriority = chain?.length ? Math.max(...chain.map((c: any) => c.priority)) + 1 : 2
    const { error } = await db.from('product_suppliers').insert({ product_id, supplier_id, priority: nextPriority } as any)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const id = searchParams.get('id')
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const { data: row } = await db.from('product_suppliers').select('product_id').eq('id', id).maybeSingle()
    if (!row || !(await loadOwnedProduct(db, access, org_id, (row as any).product_id))) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const { error } = await db.from('product_suppliers').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
