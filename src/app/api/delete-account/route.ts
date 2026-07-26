import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, user_id } = await req.json()
    if (!org_id || !user_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    // بدل الحذف الفوري — نحدد موعد حذف بعد 15 يوم (فترة سماح)
    const deletionDate = new Date()
    deletionDate.setDate(deletionDate.getDate() + 15)

    const { error } = await sb().from('organizations')
      .update({ deletion_scheduled_at: deletionDate.toISOString() } as any)
      .eq('id', org_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, deletion_scheduled_at: deletionDate.toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
