import { describe, it, expect } from 'vitest'
import { parseZatcaQr, buildZatcaQr, zatcaFingerprint, zatcaDate } from './zatcaQr'

const qr = buildZatcaQr({ sellerName: 'شركة المراعي', vatNumber: '300012345678903', issuedAt: '2026-10-05T21:30:00Z', total: '1150.00', vat: '150.00' })

describe('ZATCA QR', () => {
  it('decodes seller, VAT number, time and amounts (Arabic names too)', () => {
    expect(parseZatcaQr(qr)).toEqual({ sellerName: 'شركة المراعي', vatNumber: '300012345678903', issuedAt: '2026-10-05T21:30:00.000Z', total: 1150, vat: 150 })
  })
  it('invoice date is in Saudi time', () => {
    expect(zatcaDate(parseZatcaQr(qr)!)).toBe('2026-10-06')   // ٩:٣٠ مساءً UTC = ١٢:٣٠ بعد منتصف الليل بالسعودية
  })
  it('rejects junk, product barcodes, bad VAT numbers and broken amounts', () => {
    expect(parseZatcaQr('6281007031234')).toBeNull()
    expect(parseZatcaQr('https://example.com')).toBeNull()
    expect(parseZatcaQr('')).toBeNull()
    expect(parseZatcaQr(buildZatcaQr({ sellerName: 'x', vatNumber: '123', issuedAt: '2026-10-05T10:00:00Z', total: '10', vat: '1' }))).toBeNull()
    expect(parseZatcaQr(buildZatcaQr({ sellerName: 'x', vatNumber: '300012345678903', issuedAt: '2026-10-05T10:00:00Z', total: '10', vat: '20' }))).toBeNull()
    expect(parseZatcaQr(qr.slice(0, 20))).toBeNull()
  })
  it('same invoice = same fingerprint', () => {
    expect(zatcaFingerprint(parseZatcaQr(qr)!)).toBe(zatcaFingerprint(parseZatcaQr(qr)!))
  })
})
