import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// أرقام الصفحة الرئيسية للوحة الأدمن — كانت تُقرأ من المتصفح كمستخدم مجهول (فغالباً ترجع أصفار)
export async function GET(req: Request) {
  if (!(await requirePermission(req.headers.get('x-admin-key'), 'view_metrics'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const db = sb()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const [total, month, trial, paid, expiring] = await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true }),
      db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_type', 'trial'),
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_type', 'paid'),
      db.from('profiles').select('full_name,subscription_ends_at,phone')
        .lte('subscription_ends_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .gte('subscription_ends_at', now.toISOString()).order('subscription_ends_at').limit(5),
    ])
    return NextResponse.json({
      success: true,
      totalUsers: total.count || 0, newThisMonth: month.count || 0,
      trialUsers: trial.count || 0, paidUsers: paid.count || 0,
      expiringSoon: expiring.data || [],
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
