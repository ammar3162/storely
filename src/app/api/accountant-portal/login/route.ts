import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeEmail, isEmail, newCode, hashCode, CODE_MINUTES } from '@/lib/accountantPortalAuth'
import { clientIp } from '@/lib/loginThrottle'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const GENERIC = 'إذا كان إيميلك مدعو من منشأة، بيوصلك رمز الدخول خلال دقيقة'

// طلب رمز دخول لبوابة المحاسب — نفس الرد للكل (ما نكشف مين مدعو)
export async function POST(req: Request) {
  try {
    const email = normalizeEmail((await req.json()).email)
    if (!isEmail(email)) return NextResponse.json({ error: 'اكتب إيميل صحيح' }, { status: 400 })
    const db = sb(), ip = clientIp(req)
    const hourAgo = new Date(Date.now() - 3600e3).toISOString()
    const [{ count: byEmail }, { count: byIp }] = await Promise.all([
      db.from('accountant_login_codes').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', hourAgo),
      db.from('accountant_login_codes').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', hourAgo),
    ])
    if ((byEmail || 0) >= 5 || (byIp || 0) >= 20) return NextResponse.json({ error: 'طلبت رموز كثيرة — جرّب بعد ساعة' }, { status: 429 })

    const { count: invited } = await db.from('accountant_access').select('id', { count: 'exact', head: true }).eq('email', email)
    if (!invited) return NextResponse.json({ success: true, message: GENERIC })

    const code = newCode()
    await db.from('accountant_login_codes').insert({ email, code_hash: hashCode(email, code), ip, expires_at: new Date(Date.now() + CODE_MINUTES * 60e3).toISOString() } as any)
    await sendEmail({
      to: email, subject: `رمز الدخول لبوابة المحاسب: ${code}`,
      html: brandEmail({ title: 'رمز الدخول لبوابة المحاسب', preheader: `رمزك ${code}`, code,
        paragraphs: [`اكتب هذا الرمز في صفحة الدخول. صالح ${CODE_MINUTES} دقايق.`], small: 'إذا ما طلبت الرمز، تجاهل هالإيميل.' }),
    })
    return NextResponse.json({ success: true, message: GENERIC })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}
