import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant } from '@/lib/accountantPortalAuth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: Request) {
  const me = await currentAccountant(sb(), req)
  if (!me) return NextResponse.json({ error: 'سجّل الدخول' }, { status: 401 })
  const { data } = await sb().from('accountant_users').select('digest_opt_out').eq('id', me.id).maybeSingle()
  return NextResponse.json({ success: true, accountant: { ...me, digest: !(data as any)?.digest_opt_out } })
}

// تفضيلات المحاسب: الملخص الأسبوعي بالإيميل (تشغيل/إيقاف)
export async function PATCH(req: Request) {
  const db = sb()
  const me = await currentAccountant(db, req)
  if (!me) return NextResponse.json({ error: 'سجّل الدخول' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (typeof b.digest !== 'boolean') return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  await db.from('accountant_users').update({ digest_opt_out: !b.digest } as any).eq('id', me.id)
  return NextResponse.json({ success: true, digest: b.digest })
}
