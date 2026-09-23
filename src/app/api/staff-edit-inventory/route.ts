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

    const { productId, newQty, staffName } = await req.json()
    if (!productId || newQty === undefined || newQty === null || Number(newQty) < 0) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const supabase = sb()

    // تحقق إن الموظف عنده صلاحية "المخزون" فعلاً — مو بس صلاحية الصرف
    const { data: staffRow } = await supabase.from('staff_members').select('permissions').eq('id', staffId).single()
    if (!(staffRow as any)?.permissions?.inventory) {
      return NextResponse.json({ error: 'ما عندك صلاحية تعديل المخزون' }, { status: 403 })
    }

    const { data: product } = await supabase.from('products').select('id,qty,name,unit,org_id').eq('id', productId).single()
    if (!product) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 })
    if ((product as any).org_id !== orgId) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

    const qtyNum = Number(newQty)
    const diff = qtyNum - Number(product.qty)

    // الكمية تتعدّل عبر حركة مخزون فقط — الـ trigger "after_stock_movement" يحسب qty من مجموع الحركات.
    // (كان يكتب qty مباشرة ثم يضيف الحركة بدون فحص خطأ: لو فشلت الحركة، تختلف الكمية عن سجل الحركات)
    if (diff !== 0) {
      const { error: moveErr } = await supabase.from('stock_movements').insert({
        product_id: productId,
        org_id: orgId,
        type: diff > 0 ? 'in' : 'out',
        qty_change: diff,
        note: `تعديل يدوي بواسطة الموظف: ${staffName || ''}`,
        staff_id: staffId || null,
      } as any)
      if (moveErr) return NextResponse.json({ error: moveErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
