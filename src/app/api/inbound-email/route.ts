import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { parseFrom, isOwnAddress, htmlToText, stripQuoted } from '@/lib/inboundEmail'
import { ownerRows } from '@/lib/marketing'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Resend يبلّغنا بكل إيميل يوصل عنوان الاستقبال (ImprovMX يحوّل له support@storely.dev).
// مغلق افتراضياً: بدون السر أو بتوقيع غير صحيح → 401. الرسالة تنحفظ مرة وحدة (resend_id فريد).
export async function POST(req: Request) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'not configured' }, { status: 401 })
  const payload = await req.text()
  const resend = new Resend(process.env.RESEND_API_KEY || 're_missing')
  let ev: any
  try {
    ev = resend.webhooks.verify({ payload, webhookSecret: secret, headers: {
      id: req.headers.get('svix-id') || '', timestamp: req.headers.get('svix-timestamp') || '', signature: req.headers.get('svix-signature') || '' } })
  } catch { return NextResponse.json({ error: 'invalid signature' }, { status: 401 }) }
  if (ev?.type !== 'email.received' || !ev.data?.email_id) return NextResponse.json({ ok: true, ignored: true })

  const d = ev.data
  // النص الكامل من Resend (الإشعار نفسه فيه العنوان والمرسل بس)
  // قراءة الرسائل الواردة تحتاج مفتاح Resend بصلاحية كاملة (مفتاح الإرسال ما يكفي) — نستخدمه لو موجود
  const reader = process.env.RESEND_RECEIVING_API_KEY ? new Resend(process.env.RESEND_RECEIVING_API_KEY) : resend
  const got = await reader.emails.receiving.get(String(d.email_id)).catch((e: any) => ({ data: null, error: e }))
  if (!got?.data) console.error('INBOUND_EMAIL_BODY_FAILED', (got as any)?.error?.name || (got as any)?.error?.message || 'unknown')
  const full = got?.data || null
  const from = parseFrom(full?.headers?.from || full?.headers?.From, full?.from || d.from)
  if (!from.email || isOwnAddress(from.email)) return NextResponse.json({ ok: true, ignored: true })
  const raw = full?.text || (full?.html ? htmlToText(full.html) : '')
  const body = raw ? stripQuoted(raw) : null

  const db = sb()
  const owners = await ownerRows(db as any).catch(() => [])
  const org = owners.find(o => o.email && o.email.trim().toLowerCase() === from.email)?.org_id || null
  const { error } = await (db as any).from('inbound_emails').upsert({
    resend_id: String(d.email_id), org_id: org, from_email: from.email, from_name: from.name,
    subject: String(full?.subject || d.subject || '').slice(0, 300) || null, body,
    received_at: d.created_at || new Date().toISOString(),
  }, { onConflict: 'resend_id', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: 'save failed' }, { status: 500 })   // Resend يعيد المحاولة
  return NextResponse.json({ ok: true })
}
