import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// سجل الإشعارات اللي أرسلها الأدمن
export async function GET(req: Request) {
  if (!(await requirePermission(req.headers.get('x-admin-key'), 'super_admin_only'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { data, error } = await sb().from('admin_notifications')
    .select('id,type,created_at,title,message,sent_to_count')
    .order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  return NextResponse.json({ success: true, notifications: data || [] })
}

// إرسال إشعار: يسجّله بـ admin_notifications، ولو with_org_notifications=true يضيفه لإشعارات كل منشأة مستهدفة
export async function POST(req: Request) {
  if (!(await requirePermission(req.headers.get('x-admin-key'), 'super_admin_only'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const { title, message, type, target_orgs, org_ids, with_org_notifications } = await req.json()
    if (!title || !message || !Array.isArray(org_ids)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const db = sb()
    const { error } = await db.from('admin_notifications').insert({
      title, message, type,
      target_orgs: target_orgs || null,
      sent_to_count: org_ids.length,
    } as any)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (with_org_notifications && org_ids.length) {
      const inserts = org_ids.map((org_id: string) => ({ org_id, title, message, type }))
      const { error: nErr } = await db.from('notifications').insert(inserts as any)
      if (nErr) return NextResponse.json({ error: nErr.message, stage: 'notifications' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
