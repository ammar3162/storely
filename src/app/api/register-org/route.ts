import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sanitizeShortText } from '@/lib/sanitize'
import { formatPhone } from '@/lib/whatsapp'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// يجب تحديث هذا الرقم يدوياً كل ما تُعدَّل صفحة الشروط والأحكام (storely.dev/terms)
const TERMS_VERSION = '2026-06-b'

export async function POST(req: Request) {
  try {
    let { userId, orgName, fullPhone, businessType, branchCount, phone, trialEnds, countryCode, termsAcceptedAt } = await req.json()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = req.headers.get('user-agent') || null

    orgName = sanitizeShortText(orgName, 150)
    fullPhone = formatPhone(sanitizeShortText(fullPhone, 20))
    phone = formatPhone(sanitizeShortText(phone, 20))
    businessType = businessType ? sanitizeShortText(businessType, 50) : businessType

    if (!orgName || !fullPhone) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const supabase = sb()

    const maxB = branchCount===1?1:branchCount<=3?3:10
    const maxStaff = branchCount===1?2:branchCount<=3?10:999
    const maxSup = branchCount===1?3:branchCount<=3?10:999
    const plan = branchCount===1?'basic':branchCount<=3?'pro':'advanced'

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        country_code: countryCode || '+966',
        whatsapp_number: fullPhone,
        low_stock_threshold: 5,
        business_type: businessType||'مطعم',
        requested_plan: plan,
        max_branches: maxB,
        max_staff: maxStaff,
        max_suppliers: maxSup,
        plan: plan
      })
      .select().single()

    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 })

    await supabase.from('branches').insert({
      org_id: org.id, name: 'الفرع الرئيسي', is_active: true
    })

    const acceptedAt = termsAcceptedAt || new Date().toISOString()
    await supabase.from('profiles').upsert({
      id: userId,
      org_id: org.id,
      full_name: orgName,
      role: 'owner',
      phone: phone,
      status: 'active',
      subscription_type: 'trial',
      subscription_ends_at: trialEnds,
      terms_accepted_at: acceptedAt
    }, { onConflict: 'id' })

    // سجل موافقة مفصّل — دليل قانوني موثّق (نسخة الشروط، IP، الجهاز)
    await (supabase as any).from('consent_logs').insert({
      profile_id: userId,
      org_id: org.id,
      terms_version: TERMS_VERSION,
      accepted_at: acceptedAt,
      ip_address: ip,
      user_agent: userAgent,
    }).then(({ error }: any) => { if (error) console.log('consent_logs insert error:', error.message) })

    return NextResponse.json({ success: true, org_id: org.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
