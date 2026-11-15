import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { staffFeatureError } from '@/lib/featureRoutes'
import { isWholePositive, WHOLE_QTY_ERROR } from '@/lib/qtyRules'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.reason==='subscription_expired'?403:401 })
    // «ابنِ باقتك»: الميزة لازم تكون لفرع الموظف
    const featureLocked = await staffFeatureError(auth.data as any, 'inventory')
    if (featureLocked) return NextResponse.json({ error: featureLocked }, { status: 403 })
    const { org_id: orgId, staff_id: staffId } = auth.data!

    const { productId, qty, wasteReason, note } = await req.json()
    if (!productId || !wasteReason) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    if (!isWholePositive(qty)) return NextResponse.json({ error: WHOLE_QTY_ERROR }, { status: 400 })
    const n = Number(qty)

    const supabase = sb()
    // الاسم والفرع من قاعدة البيانات — مو من الطلب
    const { data: me } = await supabase.from('staff_members').select('name,branch_id').eq('id', staffId).eq('org_id', orgId).maybeSingle()
    if (!me) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    const { data: product } = await supabase.from('products').select('id,qty,branch_id').eq('id', productId).eq('org_id', orgId).maybeSingle()
    if (!product) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 })
    if ((me as any).branch_id && (product as any).branch_id && (product as any).branch_id !== (me as any).branch_id) return NextResponse.json({ error: 'المنتج من فرع آخر' }, { status: 403 })
    if (Number((product as any).qty) < n) return NextResponse.json({ error: 'الكمية تتجاوز المتاح' }, { status: 400 })

    const cleanNote = typeof note === 'string' ? note.trim().slice(0, 300) : ''
    const fullNote = `هدر بواسطة الموظف: ${(me as any).name}${cleanNote ? ' — ' + cleanNote : ''}`

    // الكمية تنخصم من الحركة نفسها (trigger يجمع الحركات ويقفل الصنف) — ما نكتب qty مباشرة
    const { error: mErr } = await supabase.from('stock_movements').insert({
      product_id: productId, org_id: orgId, branch_id: (product as any).branch_id,
      type: 'waste', qty_change: -n,
      waste_reason: String(wasteReason).slice(0, 100), note: fullNote,
      staff_id: staffId, staff_name: (me as any).name,
    } as any)
    if (mErr) return NextResponse.json({ error: 'تعذّر تسجيل الهدر — تأكد من الكمية المتاحة' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
