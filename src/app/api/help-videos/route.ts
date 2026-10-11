import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// فيديوهات الشرح (عامة، قراءة بس): { '/inventory': { id, title } } — الزر يطلع بس للصفحات اللي لها فيديو
export async function GET() {
  const { data } = await sb().from('help_videos').select('page_key,youtube_id,title')
  const videos: Record<string, { id: string; title: string | null }> = {}
  for (const r of (data || []) as any[]) videos[r.page_key] = { id: r.youtube_id, title: r.title }
  return NextResponse.json({ success: true, videos }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } })
}
