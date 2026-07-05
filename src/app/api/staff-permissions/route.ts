import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { staff_id } = await req.json()
    if (!staff_id) return NextResponse.json({ error: 'staff_id required' }, { status: 400 })

    const { data } = await sb().from('staff_members')
      .select('permissions,is_active')
      .eq('id', staff_id)
      .maybeSingle()

    if (!data || (data as any).is_active === false) {
      return NextResponse.json({ deleted: true })
    }

    return NextResponse.json({ 
      permissions: (data as any)?.permissions || {dispense:true,inventory:false,purchases:false,reports:false}
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
