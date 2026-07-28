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

// نرفع الشعار من هنا (السيرفر، بمفتاح كامل الصلاحيات) — بدل المتصفح مباشرة،
// لأن لوحة الإدارة تستخدم نظام دخول منفصل عن Supabase الأساسي فما تقدر ترفع ملفات مباشرة بنفسها
export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'manage_users'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const name = formData.get('name') as string
  const file = formData.get('file') as File | null
  if (!name || !file) return NextResponse.json({ error: 'الاسم والشعار مطلوبان' }, { status: 400 })

  const db = sb()
  const ext = file.name.split('.').pop() || 'png'
  const path = `${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await db.storage.from('partner-logos').upload(path, buffer, { contentType: file.type })
  if (upErr) return NextResponse.json({ error: 'فشل رفع الشعار: ' + upErr.message }, { status: 500 })

  const { data: pub } = db.storage.from('partner-logos').getPublicUrl(path)

  const { data: existing } = await db.from('landing_partners').select('display_order').order('display_order', { ascending: false }).limit(1)
  const nextOrder = existing && existing.length ? (existing[0] as any).display_order + 1 : 0

  const { error } = await db.from('landing_partners').insert({ name, logo_url: pub.publicUrl, display_order: nextOrder } as any)
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
