import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeEmail, isEmail, newCode } from '@/lib/accountantPortalAuth'
import { hashAgentCode, AGENT_CODE_MINUTES } from '@/lib/agentAuth'
import { clientIp } from '@/lib/loginThrottle'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const GENERIC = 'إذا كان إيميلك مسجّل كمندوب، بيوصلك رمز الدخول خلال دقيقة'

// رمز دخول لمحفظة المندوب — نفس الرد للكل (ما نكشف مين مسجّل)
export async function POST(req: Request) {
  try {
    const email = normalizeEmail((await req.json()).email)
    if (!isEmail(email)) return NextResponse.json({ error: 'اكتب إيميل صحيح' }, { status: 400 })
    const db = sb(), ip = clientIp(req)
    const hourAgo = new Date(Date.now() - 3600e3).toISOString()
    const [{ count: byEmail }, { count: byIp }] = await Promise.all([
      db.from('agent_login_codes').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', hourAgo),
      db.from('agent_login_codes').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', hourAgo),
    ])
    if ((byEmail || 0) >= 5 || (byIp || 0) >= 20) return NextResponse.json({ error: 'طلبت رموز كثيرة — جرّب بعد ساعة' }, { status: 429 })
    const { data: agent } = await db.from('sales_agents').select('id,status').eq('email', email).maybeSingle()
    if (!agent || (agent as any).status !== 'active') return NextResponse.json({ success: true, message: GENERIC })
    const code = newCode()
    await db.from('agent_login_codes').insert({ email, code_hash: hashAgentCode(email, code), ip, expires_at: new Date(Date.now() + AGENT_CODE_MINUTES * 60e3).toISOString() } as any)
    await sendEmail({ to: email, subject: `رمز دخول محفظة المندوب: ${code}`,
      html: brandEmail({ title: 'رمز دخول محفظتك', preheader: `رمزك ${code}`, code, paragraphs: [`اكتب هذا الرمز في صفحة الدخول. صالح ${AGENT_CODE_MINUTES} دقايق.`], small: 'إذا ما طلبت الرمز، تجاهل هالإيميل.' }) })
    return NextResponse.json({ success: true, message: GENERIC })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}
