import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// يكتشف الحالات اللي فيها أكثر من منشأة اتسجّلت من نفس عنوان IP —
// مؤشر محتمل (مو مؤكد) على شخص واحد يحاول يتحايل على حدود الباقة
// بإنشاء منشآت متعددة بدل استخدام نظام "إضافة فرع" الحقيقي.
export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'view_consent_logs'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const supabase = sb()

    const { data: logs, error } = await supabase
      .from('consent_logs')
      .select('org_id,profile_id,ip_address,accepted_at')
      .not('ip_address', 'is', null)
      .order('accepted_at', { ascending: false })

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    // جمّع حسب IP، واحتفظ فقط بالـIPs اللي فيها أكثر من منشأة مختلفة
    const byIp: Record<string, { orgIds: Set<string>; entries: any[] }> = {}
    for (const l of logs || []) {
      const ip = (l as any).ip_address
      if (!byIp[ip]) byIp[ip] = { orgIds: new Set(), entries: [] }
      byIp[ip].orgIds.add((l as any).org_id)
      byIp[ip].entries.push(l)
    }

    const suspiciousIps = Object.entries(byIp).filter(([, v]) => v.orgIds.size > 1)
    if (suspiciousIps.length === 0) return NextResponse.json({ success: true, groups: [] })

    const allOrgIds = [...new Set(suspiciousIps.flatMap(([, v]) => [...v.orgIds]))]
    const { data: orgsData } = await supabase
      .from('organizations')
      .select('id,name,plan,created_at')
      .in('id', allOrgIds)

    const orgMap: Record<string, any> = {}
    ;(orgsData || []).forEach((o: any) => { orgMap[o.id] = o })

    const groups = suspiciousIps.map(([ip, v]) => ({
      ip_address: ip,
      organizations: [...v.orgIds].map(id => orgMap[id]).filter(Boolean).sort((a, b) => a.created_at.localeCompare(b.created_at)),
      first_seen: v.entries.reduce((min: string, e: any) => e.accepted_at < min ? e.accepted_at : min, v.entries[0].accepted_at),
      last_seen: v.entries.reduce((max: string, e: any) => e.accepted_at > max ? e.accepted_at : max, v.entries[0].accepted_at),
    })).sort((a, b) => b.organizations.length - a.organizations.length)

    return NextResponse.json({ success: true, groups })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
