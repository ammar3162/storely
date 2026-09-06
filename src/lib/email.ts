import { Resend } from 'resend'

// دالة مركزية لإرسال الإيميلات — كل الإيميلات بالنظام تمر من هنا
// عشان اسم المرسل يكون "Storely" دايماً بمكان واحد، ما نكرره بكل ملف
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: 'Storely <noreply@storely.dev>',
    to,
    subject,
    html,
  })
  if (error) {
    console.error('EMAIL_SEND_FAILED:', error)
    return { success: false, error: error.message }
  }
  return { success: true, id: data?.id }
}
