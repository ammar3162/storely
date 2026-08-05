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
  const { data, error } = await sb().from('marquee_messages').select('*').order('display_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'manage_users'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { messages } = await req.json()
  const list: string[] = Array.isArray(messages) ? messages.map((m: string) => String(m).trim()).filter(Boolean) : []
  if (list.length === 0) return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 })

  const db = sb()
  const { data: existing } = await db.from('marquee_messages').select('display_order').order('display_order', { ascending: false }).limit(1)
  let nextOrder = existing && existing.length ? (existing[0] as any).display_order + 1 : 0
  const rows = list.map((message) => ({ message, display_order: nextOrder++ }))

  const { error } = await db.from('marquee_messages').insert(rows as any)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, count: rows.length })
}

export async function PATCH(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'manage_users'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id, is_active, message } = await req.json()
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 })
  const updates: any = {}
  if (typeof is_active === 'boolean') updates.is_active = is_active
  if (typeof message === 'string' && message.trim()) updates.message = message.trim()
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'لا يوجد تحديث' }, { status: 400 })
  const { error } = await sb().from('marquee_messages').update(updates).eq('id', id)
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
  const { error } = await sb().from('marquee_messages').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
