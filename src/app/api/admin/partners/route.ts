import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'manage_users'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { data, error } = await sb().from('landing_partners').select('*').order('display_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ partners: data })
}

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'manage_users'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { name, logo_url } = await req.json()
  if (!name || !logo_url) return NextResponse.json({ error: 'الاسم والشعار مطلوبان' }, { status: 400 })

  const { data: existing } = await sb().from('landing_partners').select('display_order').order('display_order', { ascending: false }).limit(1)
  const nextOrder = existing && existing.length ? (existing[0] as any).display_order + 1 : 0

  const { error } = await sb().from('landing_partners').insert({ name, logo_url, display_order: nextOrder } as any)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'manage_users'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 })
  const { error } = await sb().from('landing_partners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
