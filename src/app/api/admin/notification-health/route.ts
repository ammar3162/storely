import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'view_health'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const supabase = sb()
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: logs, error } = await (supabase as any)
      .from('notification_logs')
      .select('org_id,status,phone,created_at')
      .gte('created_at', since7)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const orgIds = [...new Set((logs || []).map((l: any) => l.org_id))]
    const { data: orgs } = await supabase.from('organizations').select('id,name').in('id', orgIds.length ? orgIds : ['00000000-0000-0000-0000-000000000000'])
    const orgMap: Record<string, string> = {}
    ;(orgs || []).forEach((o: any) => { orgMap[o.id] = o.name })

    const grouped: Record<string, { org_id: string; org_name: string; phone: string; sent: number; failed: number; last_at: string }> = {}
    for (const l of (logs || [])) {
      const key = l.org_id
      if (!grouped[key]) grouped[key] = { org_id: l.org_id, org_name: orgMap[l.org_id] || '—', phone: l.phone, sent: 0, failed: 0, last_at: l.created_at }
      if (l.status === 'sent') grouped[key].sent++
      else grouped[key].failed++
    }

    const result = Object.values(grouped).sort((a, b) => b.failed - a.failed)

    return NextResponse.json({ success: true, orgs: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
