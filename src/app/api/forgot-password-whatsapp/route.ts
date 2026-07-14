import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '')
  if (clean.startsWith('+')) return clean.slice(1)
  if (clean.startsWith('00')) return clean.slice(2)
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return clean
}

export async function POST(req: Request) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'أدخل رقم الجوال' }, { status: 400 })

    const db = sb()
    const digitsOnly = String(phone).replace(/\D/g, '')
    const localDigits = digitsOnly.replace(/^0+/, '')

    if (localDigits.length < 7) {
      return NextResponse.json({ error: 'رقم الجوال غير صحيح' }, { status: 400 })
    }

    const { data: profile } = await db
      .from('profiles')
      .select('id,full_name,phone')
      .ilike('phone', '%' + localDigits)
      .maybeSingle()

    const genericResponse = NextResponse.json({ success: true, message: 'إذا كان الرقم مسجّل، وصلتك رسالة واتساب فيها رابط الاستعادة' })

    if (!profile) return genericResponse

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    await (db as any).from('password_reset_tokens').insert({
      profile_id: profile.id,
      token,
      expires_at: expiresAt,
    })

    const resetLink = `https://storely.dev/reset-password-wa?token=${token}`
    const msg = `🔐 *Storely — استعادة كلمة المرور*\n\nمرحباً ${profile.full_name || ''}،\n\nاضغط الرابط التالي لتعيين كلمة مرور جديدة:\n${resetLink}\n\n⏱️ الرابط صالح لمدة ساعة واحدة فقط.\n\nإذا لم تطلب هذا، تجاهل الرسالة.`

    await sendWhatsAppMessage(formatPhone(profile.phone), msg)

    return genericResponse
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
