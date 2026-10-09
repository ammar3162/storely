import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { clearAgentCookie, currentAgent } from '@/lib/agentAuth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  const db = sb()
  const me = await currentAgent(db, req)
  if (me) await db.from('agent_sessions').update({ revoked_at: new Date().toISOString() } as any).eq('id', me.sessionId)
  const res = NextResponse.json({ success: true })
  res.headers.set('Set-Cookie', clearAgentCookie())
  return res
}
