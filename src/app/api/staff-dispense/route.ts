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
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.reason==='subscription_expired'?403:401 })
    const { org_id: orgId, staff_id: staffId } = auth.data!

    const { productId, qty } = await req.json()
    const n = Number(qty)
    if (!productId || !(n > 0)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const supabase = sb()
    // الاسم والفرع والمنتجات المخصصة من قاعدة البيانات — مو من الطلب
    const { data: me } = await supabase.from('staff_members').select('name,branch_id,assigned_products').eq('id', staffId).eq('org_id', orgId).maybeSingle()
    if (!me) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    const { data: product } = await supabase.from('products').select('id,qty,branch_id').eq('id', productId).eq('org_id', orgId).maybeSingle()
    if (!product) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 })
    const assigned: string[] = (me as any).assigned_products || []
    if ((me as any).branch_id && (product as any).branch_id && (product as any).branch_id !== (me as any).branch_id) return NextResponse.json({ error: 'المنتج من فرع ثاني' }, { status: 403 })
    if (assigned.length && !assigned.includes(productId)) return NextResponse.json({ error: 'المنتج مو مخصص لك' }, { status: 403 })
    if (Number((product as any).qty) < n) return NextResponse.json({ error: 'الكمية تتجاوز المتاح' }, { status: 400 })

    // الكمية تنخصم من الحركة نفسها (trigger يجمع الحركات) — ما نكتب qty مباشرة،
    // عشان لو موظفين صرفوا نفس المنتج بنفس اللحظة ما تضيع وحدة من الصرفتين
    const { error: mErr } = await supabase.from('stock_movements').insert({
      product_id: productId, org_id: orgId, branch_id: (product as any).branch_id, type: 'out', qty_change: -n,
      note: `صرف بواسطة الموظف: ${(me as any).name}`, staff_id: staffId, staff_name: (me as any).name,
    } as any)
    if (mErr) return NextResponse.json({ error: 'تعذّر تسجيل الصرف' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
