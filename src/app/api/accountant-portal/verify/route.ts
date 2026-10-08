import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeEmail, hashCode, makeSession, sessionCookie, CODE_MAX_ATTEMPTS } from '@/lib/accountantPortalAuth'
import { clientIp } from '@/lib/loginThrottle'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// التحقق من الرمز → إنشاء حساب المحاسب (أول مرة) + تفعيل دعواته + جلسة
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const email = normalizeEmail(b.email), code = String(b.code || '').replace(/\D/g, '')
    if (!email || code.length !== 6) return NextResponse.json({ error: 'اكتب الرمز المكوّن من ٦ أرقام' }, { status: 400 })
    const db = sb()
    const { data: row } = await db.from('accountant_login_codes').select('id,code_hash,attempts,expires_at')
      .eq('email', email).is('used_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const r = row as any
    if (!r || Date.parse(r.expires_at) < Date.now()) return NextResponse.json({ error: 'الرمز انتهى — اطلب رمز جديد' }, { status: 400 })
    if (r.attempts >= CODE_MAX_ATTEMPTS) return NextResponse.json({ error: 'محاولات كثيرة — اطلب رمز جديد' }, { status: 429 })
    if (r.code_hash !== hashCode(email, code)) {
      await db.from('accountant_login_codes').update({ attempts: r.attempts + 1 } as any).eq('id', r.id)
      return NextResponse.json({ error: 'الرمز غلط' }, { status: 400 })
    }
    await db.from('accountant_login_codes').update({ used_at: new Date().toISOString() } as any).eq('id', r.id)

    const { data: invite } = await db.from('accountant_access').select('name').eq('email', email).not('name', 'is', null).limit(1).maybeSingle()
    const { data: user, error } = await db.from('accountant_users').upsert({ email, last_login_at: new Date().toISOString() } as any, { onConflict: 'email' }).select('id,name').single()
    if (error || !user) return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
    if (!(user as any).name && (invite as any)?.name) await db.from('accountant_users').update({ name: (invite as any).name } as any).eq('id', (user as any).id)
    // الإيميل تأكد بالرمز → كل دعواته تتفعل، وكل منشأة يوصلها إشعار إن محاسبها دخل
    const { data: activated } = await db.from('accountant_access').update({ accountant_id: (user as any).id, status: 'active', accepted_at: new Date().toISOString() } as any)
      .eq('email', email).eq('status', 'pending').select('org_id,name')
    if (activated?.length) await db.from('notifications').insert((activated as any[]).map(a => ({
      org_id: a.org_id, type: 'info', read: false, title: 'محاسبك دخل بوابة المحاسب',
      message: `${a.name || email} قبل الدعوة وصار يشوف بيانات منشأتك. تقدر تسحب الإذن من الإعدادات ← المحاسب.`,
    })) as any)

    // جهاز جديد — المحاسب يشوفه في «أجهزتي» ويقدر يطلّعه
    const { data: sess } = await db.from('accountant_sessions').insert({ accountant_id: (user as any).id, ip: clientIp(req),
      user_agent: (req.headers.get('user-agent') || '').slice(0, 200) || null } as any).select('id').single()
    if (!sess) return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })

    const res = NextResponse.json({ success: true })
    res.headers.set('Set-Cookie', sessionCookie(makeSession((user as any).id, (sess as any).id)))
    return res
  } catch {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}
