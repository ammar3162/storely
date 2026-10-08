import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { clearCookie, currentAccountant } from '@/lib/accountantPortalAuth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// خروج = الجهاز ينطلّع فعلياً (حتى لو أحد نسخ الكوكي ما يشتغل)
export async function POST(req: Request) {
  const db = sb()
  const me = await currentAccountant(db, req)
  if (me) await db.from('accountant_sessions').update({ revoked_at: new Date().toISOString() } as any).eq('id', me.sessionId)
  const res = NextResponse.json({ success: true })
  res.headers.set('Set-Cookie', clearCookie())
  return res
}
