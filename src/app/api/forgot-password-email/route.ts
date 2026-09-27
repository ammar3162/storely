import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'
import { resetPasswordEmail } from '@/lib/emailTemplates'

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
    const mail = resetPasswordEmail({ name: (profile as any)?.full_name || '', link: resetLink })

    await sendEmail({ to: email, subject: mail.subject, html: mail.html })

    return genericResponse
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
