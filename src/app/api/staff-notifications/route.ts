import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// جلب إشعارات الموظف (بتوكنه)
export async function GET(req: Request) {
  try {
    const auth = verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { staff_id } = auth.data!

    const supabase = sb()
    const { data, error } = await supabase
      .from('staff_notifications')
      .select('*')
      .eq('staff_id', staff_id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    return NextResponse.json({ success: true, notifications: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تعليم إشعار (أو الكل) كمقروء
export async function PATCH(req: Request) {
  try {
    const auth = verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { staff_id } = auth.data!

    const { id, markAll } = await req.json()
    const supabase = sb()

    if (markAll) {
      const { error } = await supabase.from('staff_notifications').update({ is_read: true } as any).eq('staff_id', staff_id).eq('is_read', false)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    } else if (id) {
      const { error } = await supabase.from('staff_notifications').update({ is_read: true } as any).eq('id', id).eq('staff_id', staff_id)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    } else {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
