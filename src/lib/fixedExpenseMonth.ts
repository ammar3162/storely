// المصروف الثابت (إيجار، كهرباء...) ينحسب على الشهر اللي انضاف فيه وما بعده — مو على الشهور اللي قبله
// createdAt: وقت إضافة المصروف · month: YYYY-MM أو YYYY-MM-01
export function fixedExpenseAppliesTo(createdAt: string | null | undefined, month: string): boolean {
  if (!createdAt) return true
  const t = Date.parse(createdAt)
  if (!Number.isFinite(t)) return true
  const createdMonth = new Date(t + 3 * 3600e3).toISOString().slice(0, 7)   // بتوقيت الرياض
  return month.slice(0, 7) >= createdMonth
}
