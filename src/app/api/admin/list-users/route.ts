import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const correct = process.env.ADMIN_PASSWORD || 'storely@2026'
  if (!(await requirePermission(adminKey, 'manage_users'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,phone,role,status,created_at,org_id,subscription_type,subscription_ends_at,branch_count,organizations(name,max_branches)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: data })
}
