import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('org_id,organizations(name)').eq('id', userId).maybeSingle()
  const orgId = (profile as any)?.org_id
  const orgName = (profile as any)?.organizations?.name || null

  const { error } = orgId
    ? await supabase.from('profiles').update({ status: 'suspended' }).eq('org_id', orgId)
    : await supabase.from('profiles').update({ status: 'suspended' }).eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminAction(admin, 'suspend_user', orgId || null, orgName, { userId })

  if (orgId) {
    try {
      await (supabase as any).from('subscription_events').insert({ org_id: orgId, event_type: 'cancelled', plan: null, amount: 0 })
    } catch {}
  }

  return NextResponse.json({ success: true })
}
