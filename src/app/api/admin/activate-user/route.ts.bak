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

  const { userId, type, ends } = await req.json()

  const { data: profile } = await supabase.from('profiles').select('org_id,full_name,organizations(name,max_branches)').eq('id', userId).maybeSingle()

  const { error } = await supabase
    .from('profiles')
    .update({ status: 'active', subscription_type: type, subscription_ends_at: ends })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminAction(admin, 'activate_user', (profile as any)?.org_id, (profile as any)?.organizations?.name, { userId, type, ends })

  // سجل حدث اشتراك — يُستخدم لاحقاً لحساب MRR وChurn بدقة عبر الزمن
  try {
    const orgId = (profile as any)?.org_id
    const maxBranches = (profile as any)?.organizations?.max_branches || 1
    const planName = maxBranches === 1 ? 'basic' : maxBranches <= 3 ? 'pro' : 'advanced'
    const amount = maxBranches === 1 ? 149 : maxBranches <= 3 ? 249 : 399
    if (orgId) {
      await (supabase as any).from('subscription_events').insert({
        org_id: orgId,
        event_type: type === 'paid' ? 'activated' : 'trial_started',
        plan: planName,
        amount: type === 'paid' ? amount : 0,
      })
    }
  } catch {}

  return NextResponse.json({ success: true })
}
