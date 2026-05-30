import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  // تحقق من الـ authorization
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // جلب كل المؤسسات
  const { data: orgs } = await supabase.from('organizations').select('id, name')
  if (!orgs) return NextResponse.json({ success: false })

  let sentCount = 0

  for (const org of orgs) {
    // جلب المنتجات الناقصة
    const { data: lowStock } = await supabase
      .from('products')
      .select('*')
      .eq('org_id', org.id)
      .filter('qty', 'lte', supabase.rpc as any)

    // جلب بطريقة مختلفة
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('org_id', org.id)

    const low = (products || []).filter(p => p.qty <= p.reorder_point && p.reorder_point > 0)
    if (low.length === 0) continue

    // جلب رقم جوال المدير
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('org_id', org.id)
      .eq('role', 'owner')
      .single()

    if (!profile?.phone) continue

    const phone = profile.phone.startsWith('+')
      ? profile.phone
      : `+966${profile.phone.replace(/^0/, '')}`

    // إرسال الإشعار
    const productList = low.map(p =>
      `• ${p.name}: ${p.qty} ${p.unit} (الحد الأدنى: ${p.reorder_point})`
    ).join('\n')

    const message = `🔔 *تنبيه مخزون — ${org.name}*\n\nالأصناف التالية وصلت للحد الأدنى:\n\n${productList}\n\n⚡ يرجى إعادة الطلب في أقرب وقت\n\n_Storely — نظام إدارة المخزون_`

    const accountSid = process.env.TWILIO_ACCOUNT_SID!
    const authToken  = process.env.TWILIO_AUTH_TOKEN!

    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:+14155238886`,
          To: `whatsapp:${phone}`,
          Body: message
        }).toString(),
      }
    )

    sentCount++
  }

  return NextResponse.json({ success: true, sent: sentCount })
}