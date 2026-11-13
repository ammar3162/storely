import type { BillingCycle } from '@/lib/planPricing'

// مكافأة السفير على أول اشتراك مدفوع للمنشأة اللي جابها — حسب قيمة اشتراكها الشهري (العميل يختار خدماته)، والسنوي ضعفها.
// 2026-11-13 (قرار المالك): بدل الباقات القديمة — أقل من 100 ريال = 50، من 100 إلى 199 = 100، 200 فأكثر = 150.
export const AGENT_REWARD_TIERS = [
  { min: 200, amount: 150, label: '200 ريال فأكثر' },
  { min: 100, amount: 100, label: 'من 100 إلى 199 ريالاً' },
  { min: 0,   amount: 50,  label: 'أقل من 100 ريال' },
] as const
/** monthly = قيمة الاشتراك الشهري (السنوي ÷ 12) بعد الخصم */
export const agentReward = (monthly: number, cycle: BillingCycle) =>
  (AGENT_REWARD_TIERS.find(t => monthly >= t.min) || AGENT_REWARD_TIERS[2]).amount * (cycle === 'yearly' ? 2 : 1)

export const AGENT_TERMS_VERSION = '2026-11-13'
export const REF_COOKIE = 'ref_agent'
export const REF_DAYS = 60

/** كود السفير: حروف وأرقام كبيرة بدون الملتبسة (O/0، I/1) */
export function newAgentCode(rand: () => number = Math.random) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => A[Math.floor(rand() * A.length)]).join('')
}
export const normalizeAgentCode = (v: unknown) => String(v ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)

/** آيبان سعودي: SA + 22 رقم، مع تحقق mod-97 */
export function normalizeIban(v: unknown) { return String(v ?? '').toUpperCase().replace(/[\s-]/g, '') }
export function isValidSaIban(iban: string) {
  if (!/^SA\d{22}$/.test(iban)) return false
  const re = iban.slice(4) + iban.slice(0, 4)
  const digits = re.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55))
  let r = 0
  for (const ch of digits) r = (r * 10 + Number(ch)) % 97
  return r === 1
}
