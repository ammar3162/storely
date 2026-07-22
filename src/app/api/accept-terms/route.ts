import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 })

    const supabase = sb()
    const { data: profile } = await supabase.from('profiles').select('org_id,role').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'الملف الشخصي غير موجود' }, { status: 404 })

    const { data: settingsRow } = await supabase.from('platform_settings').select('terms_version').eq('id', 1).single()
    const TERMS_VERSION = (settingsRow as any)?.terms_version || '2026-06-b'

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = req.headers.get('user-agent') || null
    const acceptedAt = new Date().toISOString()

    await supabase.from('profiles').update({ terms_accepted_at: acceptedAt, terms_version_accepted: TERMS_VERSION }).eq('id', user.id)

    await (supabase as any).from('consent_logs').insert({
      profile_id: user.id,
      org_id: profile.org_id,
      terms_version: TERMS_VERSION,
      accepted_at: acceptedAt,
      ip_address: ip,
      user_agent: userAgent,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
