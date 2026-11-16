// عرض السعر الخاص (ملف العميل في لوحة الإدارة): مدة صلاحية العرض وتاريخها بصيغة الفاتورة
export const OFFER_VALID_DAYS = 7

export const arInvoiceDate = (d: Date) =>
  d.toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', year: 'numeric', month: 'long', day: 'numeric' })

export function offerValidUntil(from = new Date()): string {
  return arInvoiceDate(new Date(from.getTime() + OFFER_VALID_DAYS * 86400000))
}

/** بنود عرض/فاتورة من المتصفح: نص وقيمة رقمية موجبة فقط */
export function cleanInvoiceItems(items: unknown): { label: string; amount: number }[] {
  if (!Array.isArray(items)) return []
  return items
    .filter((it: any) => it?.label && Number.isFinite(Number(it?.amount)))
    .slice(0, 30)
    .map((it: any) => ({ label: String(it.label).slice(0, 200), amount: Math.round(Number(it.amount) * 100) / 100 }))
}
