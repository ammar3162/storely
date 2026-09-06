import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email || !String(email).includes('@')) {
      return NextResponse.json({ error: 'أدخل بريد إلكتروني صحيح' }, { status: 400 })
    }

    const db = sb()

    const genericResponse = NextResponse.json({ success: true, message: 'إذا كان البريد مسجّل، وصلتك رسالة فيها رابط الاستعادة' })

    const { data: usersList } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUser = usersList?.users?.find(u => u.email?.toLowerCase() === String(email).toLowerCase())
    if (!authUser) return genericResponse

    const { data: profile } = await db.from('profiles').select('full_name').eq('id', authUser.id).maybeSingle()

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    await (db as any).from('password_reset_tokens').insert({
      profile_id: authUser.id,
      token,
      expires_at: expiresAt,
    })

    const resetLink = `https://storely.dev/reset-password-wa?token=${token}`
    const html = `
      <div style="font-family:sans-serif;direction:rtl;text-align:right;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#029FA2">🔐 استعادة كلمة المرور — Storely</h2>
        <p>مرحباً ${(profile as any)?.full_name || ''}،</p>
        <p>اضغط الزر التالي لتعيين كلمة مرور جديدة:</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#029FA2;color:white;border-radius:10px;text-decoration:none;font-weight:700;margin:16px 0">تعيين كلمة مرور جديدة</a>
        <p style="color:#64748b;font-size:13px">⏱️ الرابط صالح لمدة ساعة واحدة فقط.</p>
        <p style="color:#94a3b8;font-size:12px">إذا لم تطلب هذا، تجاهل الرسالة.</p>
      </div>
    `

    await sendEmail({ to: email, subject: 'استعادة كلمة المرور — Storely', html })

    return genericResponse
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
