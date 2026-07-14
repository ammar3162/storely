import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminSession, logAdminAction } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    const caller = await verifyAdminSession(adminKey)
    if (!caller || caller.role !== 'super_admin') {
      return NextResponse.json({ error: 'صلاحية غير كافية' }, { status: 403 })
    }

    const { admin_id, permissions, is_active } = await req.json()
    if (!admin_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const updates: any = {}
    if (permissions !== undefined) updates.permissions = permissions
    if (is_active !== undefined) updates.is_active = is_active

    const db = sb()
    const { error } = await (db as any).from('admin_users').update(updates).eq('id', admin_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAdminAction(caller, is_active === false ? 'deactivate_admin' : 'update_admin_permissions', null, null, { admin_id, updates })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
