import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// تذاكر الدعم الفني — الجديدة أول، ثم اللي ردّينا عليها، ثم المحلولة
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = sb()
  if (new URL(req.url).searchParams.get('count')) {
    const { count } = await db.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'new')
    return NextResponse.json({ success: true, pending: count || 0 })
  }
  const { data, error } = await db.from('support_tickets')
    .select('id,number,org_id,branch_id,requester_name,requester_phone,page,subject,conversation,source,status,admin_reply,replied_at,replied_by_name,resolved_at,created_at,organizations(name,whatsapp_number,plan)')
    .order('created_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: 'تعذّر تحميل التذاكر' }, { status: 500 })
  // أسماء الفروع (branch_id بدون علاقة في الجدول — نجيبها بطلب منفصل)
  const bids = [...new Set(((data || []) as any[]).map(t => t.branch_id).filter(Boolean))]
  const { data: brs } = bids.length ? await db.from('branches').select('id,name').in('id', bids) : { data: [] as any[] }
  const bname = new Map(((brs || []) as any[]).map(b => [b.id, b.name]))
  const order = { new: 0, open: 1, resolved: 2 } as Record<string, number>
  const tickets = ((data || []) as any[]).map(t => ({ ...t, org_name: t.organizations?.name || '—', org_phone: t.organizations?.whatsapp_number || null, plan: t.organizations?.plan || null, branch_name: bname.get(t.branch_id) || null }))
    .sort((a, b) => (order[a.status] - order[b.status]) || Date.parse(b.created_at) - Date.parse(a.created_at))
  return NextResponse.json({ success: true, tickets })
}

// { id, action: 'reply' (reply نص) | 'resolve' | 'reopen' }
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const db = sb()
  const { data: t } = await db.from('support_tickets').select('id,number,org_id,branch_id,status').eq('id', String(body.id || '')).maybeSingle()
  if (!t) return NextResponse.json({ error: 'التذكرة غير موجودة' }, { status: 404 })
  const tk = t as any, now = new Date().toISOString()

  if (body.action === 'reply') {
    const reply = String(body.reply || '').trim().slice(0, 3000)
    if (!reply) return NextResponse.json({ error: 'اكتب الرد' }, { status: 400 })
    const { error } = await db.from('support_tickets').update({ admin_reply: reply, replied_at: now, replied_by_name: admin.full_name, status: body.resolve ? 'resolved' : 'open', ...(body.resolve ? { resolved_at: now } : {}) } as any).eq('id', tk.id)
    if (error) return NextResponse.json({ error: 'تعذّر حفظ الرد' }, { status: 500 })
    // الرد يوصل العميل إشعاراً داخل النظام (جرس الإشعارات)
    await db.from('notifications').insert({ org_id: tk.org_id, branch_id: tk.branch_id || null, type: 'info', read: false,
      title: `رد الدعم الفني — طلبك رقم ${tk.number}`, message: reply, ref_type: 'support_ticket', ref_id: tk.id } as any)
    await logAdminAction(admin, 'support_reply', tk.org_id, null, { ticket: tk.number })
    return NextResponse.json({ success: true })
  }
  if (body.action === 'resolve' || body.action === 'reopen') {
    const resolve = body.action === 'resolve'
    const { error } = await db.from('support_tickets').update({ status: resolve ? 'resolved' : 'open', resolved_at: resolve ? now : null } as any).eq('id', tk.id)
    if (error) return NextResponse.json({ error: 'تعذّر التحديث' }, { status: 500 })
    await logAdminAction(admin, resolve ? 'support_resolve' : 'support_reopen', tk.org_id, null, { ticket: tk.number })
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
}
