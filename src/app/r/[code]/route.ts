import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeAgentCode, REF_COOKIE, REF_DAYS } from '@/lib/agentRewards'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// رابط المندوب: يحفظ كوده ٦٠ يوم في جهاز العميل ويودّيه للتسجيل — أول رابط يفوز
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = normalizeAgentCode((await ctx.params).code)
  const url = new URL('/login?mode=register', req.url)
  const res = NextResponse.redirect(url)
  if (!code) return res
  const { data } = await sb().from('sales_agents').select('id').eq('code', code).eq('status', 'active').maybeSingle()
  if (!data) return res
  const existing = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${REF_COOKIE}=([A-Z0-9]+)`))
  if (!existing) res.headers.append('Set-Cookie', `${REF_COOKIE}=${code}; Path=/; Max-Age=${REF_DAYS * 86400}; SameSite=Lax; Secure; HttpOnly`)
  url.searchParams.set('ref', existing?.[1] || code)
  return NextResponse.redirect(url, { headers: res.headers })
}
