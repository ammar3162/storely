import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// أرقام صفحة المراقبة — كانت تُقرأ من المتصفح مباشرة (كمستخدم مجهول)، صارت من هنا بصلاحية الخادم
export async function GET(req: Request) {
  if (!(await requirePermission(req.headers.get('x-admin-key'), 'super_admin_only'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const db = sb()
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    const [orgs, profiles, products, lastNotified, lastBackup, movements, purchases] = await Promise.all([
      db.from('organizations').select('id', { count: 'exact', head: true }),
      db.from('profiles').select('status'),
      db.from('products').select('qty,reorder_point').eq('is_active', true),
      db.from('organizations').select('last_notified_at').not('last_notified_at', 'is', null).order('last_notified_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('organizations').select('last_backup_at').not('last_backup_at', 'is', null).order('last_backup_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('stock_movements').select('id', { count: 'exact', head: true }).gte('created_at', yesterday),
      db.from('purchases').select('id', { count: 'exact', head: true }).gte('created_at', yesterday),
    ])

    const statuses = (profiles.data || []).map((p: any) => p.status)
    const prods = products.data || []
    return NextResponse.json({
      success: true,
      db_ok: !orgs.error,
      orgs_count: orgs.count || 0,
      active_users: statuses.filter(s => s === 'active').length,
      pending_users: statuses.filter(s => s === 'pending').length,
      products_total: prods.length,
      products_low: prods.filter((p: any) => p.qty <= p.reorder_point).length,
      last_notified_at: (lastNotified.data as any)?.last_notified_at || null,
      last_backup_at: (lastBackup.data as any)?.last_backup_at || null,
      movements_24h: movements.count || 0,
      purchases_24h: purchases.count || 0,
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
