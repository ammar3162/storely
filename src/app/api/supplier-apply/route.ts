import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sanitizeShortText, sanitizeLongText } from '@/lib/sanitize'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    let { company_name, contact_name, phone, email, business_type, description, website, offer, marketplace_consent } = body

    if (marketplace_consent !== true) {
      return NextResponse.json({ error: 'يجب الموافقة على عرض البيانات بمنصة السوق العامة' }, { status: 400 })
    }

    if(!company_name||!contact_name||!phone) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // تنظيف كل الحقول النصية قبل الحفظ (حد أقصى للطول + إزالة رموز التحكم الخفية)
    company_name = sanitizeShortText(company_name, 150)
    contact_name = sanitizeShortText(contact_name, 100)
    phone = sanitizeShortText(phone, 20)
    email = email ? sanitizeShortText(email, 150) : null
    description = description ? sanitizeLongText(description, 1500) : null
    offer = offer ? sanitizeLongText(offer, 500) : null

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
      status: 'pending',
      marketplace_consent: true
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
