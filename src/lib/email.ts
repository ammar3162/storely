import { Resend } from 'resend'

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

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
  // بدون مفتاح (مثلاً بيئة staging إذا ما انضاف لها المفتاح) نرجّع فشل واضح بدل ما ينكسر الطلب كله
  if (!process.env.RESEND_API_KEY) {
    console.error('EMAIL_SEND_FAILED: RESEND_API_KEY is not set in this environment')
    return { success: false, error: 'RESEND_API_KEY missing' }
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: 'Storely <noreply@storely.dev>',
    to,
    subject,
    html,
    text: text || htmlToText(html),
  })
  if (error) {
    console.error('EMAIL_SEND_FAILED:', error)
    return { success: false, error: error.message }
  }
  return { success: true, id: data?.id }
}
