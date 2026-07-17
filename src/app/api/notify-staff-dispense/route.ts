import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { WHATSAPP_PAUSED } from '@/lib/whatsappPause'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

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
  if (WHATSAPP_PAUSED) return NextResponse.json({ success: true, skipped: 'paused' })
  try {
    const auth = verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    const org_id = auth.data!.org_id

    const { staff_name, product_name, qty, unit } = await req.json()
    if (!org_id) return NextResponse.json({ success: false })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: org } = await db.from('organizations').select('name,whatsapp_number').eq('id', org_id).single()
    if (!(org as any)?.whatsapp_number) return NextResponse.json({ success: false })

    // إشعار داخل النظام — يصل دائماً بغض النظر عن موافقة واتساب
    await (db as any).from('notifications').insert({
      org_id, title: `عملية صرف: ${staff_name}`, message: `${product_name} — ${qty} ${unit}`, type: 'info', read: false
    })

    const { data: ownerProfile } = await db.from('profiles').select('whatsapp_consent').eq('org_id', org_id).eq('role', 'owner').maybeSingle()
    if ((ownerProfile as any)?.whatsapp_consent !== true) return NextResponse.json({ success: false, message: 'لا يوجد موافقة واتساب' })

    const now = new Date()
    const timeStr = now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Riyadh'})
    const dateStr = now.toLocaleDateString('ar-SA',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Riyadh'})
    const msg = `🟢 *Storely*\n\nمرحباً ${(org as any).name}،\n\n👤 *${staff_name}* قام بصرف:\n• ${product_name} — *${qty} ${unit}*\n\n🕐 ${timeStr} · ${dateStr}`

    await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'X-Session-Id': process.env.WASENDER_SESSION_ID!,
      },
      body: JSON.stringify({ to: formatPhone((org as any).whatsapp_number), text: msg }),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message })
  }
}
