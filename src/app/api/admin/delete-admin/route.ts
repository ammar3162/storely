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

    const { admin_id } = await req.json()
    if (!admin_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const db = sb()
    const { data: target } = await db.from('admin_users').select('role,email,full_name').eq('id', admin_id).maybeSingle()

    // حماية: مستحيل حذف حساب super_admin (بما فيهم النفس) — يحمي من قفل النظام بدون أي مشرف كامل
    if (target?.role === 'super_admin') {
      return NextResponse.json({ error: 'لا يمكن حذف حساب المشرف الكامل' }, { status: 403 })
    }

    const { error } = await db.from('admin_users').delete().eq('id', admin_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAdminAction(caller, 'delete_admin', null, null, { deleted_email: target?.email, deleted_name: target?.full_name })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
