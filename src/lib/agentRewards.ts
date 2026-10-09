import type { PlanKey, BillingCycle } from '@/lib/planPricing'

// مكافأة المندوب على أول اشتراك مدفوع للمنشأة اللي جابها — حسب الباقة، والسنوي ضعفها
export const AGENT_REWARD: Record<PlanKey, number> = { basic: 50, pro: 100, advanced: 150 }
export const agentReward = (plan: PlanKey, cycle: BillingCycle) => AGENT_REWARD[plan] * (cycle === 'yearly' ? 2 : 1)

export const AGENT_TERMS_VERSION = '2026-10-09'
export const REF_COOKIE = 'ref_agent'
export const REF_DAYS = 60

/** كود المندوب: حروف وأرقام كبيرة بدون الملتبسة (O/0، I/1) */
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
