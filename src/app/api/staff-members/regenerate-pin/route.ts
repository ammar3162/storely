import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { loadOwnedStaff } from '@/lib/staffAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// يولّد رمز PIN جديد على الخادم، يحفظه مشفّر، ويرجّعه مرة وحدة للمالك يعطيه للموظف
export async function POST(req: Request) {
  try {
    const { org_id, id } = await req.json()
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const staff = await loadOwnedStaff(db, access, org_id, id)
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const pin = String(crypto.randomInt(1000, 10000))
    const { error } = await db.from('staff_members').update({ pin: await bcrypt.hash(pin, 10) } as any).eq('id', id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, pin })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
