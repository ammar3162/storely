import { timingSafeEqual } from 'crypto'
/**
 * هل الطلب من الجدولة؟
 * - Vercel Cron يرسل تلقائياً "Authorization: Bearer <CRON_SECRET>"
 * - أو تشغيل يدوي بنفس المفتاح في هيدر x-cron-secret
 * مفتاح مستقل عن كلمة سر الإدارة، ولو مو مضبوط بالبيئة نرفض (ما نفتح المهام لأي أحد).
 */
export function isCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return sameSecret(req.headers.get('authorization'), `Bearer ${secret}`) || sameSecret(req.headers.get('x-cron-secret'), secret)
}

// مقارنة بزمن ثابت (ما تكشف طول الجزء الصحيح من المفتاح عن طريق التوقيت)
function sameSecret(got: string | null, want: string): boolean {
  if (!got) return false
  const a = Buffer.from(got), b = Buffer.from(want)
  return a.length === b.length && timingSafeEqual(a, b)
}
