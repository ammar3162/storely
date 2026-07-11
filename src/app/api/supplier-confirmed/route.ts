import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logConfirmation } from '@/lib/escalateSupplierOrder'

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '')
  if (clean.startsWith('+')) return clean.slice(1)
  if (clean.startsWith('00')) return clean.slice(2)
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return clean
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ success: false })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order } = await (db as any).from('supplier_orders').select('*').eq('token', token).single()
    if (!order) return NextResponse.json({ success: false })

    await logConfirmation(order)

    const { data: org } = await db.from('organizations').select('name,whatsapp_number').eq('id', order.org_id).single()
    if (!org?.whatsapp_number) return NextResponse.json({ success: false })

    const items = (order.items || []).map((i: any) => `• ${i.name} — ${i.qty} ${i.unit}`).join('\n')
    const msg = `🟢 *Storely*\n\nمرحباً ${(org as any).name}،\n\n✅ المورد *${order.supplier_name}* أكد طلبك\n\n${items}\n\nسيتم التوصيل قريباً`

    const phone = formatPhone((org as any).whatsapp_number)
    await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'X-Session-Id': process.env.WASENDER_SESSION_ID!,
      },
      body: JSON.stringify({ to: phone, text: msg }),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message })
  }
}
