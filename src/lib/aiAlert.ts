import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'

// تنبيه صاحب المنصة لما تتوقف خدمة الذكاء الاصطناعي (رصيد خلص / مفتاح غلط)
// — مرة وحدة كل AI_ALERT_HOURS، ويتسجّل بسجل الفحص الدوري (health_check_logs) عشان يظهر بلوحة الأدمن
export const AI_ALERT_HOURS = 6
const ADMIN_PHONE = () => process.env.ADMIN_ALERT_PHONE || '966594351667'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export type AiFailureKind = 'billing' | 'auth'

/** نوع العطل اللي يحتاج تدخّل صاحب المنصة — الأعطال المؤقتة (ضغط، مهلة) ما تنبّه */
export function aiFailureKind(status: number, detail: string): AiFailureKind | null {
  const d = String(detail || '').toLowerCase()
  if (d.includes('credit balance') || d.includes('billing')) return 'billing'
  if (status === 401 || status === 403 || d.includes('authentication_error') || d.includes('invalid x-api-key')) return 'auth'
  return null
}

const TEXT: Record<AiFailureKind, { title: string; body: string }> = {
  billing: { title: 'رصيد الذكاء الاصطناعي خلص', body: 'رصيد حساب Anthropic خلص — القراءة التلقائية للفواتير والمساعد الذكي والترجمة واقفين لين تشحن من console.anthropic.com ← Plans & Billing.' },
  auth: { title: 'مفتاح الذكاء الاصطناعي مرفوض', body: 'Anthropic رفضت مفتاح ستورلي (ANTHROPIC_API_KEY) — مميزات الذكاء الاصطناعي واقفة. تأكد من المفتاح في إعدادات Vercel.' },
}

/** يسجّل العطل وينبّه صاحب المنصة (واتساب + إيميل المشرفين الكاملين) — ما يوقف الطلب الأصلي أبداً */
export async function reportAiFailure(status: number, detail: string, feature: string): Promise<boolean> {
  const kind = aiFailureKind(status, detail)
  if (!kind) return false
  try {
    const db = sb()
    const type = `ai_${kind}`
    const since = new Date(Date.now() - AI_ALERT_HOURS * 3600e3).toISOString()
    const { data: recent } = await db.from('health_check_logs').select('id').gte('checked_at', since).filter('issues', 'cs', JSON.stringify([{ type }])).limit(1)   // jsonb @> (contains بمصفوفة يترسل كمصفوفة postgres وينرفض)
    if (recent?.length) return false
    const t = TEXT[kind]
    await db.from('health_check_logs').insert({ issues_count: 1, issues: [{ type, severity: 'critical', detail: `${t.body} (أول عطل: ${feature})`, count: 1 }], checked_at: new Date().toISOString() } as any)
    const { data: admins } = await db.from('admin_users').select('email').eq('role', 'super_admin').eq('is_active', true)
    await Promise.allSettled([
      sendWhatsAppMessage(ADMIN_PHONE(), `🚨 *${t.title}*\n\n${t.body}\n\nأول عطل: ${feature}`),
      ...((admins || []) as any[]).filter(a => a.email).map(a => sendEmail({ to: a.email, subject: `🚨 ${t.title} — Storely`,
        html: brandEmail({ title: t.title, paragraphs: [t.body, `أول عطل: ${feature}`, `ما راح يوصلك تنبيه ثاني عن نفس المشكلة لمدة ${AI_ALERT_HOURS} ساعات.`] }) })),
    ])
    return true
  } catch {
    return false
  }
}
