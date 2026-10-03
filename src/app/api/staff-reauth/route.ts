import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { generateStaffToken } from '@/lib/staffAuth'
import { clientIp, lockedUntil, lockedMessage, recordFailure, recordSuccess, notifyLocked, PER_IP_MAX } from '@/lib/loginThrottle'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * إعادة مصادقة سريعة بـ PIN فقط — تُستخدم لما تنتهي جلسة الموظف (12 ساعة)
 * بينما هو لسا بنفس الصفحة، بدل ما يرجع يكتب رقم الجوال من جديد.
 */
export async function POST(req: Request) {
  try {
    const { staff_id, pin } = await req.json()
    if (!staff_id || !pin) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const supabase = sb()
    const staffKey = `staff:${String(staff_id).slice(0, 64)}`
    const ipKey = `ip:${clientIp(req)}`
    const lock = await lockedUntil(supabase, [staffKey, ipKey])
    if (lock) return NextResponse.json({ error: lockedMessage(lock) }, { status: 429 })
    const { data: staff, error } = await supabase
      .from('staff_members')
      .select('id,name,org_id,branch_id,pin,is_active,permissions,role,organizations(name),branches(name)')
      .eq('id', staff_id)
      .maybeSingle()

    if (error || !staff || !(staff as any).is_active) {
      await recordFailure(supabase, ipKey, PER_IP_MAX)
      return NextResponse.json({ error: 'الحساب غير موجود أو موقوف' }, { status: 401 })
    }

    const pinStr = String(pin)
    const storedPin = String((staff as any).pin)
    const pinValid = storedPin.startsWith('$2')
      ? await bcrypt.compare(pinStr, storedPin)
      : storedPin === pinStr

    if (!pinValid) {
      const [r] = await Promise.all([recordFailure(supabase, staffKey), recordFailure(supabase, ipKey, PER_IP_MAX)])
      if (r.justLocked) await notifyLocked(supabase, [{ org_id: (staff as any).org_id, branch_id: (staff as any).branch_id, name: (staff as any).name }])
      if (r.lockedUntil) return NextResponse.json({ error: lockedMessage(r.lockedUntil) }, { status: 429 })
      return NextResponse.json({ error: 'رمز PIN غير صحيح' }, { status: 401 })
    }

    await recordSuccess(supabase, staffKey)
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
