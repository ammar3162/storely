import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidAdminKey } from '@/lib/adminAuth'

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await isValidAdminKey(adminKey))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await db
    .from('admin_users')
    .select('id,email,full_name,role,is_active,permissions,created_at,last_login_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ admins: data })
}
