import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'أدخل الإيميل وكلمة المرور' }, { status: 400 })
    }

    const db = sb()
    const { data: admin } = await db
      .from('admin_users')
      .select('id,email,password_hash,full_name,role,is_active,permissions')
      .eq('email', String(email).trim().toLowerCase())
      .maybeSingle()

    if (!admin || !admin.is_active) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, (admin as any).password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 ساعة

    await (db as any).from('admin_sessions').insert({
      token, admin_id: admin.id, expires_at: expiresAt,
    })

    await (db as any).from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id)

    return NextResponse.json({
      success: true,
      token,
      admin: { id: admin.id, email: admin.email, full_name: admin.full_name, role: admin.role, permissions: (admin as any).permissions || {} },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
