/** رابط فاتورة مرفوعة على مخزن ستورلي (مو رابط خارجي) — الخادم يرفض غيره */
export function isStoredInvoiceUrl(u: unknown): boolean {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  return typeof u === 'string' && !!base && u.startsWith(`${base}/storage/v1/object/public/invoices/`) && u.length < 600 && !/[\s"'<>]/.test(u)
}

// ── مجلد الفواتير خاص (2026-11): الرابط المحفوظ ما يفتح مباشرة — يفتح عن طريق /api/file بعد التحقق ──

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

/** مسار الملف داخل مجلد الفواتير من الرابط المحفوظ (أو null لو مو من مخزننا) */
export function storedInvoicePath(u: unknown): string | null {
  if (typeof u !== 'string' || u.length > 600 || /[\s"'<>]/.test(u)) return null
  const i = u.indexOf('/storage/v1/object/public/invoices/')
  if (i < 0) return null
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  if (base && !u.startsWith(base)) return null
  const path = decodeURIComponent(u.slice(i + '/storage/v1/object/public/invoices/'.length).split('?')[0])
  return path && !path.includes('..') ? path : null
}

/** المنشأة صاحبة الملف من مساره: {org}/… أو invoices/{org}-… أو task-photos/{org}-… */
export function orgOfInvoicePath(path: string): string | null {
  const m = path.match(new RegExp(`^(?:(${UUID})/|(?:invoices|task-photos)/(${UUID})-)`, 'i'))
  return m ? (m[1] || m[2]).toLowerCase() : null
}

/** رابط عرض محمي للملف (نسبي للموقع، أو كامل مع origin) — غير ملفاتنا ترجع زي ما هي */
export function fileLink(u: string | null | undefined, origin = ''): string {
  if (!u) return ''
  return storedInvoicePath(u) ? `${origin}/api/file?u=${encodeURIComponent(u)}` : u
}

/** عنوان الموقع للروابط اللي تطلع برا الصفحة (إكسل المحاسب) */
export const siteOrigin = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_ENV === 'preview' ? 'https://staging.storely.dev' : 'https://storely.dev')).replace(/\/+$/, '')
