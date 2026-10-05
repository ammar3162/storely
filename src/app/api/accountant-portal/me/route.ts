import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant } from '@/lib/accountantPortalAuth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: Request) {
  const me = await currentAccountant(sb(), req)
  if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
  return NextResponse.json({ success: true, accountant: me })
}
