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
    const { data: org } = await supabase.from('organizations').select('res_wa_session_id,res_wa_api_key').eq('id', org_id).maybeSingle()
    const sessionId = (org as any)?.res_wa_session_id
    const apiKey = (org as any)?.res_wa_api_key
    if (!sessionId || !apiKey) return NextResponse.json({ success: true, status: 'disconnected' })

    // فحص الحالة يستخدم مفتاح الجلسة نفسها — مو المفتاح الإداري الرئيسي
    const res = await fetch('https://www.wasenderapi.com/api/status', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const j = await res.json().catch(() => ({}))
    const status = j?.data?.status || j?.status || 'disconnected'

    await supabase.from('organizations').update({ res_wa_status: status } as any).eq('id', org_id)

    return NextResponse.json({ success: true, status })
  } catch (err: any) {
    console.error('WA_STATUS_FAILED:', err?.message || err)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
