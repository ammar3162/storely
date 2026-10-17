/** رابط فاتورة مرفوعة على مخزن ستورلي (مو رابط خارجي) — الخادم يرفض غيره */
export function isStoredInvoiceUrl(u: unknown): boolean {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  return typeof u === 'string' && !!base && u.startsWith(`${base}/storage/v1/object/public/invoices/`) && u.length < 600 && !/[\s"'<>]/.test(u)
}
