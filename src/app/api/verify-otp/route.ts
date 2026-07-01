import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { phone, countryCode, otp } = await req.json()
    const fullPhone = (countryCode || '+966') + phone.trim().replace(/^0+/, '')

    const { data: session } = await sb()
      .from('whatsapp_sessions')
      .select('otp_code, otp_expires_at')
      .eq('phone', fullPhone)
      .single()

    if (!session) return NextResponse.json({ error: 'أرسل رمز التحقق أولاً' }, { status: 400 })
    if (new Date(session.otp_expires_at) < new Date()) return NextResponse.json({ error: 'انتهت صلاحية الرمز — أرسل رمزاً جديداً' }, { status: 400 })
    if (session.otp_code !== otp) return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 400 })

    // امسح الـ OTP بعد التحقق
    await sb().from('whatsapp_sessions').update({ otp_code: null, state: 'verified' }).eq('phone', fullPhone)

    return NextResponse.json({ success: true, verified: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
