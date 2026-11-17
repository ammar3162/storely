import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { subscription, org_id } = await req.json()
    if (!subscription || !org_id) return NextResponse.json({ error: 'missing data' }, { status: 400 })
    // لازم المستخدم يكون من المنشأة — كان أي أحد يقدر يشترك بإشعارات أي منشأة ويستقبلها
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    
    // الجهاز ينربط بصاحبه وفرعه: مدير الفرع يوصله إشعارات فرعه والعامة فقط (نفس قاعدة الجرس)،
    // والمالك يوصله كل شي. لو نفس الجهاز سجّل فيه مستخدم ثاني نحدّث الربط.
    const owner = { profile_id: (access as any).userId || null, branch_id: access.role === 'manager' ? (access as any).branchId || null : null }
    const { data: existing } = await sb().from('push_subscriptions')
      .select('id').eq('org_id', org_id)
      .eq('subscription->>endpoint', subscription.endpoint)
      .maybeSingle()

    if (existing) await sb().from('push_subscriptions').update(owner as any).eq('id', (existing as any).id)
    else await sb().from('push_subscriptions').insert({ org_id, subscription, ...owner } as any)
    
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
