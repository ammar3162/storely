import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import crypto from 'crypto'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// الخطوة الأخيرة بتسجيل الدخول — يتأكد من الرمز المؤقت ورمز التطبيق، وبعدين يصدر جلسة حقيقية
export async function POST(req: Request) {
  try {
    const { pendingToken, code } = await req.json()
    if (!pendingToken || !code) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const db = sb()
    const { data: pending } = await (db as any).from('admin_2fa_pending').select('admin_id,expires_at').eq('token', pendingToken).maybeSingle()
    if (!pending) return NextResponse.json({ error: 'انتهت صلاحية الجلسة المؤقتة، حاول تسجل دخول من جديد' }, { status: 401 })
    if (new Date(pending.expires_at) < new Date()) {
      await (db as any).from('admin_2fa_pending').delete().eq('token', pendingToken)
      return NextResponse.json({ error: 'انتهت صلاحية الجلسة المؤقتة، حاول تسجل دخول من جديد' }, { status: 401 })
    }

    const { data: admin } = await db.from('admin_users')
      .select('id,email,full_name,role,is_active,permissions,totp_secret')
      .eq('id', pending.admin_id).maybeSingle()
    if (!admin || !(admin as any).is_active || !(admin as any).totp_secret) {
      return NextResponse.json({ error: 'حساب غير صالح' }, { status: 401 })
    }

    const valid = authenticator.verify({ token: String(code).trim(), secret: (admin as any).totp_secret })
    if (!valid) return NextResponse.json({ error: 'الرمز غير صحيح' }, { status: 401 })

    await (db as any).from('admin_2fa_pending').delete().eq('token', pendingToken)

    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await (db as any).from('admin_sessions').insert({ token: sessionToken, admin_id: admin.id, expires_at: expiresAt })
    await (db as any).from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id)

    return NextResponse.json({
      success: true,
      token: sessionToken,
      admin: { id: admin.id, email: (admin as any).email, full_name: (admin as any).full_name, role: (admin as any).role, permissions: (admin as any).permissions || {}, totp_enabled: true },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
