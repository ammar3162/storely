import { describe, it, expect } from 'vitest'
import { isWholePositive, isWholeNonNegative } from './qtyRules'

describe('qty rules', () => {
  it('positive whole', () => {
    expect(isWholePositive(3)).toBe(true)
    expect(isWholePositive('2')).toBe(true)
    expect(isWholePositive(0.5)).toBe(false)
    expect(isWholePositive(0)).toBe(false)
    expect(isWholePositive(-1)).toBe(false)
    expect(isWholePositive('abc')).toBe(false)
  })
  it('non-negative whole', () => {
    expect(isWholeNonNegative(0)).toBe(true)
    expect(isWholeNonNegative(1.5)).toBe(false)
  })
})
