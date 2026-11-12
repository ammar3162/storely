import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'
import { personalize, isSendableEmail } from '@/lib/marketing'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const PERM = 'manage_users'

// رسالة شخصية لعميل واحد من ملفه في لوحة الإدارة — مو إعلان: من بريد الدعم، بدون رابط إلغاء،
// والرد يوصل لبريد المشرف اللي أرسلها. وكل رسالة تنحفظ في سجل العميل (سجل التدقيق).
async function owner(db: ReturnType<typeof sb>, orgId: string) {
  const [{ data: p }, { data: org }] = await Promise.all([
    db.from('profiles').select('id,full_name').eq('org_id', orgId).eq('role', 'owner').maybeSingle(),
    db.from('organizations').select('name').eq('id', orgId).maybeSingle(),
  ])
  if (!p) return null
  const { data: u } = await db.auth.admin.getUserById((p as any).id)
  return { email: u?.user?.email || null, name: ((p as any).full_name || '').trim(), orgName: ((org as any)?.name || '').trim() }
}

// الرسائل السابقة لهالعميل + بريده (مخفي جزئياً)
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), PERM)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const orgId = new URL(req.url).searchParams.get('org_id') || ''
  if (!orgId) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  const db = sb()
  const [o, { data: logs }] = await Promise.all([
    owner(db, orgId),
    (db as any).from('admin_audit_log').select('admin_name,details,created_at').eq('action', 'customer_email').eq('target_org_id', orgId).order('created_at', { ascending: false }).limit(20),
  ])
  const email = o?.email || null
  return NextResponse.json({ success: true, email: email ? email.replace(/^(.{2}).*(@.*)$/, '$1•••$2') : null, sendable: !!email && isSendableEmail(email),
    sent: ((logs || []) as any[]).map(l => ({ by: l.admin_name, at: l.created_at, subject: l.details?.subject || '', body: l.details?.body || '' })) })
}

// { org_id, subject, body } — {الاسم} و{المنشأة} تتبدل
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), PERM)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const orgId = String(b.org_id || '')
  const subject = String(b.subject || '').trim().slice(0, 150)
  const body = String(b.body || '').trim().slice(0, 5000)
  if (!orgId || !subject || !body) return NextResponse.json({ error: 'اكتب العنوان والنص' }, { status: 400 })
  const db = sb()
  const o = await owner(db, orgId)
  if (!o?.email || !isSendableEmail(o.email)) return NextResponse.json({ error: 'لا يوجد بريد صالح لمالك هذه المنشأة' }, { status: 400 })
  const who = { name: o.name, orgName: o.orgName }
  const paragraphs = personalize(body, who).split('\n').map(s => s.trim()).filter(Boolean)
  const html = brandEmail({
    title: personalize(subject, who), paragraphs,
    small: `أرسلها ${admin.full_name || 'فريق Storely'} من فريق Storely — يمكنك الرد على هذا البريد مباشرة.`,
  })
  const r = await sendEmail({ to: o.email, subject: personalize(subject, who), html, fromName: `${admin.full_name || 'فريق'} من Storely`, fromAddress: 'support@storely.dev', replyTo: admin.email || undefined })
  if (!r.success) return NextResponse.json({ error: 'تعذّر إرسال البريد' }, { status: 502 })
  await logAdminAction(admin, 'customer_email', orgId, o.orgName || null, { subject: personalize(subject, who), body: body.slice(0, 1000) })
  return NextResponse.json({ success: true })
}
