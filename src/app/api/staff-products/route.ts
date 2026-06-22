import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { orgId, branchId } = await req.json()
    if (!orgId) return NextResponse.json({ products: [] })
    let q = sb().from('products').select('id,name,unit,qty,category').eq('org_id', orgId).eq('is_active', true)
    if (branchId) q = q.eq('branch_id', branchId)
    const { data } = await q.order('name')
    return NextResponse.json({ products: data || [] })
  } catch {
    return NextResponse.json({ products: [] })
  }
}
