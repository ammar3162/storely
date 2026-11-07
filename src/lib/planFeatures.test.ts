import { describe, it, expect } from 'vitest'
import { featuresFrom, addonCoversBranch, planIncludes } from './planFeatures'

describe('plan features', () => {
  it('standard and advanced include everything', () => {
    for (const p of ['pro', 'advanced']) expect(featuresFrom(p, [])).toEqual({ cashier: true, hr: true, ai: true, profitability: true })
  })
  it('basic opens each feature only with its add-on', () => {
    expect(featuresFrom('basic', [])).toEqual({ cashier: false, hr: false, ai: false, profitability: false })
    expect(featuresFrom('basic', ['cashier_closing'])).toEqual({ cashier: true, hr: false, ai: false, profitability: false })
    expect(featuresFrom('basic', ['hr_full', 'ai_tools'])).toMatchObject({ hr: true, ai: true, cashier: false })
    expect(featuresFrom(null, ['profitability']).profitability).toBe(true)
  })
  it('a running free trial opens every feature, whatever the plan', () => {
    expect(featuresFrom('basic', [], true)).toEqual({ cashier: true, hr: true, ai: true, profitability: true })
  })
})

describe('new plans (2026-11)', () => {
  it('each plan includes its own features, profitability on all', () => {
    expect(featuresFrom('essential', [])).toEqual({ cashier: false, hr: false, ai: false, profitability: true })
    expect(featuresFrom('ops', [])).toEqual({ cashier: true, hr: false, ai: false, profitability: true })
    expect(featuresFrom('full', [])).toEqual({ cashier: true, hr: true, ai: true, profitability: true })
  })
  it('add-ons open the rest', () => {
    expect(featuresFrom('essential', ['cashier_closing', 'ai_tools'])).toMatchObject({ cashier: true, ai: true, hr: false })
    expect(featuresFrom('ops', ['hr_full']).hr).toBe(true)
  })
  it('an add-on with branch_ids covers only those branches; empty = every branch', () => {
    expect(addonCoversBranch(['a', 'b'], 'a')).toBe(true)
    expect(addonCoversBranch(['a', 'b'], 'c')).toBe(false)
    expect(addonCoversBranch(null, 'c')).toBe(true)
    expect(addonCoversBranch([], 'c')).toBe(true)
    expect(addonCoversBranch(['a'], null)).toBe(true)
  })
  it('legacy plans keep exactly the old behaviour', () => {
    expect(planIncludes('basic', 'profitability')).toBe(false)
    expect(planIncludes(null, 'cashier')).toBe(false)
    expect(planIncludes('pro', 'hr')).toBe(true)
  })
})
