import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { youtubeId, HELP_PAGE_KEYS } from '@/lib/helpVideos'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const PERM = 'manage_users'

export async function GET(req: Request) {
  if (!(await requirePermission(req.headers.get('x-admin-key'), PERM))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data } = await sb().from('help_videos').select('page_key,youtube_id,title,updated_by,updated_at')
  return NextResponse.json({ success: true, videos: data || [] })
}

// إضافة/تغيير فيديو صفحة — رابط يوتيوب بس
export async function PUT(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), PERM)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const b = await req.json()
    const page_key = String(b.page_key || '')
    if (!HELP_PAGE_KEYS.has(page_key)) return NextResponse.json({ error: 'الصفحة غير معروفة' }, { status: 400 })
    const id = youtubeId(b.url)
    if (!id) return NextResponse.json({ error: 'الصق رابط فيديو يوتيوب صحيح' }, { status: 400 })
    const title = String(b.title || '').trim().slice(0, 80) || null
    const { error } = await sb().from('help_videos').upsert({ page_key, youtube_id: id, title, updated_by: admin.email, updated_at: new Date().toISOString() } as any, { onConflict: 'page_key' })
    if (error) return NextResponse.json({ error: 'تعذر الحفظ' }, { status: 500 })
    await logAdminAction(admin, 'help_video_set', page_key, title || page_key, { youtube_id: id })
    return NextResponse.json({ success: true, youtube_id: id })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), PERM)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const page_key = new URL(req.url).searchParams.get('page_key') || ''
  if (!HELP_PAGE_KEYS.has(page_key)) return NextResponse.json({ error: 'الصفحة غير معروفة' }, { status: 400 })
  await sb().from('help_videos').delete().eq('page_key', page_key)
  await logAdminAction(admin, 'help_video_remove', page_key, page_key, {})
  return NextResponse.json({ success: true })
}
