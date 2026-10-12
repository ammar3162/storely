import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sanitizeShortText, sanitizeLongText } from '@/lib/sanitize'
import { toLatinDigits } from '@/lib/digits'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    // المورد لازم يكون مسجّل دخول (Google أو إيميل) — الإيميل يجي من حسابه، مو من النموذج
    const me = await getCurrentProfile()
    if (!me?.email) return NextResponse.json({ error: 'سجّل بحساب Google أو بإيميلك أول', reason: 'auth' }, { status: 401 })
    if (me.orgId) return NextResponse.json({ error: 'هذا الإيميل مربوط بحساب منشأة — سجّل المورد بإيميل ثاني' }, { status: 409 })
    const body = await req.json()
    let { company_name, contact_name, phone, business_type, description, website, offer, marketplace_consent } = body
    const email = me.email

    if (marketplace_consent !== true) {
      return NextResponse.json({ error: 'يجب الموافقة على عرض البيانات بمنصة السوق العامة' }, { status: 400 })
    }

    if(!company_name||!contact_name||!phone) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // تنظيف كل الحقول النصية قبل الحفظ (حد أقصى للطول + إزالة رموز التحكم الخفية)
    company_name = sanitizeShortText(company_name, 150)
    contact_name = sanitizeShortText(contact_name, 100)
    phone = toLatinDigits(sanitizeShortText(phone, 20)).replace(/[^\d+]/g, '')
    if (!/^(\+?966|0)?5\d{8}$/.test(phone)) return NextResponse.json({ error: 'رقم الجوال غير صحيح — مثال 05xxxxxxxx' }, { status: 400 })
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

    const db = sb()
    // نفس الرقم قدّم قبل وطلبه للحين قيد المراجعة → ما نكرر (ونحمي الصفحة من الإغراق)
    const { data: dup } = await db.from('supplier_applications').select('id').or(`phone.eq.${phone},email.eq.${email}`).eq('status', 'pending').limit(1)
    // حساب المورد (يدخل منه البوابة) — ينشأ مرة وحدة بهوية الجلسة
    const { data: sp } = await db.from('supplier_profiles').select('id').eq('id', me.userId).maybeSingle()
    if (!sp) {
      const { error: spErr } = await db.from('supplier_profiles').insert({ id: me.userId, business_name: company_name, phone, email } as any)
      if (spErr) return NextResponse.json({ error: 'تعذر إنشاء حساب المورد، حاول مرة ثانية' }, { status: 500 })
    }
    if (dup?.length) return NextResponse.json({ success: true, duplicate: true })
    const { count } = await db.from('supplier_applications').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 600e3).toISOString())
    if ((count || 0) >= 20) return NextResponse.json({ error: 'طلبات كثيرة — جرّب بعد شوي' }, { status: 429 })
    const types = Array.isArray(business_type) ? business_type.map((x: unknown) => sanitizeShortText(String(x), 40)).filter(Boolean).slice(0, 10) : []

    const { error } = await db.from('supplier_applications').insert({
      company_name, contact_name, phone, email,
      business_type: types,
      description: description||null,
      website: safeWebsite,
      offer: offer||null,
      status: 'pending',
      marketplace_consent: true
    })

    if(error) return NextResponse.json({ error: 'تعذر إرسال الطلب، حاول مرة ثانية' }, { status: 500 })

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
        text: `🤝 *طلب شراكة جديد*\n\n🏢 ${company_name}\n👤 ${contact_name}\n📱 ${phone}\n📧 ${email||'—'}\n🏷️ ${types.join('، ')||'—'}\n\n${description||''}`
      })
    }).catch(()=>{})

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'تعذر إرسال الطلب، حاول مرة ثانية' }, { status: 500 })
  }
}
