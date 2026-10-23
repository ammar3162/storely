import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { SEGMENTS, type Segment, segmentRecipients, campaignHtml, validateContent, sendCampaign, unsubUrl } from '@/lib/marketing'

export const maxDuration = 300

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const PERM = 'send_marketing'
const isSegment = (s: unknown): s is Segment => typeof s === 'string' && s in SEGMENTS

// عدد المستلمين لكل فئة + آخر الحملات
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), PERM)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = sb()
  const counts: Record<string, number> = {}
  for (const s of Object.keys(SEGMENTS) as Segment[]) counts[s] = (await segmentRecipients(db, s)).length
  const [{ data: campaigns }, { count: optouts }] = await Promise.all([
    db.from('marketing_campaigns').select('id,subject,segment,recipients,sent,failed,status,created_by_name,created_at').order('created_at', { ascending: false }).limit(30),
    db.from('email_optouts').select('email', { count: 'exact', head: true }),
  ])
  return NextResponse.json({ success: true, segments: SEGMENTS, counts, campaigns: campaigns || [], optouts: optouts || 0, adminEmail: admin.email })
}

// action: preview (معاينة) | test (تجربة لإيميل المشرف نفسه) | send (للفئة كاملة)
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), PERM)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { action, segment, expected } = body
  const content = {
    subject: String(body.subject || '').trim(), title: String(body.title || '').trim(), body: String(body.body || ''),
    button_label: String(body.button_label || '').trim() || null, button_url: String(body.button_url || '').trim() || null,
  }
  const origin = new URL(req.url).origin
  const sample = { name: admin.full_name || 'عميلنا', orgName: 'منشأتك' }

  if (action === 'preview') {
    return NextResponse.json({ success: true, html: campaignHtml({ ...content, title: content.title || 'العنوان الرئيسي', body: content.body || 'نص الإيميل' }, sample, unsubUrl(origin, admin.email)) })
  }

  const invalid = validateContent(content)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  if (action === 'test') {
    if (!admin.email) return NextResponse.json({ error: 'ما فيه إيميل لحسابك' }, { status: 400 })
    const r = await sendCampaign(content, [{ email: admin.email, ...sample }], origin)
    if (!r.sent) return NextResponse.json({ error: 'فشل إرسال التجربة' }, { status: 502 })
    return NextResponse.json({ success: true, to: admin.email })
  }

  if (action !== 'send') return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  if (!isSegment(segment)) return NextResponse.json({ error: 'اختر فئة المستلمين' }, { status: 400 })

  const db = sb()
  const recipients = await segmentRecipients(db, segment)
  if (!recipients.length) return NextResponse.json({ error: 'ما فيه مستلمين بهالفئة' }, { status: 400 })
  // العدد اللي وافق عليه المشرف لازم يطابق العدد الحالي — يمنع إرسال لعدد ما شافه
  if (Number(expected) !== recipients.length) return NextResponse.json({ error: `عدد المستلمين تغيّر (${recipients.length}) — راجع وأرسل مرة ثانية`, count: recipients.length }, { status: 409 })

  const { data: row, error } = await db.from('marketing_campaigns').insert({
    ...content, segment, recipients: recipients.length, status: 'sending', created_by: admin.id, created_by_name: admin.full_name,
  } as any).select('id').single()
  if (error || !row) return NextResponse.json({ error: 'فشل تسجيل الحملة' }, { status: 500 })

  const r = await sendCampaign(content, recipients, origin)
  await db.from('marketing_campaigns').update({ sent: r.sent, failed: r.failed, status: r.sent ? 'sent' : 'failed', sent_at: new Date().toISOString() } as any).eq('id', (row as any).id)
  await logAdminAction(admin, 'send_email_campaign', null, null, { campaign_id: (row as any).id, segment, recipients: recipients.length, sent: r.sent, failed: r.failed })
  return NextResponse.json({ success: r.sent > 0, sent: r.sent, failed: r.failed, ...(r.sent ? {} : { error: 'فشل الإرسال' }) })
}
