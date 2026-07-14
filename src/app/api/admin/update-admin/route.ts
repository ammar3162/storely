import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
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

    const { admin_id, permissions, is_active, full_name, email, new_password } = await req.json()
    if (!admin_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const db = sb()

    // حماية: ما يقدر يعدّل على مشرف super_admin (بما فيهم نفسه) عبر هذا المسار — يمنع تصعيد صلاحيات أو قفل النفس بالخطأ
    const { data: target } = await db.from('admin_users').select('role').eq('id', admin_id).maybeSingle()
    if (target?.role === 'super_admin') {
      return NextResponse.json({ error: 'لا يمكن تعديل حساب المشرف الكامل من هنا' }, { status: 403 })
    }

    const updates: any = {}
    if (permissions !== undefined) updates.permissions = permissions
    if (is_active !== undefined) updates.is_active = is_active
    if (full_name) updates.full_name = String(full_name).trim()
    if (email) updates.email = String(email).trim().toLowerCase()
    if (new_password) {
      if (new_password.length < 8) return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 })
      updates.password_hash = await bcrypt.hash(new_password, 10)
    }

    const { error } = await (db as any).from('admin_users').update(updates).eq('id', admin_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const actionType = new_password ? 'reset_admin_password' : (is_active === false ? 'deactivate_admin' : 'update_admin')
    await logAdminAction(caller, actionType, null, null, { admin_id, updated_fields: Object.keys(updates) })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
