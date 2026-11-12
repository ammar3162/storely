import { staffFeatureError } from '@/lib/featureRoutes'
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
    const { org_id: orgId } = auth.data!
    { const locked = await staffFeatureError(auth.data as any, 'purchases'); if (locked) return NextResponse.json({ error: locked, suppliers: [] }, { status: 403 }) }

    const supabase = sb()
    const { data } = await supabase.from('suppliers').select('id,name,vat_number').eq('org_id', orgId).eq('is_active', true).order('name')

    return NextResponse.json({ success: true, suppliers: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
