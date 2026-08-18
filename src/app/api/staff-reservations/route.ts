import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const auth = verifyStaffToken(extractStaffToken(req))
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { org_id: orgId } = auth.data!

  const supabase = sb()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  let q = supabase.from('reservations').select('*').eq('org_id', orgId)
  if (date) q = q.eq('booking_date', date)
  const { data } = await q.order('booking_time')

  return NextResponse.json({ success: true, reservations: data || [] })
}

export async function PATCH(req: Request) {
  const auth = verifyStaffToken(extractStaffToken(req))
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { org_id: orgId } = auth.data!

  const { reservation_id, status } = await req.json()
  if (!reservation_id || !status) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  if (!['pending','confirmed','ready','completed','cancelled'].includes(status)) {
    return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 })
  }

  const supabase = sb()
  const { data: existing } = await supabase.from('reservations').select('org_id').eq('id', reservation_id).maybeSingle()
  if (!existing || (existing as any).org_id !== orgId) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { error } = await supabase.from('reservations').update({ status } as any).eq('id', reservation_id)
  if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })

  return NextResponse.json({ success: true })
}
