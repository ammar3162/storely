import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await sb().from('platform_settings').select('terms_version').eq('id', 1).single()
  return NextResponse.json({ version: (data as any)?.terms_version || '2026-06-b' })
}

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'view_consent_logs'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { version } = await req.json()
  if (!version || typeof version !== 'string') return NextResponse.json({ error: 'نسخة غير صالحة' }, { status: 400 })
  const { error } = await sb().from('platform_settings').update({ terms_version: version }).eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, version })
}
