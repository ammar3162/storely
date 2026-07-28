import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sanitizeShortText } from '@/lib/sanitize'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    let { firstName, lastName, phone, email, businessName, branchCount } = await req.json()

    firstName = sanitizeShortText(firstName, 60)
    lastName = sanitizeShortText(lastName, 60)
    phone = sanitizeShortText(phone, 20)
    email = sanitizeShortText(email, 120)
    businessName = sanitizeShortText(businessName, 150)
    branchCount = sanitizeShortText(branchCount || '', 20)

    if (!firstName || !lastName || !phone || !email || !businessName) {
      return NextResponse.json({ error: 'كل الحقول المطلوبة لازم تُعبّى' }, { status: 400 })
    }

    const { error } = await sb().from('demo_requests').insert({
      first_name: firstName, last_name: lastName, phone, email,
      business_name: businessName, branch_count: branchCount,
    } as any)
    if (error) return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })

    const msg = `🟢 *طلب عرض جديد — Storely*\n\n👤 ${firstName} ${lastName}\n🏢 ${businessName}\n📱 ${phone}\n✉️ ${email}\n🏪 عدد الفروع: ${branchCount || 'غير محدد'}`
    await sendWhatsAppMessage('966594351667', msg)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
