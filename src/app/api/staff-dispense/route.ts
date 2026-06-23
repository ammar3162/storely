import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { productId, qty, staffName, orgId } = await req.json()
    if (!productId || !qty || qty <= 0) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const supabase = sb()

    const { data: product } = await supabase.from('products').select('id,qty,name,unit').eq('id', productId).single()
    if (!product) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 })
    if (product.qty < qty) return NextResponse.json({ error: 'الكمية تتجاوز المتاح' }, { status: 400 })

    const { error: mErr } = await supabase.from('stock_movements').insert({
      product_id: productId,
      type: 'out',
      qty_change: -qty,
      note: `صرف بواسطة الموظف: ${staffName}`,
    })
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

    await supabase.from('products').update({ qty: product.qty - qty }).eq('id', productId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
