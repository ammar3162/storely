import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// استعادة فاتورة شراء محذوفة — لو كانت "مخزون" نرجّع الكمية اللي انطرحت عند الحذف عبر حركة "in"
export async function POST(req: Request) {
  try {
    const { org_id, id, branch_id } = await req.json()
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const { data: purchase } = await db.from('purchases').select('id,category,name,qty,supplier,branch_id,deleted_at').eq('id', id).eq('org_id', org_id).maybeSingle()
    if (!purchase || !(purchase as any).deleted_at) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 })
    const p: any = purchase
    const forced = enforcedBranchId(access)
    if (forced && p.branch_id !== forced) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

    if (p.category === 'مخزون' && p.name && Number(p.qty) > 0) {
      // نفس منطق الواجهة السابق: الصنف بالاسم داخل الفرع (فرع الفاتورة، وإلا الفرع الحالي)
      const productBranch = p.branch_id || enforcedBranchId(access, branch_id)
      let pq = db.from('products').select('id').eq('org_id', org_id).eq('name', p.name)
      if (productBranch) pq = pq.eq('branch_id', productBranch)
      const { data: matched } = await pq.limit(1)
      if (matched?.length) {
        await db.from('stock_movements').insert({
          product_id: (matched[0] as any).id, org_id, profile_id: access.userId, type: 'in',
          qty_change: Number(p.qty), note: `استعادة فاتورة شراء (${p.supplier || '—'})`,
        } as any)
      }
    }

    const { error } = await db.from('purchases').update({ deleted_at: null, deleted_by: null } as any).eq('id', id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'فشلت الاستعادة' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
