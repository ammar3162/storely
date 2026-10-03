import { describe, it, expect } from 'vitest'
import { netFromTotal, vatBreakdown } from './vat'

describe('netFromTotal', () => {
  it('removes 15% VAT when the invoice includes VAT', () => {
    expect(netFromTotal(115, true)).toBe(100)
    expect(netFromTotal(100, true)).toBe(86.96)
  })

  it('keeps the total as-is when the invoice has no VAT', () => {
    expect(netFromTotal(100, false)).toBe(100)
    expect(netFromTotal(99.999, false)).toBe(100)
  })
})

describe('vatBreakdown (same formula as the DB generated columns)', () => {
  it('computes VAT and total for VAT invoices', () => {
    expect(vatBreakdown(100, true)).toEqual({ vat: 15, total: 115 })
  })

  it('has zero VAT for invoices without VAT', () => {
    expect(vatBreakdown(100, false)).toEqual({ vat: 0, total: 100 })
  })

  it('round-trips: entering a total gives back the same total', () => {
    for (const total of [1, 57.5, 115, 1234.56]) {
      expect(vatBreakdown(netFromTotal(total, true), true).total).toBeCloseTo(total, 1)
      expect(vatBreakdown(netFromTotal(total, false), false).total).toBe(total)
    }
  })
})
