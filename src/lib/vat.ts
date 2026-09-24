// ضريبة القيمة المضافة بالسعودية
export const VAT_RATE = 0.15

const round2 = (n: number) => parseFloat(n.toFixed(2))

/**
 * المبلغ قبل الضريبة (purchases.amount) من الإجمالي اللي أدخله المستخدم.
 * شاملة ضريبة ← الإجمالي ÷ 1.15، بدون ضريبة ← الإجمالي نفسه.
 * (vat_amount و total_amount أعمدة محسوبة بقاعدة البيانات من amount و has_vat)
 */
export function netFromTotal(total: number, hasVat: boolean): number {
  return hasVat ? round2(total / (1 + VAT_RATE)) : round2(total)
}

/** الضريبة والإجمالي بنفس معادلة الأعمدة المحسوبة بقاعدة البيانات */
export function vatBreakdown(amount: number, hasVat: boolean) {
  const vat = hasVat ? round2(amount * VAT_RATE) : 0
  const total = hasVat ? round2(amount * (1 + VAT_RATE)) : round2(amount)
  return { vat, total }
}
