import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeEmail, isEmail, newCode, hashCode, CODE_MINUTES } from '@/lib/accountantPortalAuth'
import { clientIp } from '@/lib/loginThrottle'
import { sendEmail } from '@/lib/email'
import { hitLimits, limit, waitText } from '@/lib/rateLimit'
import { brandEmail } from '@/lib/emailTemplates'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SENT = 'أرسلنا رمز الدخول إلى بريدك، ويصلك خلال دقيقة'
const NOT_LINKED = 'هذا البريد غير مربوط بأي منشأة. اطلب من صاحب المنشأة إضافتك من «الإعدادات ← المحاسب»، ثم حاول مرة أخرى'

// طلب رمز دخول لبوابة المحاسب. قرار المالك (2026-11-17): البريد غير المربوط بأي منشأة يأخذ رسالة واضحة فوراً
// بدل «سيصلك الرمز». حتى لا يُستغل ذلك لفحص آلاف الإيميلات، كل طلب يُحسب على الجهاز (accLoginIp: 20 بالساعة).
export async function POST(req: Request) {
  try {
    const email = normalizeEmail((await req.json()).email)
    if (!isEmail(email)) return NextResponse.json({ error: 'اكتب بريداً إلكترونياً صحيحاً' }, { status: 400 })
    const db = sb(), ip = clientIp(req)
    const wait = await hitLimits([limit('accLoginIp', ip)], db)
    if (wait > 0) return NextResponse.json({ error: `محاولات كثيرة من هذا الجهاز، حاول بعد ${waitText(wait)}` }, { status: 429 })
    const hourAgo = new Date(Date.now() - 3600e3).toISOString()
    const [{ count: byEmail }, { count: byIp }] = await Promise.all([
      db.from('accountant_login_codes').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', hourAgo),
      db.from('accountant_login_codes').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', hourAgo),
    ])
    if ((byEmail || 0) >= 5 || (byIp || 0) >= 20) return NextResponse.json({ error: 'طلبت رموزاً كثيرة — حاول بعد ساعة' }, { status: 429 })

    // فقط من له إذن على منشأة: دعوة من مالكها، أو إسناد من محاسبها (والمالك يصله إشعار) — الإضافة للفريق وحدها لا تكفي
    const { count: invited } = await db.from('accountant_access').select('id', { count: 'exact', head: true }).eq('email', email)
    if (!invited) return NextResponse.json({ error: NOT_LINKED }, { status: 404 })

    const code = newCode()
    await db.from('accountant_login_codes').insert({ email, code_hash: hashCode(email, code), ip, expires_at: new Date(Date.now() + CODE_MINUTES * 60e3).toISOString() } as any)
    await sendEmail({
      to: email, subject: `رمز الدخول لبوابة المحاسب: ${code}`,
      html: brandEmail({ title: 'رمز الدخول لبوابة المحاسب', preheader: `رمزك ${code}`, code,
        paragraphs: [`اكتب هذا الرمز في صفحة الدخول. صالح لمدة ${CODE_MINUTES} دقائق.`], small: 'إذا لم تطلب الرمز، فتجاهل هذا البريد.' }),
    })
    return NextResponse.json({ success: true, message: SENT })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
