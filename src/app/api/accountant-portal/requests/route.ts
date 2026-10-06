import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant, accessFor } from '@/lib/accountantPortalAuth'
import { REQUEST_KINDS, isKind, validateTarget, withTargets, MAX_OPEN_PER_ORG } from '@/lib/accountantRequests'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const FIELDS = 'id,invoice_group,purchase_id,closing_id,kind,message,status,owner_reply,created_at,answered_at,resolved_at'

async function guard(req: Request, orgId: unknown) {
  const db = sb()
  const me = await currentAccountant(db, req)
  if (!me) return { error: NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 }) }
  const access = await accessFor(db, me.id, String(orgId || ''))
  if (!access) return { error: NextResponse.json({ error: 'ما عندك صلاحية على هالمنشأة' }, { status: 403 }) }
  return { db, me, access }
}

// طلبات المحاسب على منشأة
export async function GET(req: Request) {
  try {
    const g = await guard(req, new URL(req.url).searchParams.get('org_id')); if (g.error) return g.error
    const { data } = await g.db.from('accountant_requests').select(FIELDS).eq('org_id', g.access.org_id).eq('accountant_id', g.me.id).order('created_at', { ascending: false }).limit(100)
    return NextResponse.json({ success: true, requests: await withTargets(g.db, g.access.org_id, (data || []) as any[]) })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// طلب جديد — يوصل المالك إشعار
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const g = await guard(req, b.org_id); if (g.error) return g.error
    if (!isKind(b.kind)) return NextResponse.json({ error: 'اختر نوع الطلب' }, { status: 400 })
    const message = String(b.message || '').trim().slice(0, 500) || null
    if ((b.kind === 'other' || b.kind === 'document') && !message) return NextResponse.json({ error: 'اكتب وش تحتاج' }, { status: 400 })
    const target = await validateTarget(g.db, g.access.org_id, b)
    if (!target) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 })
    const { count } = await g.db.from('accountant_requests').select('id', { count: 'exact', head: true }).eq('org_id', g.access.org_id).neq('status', 'resolved')
    if ((count || 0) >= MAX_OPEN_PER_ORG) return NextResponse.json({ error: 'فيه طلبات مفتوحة كثيرة لهالمنشأة — اقفل اللي انحلت أول' }, { status: 429 })

    const { data, error } = await g.db.from('accountant_requests').insert({ org_id: g.access.org_id, accountant_id: g.me.id, kind: b.kind, message, ...target } as any).select(FIELDS).single()
    if (error) return NextResponse.json({ error: 'تعذر إرسال الطلب' }, { status: 500 })
    await g.db.from('notifications').insert({ org_id: g.access.org_id, type: 'warning', read: false, title: '📝 طلب من محاسبك', ref_type: 'accountant_request', ref_id: (data as any).id,
      message: `${g.me.name || g.me.email}: ${REQUEST_KINDS[b.kind as keyof typeof REQUEST_KINDS]}${message ? ` — ${message}` : ''}`.slice(0, 600) } as any)
    return NextResponse.json({ success: true, request: (await withTargets(g.db, g.access.org_id, [data]))[0] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// المحاسب يقفل الطلب (انحل) أو يرجعه مفتوح
export async function PATCH(req: Request) {
  try {
    const b = await req.json()
    const g = await guard(req, b.org_id); if (g.error) return g.error
    if (!/^[0-9a-f-]{36}$/i.test(String(b.id || '')) || !['resolved', 'open'].includes(b.status)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const { data, error } = await g.db.from('accountant_requests').update({ status: b.status, resolved_at: b.status === 'resolved' ? new Date().toISOString() : null } as any)
      .eq('id', b.id).eq('org_id', g.access.org_id).eq('accountant_id', g.me.id).select(FIELDS).maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
