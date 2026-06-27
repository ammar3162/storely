import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { org_id } = await req.json()
    if (!org_id) return NextResponse.json({ success: false, message: 'org_id مطلوب' })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: org } = await supabase.from('organizations').select('*').eq('id', org_id).single()
    if (!org?.whatsapp_number) return NextResponse.json({ success: false, message: 'لا يوجد رقم واتساب' })

    const { data: products } = await supabase
      .from('products').select('name,qty,unit,reorder_point')
      .eq('org_id', org_id).eq('is_active', true)

    const low = (products || []).filter((p: any) => p.qty <= p.reorder_point)
    if (low.length === 0) return NextResponse.json({ success: true, sent: 0 })

    const list = low.map((p: any) => `• ${p.name}: ${p.qty} ${p.unit} (الحد: ${p.reorder_point})`).join('\n')
    const msg = `🔔 *تنبيه مخزون — ${org.name}*\n\nالأصناف التالية وصلت للحد الأدنى:\n\n${list}\n\n⚡ يرجى إعادة الطلب\n\n_Storely_`

    const phone = formatPhone(org.whatsapp_number)
    const res = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'X-Session-Id': process.env.WASENDER_SESSION_ID!,
      },
      body: JSON.stringify({ to: phone, text: msg }),
    })

    return NextResponse.json({ success: res.ok, sent: res.ok ? 1 : 0 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
