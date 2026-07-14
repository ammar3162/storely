import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { company_name, contact_name, phone, email, business_type, description, website, offer } = body

    if(!company_name||!contact_name||!phone) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // حماية أمنية: نرفض أي قيمة لا تبدأ بـ http:// أو https:// (يمنع حقن روابط javascript: الخبيثة)
    let safeWebsite: string | null = null
    if (website) {
      const trimmed = String(website).trim()
      if (/^https?:\/\//i.test(trimmed)) safeWebsite = trimmed
      else return NextResponse.json({ error: 'رابط الموقع يجب أن يبدأ بـ http:// أو https://' }, { status: 400 })
    }

    const { error } = await sb().from('supplier_applications').insert({
      company_name, contact_name, phone, email: email||null,
      business_type: business_type||[],
      description: description||null,
      website: safeWebsite,
      offer: offer||null,
      status: 'pending'
    })

    if(error) return NextResponse.json({ error: error.message }, { status: 500 })

    // إشعار واتساب للأدمن
    await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'X-Session-Id': process.env.WASENDER_SESSION_ID!
      },
      body: JSON.stringify({
        to: '966594351667',
        text: `🤝 *طلب شراكة جديد*\n\n🏢 ${company_name}\n👤 ${contact_name}\n📱 ${phone}\n📧 ${email||'—'}\n🏷️ ${business_type?.join('، ')||'—'}\n\n${description||''}`
      })
    }).catch(()=>{})

    return NextResponse.json({ success: true })
  } catch(err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
