import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { clientIp, lockedUntil, lockedMessage, recordFailure, recordSuccess, PER_IP_MAX } from '@/lib/loginThrottle'

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
    // حماية من التخمين — نفس عدّاد قاعدة البيانات حق دخول الموظفين
    const accKey = `admin:${String(email).trim().toLowerCase().slice(0, 200)}`
    const ipKey = `ip:${clientIp(req)}`
    const lock = await lockedUntil(db, [accKey, ipKey])
    if (lock) return NextResponse.json({ error: lockedMessage(lock) }, { status: 429 })
    const fail = async () => {
      const [r] = await Promise.all([recordFailure(db, accKey), recordFailure(db, ipKey, PER_IP_MAX)])
      return r.lockedUntil
        ? NextResponse.json({ error: lockedMessage(r.lockedUntil) }, { status: 429 })
        : NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    const { data: admin } = await db
      .from('admin_users')
      .select('id,email,password_hash,full_name,role,is_active,permissions,totp_enabled')
      .eq('email', String(email).trim().toLowerCase())
      .maybeSingle()

    if (!admin || !admin.is_active) return fail()

    const valid = await bcrypt.compare(password, (admin as any).password_hash)
    if (!valid) return fail()
    await recordSuccess(db, accKey)

    if ((admin as any).totp_enabled) {
      const pendingToken = crypto.randomBytes(24).toString('hex')
      const pendingExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      await (db as any).from('admin_2fa_pending').insert({ token: pendingToken, admin_id: admin.id, expires_at: pendingExpires })
      return NextResponse.json({ success: true, needs2FA: true, pendingToken })
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
      admin: { id: admin.id, email: admin.email, full_name: admin.full_name, role: admin.role, permissions: (admin as any).permissions || {}, totp_enabled: (admin as any).totp_enabled || false },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
