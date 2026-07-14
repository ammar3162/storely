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

    // بس super_admin يقدر يضيف مشرفين جدد (كلمة المرور القديمة الثابتة ما تكفي هنا لأننا نحتاج نعرف هوية المُنشئ)
    if (!caller || caller.role !== 'super_admin') {
      return NextResponse.json({ error: 'صلاحية غير كافية — بس المشرف الكامل يقدر يضيف مشرفين' }, { status: 403 })
    }

    const { email, password, full_name, permissions } = await req.json()
    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 })
    }

    const db = sb()
    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await db.from('admin_users').insert({
      email: String(email).trim().toLowerCase(),
      password_hash,
      full_name: String(full_name).trim(),
      role: 'admin',
      is_active: true,
      permissions: permissions || {},
    }).select('id,email,full_name,role,permissions').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAdminAction(caller, 'create_admin', null, null, { new_admin_email: email, new_admin_name: full_name })

    return NextResponse.json({ success: true, admin: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
