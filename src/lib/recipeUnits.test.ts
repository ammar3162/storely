import { describe, it, expect } from 'vitest'
import { subUnitOptions, formatQty, needsConversion } from './recipeUnits'

describe('recipe units', () => {
  it('kilo and liter break down to grams and ml', () => {
    expect(subUnitOptions({ unit: 'كيلو' })[0]).toEqual({ label: 'جرام', factor: 1000 })
    expect(subUnitOptions({ unit: 'لتر' })[0]).toEqual({ label: 'مل', factor: 1000 })
  })
  it('a custom conversion comes first', () => {
    expect(subUnitOptions({ unit: 'كرتون', recipe_unit: 'كوب', recipe_unit_factor: 50 })[0]).toEqual({ label: 'كوب', factor: 50 })
  })
  it('shows small amounts in the small unit', () => {
    expect(formatQty(0.018, { unit: 'كيلو' })).toBe('18 جرام')
    expect(formatQty(1 / 3, { unit: 'لتر' })).toBe('333.33 مل')
    expect(formatQty(2.5, { unit: 'كيلو' })).toBe('2.5 كيلو')
    expect(formatQty(0.02, { unit: 'كرتون', recipe_unit: 'كوب', recipe_unit_factor: 50 })).toBe('1 كوب')
  })
  it('only flags units we cannot convert', () => {
    expect(needsConversion({ unit: 'كيلو' })).toBe(false)
    expect(needsConversion({ unit: 'قطعة' })).toBe(false)
    expect(needsConversion({ unit: 'كرتون' })).toBe(true)
    expect(needsConversion({ unit: 'كرتون', recipe_unit_factor: 24 })).toBe(false)
  })
})
