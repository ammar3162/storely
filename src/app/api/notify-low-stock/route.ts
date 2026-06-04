import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success:false, error:'غير مصرح' }, { status:401 })

    const { data: profile } = await supabase
      .from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ success:false, error:'لا يوجد ملف شخصي' }, { status:400 })

    const { data: org } = await supabase
      .from('organizations').select('*').eq('id', profile.org_id).single()
    if (!org) return NextResponse.json({ success:false, error:'لا توجد مؤسسة' }, { status:400 })

    const { data: lowItems } = await supabase
      .from('products')
      .select('name, qty, unit, reorder_point')
      .eq('org_id', profile.org_id)
      .lte('qty', 'reorder_point')
      .eq('is_active', true)

    if (!lowItems || lowItems.length === 0) {
      return NextResponse.json({ success:true, message:'لا توجد منتجات ناقصة' })
    }

    const productList = lowItems
      .map(p => '• ' + p.name + ': ' + p.qty + ' ' + p.unit + ' (الحد الادنى: ' + p.reorder_point + ')')
      .join('\n')

    const message =
      'تنبيه مخزون — ' + org.name + '\n\n' +
      'الاصناف التالية وصلت للحد الادنى:\n\n' +
      productList + '\n\n' +
      'يرجى اعادة الطلب في اقرب وقت\n\n' +
      'Storely — نظام ادارة المخزون'

    const accountSid = process.env.TWILIO_ACCOUNT_SID!
    const authToken  = process.env.TWILIO_AUTH_TOKEN!
    const from       = process.env.TWILIO_WHATSAPP_FROM!
    const to         = 'whatsapp:' + org.whatsapp_number

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

    if (response.ok) {
      await supabase.from('whatsapp_logs').insert({
        org_id: profile.org_id,
        phone: org.whatsapp_number,
        message,
        status: 'sent',
      })
      return NextResponse.json({ success:true, sid: result.sid })
    } else {
      await supabase.from('whatsapp_logs').insert({
        org_id: profile.org_id,
        phone: org.whatsapp_number,
        message,
        status: 'failed',
      })
      return NextResponse.json({ success:false, error: result.message }, { status:400 })
    }
  } catch (err: any) {
    return NextResponse.json({ success:false, error: err.message }, { status:500 })
  }
}
