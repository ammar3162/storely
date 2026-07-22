import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'view_audit_log'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').trim()

    let query = sb().from('admin_audit_log')
      .select('id,admin_name,action,target_org_id,target_org_name,details,created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (search) {
      query = query.or(`admin_name.ilike.%${search}%,action.ilike.%${search}%,target_org_name.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, logs: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
