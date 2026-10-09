import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeEmail } from '@/lib/accountantPortalAuth'
import { hashAgentCode, makeAgentSession, agentCookie, AGENT_CODE_MAX_ATTEMPTS } from '@/lib/agentAuth'
import { clientIp } from '@/lib/loginThrottle'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const b = await req.json()
    const email = normalizeEmail(b.email), code = String(b.code || '').replace(/\D/g, '')
    if (!email || code.length !== 6) return NextResponse.json({ error: 'اكتب الرمز المكوّن من ٦ أرقام' }, { status: 400 })
    const db = sb()
    const { data: row } = await db.from('agent_login_codes').select('id,code_hash,attempts,expires_at')
      .eq('email', email).is('used_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const r = row as any
    if (!r || Date.parse(r.expires_at) < Date.now()) return NextResponse.json({ error: 'الرمز انتهى — اطلب رمز جديد' }, { status: 400 })
    if (r.attempts >= AGENT_CODE_MAX_ATTEMPTS) return NextResponse.json({ error: 'محاولات كثيرة — اطلب رمز جديد' }, { status: 429 })
    if (r.code_hash !== hashAgentCode(email, code)) {
      await db.from('agent_login_codes').update({ attempts: r.attempts + 1 } as any).eq('id', r.id)
      return NextResponse.json({ error: 'الرمز غلط' }, { status: 400 })
    }
    await db.from('agent_login_codes').update({ used_at: new Date().toISOString() } as any).eq('id', r.id)
    const { data: agent } = await db.from('sales_agents').select('id,status').eq('email', email).maybeSingle()
    if (!agent || (agent as any).status !== 'active') return NextResponse.json({ error: 'الحساب موقوف — تواصل معنا' }, { status: 403 })
    await db.from('sales_agents').update({ last_login_at: new Date().toISOString() } as any).eq('id', (agent as any).id)
    const { data: sess } = await db.from('agent_sessions').insert({ agent_id: (agent as any).id, ip: clientIp(req), user_agent: (req.headers.get('user-agent') || '').slice(0, 200) || null } as any).select('id').single()
    if (!sess) return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
    const res = NextResponse.json({ success: true })
    res.headers.set('Set-Cookie', agentCookie(makeAgentSession((agent as any).id, (sess as any).id)))
    return res
  } catch {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}
