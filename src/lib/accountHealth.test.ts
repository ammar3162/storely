import { describe, it, expect } from 'vitest'
import { assessHealth, type OrgSignals } from './accountHealth'

const NOW = Date.parse('2026-11-01T18:00:00Z'), DAY = 86400e3
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString()
const base = (o: Partial<OrgSignals> = {}): OrgSignals => ({
  now: NOW, createdAt: iso(60), subscriptionType: 'paid', endsAt: iso(-30), lastLogin: iso(0), ops7: 40, lastOp: iso(0),
  products: 30, staff: 4, closingDays7: 7, attendance7: 25, waSent7: 10, waFailed7: 0,
  usage30: { cashier: 28, hr: 100, ai: 5, profitability: 2 }, paidAddons: [],
  features: { cashier: true, hr: true, ai: true, profitability: true }, ...o,
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
    const h = assessHealth(base({ paidAddons: ['hr'], usage30: { cashier: 28, hr: 0, ai: 5, profitability: 2 }, attendance7: 0 }))
    expect(h.status).toBe('attention'); expect(h.unusedPaid).toEqual(['hr'])
    expect(h.reasons.some(r => r.text.includes('يدفع على «إدارة الموظفين»'))).toBe(true)
  })
  it('included-but-unused features are info only, not a problem', () => {
    const h = assessHealth(base({ usage30: { cashier: 28, hr: 100, ai: 0, profitability: 0 } }))
    expect(h.status).toBe('active'); expect(h.unusedIncluded).toEqual(['ai', 'profitability'])
  })
  it('missing cashier closings and failing WhatsApp need attention', () => {
    const h = assessHealth(base({ closingDays7: 2, waSent7: 3, waFailed7: 4 }))
    expect(h.status).toBe('attention')
    expect(h.reasons.map(r => r.text).join(' | ')).toMatch(/2 أيام بس.*واتساب فشلت/)
  })
  it('cashier closings are not judged when the owner never used or paid for them', () => {
    expect(assessHealth(base({ closingDays7: 0, usage30: { cashier: 0, hr: 100, ai: 5, profitability: 2 } })).status).toBe('active')
  })
  it('trial ending soon is a warning', () => {
    const h = assessHealth(base({ subscriptionType: 'trial', endsAt: iso(-2) }))
    expect(h.status).toBe('attention'); expect(h.reasons[0].text).toContain('التجربة تنتهي')
  })
})
