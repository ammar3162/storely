import { describe, it, expect } from 'vitest'
import { resolvePurchaseTax } from './taxInvoice'
import { buildZatcaQr } from './zatcaQr'

// قاعدة بيانات وهمية: فواتير سابقة بنفس البصمة
function fakeDb(prev: any[]) {
  const q = (rows: any[]) => { const o: any = {}; for (const m of ['select', 'eq', 'is', 'limit', 'update', 'order']) o[m] = () => o; o.then = (r: any) => r({ data: rows, error: null }); return o }
  return { from: (t: string) => q(t === 'purchases' ? prev : []) } as any
}
const zatca_qr = buildZatcaQr({ sellerName: 'المراعي', vatNumber: '300012345678903', issuedAt: '2026-10-05T10:00:00Z', total: '1150.00', vat: '150.00' })

describe('ZATCA QR on save', () => {
  it('verified: VAT number comes from the QR, not what was typed', async () => {
    const r = await resolvePurchaseTax(fakeDb([]), 'org', 'المراعي', { zatca_qr, supplier_vat_number: '311111111111113' }, true, 1150)
    expect(r.ok && r.tax).toMatchObject({ qr_verified: true, supplier_vat_number: '300012345678903', qr_total: 1150, qr_mismatch: false })
    expect(r.ok && r.alert).toBeNull()
  })
  it('entered more than the original → saved but flagged with an alert', async () => {
    const r = await resolvePurchaseTax(fakeDb([]), 'org', 'المراعي', { zatca_qr }, true, 1300)
    expect(r.ok && r.tax.qr_mismatch).toBe(true)
    expect(r.ok && r.alert).toContain('1150.00')
  })
  it('items of the same invoice entered one by one → same group, no alert until the total is exceeded', async () => {
    const r = await resolvePurchaseTax(fakeDb([{ invoice_group: 'g1', total_amount: 600, created_at: '2026-10-05T10:00:00Z' }]), 'org', 'المراعي', { zatca_qr }, true, 550)
    expect(r.ok && r.tax).toMatchObject({ invoice_group: 'g1', qr_mismatch: false })
  })
  it('invoice already fully recorded → rejected as a duplicate', async () => {
    const r = await resolvePurchaseTax(fakeDb([{ invoice_group: 'g1', total_amount: 1150, created_at: '2026-10-05T10:00:00Z' }]), 'org', 'المراعي', { zatca_qr }, true, 1150)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.status).toBe(409)
  })
  it('a forged / non-ZATCA code is ignored, not trusted', async () => {
    const r = await resolvePurchaseTax(fakeDb([]), 'org', 'x', { zatca_qr: 'not-a-qr' }, true, 100)
    expect(r.ok && r.tax.qr_verified).toBe(false)
  })
})
