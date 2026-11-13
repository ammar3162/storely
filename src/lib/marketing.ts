// إعلانات الإيميل من لوحة الأدمن: اختيار المستلمين، القالب، رابط إلغاء الاشتراك، والإرسال على دفعات
// الإعلانات تطلع من عنوان منفصل (MARKETING_FROM) عن إيميلات النظام (noreply) عشان أي بلاغ سبام ما يأثر عليها
import crypto from 'node:crypto'
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { brandEmail, esc, BRAND } from '@/lib/emailTemplates'
import { withTimeout, EXTERNAL_TIMEOUT_MS } from '@/lib/fetchExternal'

export const SEGMENTS = {
  all: 'كل العملاء',
  paid: 'المشتركين (مدفوع)',
  trial: 'الفترة التجريبية',
  expired: 'المنتهي اشتراكهم',
} as const
export type Segment = keyof typeof SEGMENTS
export type Recipient = { email: string; name: string; orgName: string }

// إيميلات الاختبار والحسابات الوهمية ما توصلها إعلانات
const TEST_EMAIL = /@(storely\.test|example\.(com|org|net))$/i

// Resend يرفض الدفعة كاملة (100 إيميل) لو عنوان واحد غلط — فنفلتر قبل الإرسال
const VALID_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
export function isSendableEmail(email?: string | null) {
  const e = (email || '').trim()
  return e.length <= 254 && VALID_EMAIL.test(e) && !e.includes('..')
}

const secret = () => process.env.MARKETING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function unsubToken(email: string) {
  return crypto.createHmac('sha256', secret()).update(email.trim().toLowerCase()).digest('base64url').slice(0, 32)
}

