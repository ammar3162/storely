// إيميل للإدارة لما عميل جديد يسجّل، أو عميل يطلب إضافة أو ترقية — عشان يوصلك حتى لو لوحة الإدارة مقفلة.
// المستلمون: المشرفون النشطون اللي يقدرون يوافقون على الطلبات (المشرف العام أو صلاحية manage_users).
// الإرسال بعد الرد على العميل (after) وفشله ما يأثر على الطلب نفسه.
import { after } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { brandEmail, type EmailRow } from '@/lib/emailTemplates'
import { planLabel } from '@/lib/planPricing'
import { SIGNUP_SOURCES } from '@/lib/signupSource'

export const ADMIN_REQUESTS_URL = 'https://storely.dev/storely-admin/addon-requests'
export const ADMIN_CUSTOMERS_URL = 'https://storely.dev/storely-admin/customers'

type AdminRow = { email: string | null; role: string | null; is_active: boolean | null; permissions?: Record<string, boolean> | null }

/** إيميلات المشرفين اللي يوافقون على الطلبات (بدون تكرار) */
export function approverEmails(admins: AdminRow[]): string[] {
  const out = new Set<string>()
  for (const a of admins) {
    if (!a.is_active || !a.email || !a.email.includes('@')) continue
    if (a.role === 'super_admin' || a.permissions?.manage_users) out.add(a.email.trim().toLowerCase())
  }
  return [...out]
}

export type RequestNotice =
  | { kind: 'addon'; addonName: string; quantity: number; note?: string | null }
  | { kind: 'plan'; fromPlan: string; toPlan: string; billAtRequest?: number | null }
  | { kind: 'renewal'; expired: boolean; graceUntil?: string | null }
  | { kind: 'support'; number: number; subject: string; page?: string | null; requester?: string | null }
  | { kind: 'signup'; email?: string | null; businessType?: string | null; plan: string; branches: number; billing: 'monthly' | 'yearly'; source?: string | null; sourceDetail?: string | null; agentCode?: string | null; demoMatched?: boolean }

const sourceLabel = (v?: string | null) => SIGNUP_SOURCES.find(x => x.v === v)?.ar || null

