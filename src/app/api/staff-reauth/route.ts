import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { generateStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rate limiting: نفس منطق staff-login لحماية من التخمين
const attempts = new Map<string, { count: number; firstAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

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

    if (!checkRateLimit(staff_id)) {
      return NextResponse.json({ error: 'محاولات كثيرة — انتظر 5 دقائق' }, { status: 429 })
    }

    const supabase = sb()
    const { data: staff, error } = await supabase
      .from('staff_members')
      .select('id,name,org_id,branch_id,pin,is_active,permissions,role,organizations(name),branches(name)')
      .eq('id', staff_id)
      .maybeSingle()

    if (error || !staff || !(staff as any).is_active) {
      return NextResponse.json({ error: 'الحساب غير موجود أو موقوف' }, { status: 401 })
    }

    const pinStr = String(pin)
    const storedPin = String((staff as any).pin)
    const pinValid = storedPin.startsWith('$2')
      ? await bcrypt.compare(pinStr, storedPin)
      : storedPin === pinStr

    if (!pinValid) {
      return NextResponse.json({ error: 'رمز PIN غير صحيح' }, { status: 401 })
    }

    attempts.delete(staff_id)
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
