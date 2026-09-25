import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'partner-logos'
const MAX_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

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
  const name = String(formData.get('name') || '').trim().slice(0, 80)
  const file = formData.get('file') as File | null
  if (!name || !file) return NextResponse.json({ error: 'الاسم والشعار مطلوبان' }, { status: 400 })
  // صور فقط (بدون SVG — ممكن يحمل سكربت)، وحجم معقول
  const ext = IMAGE_TYPES[file.type]
  if (!ext) return NextResponse.json({ error: 'الشعار لازم يكون صورة PNG أو JPG أو WEBP' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'حجم الشعار أكبر من 2 ميجا' }, { status: 400 })

  const db = sb()
  const path = `${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  let { error: upErr } = await db.storage.from(BUCKET).upload(path, buffer, { contentType: file.type })
  if (upErr && /bucket not found/i.test(upErr.message)) {
    // أول رفع بالمشروع: ننشئ مجلد الشعارات (عام للقراءة لأن الصفحة التسويقية تعرضه)
    await db.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: Object.keys(IMAGE_TYPES) })
    ;({ error: upErr } = await db.storage.from(BUCKET).upload(path, buffer, { contentType: file.type }))
  }
  if (upErr) return NextResponse.json({ error: 'فشل رفع الشعار: ' + upErr.message }, { status: 500 })

  const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path)

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
  const db = sb()
  const { data: row } = await db.from('landing_partners').select('logo_url').eq('id', id).maybeSingle()
  const { error } = await db.from('landing_partners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // نحذف ملف الشعار كمان (لو كان مرفوع عندنا)
  const file = String((row as any)?.logo_url || '').split(`/${BUCKET}/`)[1]
  if (file) await db.storage.from(BUCKET).remove([decodeURIComponent(file)])
  return NextResponse.json({ success: true })
}
