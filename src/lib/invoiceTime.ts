// وقت تسجيل فاتورة الشراء وحركتها بالمخزون:
// فاتورة بتاريخ اليوم = الوقت الفعلي الحين؛ فاتورة بتاريخ سابق = 12 الظهر بذاك اليوم (بتوقيت السعودية).
// قبل كان دايماً 12 الظهر — فاتورة تنسجل الصبح كانت تاخذ وقت بالمستقبل وتلخبط «طلب المورد مرة وحدة لكل نزول».
export function invoiceTimestamp(invoiceDate: string | null | undefined, now: Date = new Date()): string {
  const todaySaudi = new Date(now.getTime() + 3 * 3600e3).toISOString().slice(0, 10)
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(invoiceDate || '')) ? String(invoiceDate) : todaySaudi
  if (d >= todaySaudi) return now.toISOString()
  return new Date(`${d}T12:00:00+03:00`).toISOString()
}
