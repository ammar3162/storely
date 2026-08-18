import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: org } = await supabase.from('organizations').select('res_wa_session_id').eq('id', org_id).maybeSingle()
    const sessionId = (org as any)?.res_wa_session_id
    if (!sessionId) return NextResponse.json({ error: 'ما فيه جلسة بعد — ابدأ الربط أول' }, { status: 400 })

    const token = process.env.WASENDER_PERSONAL_ACCESS_TOKEN
    if (!token) return NextResponse.json({ error: 'إعدادات الخادم ناقصة' }, { status: 500 })

    const res = await fetch(`https://www.wasenderapi.com/api/whatsapp-sessions/${sessionId}/qrcode`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const j = await res.json()
    if (!res.ok || !j?.success) {
      return NextResponse.json({ error: j?.message || 'فشل جلب رمز QR' }, { status: 500 })
    }

    return NextResponse.json({ success: true, qrCode: j.data?.qrCode })
  } catch (err: any) {
    console.error('WA_QRCODE_FAILED:', err?.message || err)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
