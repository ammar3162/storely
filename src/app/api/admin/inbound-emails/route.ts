import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'
import { isSendableEmail } from '@/lib/marketing'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const PERM = 'manage_users'
const COLS = 'id,org_id,from_email,from_name,subject,body,status,replied_at,replied_by_name,reply_body,received_at,organizations(name)'

// البريد الوارد — ?count=1 عدد الجديد، ?org_id= رسائل عميل واحد، وبدونها آخر 200 رسالة
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), PERM)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const q = new URL(req.url).searchParams, db = sb() as any
  if (q.get('count')) {
    const { count } = await db.from('inbound_emails').select('id', { count: 'exact', head: true }).eq('status', 'new')
    return NextResponse.json({ success: true, pending: count || 0 })
  }
  let sel = db.from('inbound_emails').select(COLS).order('received_at', { ascending: false }).limit(200)
  if (q.get('org_id')) sel = sel.eq('org_id', q.get('org_id'))
  const { data, error } = await sel
  if (error) return NextResponse.json({ error: 'تعذّر تحميل البريد' }, { status: 500 })
  return NextResponse.json({ success: true, emails: ((data || []) as any[]).map(e => ({ ...e, org_name: e.organizations?.name || null, organizations: undefined })) })
}

// { id, action: 'read' | 'unread' | 'reply' | 'delete', reply } — بعد الرد تنتقل للأرشيف (تبقى في ملف العميل)، والحذف للرسائل المزعجة فقط
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), PERM)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const db = sb() as any
  const { data: e } = await db.from('inbound_emails').select('id,org_id,from_email,subject,status,organizations(name)').eq('id', String(b.id || '')).maybeSingle()
  if (!e) return NextResponse.json({ error: 'الرسالة غير موجودة' }, { status: 404 })
  if (b.action === 'read' || b.action === 'unread') {
    if (e.status !== 'replied') await db.from('inbound_emails').update({ status: b.action === 'read' ? 'read' : 'new' }).eq('id', e.id)
    return NextResponse.json({ success: true })
  }
  if (b.action === 'delete') {
    await db.from('inbound_emails').delete().eq('id', e.id)
    await logAdminAction(admin, 'inbound_email_delete', e.org_id || null, e.organizations?.name || null, { from: e.from_email, subject: e.subject || '' })
    return NextResponse.json({ success: true })
  }
  if (b.action !== 'reply') return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  const reply = String(b.reply || '').trim().slice(0, 5000)
  if (!reply) return NextResponse.json({ error: 'اكتب الرد' }, { status: 400 })
  if (!isSendableEmail(e.from_email)) return NextResponse.json({ error: 'بريد المرسل غير صالح' }, { status: 400 })
  const base = String(e.subject || 'رسالتك إلى Storely').replace(/^\s*((re|رد)\s*:\s*)+/i, '')
  const subject = `رد: ${base}`.slice(0, 150)
  const html = brandEmail({ title: base, paragraphs: reply.split('\n').map(s => s.trim()).filter(Boolean), small: 'فريق Storely — يمكنك الرد على هذا البريد مباشرة.' })
  const r = await sendEmail({ to: e.from_email, subject, html, fromName: 'فريق Storely', fromAddress: 'support@storely.dev', replyTo: 'support@storely.dev' })
  if (!r.success) return NextResponse.json({ error: 'تعذّر إرسال الرد' }, { status: 502 })
  await db.from('inbound_emails').update({ status: 'replied', replied_at: new Date().toISOString(), replied_by_name: admin.full_name || null, reply_body: reply }).eq('id', e.id)
  if (e.org_id) await logAdminAction(admin, 'customer_email', e.org_id, e.organizations?.name || null, { subject, body: reply.slice(0, 1000) })
  return NextResponse.json({ success: true })
}
