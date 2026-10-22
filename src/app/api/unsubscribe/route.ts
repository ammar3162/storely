import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUnsubToken } from '@/lib/marketing'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// إلغاء الاشتراك بالإعلانات — من صفحة /unsubscribe أو مباشرة من زر "إلغاء الاشتراك" في Gmail/Outlook (One-Click)
// الرابط موقّع (HMAC) فما أحد يقدر يلغي اشتراك إيميل غيره
export async function POST(req: Request) {
  const url = new URL(req.url)
  let email = url.searchParams.get('e') || ''
  let token = url.searchParams.get('t') || ''
  if (!email && (req.headers.get('content-type') || '').includes('application/json')) {
    const b = await req.json().catch(() => ({}))
    email = String(b.e || ''); token = String(b.t || '')
  }
  email = email.trim().toLowerCase()
  if (!verifyUnsubToken(email, token)) return NextResponse.json({ error: 'الرابط غير صالح' }, { status: 400 })
  const { error } = await sb().from('email_optouts').upsert({ email } as any, { onConflict: 'email', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  return NextResponse.json({ success: true })
}
