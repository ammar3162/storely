import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readInviteToken, currentAccountant, sessionCookie } from '@/lib/accountantPortalAuth'
import { acceptInvite, declineInvite, sectionLabels } from '@/lib/accountantInvite'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UUID_RE = /^[0-9a-f-]{36}$/i

// تفاصيل الدعوة من رابط الإيميل (قبل ما يضغط قبول)
export async function GET(req: Request) {
  try {
    const t = readInviteToken(new URL(req.url).searchParams.get('t'))
    if (t === 'expired') return NextResponse.json({ success: true, state: 'expired' })
    if (!t) return NextResponse.json({ success: true, state: 'invalid' })
    const { data } = await sb().from('accountant_access').select('status,name,email,sections,organizations(name,logo_url),branches(name)').eq('id', t.iid).eq('email', t.em).maybeSingle()
    const a = data as any
    if (!a) return NextResponse.json({ success: true, state: 'gone' })
    return NextResponse.json({ success: true, state: a.status === 'active' ? 'accepted' : 'pending', invite: {
      org: a.organizations?.name || 'منشأة', logo_url: a.organizations?.logo_url || null, branch: a.branches?.name || null,
      name: a.name, email: a.email, sections: sectionLabels(a.sections || []) } })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}

// قبول أو رفض: إما برابط الإيميل (t) أو من داخل البوابة (id + جلسة المحاسب)
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const action = b.action === 'decline' ? 'decline' : b.action === 'accept' ? 'accept' : null
    if (!action) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const db = sb()
    let id: string, email: string
    if (b.t) {
      const t = readInviteToken(String(b.t))
      if (t === 'expired') return NextResponse.json({ error: 'رابط الدعوة انتهى — اطلب من المنشأة ترسله مرة ثانية' }, { status: 410 })
      if (!t) return NextResponse.json({ error: 'رابط الدعوة غير صحيح' }, { status: 400 })
      id = t.iid; email = t.em
    } else {
      const me = await currentAccountant(db, req)
      if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
      if (!UUID_RE.test(String(b.id || ''))) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
      id = b.id; email = me.email
    }
    if (action === 'decline') {
      await declineInvite(db, id, email)
      return NextResponse.json({ success: true })
    }
    const r = await acceptInvite(db, req, id, email, !!b.t)
    if (!('ok' in r)) return NextResponse.json({ error: r.error }, { status: r.status })
    const res = NextResponse.json({ success: true, org_id: r.orgId })
    if (r.session) res.headers.set('Set-Cookie', sessionCookie(r.session))
    return res
  } catch {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}
