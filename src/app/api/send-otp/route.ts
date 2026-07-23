import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function sendWhatsApp(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // إزالة علامة + قبل الإرسال — مطلوبة لواتساب/Wasender (نفس نمط formatPhone المستخدم بباقي المشروع)
    const cleanTo = to.replace(/^\+/, '')
    const res = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'X-Session-Id': process.env.WASENDER_SESSION_ID!
      },
      body: JSON.stringify({ to: cleanTo, text }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('send-otp WhatsApp send failed:', res.status, errBody)
      return { ok: false, error: `فشل الإرسال (${res.status})` }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('send-otp WhatsApp send exception:', err)
    return { ok: false, error: err.message }
  }
}

export async function POST(req: Request) {
  try {
    const { phone, countryCode } = await req.json()
    if (!phone) return NextResponse.json({ error: 'رقم الجوال مطلوب' }, { status: 400 })

    const fullPhone = (countryCode || '+966') + phone.trim().replace(/^0+/, '')
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 دقائق

    // خزّن الـ OTP
    await sb().from('whatsapp_sessions').upsert({
      phone: fullPhone,
      state: 'otp',
      otp_code: otp,
      otp_expires_at: expiresAt
    }, { onConflict: 'phone' })

    // أرسل عبر واتساب
    const sendResult = await sendWhatsApp(fullPhone, `🔐 *رمز التحقق الخاص بك في Storely:*\n\n*${otp}*\n\nصالح لمدة 5 دقائق فقط. لا تشاركه مع أحد.`)
    if (!sendResult.ok) {
      return NextResponse.json({ error: 'تعذر إرسال رمز التحقق — تأكد من رقم الجوال وحاول مرة أخرى' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
