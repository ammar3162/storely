import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { subscription, org_id } = await req.json()
    if (!subscription || !org_id) return NextResponse.json({ error: 'missing data' }, { status: 400 })
    
    // تحقق لو موجود مسبقاً
    const { data: existing } = await sb().from('push_subscriptions')
      .select('id').eq('org_id', org_id)
      .eq('subscription->>endpoint', subscription.endpoint)
      .single()
    
    if (!existing) {
      await sb().from('push_subscriptions').insert({ org_id, subscription })
    }
    
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
