import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get('cookie')||''
    const adminToken = cookie.split(';').find((c:string)=>c.trim().startsWith('storely_admin_token='))?.split('=')[1]
    const correctToken = process.env.ADMIN_PASSWORD || '900@'
    if (adminToken !== correctToken) return NextResponse.json({ success:false, message:'غير مصرح' }, { status:401 })
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { userId, orgId } = await req.json()
    if (!userId) return NextResponse.json({ success:false, message:'userId مطلوب' })
    if (orgId) {
      const{data:prods}=await supabase.from('products').select('id').eq('org_id',orgId)
      const pids=(prods||[]).map((p:any)=>p.id)
      if(pids.length>0) await supabase.from('stock_movements').delete().in('product_id',pids)
      await Promise.all([
        supabase.from('products').delete().eq('org_id',orgId),
        supabase.from('notifications').delete().eq('org_id',orgId),
        supabase.from('purchases').delete().eq('org_id',orgId),
        supabase.from('branches').delete().eq('org_id',orgId),
      ])
      await supabase.from('profiles').delete().eq('org_id',orgId)
      await supabase.from('organizations').delete().eq('id',orgId)
    } else {
      await supabase.from('profiles').delete().eq('id',userId)
    }
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ success:true })
  } catch(err:any) {
    return NextResponse.json({ success:false, error:err.message }, {status:500})
  }
}