export function requestEmail(n: RequestNotice, org: { name: string; owner?: string | null; phone?: string | null }) {
  const oneLine = (t: string) => t.replace(/[\r\n]+/g, ' ').slice(0, 180)
  const who: EmailRow[] = [
    { label: 'المنشأة', value: org.name, strong: true },
    ...(org.owner ? [{ label: 'المالك', value: org.owner }] : []),
    ...(org.phone ? [{ label: 'الجوال', value: org.phone }] : []),
  ]

  if (n.kind === 'signup') {
    const src = [sourceLabel(n.source), n.sourceDetail].filter(Boolean).join(' — ')
    const rows: EmailRow[] = [
      ...who,
      ...(n.email ? [{ label: 'الإيميل', value: n.email }] : []),
      ...(n.businessType ? [{ label: 'النشاط', value: n.businessType }] : []),
      { label: 'الباقة المختارة', value: `${planLabel(n.plan)} · ${n.branches} ${n.branches === 1 ? 'فرع' : 'فروع'} · ${n.billing === 'yearly' ? 'سنوي' : 'شهري'}`, strong: true },
      ...(src ? [{ label: 'من وين سمع عنا', value: src }] : []),
      ...(n.agentCode ? [{ label: 'رمز السفير', value: n.agentCode }] : []),
      ...(n.demoMatched ? [{ label: 'طلب عرض سابق', value: 'نعم — انربط بطلب العرض تلقائياً' }] : []),
    ]
    return {
      subject: oneLine(`تسجيل جديد: ${org.name}`),
      html: brandEmail({
        title: 'عميل جديد سجّل في ستورلي',
        eyebrow: 'لوحة الإدارة',
        paragraphs: ['بدأ فترة التجربة المجانية الحين. تواصل معه في أول يومين يساعده يبدأ صح.'],
        rows,
        button: { label: 'فتح العملاء', url: ADMIN_CUSTOMERS_URL },
        small: 'وصلك هذا الإيميل لأنك مشرف في لوحة إدارة ستورلي.',
      }),
    }
  }

  if (n.kind === 'support') {
    return {
      subject: oneLine(`تذكرة دعم #${n.number}: ${org.name}`),
      html: brandEmail({
        title: `تذكرة دعم جديدة #${n.number}`,
        preheader: `${org.name}: ${n.subject.slice(0, 80)}`,
        eyebrow: 'لوحة الإدارة',
        paragraphs: ['طلب عميل التواصل مع الدعم الفني. المحادثة كاملة مع المساعد الذكي موجودة في التذكرة.'],
        rows: [...who, ...(n.requester ? [{ label: 'مقدّم الطلب', value: n.requester }] : []), { label: 'السؤال', value: n.subject.slice(0, 300), strong: true }, ...(n.page ? [{ label: 'الصفحة', value: n.page }] : [])],
        button: { label: 'فتح تذاكر الدعم', url: 'https://storely.dev/storely-admin/requests?tab=support' },
        small: 'وصلك هذا الإيميل لأنك مشرف في لوحة إدارة ستورلي.',
      }),
    }
  }

  if (n.kind === 'renewal') {
    return {
      subject: oneLine(`طلب تجديد اشتراك: ${org.name}`),
      html: brandEmail({
        title: 'طلب تجديد اشتراك',
        preheader: `${org.name} ضغط «تجديد الاشتراك» — تواصل معه للدفع`,
        eyebrow: 'لوحة الإدارة',
        paragraphs: [n.expired ? 'كان اشتراكه منتهياً، فتفعّل حسابه يوم سماح واحد لحين الدفع.' : 'اشتراكه ما زال سارياً، وطلب التجديد قبل الانتهاء.', 'تواصل معه لإتمام الدفع، ثم فعّل اشتراكه من «العملاء» — يتحوّل الطلب إلى «مدفوع» تلقائياً.'],
        rows: [...who, ...(n.graceUntil ? [{ label: 'يعمل حسابه حتى', value: new Date(n.graceUntil).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) }] : [])],
        button: { label: 'فتح طلبات التجديد', url: 'https://storely.dev/storely-admin/renewals' },
        small: 'وصلك هذا الإيميل لأنك مشرف في لوحة إدارة ستورلي.',
      }),
    }
  }

  const what = n.kind === 'addon'
    ? `إضافة «${n.addonName}»${n.quantity > 1 ? ` (${n.quantity})` : ''}`
    : `ترقية إلى ${planLabel(n.toPlan)}`
  const rows: EmailRow[] = [
    ...who,
    { label: 'الطلب', value: what, strong: true },
    ...(n.kind === 'plan' ? [{ label: 'الباقة الحالية', value: planLabel(n.fromPlan) }] : []),
    ...(n.kind === 'plan' && n.billAtRequest != null ? [{ label: 'فاتورته الحالية', value: `${n.billAtRequest} ر.س شهرياً` }] : []),
    ...(n.kind === 'addon' && n.note ? [{ label: 'ملاحظة', value: n.note }] : []),
  ]
  return {
    subject: oneLine(`طلب جديد: ${what} — ${org.name}`),
    html: brandEmail({
      title: n.kind === 'addon' ? 'طلب إضافة جديد' : 'طلب ترقية جديد',
      preheader: `${org.name} يطلب ${what}`,
      eyebrow: 'لوحة الإدارة',
      paragraphs: ['وصل طلب جديد من عميل وينتظر موافقتك. لما توافق يتفعّل له مباشرة ويوصله إشعار.'],
      rows,
      button: { label: 'فتح الطلبات', url: ADMIN_REQUESTS_URL },
      small: 'وصلك هذا الإيميل لأنك مشرف في لوحة إدارة ستورلي.',
    }),
  }
}

/** يرسل الإيميل لكل مشرف معني — ما يرمي خطأ أبداً */
export async function notifyAdminsOfRequest(db: SupabaseClient, orgId: string, n: RequestNotice): Promise<number> {
  try {
    const [{ data: admins }, { data: org }, { data: owner }] = await Promise.all([
      db.from('admin_users').select('email,role,is_active,permissions'),
      db.from('organizations').select('name,whatsapp_number').eq('id', orgId).maybeSingle(),
      db.from('profiles').select('full_name,phone').eq('org_id', orgId).eq('role', 'owner').maybeSingle(),
    ])
    const to = approverEmails((admins || []) as AdminRow[])
    if (!to.length) return 0
    const mail = requestEmail(n, { name: (org as any)?.name || 'منشأة', owner: (owner as any)?.full_name, phone: (org as any)?.whatsapp_number || (owner as any)?.phone })
    let sent = 0
    for (const email of to) {
      const r = await sendEmail({ to: email, subject: mail.subject, html: mail.html }).catch(() => ({ success: false }))
      if ((r as any)?.success) sent++
      else console.error('ADMIN_REQUEST_EMAIL_FAILED', (r as any)?.error || '')
    }
    return sent
  } catch (e) {
    console.error('ADMIN_REQUEST_EMAIL_FAILED', e)
    return 0
  }
}

/** يرسل إيميل الطلب بعد الرد على العميل (after) — وخارج طلب Next (الاختبارات) يرسله مباشرة بدون انتظار */
export function notifyAdminsLater(db: SupabaseClient, orgId: string, n: RequestNotice) {
  const job = () => notifyAdminsOfRequest(db, orgId, n).then(() => {})
  try { after(job) } catch { void job() }
}
