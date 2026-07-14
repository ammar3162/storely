import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// حماية: يشتغل بس لو جدول admin_users فاضي تماماً (أول حساب فقط)
export async function POST(req: Request) {
  try {
    const { email, password, full_name, setupSecret } = await req.json()

    // حماية إضافية: يتطلب كلمة سر إعداد من متغير البيئة (تحمي من إساءة الاستخدام حتى لو الجدول فاضي)
    if (setupSecret !== (process.env.ADMIN_PASSWORD || 'storely@2026')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 })
    }

    const db = sb()
    const { count } = await db.from('admin_users').select('id', { count: 'exact', head: true })
    if ((count || 0) > 0) {
      return NextResponse.json({ error: 'يوجد أدمن مسجّل بالفعل — استخدم صفحة الدخول العادية' }, { status: 403 })
    }

    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await db.from('admin_users').insert({
      email: String(email).trim().toLowerCase(),
      password_hash,
      full_name: String(full_name).trim(),
      role: 'super_admin',
      is_active: true,
    }).select('id,email,full_name').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, admin: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
