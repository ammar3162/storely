import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { loadOwnedStaff } from '@/lib/staffAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// تخصيص منتجات لموظف — المنتج ممكن يكون عند أكثر من موظف، والمالك يحدد مين.
// الموظف بدون قائمة (فاضية) يشوف كل منتجات فرعه.
//   { product_ids }: يستبدل قائمة الموظف كاملة
//   { add_product_id }: يضيف منتج واحد لقائمته
export async function POST(req: Request) {
  try {
    const { org_id, staff_id, product_ids, add_product_id } = await req.json()
    if (!org_id || !staff_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const target = await loadOwnedStaff(db, access, org_id, staff_id)
    if (!target) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const wanted: string[] = add_product_id
      ? Array.from(new Set([...(target.assigned_products || []), String(add_product_id)]))
      : Array.isArray(product_ids) ? Array.from(new Set(product_ids.map(String))) : (null as any)
    if (!wanted) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    // المنتجات لازم تكون من نفس المنشأة ومن فرع الموظف
    if (wanted.length) {
      let q = db.from('products').select('id').eq('org_id', org_id).in('id', wanted)
      if ((target as any).branch_id) q = q.or(`branch_id.eq.${(target as any).branch_id},branch_id.is.null`)
      const { data: ok } = await q
      if ((ok || []).length !== wanted.length) return NextResponse.json({ error: 'فيه منتج مو من فرع الموظف' }, { status: 400 })
    }

    const { error } = await db.from('staff_members').update({ assigned_products: wanted } as any).eq('id', staff_id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'فشل الحفظ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
