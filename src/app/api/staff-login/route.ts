import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // تحقق من Rate Limit
    if (!checkRateLimit(cleanPhone)) {
      return NextResponse.json(
        { error: 'محاولات كثيرة — انتظر 5 دقائق وحاول مرة أخرى' },
        { status: 429 }
      )
    }

    const supabase = sb()

    const { data: staff, error } = await supabase
      .from('staff_members')
      .select('id,name,org_id,branch_id,phone,pin,is_active,permissions,organizations(name),branches(name)')
      .eq('phone', cleanPhone)
      .eq('pin', String(pin))
      .eq('is_active', true)
      .maybeSingle()

    if (error || !staff) {
      return NextResponse.json({ error: 'رقم الجوال أو رمز PIN غير صحيح' }, { status: 401 })
    }

    // إعادة تعيين العداد عند النجاح
    attempts.delete(cleanPhone)

    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        org_id: staff.org_id,
        branch_id: staff.branch_id,
        org_name: (staff as any).organizations?.name || '',
        branch_name: (staff as any).branches?.name || '',
        permissions: (staff as any).permissions || {dispense:true,inventory:false,purchases:false,reports:false},
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
