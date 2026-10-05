import { describe, it, expect } from 'vitest'
import { normalizeVat, isValidVat, normalizeInvoiceNumber } from './taxInvoice'

describe('tax invoice fields', () => {
  it('normalizes and validates Saudi VAT numbers', () => {
    expect(normalizeVat('٣٠٠٠ ١٢٣٤ ٥٦٧٨ ٩٠٣')).toBe('300012345678903')
    expect(isValidVat('300012345678903')).toBe(true)
    expect(isValidVat('300012345678901')).toBe(false)   // لازم ينتهي بـ 3
    expect(isValidVat('30001234567890')).toBe(false)    // ١٤ رقم
    expect(isValidVat(null)).toBe(false)
    expect(normalizeVat('')).toBeNull()
  })
  it('invoice number', () => {
    expect(normalizeInvoiceNumber('  INV-٢٠٢٦/15 ')).toBe('INV-2026/15')
    expect(normalizeInvoiceNumber('')).toBeNull()
    expect(normalizeInvoiceNumber('x'.repeat(80))?.length).toBe(50)
  })
})
