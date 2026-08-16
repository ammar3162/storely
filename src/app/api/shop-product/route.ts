import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, product_id, show_on_shop, public_price, public_description, public_image_url } = await req.json()
    if (!org_id || !product_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: product } = await supabase.from('products').select('org_id').eq('id', product_id).maybeSingle()
    if (!product || (product as any).org_id !== org_id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

    const { error } = await supabase.from('products').update({
      show_on_shop: !!show_on_shop,
      public_price: public_price !== undefined && public_price !== '' ? Number(public_price) : null,
      public_description: public_description?.trim() || null,
      public_image_url: public_image_url || null,
    } as any).eq('id', product_id)

    if (error) return NextResponse.json({ error: 'فشل الحفظ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
