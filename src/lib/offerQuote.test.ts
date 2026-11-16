import { describe, it, expect } from 'vitest'
import { cleanInvoiceItems, offerValidUntil } from './offerQuote'

describe('offer quote', () => {
  it('keeps only labelled numeric items', () => {
    expect(cleanInvoiceItems([{ label: 'a', amount: '900' }, { label: '', amount: 1 }, { label: 'b', amount: 'x' }, null])).toEqual([{ label: 'a', amount: 900 }])
    expect(cleanInvoiceItems('nope')).toEqual([])
  })
  it('valid-until is 7 days later', () => {
    expect(offerValidUntil(new Date(Date.UTC(2026, 10, 17, 12)))).toContain('24')
  })
})

import { offerState, needsFollowup, suggestRenewal } from './offerQuote'
describe('offers follow-up and renewal', () => {
  const now = Date.UTC(2026, 10, 17)
  const d = (days: number) => new Date(now + days * 86400000).toISOString()
  it('state: expired only when sent and past validity', () => {
    expect(offerState({ status: 'sent', created_at: d(-8), valid_until: d(-1) }, now)).toBe('expired')
    expect(offerState({ status: 'sent', created_at: d(-1), valid_until: d(6) }, now)).toBe('sent')
    expect(offerState({ status: 'paid', created_at: d(-8), valid_until: d(-1) }, now)).toBe('paid')
  })
  it('follow-up after 3 days, not for paid or long-expired', () => {
    expect(needsFollowup({ status: 'sent', created_at: d(-2), valid_until: d(5) }, now)).toBe(false)
    expect(needsFollowup({ status: 'sent', created_at: d(-3), valid_until: d(4) }, now)).toBe(true)
    expect(needsFollowup({ status: 'paid', created_at: d(-5), valid_until: d(2) }, now)).toBe(false)
    expect(needsFollowup({ status: 'sent', created_at: d(-20), valid_until: d(-13) }, now)).toBe(false)
  })
  it('renewal suggestion: 6 months −10% rounded down to 5', () => {
    expect(suggestRenewal(198)).toEqual({ months: 6, pct: 10, list: 1188, amount: 1065 })
    expect(suggestRenewal(0).amount).toBe(0)
  })
})
