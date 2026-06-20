import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const supabase = sb()
    const cleanPhone = String(phone).replace(/\s/g, '')

    const { data: staff, error } = await supabase
      .from('staff_members')
      .select('id,name,org_id,branch_id,phone,pin,is_active,organizations(name),branches(name)')
      .eq('phone', cleanPhone)
      .eq('pin', String(pin))
      .eq('is_active', true)
      .maybeSingle()

    if (error || !staff) {
      return NextResponse.json({ error: 'رقم الجوال أو رمز PIN غير صحيح' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        org_id: staff.org_id,
        branch_id: staff.branch_id,
        org_name: (staff as any).organizations?.name || '',
        branch_name: (staff as any).branches?.name || '',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
