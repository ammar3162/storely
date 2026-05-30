import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { products, orgName, phone } = await req.json()

    if (!products || products.length === 0) {
      return NextResponse.json({ success: false, message: 'لا توجد أصناف ناقصة' })
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID!
    const authToken  = process.env.TWILIO_AUTH_TOKEN!
    const from       = process.env.TWILIO_WHATSAPP_FROM!
    const to         = `whatsapp:${phone}`

    const productList = products.map((p: any) => `• ${p.name}: ${p.qty} ${p.unit} (الحد الأدنى: ${p.reorder_point})`).join('\n')

    const message = `🔔 *تنبيه مخزون — ${orgName}*\n\nالأصناف التالية وصلت للحد الأدنى:\n\n${productList}\n\n⚡ يرجى إعادة الطلب في أقرب وقت\n\n_Storely — نظام إدارة المخزون_`

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: to, Body: message }).toString(),
      }
    )

    const data = await response.json()

    if (response.ok) {
      return NextResponse.json({ success: true, sid: data.sid })
    } else {
      return NextResponse.json({ success: false, error: data.message }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}