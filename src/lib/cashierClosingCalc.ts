// حساب إقفال الكاشير — نفس قواعد التقفيل الأصلي (cashier-closing POST):
// المتوقع بالدرج = المبيعات − الشبكة، والفرق = الكاش الفعلي − المتوقع. المسحوبات ما تأثر على العجز
export type ClosingInput = { total_sales: unknown; mada_amount?: unknown; visa_amount?: unknown; mastercard_amount?: unknown; cash_amount: unknown; purchases?: unknown }
export const money = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n * 100) / 100 : NaN }
const r2 = (n: number) => Math.round(n * 100) / 100

export function computeClosing(i: ClosingInput) {
  const sales = money(i.total_sales), mada = money(i.mada_amount), visa = money(i.visa_amount), mastercard = money(i.mastercard_amount), cash = money(i.cash_amount)
  if ([sales, mada, visa, mastercard, cash].some(Number.isNaN)) return null
  const purchases = (Array.isArray(i.purchases) ? i.purchases : []).slice(0, 50)
    .map((p: any) => ({ amount: money(p?.amount), reason: String(p?.reason ?? '').trim().slice(0, 200) }))
    .filter(p => p.amount > 0)
  if (purchases.some(p => Number.isNaN(p.amount))) return null
  const network = r2(mada + visa + mastercard)
  const totalPurchases = r2(purchases.reduce((s, p) => s + p.amount, 0))
  const expected = r2(sales - network)
  const difference = r2(cash - expected)
  const status = Math.abs(difference) < 0.01 ? 'balanced' : difference < 0 ? 'deficit' : 'surplus'
  return { total_sales: sales, mada_amount: mada, visa_amount: visa, mastercard_amount: mastercard, network_amount: network, cash_amount: cash,
    purchases, total_purchases: totalPurchases, expected_cash: expected, difference, status: status as 'balanced' | 'deficit' | 'surplus' }
}
