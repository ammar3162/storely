import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success:false, error:'غير مصرح' }, { status:401 })

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ success:false, error:'لا يوجد ملف شخصي' }, { status:400 })

    const { data: org } = await supabase.from('organizations').select('*').eq('id', profile.org_id).single()
    if (!org) return NextResponse.json({ success:false, error:'لا توجد مؤسسة' }, { status:400 })

    const { data: products } = await supabase
      .from('products').select('name, qty, unit, reorder_point')
      .eq('org_id', profile.org_id).eq('is_active', true)

    const low = (products || []).filter(p => p.qty <= p.reorder_point)
    if (low.length === 0) return NextResponse.json({ success:true, message:'لا توجد منتجات ناقصة' })

    const productList = low.map(p =>
      '• ' + p.name + ': ' + p.qty + ' ' + p.unit + ' (الحد الأدنى: ' + p.reorder_point + ')'
    ).join('\n')

    const message =
      '🔔 *تنبيه مخزون — ' + org.name + '*\n\n' +
      'الأصناف التالية وصلت للحد الأدنى:\n\n' +
      productList + '\n\n' +
      '⚡ يرجى إعادة الطلب في أقرب وقت\n\n' +
      '_Storely — نظام إدارة المخزون_'

    const phone = org.whatsapp_number.startsWith('+') ? org.whatsapp_number : '+' + org.whatsapp_number
    const accountSid = process.env.TWILIO_ACCOUNT_SID!
    const authToken  = process.env.TWILIO_AUTH_TOKEN!
    const from       = process.env.TWILIO_WHATSAPP_FROM!
    const to         = 'whatsapp:' + phone

    const response = await fetch(
      'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: to, Body: message }).toString(),
      }
    )

    const result = await response.json()

    await supabase.from('whatsapp_logs').insert({
      org_id: profile.org_id,
      phone,
      message,
      status: response.ok ? 'sent' : 'failed',
    })

    if (response.ok) return NextResponse.json({ success:true, sid: result.sid })
    return NextResponse.json({ success:false, error: result.message }, { status:400 })

  } catch (err: any) {
    return NextResponse.json({ success:false, error: err.message }, { status:500 })
  }
}

export async function GET() { return POST() }
