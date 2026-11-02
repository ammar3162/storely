import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'manage_users'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const db = sb()
  const { data, error } = await db.from('demo_requests').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // نجيب حالة الاشتراك الحقيقية تلقائياً لأي طلب صار له حساب فعلي (matched_org_id)
  const matchedIds = [...new Set((data||[]).map((r:any)=>r.matched_org_id).filter(Boolean))]
  let liveStatusMap: Record<string, any> = {}
  if (matchedIds.length > 0) {
    const { data: profiles } = await db.from('profiles').select('org_id,subscription_type,subscription_ends_at').in('org_id', matchedIds).eq('role','owner')
    for (const p of (profiles||[])) liveStatusMap[(p as any).org_id] = p
  }

  const enriched = (data||[]).map((r:any) => ({
    ...r,
    liveStatus: r.matched_org_id ? (liveStatusMap[r.matched_org_id] || null) : null,
  }))

  return NextResponse.json({ requests: enriched })
}

export async function PATCH(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'manage_users'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'id وstatus مطلوبان' }, { status: 400 })
  const { error } = await sb().from('demo_requests').update({ status } as any).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// حذف طلب عرض (بعد ما انتهى التواصل معه) — بياناته تنحفظ بسجل الإدارة
export async function DELETE(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  const db = sb()
  const { data: r } = await db.from('demo_requests').select('id,first_name,last_name,business_name,phone,status,matched_org_id,created_at').eq('id', id).maybeSingle()
  if (!r) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
  const { error } = await db.from('demo_requests').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'تعذر الحذف' }, { status: 500 })
  const x = r as any
  await logAdminAction(admin, 'delete_demo_request', x.matched_org_id || null, x.business_name || null, { request: x })
  return NextResponse.json({ success: true })
}
