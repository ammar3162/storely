import { describe, it, expect } from 'vitest'
import { normalizeUnit, sameUnit, conversionFactor, describeQty, breakdownQty } from './productUnits'

describe('purchase units', () => {
  it('normalizes unit names (Arabic variants, English, typos)', () => {
    expect(normalizeUnit('cartoon')).toBe('كرتون')
    expect(normalizeUnit('كرتونة')).toBe('كرتون')
    expect(normalizeUnit('شده')).toBe('شدة')
    expect(normalizeUnit('KG')).toBe('كيلو')
    expect(normalizeUnit('كجم')).toBe('كيلو')
    expect(normalizeUnit('pcs')).toBe('حبة')
    expect(normalizeUnit('قطعة')).toBe('حبة')
    expect(normalizeUnit('سطل')).toBe('سطل')   // غير معروفة تبقى
    expect(sameUnit('قطعة', 'حبة')).toBe(true)
  })
  it('factor: same unit 1, saved per product, built-in kilo/gram, unknown null', () => {
    expect(conversionFactor('كيس', 'كيس')).toBe(1)
    expect(conversionFactor('كيس', 'cartoon', { 'كرتون': 12 })).toBe(12)
    expect(conversionFactor('غرام', 'كيلو')).toBe(1000)
    expect(conversionFactor('حبة', 'درزن')).toBe(12)
    expect(conversionFactor('كيلو', 'غرام')).toBe(0.001)
    expect(conversionFactor('كيس', 'كرتون')).toBeNull()
  })
  it('describes stock with the biggest purchase unit', () => {
    expect(describeQty(30, 'كيس', [{ unit: 'كرتون', factor: 12 }])).toBe('30 كيس (2 كرتون و6 أكياس)')
    expect(describeQty(24, 'كيس', [{ unit: 'كرتون', factor: 12 }])).toBe('24 كيس (2 كرتون)')
    expect(describeQty(5, 'كيس', [{ unit: 'كرتون', factor: 12 }])).toBe('5 أكياس')
    expect(breakdownQty(30, 'كيس', [{ unit: 'شدة', factor: 6 }, { unit: 'كرتون', factor: 12 }])).toBe('2 كرتون و6 أكياس')
    expect(breakdownQty(30, 'كيس', [])).toBe('')
  })
})
