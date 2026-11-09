import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'
import {
  readDeviceId, newDeviceId, hashDevice, newCode, hashCode, maskEmail, deviceLabel, deviceCookie, trustDevice,
  isDeviceTrusted, verificationEnabled, VERIFIED_ROLES, CODE_TTL_MS, RESEND_AFTER_MS, MAX_CODES_PER_DAY,
} from '@/lib/deviceTrust'
import { sendEmail } from '@/lib/email'
import { deviceCodeEmail } from '@/lib/emailTemplates'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// يرسل رمز الدخول لإيميل المستخدم المسجل دخوله — للجهاز الحالي فقط
// (أول جهاز بعد التسجيل = تأكيد الإيميل). دخول قوقل أول مرة يتوثق بدون رمز لأن قوقل أكّد الإيميل.
export async function POST() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'سجّل دخولك أولاً' }, { status: 401 })
    const h = await headers()
    const ua = h.get('user-agent')
    const fromApp = !!h.get('authorization')
    const db = sb()

    let deviceId = await readDeviceId()
    const isNew = !deviceId
    if (!deviceId) deviceId = newDeviceId()
    // تطبيق الجوال يحفظ المعرّف بنفسه (ما فيه كوكيز بين الدومينات) — الموقع يبقى httpOnly
    const reply = (body: Record<string, unknown>, status = 200) => {
      const res = NextResponse.json({ ...body, ...(fromApp ? { device_token: deviceId } : {}) }, { status })
      res.cookies.set(deviceCookie(deviceId!))
      return res
    }

    const needsCheck = !!profile.role && VERIFIED_ROLES.includes(profile.role) && await verificationEnabled(db)
    if (!needsCheck || (!isNew && await isDeviceTrusted(profile.userId, deviceId, db))) return reply({ success: true, trusted: true })

    // دخول قوقل أول مرة لحساب جديد: الإيميل مؤكد من قوقل
    const { data: authUser } = await db.auth.admin.getUserById(profile.userId)
    const u = authUser?.user
    const providers: string[] = (u?.app_metadata as { providers?: string[] } | undefined)?.providers || []
    if (u && providers.includes('google') && Date.now() - new Date(u.created_at).getTime() < 24 * 3600 * 1000) {
      const { count } = await db.from('trusted_devices').select('id', { count: 'exact', head: true }).eq('user_id', profile.userId)
      if (!count) {
        await trustDevice(db, profile.userId, deviceId, ua)
        return reply({ success: true, trusted: true })
      }
    }

    const email = profile.email || u?.email || ''
    if (!email) return reply({ error: 'لا يوجد بريد إلكتروني مسجّل في الحساب — تواصل مع فريق ستورلي' }, 400)

    // إعادة الإرسال بعد دقيقة، وحد يومي
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data: recent } = await db.from('login_codes').select('created_at')
      .eq('user_id', profile.userId).eq('source', 'email').gte('created_at', dayAgo).order('created_at', { ascending: false })
    const last = recent?.[0] ? new Date((recent[0] as { created_at: string }).created_at).getTime() : 0
    if (last && Date.now() - last < RESEND_AFTER_MS) {
      return reply({ success: true, sent: false, email: maskEmail(email), wait: Math.ceil((RESEND_AFTER_MS - (Date.now() - last)) / 1000) })
    }
    if ((recent?.length || 0) >= MAX_CODES_PER_DAY) {
      return reply({ error: 'وصلت إلى الحد اليومي لإرسال الرموز — حاول غداً أو تواصل مع فريق ستورلي' }, 429)
    }

    const code = newCode()
    const { data: row, error: insErr } = await db.from('login_codes').insert({
      user_id: profile.userId, code_hash: hashCode(profile.userId, code), device_hash: hashDevice(deviceId),
      source: 'email', expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    }).select('id').single()
    if (insErr) throw new Error(insErr.message)

    // أول جهاز للحساب = تأكيد التسجيل
    const { count: devices } = await db.from('trusted_devices').select('id', { count: 'exact', head: true }).eq('user_id', profile.userId)
    const { data: p } = await db.from('profiles').select('full_name').eq('id', profile.userId).maybeSingle()
    const mail = deviceCodeEmail({ name: (p as { full_name?: string } | null)?.full_name || '', code, device: deviceLabel(ua), firstTime: !devices })
    const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html })
    if (!sent?.success) {
      // الرمز ما وصل: نشيله عشان ما يمنع إعادة الإرسال
      await db.from('login_codes').delete().eq('id', (row as { id: string }).id)
      return reply({ error: 'تعذّر إرسال الرمز — حاول مرة أخرى' }, 502)
    }

    return reply({ success: true, sent: true, email: maskEmail(email), wait: RESEND_AFTER_MS / 1000 })
  } catch (e) {
    console.error('device send-code failed:', e)
    return NextResponse.json({ error: 'حدث خطأ — حاول مرة أخرى' }, { status: 500 })
  }
}
