import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: orgs } = await supabase.from('organizations').select('*')
    if (!orgs || orgs.length === 0)
      return NextResponse.json({ success:true, message:'لا توجد مؤسسات' })

    let sent = 0
    for (const org of orgs) {
      const { data: products } = await supabase
        .from('products').select('name,qty,unit,reorder_point')
        .eq('org_id', org.id).eq('is_active', true)

      const low = (products||[]).filter(p => p.qty <= p.reorder_point)
      if (low.length === 0) continue

      const list = low.map(p =>
        '• ' + p.name + ': ' + p.qty + ' ' + p.unit + ' (الحد الأدنى: ' + p.reorder_point + ')'
      ).join('\n')

      const msg =
        '🔔 *تنبيه مخزون — ' + org.name + '*\n\n' +
        'الأصناف التالية وصلت للحد الأدنى:\n\n' +
        list + '\n\n' +
        '⚡ يرجى إعادة الطلب في أقرب وقت\n\n' +
        '_Storely — نظام إدارة المخزون_'

      const phone = org.whatsapp_number?.startsWith('+')
        ? org.whatsapp_number
        : '+' + org.whatsapp_number

      const sid  = process.env.TWILIO_ACCOUNT_SID!
      const auth = process.env.TWILIO_AUTH_TOKEN!
      const from = process.env.TWILIO_WHATSAPP_FROM!

      const res = await fetch(
        'https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json',
        {
          method:'POST',
          headers:{
            'Authorization':'Basic ' + Buffer.from(sid+':'+auth).toString('base64'),
            'Content-Type':'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From:from, To:'whatsapp:'+phone, Body:msg }).toString(),
        }
      )

      const result = await res.json()
      await supabase.from('whatsapp_logs').insert({
        org_id: org.id, phone, message: msg,
        status: res.ok ? 'sent' : 'failed',
      })
      if (res.ok) sent++
      else console.error('Twilio error:', result.message)
    }

    return NextResponse.json({ success:true, sent })
  } catch (err:any) {
    return NextResponse.json({ success:false, error:err.message }, { status:500 })
  }
}

export async function GET() { return POST() }
