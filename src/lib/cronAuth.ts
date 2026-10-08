/**
 * هل الطلب من الجدولة؟
 * - Vercel Cron يرسل تلقائياً "Authorization: Bearer <CRON_SECRET>"
 * - أو تشغيل يدوي بنفس المفتاح في هيدر x-cron-secret
 * مفتاح مستقل عن كلمة سر الإدارة، ولو مو مضبوط بالبيئة نرفض (ما نفتح المهام لأي أحد).
 */
export function isCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}` || req.headers.get('x-cron-secret') === secret
}