export function verifyUnsubToken(email: string, token: string) {
  if (!email || !token || !secret()) return false
  const a = Buffer.from(unsubToken(email)), b = Buffer.from(String(token))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function unsubUrl(origin: string, email: string) {
  return `${origin}/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`
}

/** يطابق المالك مع الفئة المختارة */
export function inSegment(p: { status?: string | null; subscription_type?: string | null; subscription_ends_at?: string | null }, segment: Segment, now = new Date()) {
  if (p.status === 'suspended') return false
  const live = !!p.subscription_ends_at && new Date(p.subscription_ends_at) > now
  if (segment === 'all') return true
  if (segment === 'paid') return p.subscription_type === 'paid' && live
  if (segment === 'trial') return p.subscription_type === 'trial' && live
  return !live
}

/** أصحاب المنشآت مع إيميلاتهم وحالة الإعلانات (مصدر واحد للفئات والعملاء المحددين) */
type OwnerRow = { org_id: string; email: string | null; name: string; orgName: string; status: string | null; subscription_type: string | null; subscription_ends_at: string | null; optedOut: boolean; sendable: boolean }
export async function ownerRows(db: SupabaseClient): Promise<OwnerRow[]> {
  const { data: owners } = await db.from('profiles')
    .select('id,org_id,full_name,status,subscription_type,subscription_ends_at,organizations(name)')
    .eq('role', 'owner')
  const emails = new Map<string, string>()
  for (let page = 1; page < 50; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    const users = data?.users || []
    for (const u of users) if (u.email) emails.set(u.id, u.email)
    if (users.length < 1000) break
  }
  const { data: out } = await db.from('email_optouts').select('email')
  const optedOut = new Set((out || []).map((r: any) => String(r.email).toLowerCase()))
  return ((owners || []) as any[]).map(p => {
    const email = emails.get(p.id)?.trim() || null, key = email?.toLowerCase() || ''
    return { org_id: p.org_id, email, name: (p.full_name || '').trim(), orgName: (p.organizations?.name || '').trim(), status: p.status, subscription_type: p.subscription_type,
      subscription_ends_at: p.subscription_ends_at, optedOut: !!key && optedOut.has(key), sendable: !!email && isSendableEmail(email) && !TEST_EMAIL.test(key) }
  })
}

function toRecipients(rows: OwnerRow[]): Recipient[] {
  const seen = new Set<string>(), list: Recipient[] = []
  for (const r of rows) {
    const key = r.email?.toLowerCase()
    if (!r.email || !key || !r.sendable || r.optedOut || seen.has(key)) continue
    seen.add(key); list.push({ email: r.email, name: r.name, orgName: r.orgName })
  }
  return list
}

/** إيميلات أصحاب المنشآت في الفئة — بدون اللي ألغوا الاشتراك وبدون إيميلات الاختبار */
export async function segmentRecipients(db: SupabaseClient, segment: Segment, rows?: OwnerRow[]): Promise<Recipient[]> {
  return toRecipients((rows || await ownerRows(db)).filter(p => inSegment(p, segment)))
}

export type CampaignContent = { subject: string; title: string; body: string; button_label?: string | null; button_url?: string | null }

/** {الاسم} و {المنشأة} تتبدل لكل مستلم */
export function personalize(text: string, r: Pick<Recipient, 'name' | 'orgName'>) {
  return text.replace(/\{الاسم\}/g, r.name || 'عميلنا').replace(/\{المنشأة\}/g, r.orgName || 'منشأتك')
}

export function campaignHtml(c: CampaignContent, r: Pick<Recipient, 'name' | 'orgName'>, unsubscribeUrl: string) {
  const paragraphs = personalize(c.body, r).split('\n').map(s => s.trim()).filter(Boolean)
  const url = c.button_url?.trim()
  return brandEmail({
    title: personalize(c.title, r),
    paragraphs,
    ...(c.button_label?.trim() && url && /^https:\/\//i.test(url) ? { button: { label: c.button_label.trim(), url } } : {}),
    rawFooter: `<div style="font-size:11px;color:#94a3b8;margin-top:10px;line-height:1.8">وصلك هذا الإيميل لأنك عميل في Storely.
      <a href="${esc(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline">إلغاء الاشتراك بالإعلانات</a></div>`,
  })
}

export function validateContent(c: Partial<CampaignContent>): string | null {
  if (!c.subject?.trim() || c.subject.trim().length > 150) return 'اكتب عنوان الإيميل (أقل من 150 حرف)'
  if (!c.title?.trim() || c.title.trim().length > 150) return 'اكتب العنوان الرئيسي (أقل من 150 حرف)'
  if (!c.body?.trim() || c.body.length > 5000) return 'اكتب نص الإيميل (أقل من 5000 حرف)'
  if (c.button_url?.trim() && !/^https:\/\/[^\s]+$/i.test(c.button_url.trim())) return 'رابط الزر لازم يبدأ بـ https://'
  if (!!c.button_label?.trim() !== !!c.button_url?.trim()) return 'اكتب نص الزر ورابطه مع بعض، أو اتركهم فاضيين'
  return null
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

/** يرسل الحملة على دفعات (100 إيميل بالطلب) ويرجّع عدد الناجح والفاشل */
export async function sendCampaign(c: CampaignContent, recipients: Recipient[], origin: string) {
  if (!process.env.RESEND_API_KEY) return { sent: 0, failed: recipients.length, error: 'RESEND_API_KEY missing' }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = `Storely <${process.env.MARKETING_FROM || 'news@storely.dev'}>`
  let sent = 0, failed = 0
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const msgs = chunk.map(r => {
      const unsub = unsubUrl(origin, r.email)
      return {
        from, to: r.email,
        subject: personalize(c.subject, r),
        html: campaignHtml(c, r, unsub),
        text: `${personalize(c.title, r)}\n\n${personalize(c.body, r)}${c.button_url ? `\n\n${c.button_url}` : ''}\n\n—\nإلغاء الاشتراك بالإعلانات: ${unsub}\n${BRAND.site}`,
        // زر «إلغاء الاشتراك» في Gmail/Outlook يرسل POST لهذا الرابط — لازم يكون مسار الـ API (الصفحة ما تلغي شي)،
        // وإلا Gmail يعتبر المرسل ما يحترم إلغاء الاشتراك ويحطه بالسبام
        headers: { 'List-Unsubscribe': `<${unsub.replace('/unsubscribe?', '/api/unsubscribe?')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        replyTo: process.env.MARKETING_REPLY_TO || 'support@storely.dev',   // ردود الحملات → «البريد الوارد»
      }
    })
    const { data, error } = await withTimeout(resend.batch.send(msgs), 30_000, 'Resend batch').catch((e: Error) => ({ data: null, error: { message: e.message } as never }))
    if (!error) sent += (data as any)?.data?.length ?? chunk.length
    else {
      // فشل الدفعة: نرسل واحد واحد عشان عنوان غلط ما يحرم الباقين
      console.error('MARKETING_BATCH_FAILED:', error)
      for (const m of msgs) {
        const one = await withTimeout(resend.emails.send(m as any), EXTERNAL_TIMEOUT_MS.messaging, 'Resend').catch((e: Error) => ({ data: null, error: { message: e.message } as never }))
        if (one.error) { failed++; console.error('MARKETING_SEND_FAILED:', one.error.message) } else sent++
        await delay(550)
      }
    }
    if (i + 100 < recipients.length) await delay(700) // حد Resend: طلبين بالثانية
  }
  return { sent, failed }
}
