import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { quote_request_id, rep_name, rep_phone, delivery_date, supplier_business_name, org_id } = await req.json()
    if (!quote_request_id || !rep_name || !delivery_date || !org_id) {
      return NextResponse.json({ success: false, error: 'بيانات ناقصة' }, { status: 400 })
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: updateErr } = await db.from('quote_requests')
      .update({ status: 'confirmed', delivery_date, rep_name, rep_phone })
      .eq('id', quote_request_id)
    if (updateErr) return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 })

    const { error: notifErr } = await db.from('notifications').insert({
      org_id,
      title: 'مورد وافق على التوريد',
      message: `${supplier_business_name || 'المورد'} وافق على توريد طلبك — المندوب: ${rep_name} (${rep_phone || ''}) — موعد التوريد: ${delivery_date}`,
      type: 'success',
    })
    if (notifErr) console.error('notif insert failed:', notifErr.message)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
