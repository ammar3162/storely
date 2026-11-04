import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'
import { readDeviceId, hashDevice, hashCode, sameHash, normalizeCode, trustDevice, deviceCookie, CODE_MAX_ATTEMPTS } from '@/lib/deviceTrust'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type CodeRow = { id: string; code_hash: string; device_hash: string | null; attempts: number }

// يتحقق من رمز الدخول ويوثّق الجهاز الحالي
// يقبل رمز الإيميل لنفس الجهاز، أو رمز من فريق ستورلي (يشتغل على أي جهاز)
export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'سجّل دخولك أولاً' }, { status: 401 })
    const deviceId = await readDeviceId()
    if (!deviceId) return NextResponse.json({ error: 'اطلب رمز جديد' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const code = normalizeCode((body as { code?: unknown }).code)
    if (code.length !== 6) return NextResponse.json({ error: 'الرمز 6 أرقام' }, { status: 400 })

    const db = sb()
    const deviceHash = hashDevice(deviceId)
    const { data } = await db.from('login_codes').select('id,code_hash,device_hash,attempts')
      .eq('user_id', profile.userId).is('used_at', null).gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(5)
    const codes = ((data || []) as CodeRow[]).filter(c => (c.device_hash === null || c.device_hash === deviceHash) && c.attempts < CODE_MAX_ATTEMPTS)
    if (!codes.length) return NextResponse.json({ error: 'الرمز انتهى أو استُخدم — اطلب رمز جديد', expired: true }, { status: 400 })

    const wanted = hashCode(profile.userId, code)
    const match = codes.find(c => sameHash(c.code_hash, wanted))
    if (!match) {
      // المحاولة الخاطئة تنحسب على أحدث رمز لهالجهاز
      const latest = codes[0]
      await db.from('login_codes').update({ attempts: latest.attempts + 1 }).eq('id', latest.id)
      const left = CODE_MAX_ATTEMPTS - latest.attempts - 1
      return NextResponse.json({
        error: left > 0 ? `الرمز غير صحيح — باقي ${left} ${left === 1 ? 'محاولة' : 'محاولات'}` : 'الرمز غير صحيح — اطلب رمز جديد',
        expired: left <= 0,
      }, { status: 400 })
    }

    await db.from('login_codes').update({ used_at: new Date().toISOString() }).eq('id', match.id)
    await trustDevice(db, profile.userId, deviceId, (await headers()).get('user-agent'))

    const res = NextResponse.json({ success: true })
    res.cookies.set(deviceCookie(deviceId))
    return res
  } catch (e) {
    console.error('device verify-code failed:', e)
    return NextResponse.json({ error: 'حدث خطأ — حاول مرة ثانية' }, { status: 500 })
  }
}
