import { Resend } from 'resend'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { withTimeout, EXTERNAL_TIMEOUT_MS } from '@/lib/fetchExternal'

// مزوّد الإرسال: Amazon SES لما يكون EMAIL_PROVIDER=ses ومفاتيحه موجودة، وإلا Resend.
// لو SES فشل نرسل نفس الإيميل من Resend تلقائياً (احتياط) — رموز الدخول ما تضيع.
// الاستقبال (support@) يبقى على Resend.
export function sesConfigured(env: NodeJS.ProcessEnv = process.env) {
  return env.EMAIL_PROVIDER === 'ses' && !!env.SES_ACCESS_KEY_ID && !!env.SES_SECRET_ACCESS_KEY && !!env.SES_REGION
}
let sesClient: SESv2Client | null = null
function ses() {
  sesClient ??= new SESv2Client({
    region: process.env.SES_REGION,
    credentials: { accessKeyId: process.env.SES_ACCESS_KEY_ID!, secretAccessKey: process.env.SES_SECRET_ACCESS_KEY! },
  })
  return sesClient
}

async function sendViaSes(m: { from: string; to: string; subject: string; html: string; text: string; replyTo: string; attachments?: { filename: string; content: Buffer }[] }) {
  const out = await withTimeout(ses().send(new SendEmailCommand({
    FromEmailAddress: m.from,
    Destination: { ToAddresses: [m.to] },
    ReplyToAddresses: [m.replyTo],
    Content: { Simple: {
      Subject: { Data: m.subject, Charset: 'UTF-8' },
      Body: { Html: { Data: m.html, Charset: 'UTF-8' }, Text: { Data: m.text, Charset: 'UTF-8' } },
      ...(m.attachments?.length ? { Attachments: m.attachments.map(a => ({ FileName: a.filename, RawContent: new Uint8Array(a.content) })) } : {}),
    } },
  })), EXTERNAL_TIMEOUT_MS.messaging, 'SES')
  return out.MessageId || null
}

// دالة مركزية لإرسال الإيميلات — كل الإيميلات بالنظام تمر من هنا
// عشان اسم المرسل يكون "Storely" دايماً بمكان واحد، ما نكرره بكل ملف
// نسخة نصية عادية من الإيميل: مزودو البريد (خصوصاً iCloud و Outlook) يقيّمون الإيميل اللي بدونها أسوأ
function htmlToText(html: string) {
  return html
    .replace(/<(style|title|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => `${label.replace(/<[^>]+>/g, '').trim()} (${href})`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim()
}

// اسم المرسل الظاهر — نشيل أي رموز تكسر ترويسة From
const cleanName = (s: string) => s.replace(/[<>"\r\n\\]/g, '').trim().slice(0, 60)

/** عنوان الدعم الوحيد — الردود عليه تظهر في «البريد الوارد» بلوحة الإدارة */
export const SUPPORT_EMAIL = 'support@storely.dev'

export async function sendEmail({ to, subject, html, text, fromName, fromAddress, replyTo, attachments }: {
  to: string; subject: string; html: string; text?: string
  fromName?: string; fromAddress?: string; replyTo?: string
  attachments?: { filename: string; content: Buffer }[]
}) {
  const from = `${fromName ? cleanName(fromName) || 'Storely' : 'Storely'} <${fromAddress || 'noreply@storely.dev'}>`
  const plain = text || htmlToText(html)
  if (sesConfigured()) {
    try {
      const id = await sendViaSes({ from, to, subject, html, text: plain, replyTo: replyTo || SUPPORT_EMAIL, attachments })
      return { success: true, id, provider: 'ses' as const }
    } catch (e: any) {
      console.error('EMAIL_SES_FAILED (falling back to Resend):', e?.name || '', e?.message || e)
    }
  }
  // بدون مفتاح (مثلاً بيئة staging إذا ما انضاف لها المفتاح) نرجّع فشل واضح بدل ما ينكسر الطلب كله
  if (!process.env.RESEND_API_KEY) {
    console.error('EMAIL_SEND_FAILED: RESEND_API_KEY is not set in this environment')
    return { success: false, error: 'RESEND_API_KEY missing' }
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  // حد وقت 15 ثانية: لو علق Resend نرجّع فشل عادي بدل ما يعلق الطلب
  const { data, error } = await withTimeout(resend.emails.send({
    from,
    to,
    subject,
    html,
    text: plain,
    // أي رد من العميل يرجع لعنوان الدعم الوحيد (يظهر في «البريد الوارد» بالأدمن) — إلا لو حُدّد غيره (مثل تقرير المحاسب → المالك)
    replyTo: replyTo || SUPPORT_EMAIL,
    ...(attachments?.length ? { attachments } : {}),
  }), EXTERNAL_TIMEOUT_MS.messaging, 'Resend').catch((e: Error) => ({ data: null, error: { message: e.message, name: 'timeout' } as never }))
  if (error) {
    // تعدّي حد Resend (اليومي/الشهري) — كل الإرسال متوقف لين يتجدد الحد؛ لوحة الإدارة تعرض التنبيه من عدّاد الاستهلاك
    if (/quota_exceeded/.test(String((error as any).name || ''))) console.error('EMAIL_QUOTA_EXCEEDED:', (error as any).name)
    console.error('EMAIL_SEND_FAILED:', error)
    return { success: false, error: error.message }
  }
  return { success: true, id: data?.id, provider: 'resend' as const }
}
