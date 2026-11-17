import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'
import { combineBranchLimit, EXTRA_BRANCH_SLUG } from '@/lib/branchLimit'
import { orgFeatures, branchFeaturesMap, featuresFrom, activeAddonSlugs, orgOnTrial, type Feature } from '@/lib/planFeatures'
import { DEVICE_UNVERIFIED_ERROR, DEVICE_UNVERIFIED_REASON } from '@/lib/deviceMessages'
import { readDeviceId, deviceCookie } from '@/lib/deviceTrust'
import { normalizePhone } from '@/lib/deployEnv'
import { sendEmail } from '@/lib/email'
import { phoneChangedEmail } from '@/lib/emailTemplates'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// بيانات المستخدم الحالي ومؤسسته وفروعه — بديل استعلامات profiles/organizations/branches المباشرة
// (تستخدمها لوحة التحكم الرئيسية وكل الصفحات عبر getMe)
export async function GET() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'غير مسجل دخول', reason: 'unauthenticated' }, { status: 401 })
    if (profile.deviceTrusted === false) return NextResponse.json({ error: DEVICE_UNVERIFIED_ERROR, reason: DEVICE_UNVERIFIED_REASON }, { status: 403 })
    if (!profile.orgId) return NextResponse.json({ error: 'لا توجد مؤسسة مرتبطة بالحساب', reason: 'no_org', status: profile.status }, { status: 404 })

    const db = sb()
    let branchesQ = db.from('branches').select('id,name,location').eq('org_id', profile.orgId).eq('is_active', true)
    if (profile.role === 'manager' && profile.branchId) branchesQ = branchesQ.eq('id', profile.branchId)

    const [{ data: org }, { data: extra }, { data: branches }, { data: branchSubs }] = await Promise.all([
      db.from('organizations')
        .select('id,name,plan,billing_cycle,currency,logo_url,deletion_scheduled_at,max_staff,max_suppliers,max_branches,country_code,business_type,onboarding_done,vat_registered,locked_plan_monthly,staff_included,discount_type,discount_value,discount_note,discount_until')
        .eq('id', profile.orgId).single(),
      db.from('profiles')
        .select('full_name,phone,subscription_ends_at,permissions,whatsapp_consent,whatsapp_first_contact_confirmed,terms_version_accepted')
        .eq('id', profile.userId).single(),
      branchesQ.order('created_at'),
      db.from('org_addon_subscriptions')
        .select('quantity,expires_at,marketplace_addons!inner(slug)')
        .eq('org_id', profile.orgId).eq('status', 'active').eq('marketplace_addons.slug', EXTRA_BRANCH_SLUG),
    ])
    const o: any = org || {}
    // الميزات المفتوحة (الباقة + الإضافات) — نفس المصدر اللي يستخدمه الخادم للقفل
    const features = await orgFeatures(db, profile.orgId, o.plan || 'basic')
    // ميزات كل فرع (الإضافات ممكن تكون لفروع معيّنة) — الواجهة تقفل الصفحة للفرع اللي ما فيه الميزة
    const branchFeatures = await branchFeaturesMap(db, profile.orgId, o.plan || 'basic', ((branches || []) as any[]).map(b => b.id))
    // التجربة تفتح كل شي — نعرف العميل وش اللي ينقفل بعدها (الباقة + إضافاته بدون التجربة)
    let trialLocked: Feature[] = []
    if (await orgOnTrial(db, profile.orgId)) {
      const paid = featuresFrom(o.plan || 'basic', await activeAddonSlugs(db, profile.orgId), false)
      trialLocked = (Object.keys(paid) as Feature[]).filter(f => !paid[f])
    }
    const e: any = extra || {}

    const res = NextResponse.json({
      success: true,
      user_id: profile.userId,
      org_id: profile.orgId,
      role: profile.role,
      branch_id: profile.branchId,
      status: profile.status,
      full_name: e.full_name || '',
      phone: e.phone || '',
      email: profile.email || '',
      subscription_ends_at: e.subscription_ends_at || null,
      permissions: e.permissions || {},
      whatsapp_consent: e.whatsapp_consent === true,
      whatsapp_first_contact_confirmed: e.whatsapp_first_contact_confirmed === true,
      terms_version_accepted: e.terms_version_accepted || null,
      org: org ? {
        name: o.name || '',
        plan: o.plan || '',
        billing_cycle: o.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
        currency: o.currency || null,
        logo_url: o.logo_url || null,
        deletion_scheduled_at: o.deletion_scheduled_at || null,
        max_staff: o.max_staff ?? 1,
        max_suppliers: o.max_suppliers ?? 1,
        max_branches: combineBranchLimit(o.max_branches, (branchSubs || []) as any[]).total,
        // فروع الباقة نفسها (بدون «فرع إضافي») — للفاتورة
        plan_branches: o.max_branches ?? 1,
        country_code: o.country_code || '+966',
        business_type: o.business_type || null,
        onboarding_done: o.onboarding_done !== false,
        features,
        branch_features: branchFeatures,
        trial_locked: trialLocked,
        locked_plan_monthly: o.locked_plan_monthly ?? null,
        staff_included: o.staff_included ?? null,
        // الخصم الخاص (من لوحة الإدارة) — يطلع سطر بالفاتورة
        discount_type: o.discount_type ?? null, discount_value: o.discount_value ?? null, discount_note: o.discount_note ?? null, discount_until: o.discount_until ?? null,
      } : null,
      branches: branches || [],
    })
    // الجهاز الموثوق: نجدد عمر الكوكي مع كل فتح للنظام — ما ينتهي طالما الجهاز مستخدم
    const deviceId = await readDeviceId()
    if (deviceId && profile.deviceTrusted) res.cookies.set(deviceCookie(deviceId))
    return res
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تحديثات المستخدم على حسابه — قائمة مسموحة فقط:
//   { whatsapp_consent: true } | { whatsapp_first_contact_confirmed: true } | { cancel_org_deletion: true }
//   | { full_name, phone } (البيانات الشخصية)
export async function PATCH(req: Request) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 })

    const body = await req.json()
    const db = sb()
    // تغيير الجوال أو موافقة واتساب أو إلغاء الحذف = من جهاز موثوق فقط (رمز الإيميل).
    // كان يمر من جهاز غير موثوق: بكلمة مرور مسروقة يغيّر الرقم لرقمه ويدخل من بوت واتساب بدون تحقق الجهاز
    const sensitive = 'phone' in body || body.whatsapp_consent === true || body.cancel_org_deletion === true
    if (sensitive && profile.deviceTrusted === false) {
      return NextResponse.json({ error: DEVICE_UNVERIFIED_ERROR, reason: DEVICE_UNVERIFIED_REASON }, { status: 403 })
    }
    const profileUpdate: Record<string, unknown> = {}
    if (body.whatsapp_consent === true) {
      profileUpdate.whatsapp_consent = true
      profileUpdate.whatsapp_consent_at = new Date().toISOString()
    }
    if (body.whatsapp_first_contact_confirmed === true) profileUpdate.whatsapp_first_contact_confirmed = true
    if ('full_name' in body) profileUpdate.full_name = String(body.full_name || '').trim()
    let notifyPhoneChange: (() => Promise<unknown>) | null = null
    if ('phone' in body) {
      // صفحة الإعدادات ترسل الاسم والجوال مع بعض — نفحص ونحدّث الجوال بس لو تغيّر فعلاً
      const phone = String(body.phone || '').trim()
      const digits = normalizePhone(phone)
      const { data: cur } = await db.from('profiles').select('phone,full_name').eq('id', profile.userId).maybeSingle()
      if (digits !== normalizePhone((cur as any)?.phone)) {
        if (phone) {
          if (!/^\d{9,15}$/.test(digits)) return NextResponse.json({ error: 'رقم الجوال غير صحيح' }, { status: 400 })
          // الرقم ما يتكرر بين الحسابات — بوت واتساب يتعرف على صاحب الحساب من رقمه
          const variants = [...new Set([phone, digits, '+' + digits, digits.startsWith('966') ? '0' + digits.slice(3) : digits, digits.startsWith('966') ? digits.slice(3) : digits])]
          const { data: taken } = await db.from('profiles').select('id').in('phone', variants).neq('id', profile.userId).limit(1)
          if (taken?.length) return NextResponse.json({ error: 'رقم الجوال هذا مرتبط بحساب آخر' }, { status: 409 })
          if (profile.email) {
            const mail = phoneChangedEmail({ name: (cur as any)?.full_name, maskedPhone: digits.replace(/\d(?=\d{3})/g, '•') })
            // تنبيه أمني لإيميل الحساب بعد الحفظ
            notifyPhoneChange = () => sendEmail({ to: profile.email!, subject: mail.subject, html: mail.html }).catch(() => null)
          }
        }
        profileUpdate.phone = phone
      }
    }

    if (Object.keys(profileUpdate).length) {
      const { error } = await db.from('profiles').update(profileUpdate as any).eq('id', profile.userId)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      if (notifyPhoneChange) await notifyPhoneChange()
    }

    // تسجيل الدخول يعتبر تراجع عن طلب حذف الحساب المجدول — للمالك فقط (المدير ما يلغي حذف طلبه المالك)
    if (body.cancel_org_deletion === true && profile.orgId && profile.role === 'owner') {
      const { error } = await db.from('organizations').update({ deletion_scheduled_at: null } as any).eq('id', profile.orgId)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
