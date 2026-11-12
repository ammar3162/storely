import { describe, it, expect } from 'vitest'
import { featuresFrom, addonCoversBranch, planIncludes } from './planFeatures'

describe('plan features', () => {
  it('standard and advanced include everything', () => {
    for (const p of ['pro', 'advanced']) expect(featuresFrom(p, [])).toEqual({ inventory: true, purchases: true, cashier: true, hr: true, ai: true, profitability: true })
  })
  it('basic opens each feature only with its add-on', () => {
    expect(featuresFrom('basic', [])).toEqual({ inventory: true, purchases: true, cashier: false, hr: false, ai: false, profitability: true })   // الربحية مجانية لكل الباقات (2026-11-12)
    expect(featuresFrom('basic', ['cashier_closing'])).toEqual({ inventory: true, purchases: true, cashier: true, hr: false, ai: false, profitability: true })
    expect(featuresFrom('basic', ['hr_full', 'ai_tools'])).toMatchObject({ hr: true, ai: true, cashier: false })
    expect(featuresFrom(null, ['profitability']).profitability).toBe(true)
  })
  it('a running free trial opens every feature, whatever the plan', () => {
    expect(featuresFrom('basic', [], true)).toEqual({ inventory: true, purchases: true, cashier: true, hr: true, ai: true, profitability: true })
  })
})

describe('new plans (2026-11)', () => {
  it('each plan includes its own features, profitability on all', () => {
    expect(featuresFrom('essential', [])).toEqual({ inventory: true, purchases: true, cashier: false, hr: false, ai: false, profitability: true })
    expect(featuresFrom('ops', [])).toEqual({ inventory: true, purchases: true, cashier: true, hr: false, ai: false, profitability: true })
    expect(featuresFrom('full', [])).toEqual({ inventory: true, purchases: true, cashier: true, hr: true, ai: true, profitability: true })
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
  it('legacy plans keep the old behaviour (profitability now free)', () => {
    expect(planIncludes('basic', 'profitability')).toBe(true)   // 2026-11-12: الربحية مجانية حتى للأساسية القديمة
    expect(planIncludes(null, 'cashier')).toBe(false)
    expect(planIncludes('pro', 'hr')).toBe(true)
  })
})

describe('«ابنِ باقتك» (custom): only the chosen features', () => {
  it('nothing but profitability without modules; each module opens its feature', () => {
    expect(featuresFrom('custom', [])).toEqual({ inventory: false, purchases: false, cashier: false, hr: false, ai: false, profitability: true })
    expect(featuresFrom('custom', ['cashier_closing'])).toMatchObject({ cashier: true, inventory: false, purchases: false })
    expect(featuresFrom('custom', ['mod_purchases', 'mod_inventory'])).toMatchObject({ inventory: true, purchases: true, cashier: false })
    expect(featuresFrom('custom', [], true).inventory).toBe(true)   // التجربة تفتح الكل
  })
  it('every other plan keeps inventory and purchases', () => {
    for (const p of ['basic', 'pro', 'advanced', 'essential', 'ops', 'full', null, 'weird']) {
      expect(planIncludes(p, 'inventory')).toBe(true)
      expect(planIncludes(p, 'purchases')).toBe(true)
    }
  })
})
