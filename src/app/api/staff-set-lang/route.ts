import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const auth = verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { staff_id } = auth.data!

    const { lang } = await req.json()
    if (!['ar', 'en'].includes(lang)) return NextResponse.json({ error: 'لغة غير مدعومة' }, { status: 400 })

    const supabase = sb()
    const { error } = await supabase.from('staff_members').update({ preferred_lang: lang } as any).eq('id', staff_id)
    if (error) return NextResponse.json({ error: 'فشل الحفظ' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
