import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'
import { DEVICE_UNVERIFIED_ERROR, DEVICE_UNVERIFIED_REASON } from '@/lib/deviceMessages'
import { guard, limit } from '@/lib/rateLimit'
import { notifyAdminsLater } from '@/lib/adminNotify'
import { cleanConversation, ticketSubject, cleanPage } from '@/lib/supportTickets'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// الدعم الفني (المالك ومدير الفرع): جلسة المستخدم مباشرة (مو verifyOrgAccess) —
// العميل اللي اشتراكه منتهي لازم يقدر يتواصل مع الدعم بعد
async function me() {
  const p = await getCurrentProfile()
  if (!p) return { error: NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 }) }
  if (p.deviceTrusted === false) return { error: NextResponse.json({ error: DEVICE_UNVERIFIED_ERROR, reason: DEVICE_UNVERIFIED_REASON }, { status: 403 }) }
  if (!p.orgId) return { error: NextResponse.json({ error: 'لا توجد منشأة' }, { status: 400 }) }
  return { p }
}

// تذاكري (آخر 10) — عشان العميل يشوف رد الدعم
export async function GET() {
  try {
    const g = await me(); if (g.error) return g.error
    const db = sb()
    let q = db.from('support_tickets').select('id,number,subject,status,admin_reply,replied_at,created_at').eq('org_id', g.p.orgId!)
    if (g.p.role === 'manager') q = q.eq('requested_by', g.p.userId)
    const { data } = await q.order('created_at', { ascending: false }).limit(10)
    return NextResponse.json({ success: true, tickets: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// فتح تذكرة: { subject?, conversation?, page?, source? }
export async function POST(req: Request) {
  try {
    const g = await me(); if (g.error) return g.error
    const body = await req.json().catch(() => ({}))
    const conversation = cleanConversation(body.conversation)
    const subject = ticketSubject(body.subject, conversation)
    if (!subject) return NextResponse.json({ error: 'اكتب سؤالك أو مشكلتك' }, { status: 400 })
    const db = sb()
    const limited = await guard([limit('supportTicketOrg', g.p.orgId!)], db)
    if (limited) return limited
    const { data: who } = await db.from('profiles').select('full_name,phone').eq('id', g.p.userId).maybeSingle()
    const { data: t, error } = await db.from('support_tickets').insert({
      org_id: g.p.orgId, branch_id: g.p.branchId || null, requested_by: g.p.userId,
      requester_name: (who as any)?.full_name || null, requester_phone: (who as any)?.phone || null,
      page: cleanPage(body.page), subject, conversation, source: body.source === 'button' ? 'button' : 'assistant',
    } as any).select('id,number').single()
    if (error || !t) return NextResponse.json({ error: 'تعذّر إرسال الطلب' }, { status: 500 })
    notifyAdminsLater(db, g.p.orgId!, { kind: 'support', number: (t as any).number, subject, page: cleanPage(body.page), requester: (who as any)?.full_name || null })
    return NextResponse.json({ success: true, number: (t as any).number })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
