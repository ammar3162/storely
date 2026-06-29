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
    const { org_id, product_id, new_qty, reorder_point } = await req.json()
    if (!org_id) return NextResponse.json({ success: false, message: 'org_id مطلوب' })

    // أرسل فقط إذا الصنف وصل للحد بالضبط الآن
    if (product_id !== undefined) {
      // إذا الكمية الجديدة أكبر من الحد — لا ترسل
      if (new_qty > reorder_point) return NextResponse.json({ success: false, message: 'المخزون كافٍ' })
      // إذا الكمية قبل الصرف كانت أقل من الحد — كان ناقص مسبقاً، لا ترسل مرة ثانية
      if (new_qty < reorder_point - 1) return NextResponse.json({ success: false, message: 'كان ناقصاً مسبقاً' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: org } = await supabase.from('organizations').select('*').eq('id', org_id).single()
    if (!org?.whatsapp_number) return NextResponse.json({ success: false, message: 'لا يوجد رقم واتساب' })

    const { data: products } = await supabase
      .from('products').select('name,qty,unit,reorder_point')
      .eq('org_id', org_id).eq('is_active', true)

    let low = (products || []).filter((p: any) => p.qty <= p.reorder_point)
    // إذا محدد صنف معين، أرسل فقط ذلك الصنف
    if (product_id) low = low.filter((p: any) => p.id === product_id)
    if (low.length === 0) return NextResponse.json({ success: true, sent: 0 })

    const list = low.map((p: any) => `⚠️ *${p.name}* وصل للحد الأدنى\nالمتبقي: *${p.qty} ${p.unit}*`).join('\n\n')
    const msg = `🟢 *Storely*\n\nمرحباً ${org.name}،\n\n${list}\n\nيرجى الطلب في أقرب وقت`

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
