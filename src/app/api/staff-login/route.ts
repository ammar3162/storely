import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { generateStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rate limiting: max 5 attempts per phone per 5 minutes
const attempts = new Map<string, { count: number; firstAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000

function checkRateLimit(phone: string): boolean {
  const now = Date.now()
  const entry = attempts.get(phone)
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(phone, { count: 1, firstAt: now })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

export async function POST(req: Request) {
  try {
    const { phone, pin } = await req.json()
    if (!phone || !pin) {
      return NextResponse.json({ error: 'أدخل رقم الجوال ورمز PIN' }, { status: 400 })
    }

    const cleanPhone = String(phone).replace(/\s/g, '')
    // نطابق آخر الأرقام بغض النظر عن رمز الدولة أو الصفر الأول
    const digitsOnly = cleanPhone.replace(/\D/g, '')
    const localDigits = digitsOnly.replace(/^0+/, '')

    // تحقق من Rate Limit
    if (!checkRateLimit(cleanPhone)) {
      return NextResponse.json(
        { error: 'محاولات كثيرة — انتظر 5 دقائق وحاول مرة أخرى' },
        { status: 429 }
      )
    }

    if (localDigits.length < 7) {
      return NextResponse.json({ error: 'رقم الجوال أو رمز PIN غير صحيح' }, { status: 401 })
    }

    const supabase = sb()

    const { data: staff, error } = await supabase
      .from('staff_members')
      .select('id,name,org_id,branch_id,phone,pin,is_active,permissions,role,organizations(name),branches(name)')
      .ilike('phone', '%' + localDigits)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !staff) {
      return NextResponse.json({ error: 'رقم الجوال أو رمز PIN غير صحيح' }, { status: 401 })
    }

    // تحقق من الـ PIN مع دعم النصوص القديمة
    const pinStr = String(pin)
    const storedPin = String((staff as any).pin)
    const pinValid = storedPin.startsWith('$2') 
      ? await bcrypt.compare(pinStr, storedPin)
      : storedPin === pinStr
    
    if (!pinValid) {
      return NextResponse.json({ error: 'رقم الجوال أو رمز PIN غير صحيح' }, { status: 401 })
    }

    // إعادة تعيين العداد عند النجاح
    attempts.delete(cleanPhone)

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
