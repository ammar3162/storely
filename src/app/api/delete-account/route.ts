import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, user_id } = await req.json()
    if (!org_id || !user_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const supabase = sb()

    // حذف كل البيانات المرتبطة بالمؤسسة
    await supabase.from('stock_movements').delete().in('product_id',
      (await supabase.from('products').select('id').eq('org_id', org_id)).data?.map((p:any) => p.id) || []
    )
    await supabase.from('products').delete().eq('org_id', org_id)
    await supabase.from('purchases').delete().eq('org_id', org_id)
    await supabase.from('notifications').delete().eq('org_id', org_id)
    await supabase.from('whatsapp_logs').delete().eq('org_id', org_id)
    await (supabase as any).from('staff_members').delete().eq('org_id', org_id)
    await supabase.from('branches').delete().eq('org_id', org_id)
    await supabase.from('profiles').delete().eq('org_id', org_id)
    await supabase.from('organizations').delete().eq('id', org_id)

    // حذف الحساب من Supabase Auth
    await supabase.auth.admin.deleteUser(user_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
