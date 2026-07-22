import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'view_consent_logs'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').trim()

    const supabase = sb()

    let orgIds: string[] | null = null
    let profileIds: string[] | null = null

    if (search) {
      // ابحث بالتوازي عن مؤسسات مطابقة بالاسم، وملفات شخصية مطابقة بالجوال أو الاسم
      const [{ data: orgs }, { data: profiles }] = await Promise.all([
        supabase.from('organizations').select('id').ilike('name', `%${search}%`),
        supabase.from('profiles').select('id').or(`phone.ilike.%${search}%,full_name.ilike.%${search}%`),
      ])
      orgIds = (orgs || []).map((o: any) => o.id)
      profileIds = (profiles || []).map((p: any) => p.id)

      if (orgIds.length === 0 && profileIds.length === 0) {
        return NextResponse.json({ success: true, logs: [] })
      }
    }

    let query = (supabase as any)
      .from('consent_logs')
      .select('id,profile_id,org_id,terms_version,accepted_at,ip_address,user_agent,created_at')
      .order('accepted_at', { ascending: false })
      .limit(200)

    if (search) {
      const orFilters: string[] = []
      if (orgIds && orgIds.length > 0) orFilters.push(`org_id.in.(${orgIds.join(',')})`)
      if (profileIds && profileIds.length > 0) orFilters.push(`profile_id.in.(${profileIds.join(',')})`)
      query = query.or(orFilters.join(','))
    }

    const { data: logs, error } = await query
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    if (!logs || logs.length === 0) return NextResponse.json({ success: true, logs: [] })

    // جيب أسماء المؤسسات وبيانات الملفات الشخصية المرتبطة دفعة وحدة (بدل استعلام لكل سجل)
    const allOrgIds = [...new Set(logs.map((l: any) => l.org_id))]
    const allProfileIds = [...new Set(logs.map((l: any) => l.profile_id))]

    const [{ data: orgsData }, { data: profilesData }] = await Promise.all([
      supabase.from('organizations').select('id,name').in('id', allOrgIds),
      supabase.from('profiles').select('id,full_name,phone').in('id', allProfileIds),
    ])

    const orgMap: Record<string, string> = {}
    ;(orgsData || []).forEach((o: any) => { orgMap[o.id] = o.name })
    const profileMap: Record<string, { full_name: string; phone: string }> = {}
    ;(profilesData || []).forEach((p: any) => { profileMap[p.id] = { full_name: p.full_name, phone: p.phone } })

    const enriched = logs.map((l: any) => ({
      ...l,
      org_name: orgMap[l.org_id] || '—',
      profile_name: profileMap[l.profile_id]?.full_name || '—',
      profile_phone: profileMap[l.profile_id]?.phone || '—',
    }))

    return NextResponse.json({ success: true, logs: enriched })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
