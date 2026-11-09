import { describe, it, expect } from 'vitest'
import { assessHealth, stuckCodeAt, type OrgSignals } from './accountHealth'

const NOW = Date.parse('2026-11-01T18:00:00Z'), DAY = 86400e3
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString()
const base = (o: Partial<OrgSignals> = {}): OrgSignals => ({
  now: NOW, createdAt: iso(60), subscriptionType: 'paid', endsAt: iso(-30), lastLogin: iso(0), ops7: 40, lastOp: iso(0),
  products: 30, staff: 4, closingDays7: 7, attendance7: 25, waSent7: 10, waFailed7: 0,
  usage30: { inventory: 1, purchases: 1, cashier: 28, hr: 100, ai: 5, profitability: 2 }, paidAddons: [],
  features: { inventory: true, purchases: true, cashier: true, hr: true, ai: true, profitability: true }, ...o,
})

describe('assessHealth', () => {
  it('active when used daily and nothing is wrong', () => {
    const h = assessHealth(base())
    expect(h.status).toBe('active'); expect(h.reasons).toEqual([])
  })
  it('expired wins over everything', () => {
    expect(assessHealth(base({ endsAt: iso(3), ops7: 0 })).status).toBe('expired')
  })
  it('dormant: no login for a week and no operations', () => {
    const h = assessHealth(base({ lastLogin: iso(9), ops7: 0, lastOp: iso(12) }))
    expect(h.status).toBe('dormant'); expect(h.reasons[0].text).toContain('9 يوم')
  })
  it('a brand new account is not dormant yet', () => {
    expect(assessHealth(base({ createdAt: iso(1), lastLogin: null, ops7: 0, lastOp: null, products: 0 })).status).toBe('active')
  })
  it('flags a paid add-on that is not used', () => {
    const h = assessHealth(base({ paidAddons: ['hr'], usage30: { inventory: 1, purchases: 1, cashier: 28, hr: 0, ai: 5, profitability: 2 }, attendance7: 0 }))
    expect(h.status).toBe('attention'); expect(h.unusedPaid).toEqual(['hr'])
    expect(h.reasons.some(r => r.text.includes('يدفع على «الحضور والرواتب»'))).toBe(true)
  })
  it('included-but-unused features are info only, not a problem', () => {
    const h = assessHealth(base({ usage30: { inventory: 1, purchases: 1, cashier: 28, hr: 100, ai: 0, profitability: 0 } }))
    expect(h.status).toBe('active'); expect(h.unusedIncluded).toEqual(['ai', 'profitability'])
  })
  it('missing cashier closings and failing WhatsApp need attention', () => {
    const h = assessHealth(base({ closingDays7: 2, waSent7: 3, waFailed7: 4 }))
    expect(h.status).toBe('attention')
    expect(h.reasons.map(r => r.text).join(' | ')).toMatch(/2 أيام بس.*واتساب فشلت/)
  })
  it('cashier closings are not judged when the owner never used or paid for them', () => {
    expect(assessHealth(base({ closingDays7: 0, usage30: { inventory: 1, purchases: 1, cashier: 0, hr: 100, ai: 5, profitability: 2 } })).status).toBe('active')
  })
  it('trial ending soon is a warning', () => {
    const h = assessHealth(base({ subscriptionType: 'trial', endsAt: iso(-2) }))
    expect(h.status).toBe('attention'); expect(h.reasons[0].text).toContain('التجربة تنتهي')
  })
})

describe('stuck on the login code', () => {
  const H = 3600e3, at = (hAgo: number) => new Date(NOW - hAgo * H).toISOString()
  it('code requested 3 hours ago, never used, no device after → stuck', () => {
    expect(stuckCodeAt([{ user_id: 'u1', created_at: at(3), used_at: null }], [], ['u1'], NOW)).toBe(at(3))
  })
  it('not stuck: used, too recent, device trusted after, older than 3 days, or another org user', () => {
    expect(stuckCodeAt([{ user_id: 'u1', created_at: at(3), used_at: at(2.9) }], [], ['u1'], NOW)).toBeNull()
    expect(stuckCodeAt([{ user_id: 'u1', created_at: at(0.2), used_at: null }], [], ['u1'], NOW)).toBeNull()
    expect(stuckCodeAt([{ user_id: 'u1', created_at: at(3), used_at: null }], [{ user_id: 'u1', created_at: at(1) }], ['u1'], NOW)).toBeNull()
    expect(stuckCodeAt([{ user_id: 'u1', created_at: at(80), used_at: null }], [], ['u1'], NOW)).toBeNull()
    expect(stuckCodeAt([{ user_id: 'u2', created_at: at(3), used_at: null }], [], ['u1'], NOW)).toBeNull()
  })
  it('not stuck when he signed in later from an already-trusted device', () => {
    expect(stuckCodeAt([{ user_id: 'u1', created_at: at(3), used_at: null }], [{ user_id: 'u1', created_at: at(200), last_seen_at: at(1) }], ['u1'], NOW)).toBeNull()
  })
  it('only the latest code counts (an older unused one then a used one → fine)', () => {
    expect(stuckCodeAt([{ user_id: 'u1', created_at: at(5), used_at: null }, { user_id: 'u1', created_at: at(4), used_at: at(4) }], [], ['u1'], NOW)).toBeNull()
  })
  it('shows as a follow-up reason with how long ago', () => {
    const h = assessHealth(base({ stuckCodeAt: new Date(NOW - 3 * H).toISOString() }))
    expect(h.status).toBe('attention')
    expect(h.reasons[0].text).toContain('طلب رمز دخول قبل 3 ساعات وما أدخله')
  })
})
