import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// سجل أسئلة المساعد الذكي — آخر الأسئلة (مع البحث والمنشأة)
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100)
  const orgId = url.searchParams.get('org_id')
  let query = sb().from('assistant_questions')
    .select('id,org_id,role,question,reply,sections,created_at,organizations(name)')
    .order('created_at', { ascending: false }).limit(200)
  if (q) query = query.ilike('question', `%${q.replace(/[%_]/g, '')}%`)
  if (orgId) query = query.eq('org_id', orgId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  return NextResponse.json({ success: true, questions: data || [] })
}
