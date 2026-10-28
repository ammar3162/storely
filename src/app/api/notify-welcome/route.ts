import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPhone as normalizePhone } from '@/lib/whatsapp'

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
    if (!phone) return NextResponse.json({ success: false })

    // رابط مفتوح (يُستدعى بعد التسجيل مباشرة) — فما نثق بأي نص من الطلب:
    // الاسم من قاعدة البيانات، وبس لمالك سجّل خلال آخر 15 دقيقة. غير كذا أي أحد يقدر يرسل نص من رقمنا لعملائنا
    const cleanPhone = normalizePhone(phone)
    const { data: profile } = await sb().from('profiles').select('whatsapp_consent,role,created_at,organizations(name)').eq('phone', cleanPhone).eq('role', 'owner').maybeSingle()
    if ((profile as any)?.whatsapp_consent !== true) return NextResponse.json({ success: false, message: 'لا يوجد موافقة واتساب' })
    if (!(profile as any)?.created_at || Date.now() - new Date((profile as any).created_at).getTime() > 15 * 60_000) return NextResponse.json({ success: false })
    const name = String((profile as any)?.organizations?.name || '').slice(0, 80)

    const msg = `🟢 *Storely*

مرحباً ${name} 👋

تم إنشاء حسابك بنجاح
لديك *14 يوم تجربة مجانية*

ابدأ الآن بإضافة مخزونك`

    const res = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'X-Session-Id': process.env.WASENDER_SESSION_ID!,
      },
      body: JSON.stringify({ to: formatPhone(phone), text: msg }),
    })

    return NextResponse.json({ success: res.ok })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message })
  }
}
