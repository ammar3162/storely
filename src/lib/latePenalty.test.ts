import { describe, it, expect } from 'vitest'
import { applyLateRules } from './latePenalty'

const s = { graceMinutes: 10, perHour: 5 }

describe('applyLateRules', () => {
  it('ignores lateness within the grace period', () => {
    expect(applyLateRules(10, s)).toEqual({ lateMinutes: 0, penalty: null })
    expect(applyLateRules(3, s)).toEqual({ lateMinutes: 0, penalty: null })
  })
  it('counts the full lateness once past grace, pro-rated per hour', () => {
    expect(applyLateRules(14, s)).toEqual({ lateMinutes: 14, penalty: 1.17 })
    expect(applyLateRules(60, s)).toEqual({ lateMinutes: 60, penalty: 5 })
    expect(applyLateRules(90, s)).toEqual({ lateMinutes: 90, penalty: 7.5 })
  })
  it('records lateness without a penalty when no hourly amount is set', () => {
    expect(applyLateRules(25, { graceMinutes: 0, perHour: null })).toEqual({ lateMinutes: 25, penalty: null })
  })
  it('on time is zero', () => {
    expect(applyLateRules(0, s)).toEqual({ lateMinutes: 0, penalty: null })
  })
})
