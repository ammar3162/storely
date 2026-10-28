import { describe, it, expect } from 'vitest'
import { featuresFrom } from './planFeatures'

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
})
