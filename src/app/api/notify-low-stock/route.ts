import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const isManual = authHeader === 'Bearer ' + process.env.CRON_SECRET

    const { data: orgs } = await supabase.from('organizations').select('id, name, whatsapp_number')
    if (!orgs || orgs.length === 0) return NextResponse.json({ success: false, message: 'لا توجد مؤسسات' })

    let totalSent = 0

    for (const org of orgs) {
      const { data: lowItems } = await supabase
        .from('products')
        .select('name, qty, unit, reorder_point')
        .eq('org_id', org.id)
        .eq('is_active', true)
        .lte('qty', supabase.rpc as any)

      const { data: products } = await supabase
        .from('products')
        .select('name, qty, unit, reorder_point')
        .eq('org_id', org.id)
        .eq('is_active', true)

      const low = (products || []).filter(p => p.qty <= p.reorder_point)
      if (low.length === 0) continue

      const productList = low.map(p =>
        '• ' + p.name + ': ' + p.qty + ' ' + p.unit + ' (الحد الأدنى: ' + p.reorder_point + ')'
      ).join('\n')

      const message =
        '🔔 *تنبيه مخزون — ' + org.name + '*\n\n' +
        'الأصناف التالية وصلت للحد الأدنى:\n\n' +
        productList + '\n\n' +
        '⚡ يرجى إعادة الطلب في أقرب وقت\n\n' +
        '_Storely — نظام إدارة المخزون_'

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

      await supabase.from('whatsapp_logs').insert({
        org_id: org.id,
        phone: org.whatsapp_number,
        message,
        status: response.ok ? 'sent' : 'failed',
      })

      if (response.ok) totalSent++
    }

    return NextResponse.json({ success: true, sent: totalSent })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  return POST(req)
}
