import { timingSafeEqual } from 'crypto'

/**
 * بوابة واتساب (Wasender → /api/webhook): Wasender يرسل سر الـ webhook بالهيدر x-webhook-signature.
 * بدون تطابق السر = طلب مزوّر من خارج واتساب (رسالة «تم» من رقم مورد، أوامر البوت باسم المالك...) → مرفوض.
 * السر غير مضبوط = نرفض (كان يقبل الكل «لين يتضبط السر» — ثغرة 2026-11-10).
 */
export function validWasenderWebhook(headerValue: string | null | undefined, secret: string | null | undefined): boolean {
  if (!secret) return false
  const got = Buffer.from(String(headerValue || ''))
  const want = Buffer.from(secret)
  return got.length === want.length && timingSafeEqual(got, want)
}
