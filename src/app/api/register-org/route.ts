import { NextResponse } from 'next/server'
import { PLAN_CAPS, isNewPlan, type PlanKey } from '@/lib/planPricing'
import { normalizeWhatsapp } from '@/lib/phoneNormalize'
import { SIGNUP_BUSINESS_TYPES } from '@/lib/businessTypes'
import { attachReferral } from '@/lib/agentReferral'
import { REF_COOKIE } from '@/lib/agentRewards'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sanitizeShortText } from '@/lib/sanitize'
import { formatPhone } from '@/lib/whatsapp'
import { currencyForDialCode } from '@/lib/currencyByCountry'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/emailTemplates'
import { buildAttributionRow, normalizeSignupSource, normalizeSourceDetail } from '@/lib/signupSource'
import { notifyAdminsLater } from '@/lib/adminNotify'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    // تحقق من هوية المتصل الفعلية عبر جلسته الموثوقة (كوكيز) — لا نثق بأي userId قادم من body
    const authClient = await createServerClient()
    const { data: { user: authedUser } } = await authClient.auth.getUser()
    if (!authedUser) {
      return NextResponse.json({ error: 'غير مصرح — سجّل الدخول أولاً' }, { status: 401 })
    }

    const body = await req.json()
    let { orgName, fullPhone, businessType, branchCount, billing, phone, trialEnds, countryCode, termsAcceptedAt, agentCode, plan: chosenPlan } = body
    const userId = authedUser.id
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = req.headers.get('user-agent') || null

    // امنع إعادة التسجيل فوق حساب مربوط بمنشأة موجودة فعلاً
    const { data: existingProfile } = await sb().from('profiles').select('org_id').eq('id', userId).maybeSingle()
    if (existingProfile?.org_id) {
      return NextResponse.json({ error: 'هذا الحساب مسجّل بمنشأة بالفعل' }, { status: 400 })
    }

    orgName = sanitizeShortText(orgName, 150)
    // رقم واتساب المنشأة: صيغة ثابتة، ويشيل مفتاح الدولة لو تكرر (+966966…)
    fullPhone = normalizeWhatsapp(sanitizeShortText(fullPhone, 20), typeof countryCode === 'string' ? countryCode : '+966')
    phone = formatPhone(sanitizeShortText(phone, 20))
    // التسجيل الجديد: مطعم أو كوفي أو أخرى — النوع يحدد الفئات والوحدات داخل النظام
    businessType = SIGNUP_BUSINESS_TYPES.some(b => b.v === businessType) ? businessType : 'أخرى'

    if (!orgName || !fullPhone) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // منع رقم الجوال المكرر — تحقق حقيقي على مستوى الخادم (مو بس بالواجهة اللي ممكن تتجاوز)
    const { data: existingPhoneProfile } = await sb().from('profiles').select('id').eq('phone', phone).maybeSingle()
    if (existingPhoneProfile) {
      return NextResponse.json({ error: 'رقم الجوال هذا مرتبط بحساب آخر — استخدم رقماً مختلفاً' }, { status: 409 })
    }

    const supabase = sb()
    const { data: settingsRow } = await supabase.from('platform_settings').select('terms_version').eq('id', 1).single()
    const TERMS_VERSION = (settingsRow as any)?.terms_version || '2026-06-b'

    // التجربة المجانية على الباقة اللي اختارها (الفروع والموظفين والموردين حسبها)، والمميزات كلها مفتوحة طول التجربة (lib/planFeatures)
    // الباقات الجديدة (2026-11): الباقة اللي اختارها وعدد فروعها (1–10). نسخة قديمة من التطبيق ما ترسل plan → التشغيل
    const plan: PlanKey = isNewPlan(chosenPlan) ? chosenPlan : 'ops'
    const requestedPlan: PlanKey = plan
    const caps = PLAN_CAPS[plan]
    const maxB = Math.max(1, Math.min(caps.maxBranches, Math.round(Number(branchCount)) || 1))
    const maxStaff = caps.staff * maxB, maxSup = caps.suppliers * maxB

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        country_code: countryCode || '+966',
        currency: currencyForDialCode(countryCode || '+966'),
        whatsapp_number: fullPhone,
        low_stock_threshold: 5,
        business_type: businessType||'مطعم',
        requested_plan: requestedPlan,
        max_branches: maxB,
        max_staff: maxStaff,
        max_suppliers: maxSup,
        plan: plan,
        billing_cycle: billing === 'yearly' ? 'yearly' : 'monthly'
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
      terms_accepted_at: acceptedAt,
      terms_version_accepted: TERMS_VERSION
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

    // سفير: الكود المكتوب في التسجيل، وإلا كوكي رابطه (أفضل جهد — ما يوقف التسجيل)
    try {
      const refCookie = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${REF_COOKIE}=([A-Z0-9]+)`))?.[1]
      await attachReferral(supabase, { orgId: org.id, orgName, code: agentCode || refCookie, ownerEmail: authedUser.email, ownerPhone: fullPhone })
    } catch (e) { console.error('AGENT_REFERRAL_FAILED (non-fatal):', e) }

    // مصدر العميل («من وين سمعت عنا؟» + utm) — أفضل جهد، ما يوقف التسجيل
    try {
      const { error } = await (supabase as any).from('signup_attribution').insert(buildAttributionRow(org.id, body))
      if (error) console.error('SIGNUP_ATTRIBUTION_FAILED (non-fatal):', error.message)
    } catch (e) { console.error('SIGNUP_ATTRIBUTION_FAILED (non-fatal):', e) }

    let demoMatched = false
    // ربط تلقائي بطلب عرض سابق (لو وجد) — نطابق آخر 9 أرقام من رقم الجوال، بدون تدخل يدوي
    try {
      const last9 = fullPhone.replace(/[^0-9]/g,'').slice(-9)
      const { data: pendingRequests } = await supabase.from('demo_requests').select('id,phone').in('status',['new','contacted']).is('matched_org_id', null)
      const match = (pendingRequests||[]).find((r:any) => (r.phone||'').replace(/[^0-9]/g,'').slice(-9) === last9)
      demoMatched = !!match
      if (match) {
        await supabase.from('demo_requests').update({ matched_org_id: org.id } as any).eq('id', (match as any).id)
      }
    } catch {}

    // إيميل ترحيب (أفضل جهد — لو فشل ما يوقف التسجيل)
    if (authedUser.email) {
      try {
        const mail = welcomeEmail({ name: orgName, trialEnds })
        await sendEmail({ to: authedUser.email, subject: mail.subject, html: mail.html })
      } catch (e) { console.error('WELCOME_EMAIL_FAILED (non-fatal):', e) }
    }

    // إيميل للإدارة: عميل جديد سجّل (بعد الرد على العميل — فشله ما يأثر على التسجيل)
    const src = normalizeSignupSource(body.signupSource)
    notifyAdminsLater(supabase, org.id, {
      kind: 'signup', email: authedUser.email, businessType, plan, branches: Number(branchCount) || 1,
      billing: billing === 'yearly' ? 'yearly' : 'monthly', source: src, sourceDetail: normalizeSourceDetail(src, body.signupSourceDetail),
      agentCode: typeof agentCode === 'string' ? agentCode.slice(0, 20) : null, demoMatched,
    })

    return NextResponse.json({ success: true, org_id: org.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
