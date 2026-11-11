import { describe, it, expect } from 'vitest'
import { qtyUnit, unitFor } from './arabicCount'

describe('arabicCount', () => {
  it('plural from 3 to 10, singular otherwise', () => {
    expect(qtyUnit(6, 'قطعة')).toBe('6 قطع')
    expect(qtyUnit(3, 'كيس')).toBe('3 أكياس')
    expect(qtyUnit(10, 'كرتون')).toBe('10 كراتين')
    expect(qtyUnit(1, 'كيس')).toBe('1 كيس')
    expect(qtyUnit(2, 'كيس')).toBe('2 كيس')
    expect(qtyUnit(11, 'كيس')).toBe('11 كيس')
    expect(qtyUnit(105, 'علبة')).toBe('105 علب')
    expect(qtyUnit(0, 'قطعة')).toBe('0 قطعة')
  })
  it('decimals, negatives, strings, unknown and abbreviated units', () => {
    expect(qtyUnit(2.5, 'كيس')).toBe('2.5 كيس')
    expect(qtyUnit(-4, 'قطعة')).toBe('-4 قطع')
    expect(qtyUnit('5', 'لتر')).toBe('5 لترات')
    expect(qtyUnit(5, 'كيلو')).toBe('5 كيلو')
    expect(qtyUnit(5, 'وحدتي الخاصة')).toBe('5 وحدتي الخاصة')
    expect(qtyUnit(5, null)).toBe('5')
    expect(unitFor(7, 'زجاجة')).toBe('زجاجات')
  })
})
