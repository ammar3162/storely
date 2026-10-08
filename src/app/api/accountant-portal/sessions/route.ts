import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant, deviceLabel } from '@/lib/accountantPortalAuth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// «أجهزتي»: الأجهزة الداخلة على حساب المحاسب
export async function GET(req: Request) {
  const db = sb()
  const me = await currentAccountant(db, req)
  if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
  const { data } = await db.from('accountant_sessions').select('id,user_agent,created_at,last_seen_at')
    .eq('accountant_id', me.id).is('revoked_at', null).gte('created_at', new Date(Date.now() - 15 * 86400e3).toISOString())
    .order('last_seen_at', { ascending: false }).limit(20)
  return NextResponse.json({ success: true, sessions: ((data || []) as any[]).map(s => ({ id: s.id, device: deviceLabel(s.user_agent), created_at: s.created_at, last_seen_at: s.last_seen_at, current: s.id === me.sessionId })) })
}

// طلّع جهاز (?id=) أو كل الأجهزة الثانية (?others=1)
export async function DELETE(req: Request) {
  const db = sb()
  const me = await currentAccountant(db, req)
  if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  let q = db.from('accountant_sessions').update({ revoked_at: new Date().toISOString() } as any).eq('accountant_id', me.id).is('revoked_at', null)
  if (searchParams.get('others') === '1') q = q.neq('id', me.sessionId)
  else {
    const id = searchParams.get('id') || ''
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    q = q.eq('id', id)
  }
  const { error } = await q
  if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  return NextResponse.json({ success: true })
}
