import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { normalizePhone, clientIp, lockedUntil, lockedMessage, recordFailure, recordSuccess, notifyLocked, PER_IP_MAX } from '@/lib/loginThrottle'
import { createClient } from '@supabase/supabase-js'
import { generateStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { phone, pin } = await req.json()
    if (!phone || !pin) {
      return NextResponse.json({ error: 'أدخل رقم الجوال ورمز PIN' }, { status: 400 })
    }

    // رقم الجوال كامل (بأي صيغة: 05… / 9665… / +966…) — مو آخر الأرقام بس
    const normalized = normalizePhone(String(phone))
    const supabase = sb()
    const phoneKey = `phone:${normalized}`
    const ipKey = `ip:${clientIp(req)}`
    const fail = async () => {
      const [acc] = await Promise.all([recordFailure(supabase, phoneKey), recordFailure(supabase, ipKey, PER_IP_MAX)])
      return acc
    }

    // القفل قبل أي مقارنة — المحاولات تنحسب بقاعدة البيانات (تشتغل مع كل نسخ السيرفر)
    const lock = await lockedUntil(supabase, [phoneKey, ipKey])
    if (lock) return NextResponse.json({ error: lockedMessage(lock) }, { status: 429 })

    if (normalized.length < 8 || String(pin).length < 4 || String(pin).length > 6) {
      await fail()
      return NextResponse.json({ error: 'رقم الجوال أو رمز PIN غير صحيح' }, { status: 401 })
    }

    // نفس الرقم ممكن يكون مسجّل لأكثر من موظف (مثلاً بمنشأتين) — نجيب كل المطابقين
    // ونختار اللي الـ PIN حقه صحيح
    const { data: found, error } = await supabase
      .from('staff_members')
      .select('id,name,org_id,branch_id,phone,pin,is_active,permissions,role,organizations(name),branches(name)')
      .ilike('phone', '%' + normalized.slice(-8))
      .eq('is_active', true)
      .limit(20)
    const candidates = (found || []).filter((c: any) => normalizePhone(c.phone) === normalized)

    if (error || !candidates.length) {
      await fail()
      return NextResponse.json({ error: 'رقم الجوال أو رمز PIN غير صحيح' }, { status: 401 })
    }

    // تحقق من الـ PIN مع دعم النصوص القديمة
    const pinStr = String(pin)
    const matches = []
    for (const c of candidates) {
      const storedPin = String((c as any).pin)
      const pinValid = storedPin.startsWith('$2')
        ? await bcrypt.compare(pinStr, storedPin)
        : storedPin === pinStr
      if (pinValid) matches.push(c)
    }

    if (matches.length === 0) {
      const r = await fail()
      if (r.justLocked) await notifyLocked(supabase, candidates.map((c: any) => ({ org_id: c.org_id, branch_id: c.branch_id, name: c.name })))
      if (r.lockedUntil) return NextResponse.json({ error: lockedMessage(r.lockedUntil) }, { status: 429 })
      return NextResponse.json({ error: 'رقم الجوال أو رمز PIN غير صحيح' }, { status: 401 })
    }
    if (matches.length > 1) {
      return NextResponse.json({ error: 'هذا الرقم مسجّل بأكثر من منشأة بنفس رمز PIN — اطلب من صاحب العمل تغيير رمزك' }, { status: 409 })
    }
    const staff = matches[0]

    // دخول صحيح: نمسح عدّاد الرقم
    await recordSuccess(supabase, phoneKey)

    const { data: orgSub } = await supabase.from('profiles').select('subscription_ends_at').eq('org_id', staff.org_id).eq('role', 'owner').maybeSingle()
    if ((orgSub as any)?.subscription_ends_at && new Date((orgSub as any).subscription_ends_at) < new Date()) {
      return NextResponse.json({ error: 'انتهت فترة الاشتراك. يرجى إبلاغ صاحب المنشأة لتجديد الاشتراك', subscriptionExpired: true }, { status: 403 })
    }

    const token = generateStaffToken(staff.id, staff.org_id, staff.branch_id)

    return NextResponse.json({
      success: true,
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        org_id: staff.org_id,
        branch_id: staff.branch_id,
        org_name: (staff as any).organizations?.name || '',
        branch_name: (staff as any).branches?.name || '',
        permissions: (staff as any).permissions || {dispense:true,inventory:false,purchases:false,reports:false},
        role: (staff as any).role || 'staff',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
