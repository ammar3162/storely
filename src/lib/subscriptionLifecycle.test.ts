import { describe, it, expect } from 'vitest'
import { renewalStart, renewalEnd, resumeOutcome } from './subscriptionLifecycle'

const NOW = Date.UTC(2026, 10, 6, 9)         // 6 نوفمبر
const day = (d: number) => new Date(Date.UTC(2026, 10, d, 9)).toISOString()

describe('subscription lifecycle', () => {
  it('renewing an active paid subscription continues from its end (no lost days)', () => {
    const r = renewalEnd({ type: 'paid', endsAt: day(30) }, 'paid', { days: 30 }, NOW)
    expect(r.start.toISOString()).toBe(day(30))
    expect(r.end.toISOString()).toBe(new Date(Date.UTC(2026, 11, 30, 9)).toISOString())
  })
  it('trial → paid starts today; expired paid starts today', () => {
    expect(renewalStart({ type: 'trial', endsAt: day(20) }, 'paid', NOW).getTime()).toBe(NOW)
    expect(renewalStart({ type: 'paid', endsAt: day(1) }, 'paid', NOW).getTime()).toBe(NOW)
  })
  it('extending a trial adds to the current trial end', () => {
    expect(renewalStart({ type: 'trial', endsAt: day(10) }, 'trial', NOW).toISOString()).toBe(day(10))
  })
  it('paying after the 1-day grace starts today, not from the grace end', () => {
    const grace = new Date(NOW + 20 * 3600e3).toISOString()
    expect(renewalStart({ type: 'paid', endsAt: grace }, 'paid', NOW, grace).getTime()).toBe(NOW)
  })
  it('months-based offers add calendar months from the start', () => {
    expect(renewalEnd({ type: 'paid', endsAt: day(30) }, 'paid', { months: 6 }, NOW).end.toISOString())
      .toBe(new Date(Date.UTC(2027, 4, 30, 9)).toISOString())
  })
  it('resume keeps the same end date (your example: 1→30, suspended 5, resumed 6 → still ends 30)', () => {
    const r = resumeOutcome({ type: 'paid', endsAt: day(30), status: 'suspended' }, NOW)
    expect(r.endsAt).toBe(day(30))
    expect(r.daysLeft).toBe(24)
    expect(r.expired).toBe(false)
    expect(resumeOutcome({ type: 'paid', endsAt: day(2) }, NOW).expired).toBe(true)
  })
})
