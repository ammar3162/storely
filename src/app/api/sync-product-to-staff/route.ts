import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, product_id } = await req.json()
    if (!org_id || !product_id) return NextResponse.json({ success: false })

    const supabase = sb()
    const { data: staffList } = await supabase
      .from('staff_members')
      .select('id,assigned_products')
      .eq('org_id', org_id)

    for (const s of (staffList || [])) {
      const assigned = (s as any).assigned_products
      // نضيف بس للموظفين المقيّدين (عندهم قائمة مو فاضية) — اللي على "كل المنتجات" ما يحتاجون تحديث
      if (Array.isArray(assigned) && assigned.length > 0 && !assigned.includes(product_id)) {
        await supabase.from('staff_members')
          .update({ assigned_products: [...assigned, product_id] })
          .eq('id', (s as any).id)
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false })
  }
}
