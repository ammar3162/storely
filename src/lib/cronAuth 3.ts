/**
 * هل الطلب من الجدولة؟
 * - Vercel Cron يرسل تلقائياً "Authorization: Bearer <CRON_SECRET>" لو المتغير مضبوط بالمشروع
 * - أو تشغيل يدوي بمفتاح الأدمن بهيدر x-cron-secret
 * لو CRON_SECRET مو مضبوط بالبيئة نسمح (عشان الجدولة ما توقف) — اضبطه بـ Vercel عشان تكتمل الحماية.
 */
export function isCronRequest(req: Request): boolean {
  const manualKey = req.headers.get('x-cron-secret')
  if (process.env.ADMIN_PASSWORD && manualKey === process.env.ADMIN_PASSWORD) return true
  if (!process.env.CRON_SECRET) return true
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}
