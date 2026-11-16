import { describe, it, expect } from 'vitest'
import { cleanInvoiceItems, offerValidUntil } from './offerQuote'

describe('offer quote', () => {
  it('keeps only labelled numeric items', () => {
    expect(cleanInvoiceItems([{ label: 'a', amount: '900' }, { label: '', amount: 1 }, { label: 'b', amount: 'x' }, null])).toEqual([{ label: 'a', amount: 900 }])
    expect(cleanInvoiceItems('nope')).toEqual([])
  })
  it('valid-until is 7 days later', () => {
    expect(offerValidUntil(new Date(Date.UTC(2026, 10, 17, 12)))).toContain('24')
  })
})
