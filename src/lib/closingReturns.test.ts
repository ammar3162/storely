import { describe, it, expect } from 'vitest'
import { cleanInvoiceNo, returnsFromInput, closingReturns, returnsStats, previousReturns, MAX_RETURNS } from './closingReturns'

const base = 'https://x.supabase.co/storage/v1/object/public/invoices/'
const safe = (u: unknown) => (typeof u === 'string' && u.startsWith(base) ? u : null)

describe('closing returns', () => {
  it('invoice number: Arabic/Persian digits become 0-9, spaces trimmed, max 40', () => {
    expect(cleanInvoiceNo(' ١٠٤٣ ')).toBe('1043')
    expect(cleanInvoiceNo('۱۲۳')).toBe('123')
    expect(cleanInvoiceNo('INV  - 7')).toBe('INV - 7')
    expect(cleanInvoiceNo('x'.repeat(50))).toHaveLength(40)
    expect(cleanInvoiceNo(null)).toBe('')
  })
  it('every return needs a number and an uploaded photo; reason is optional and whitelisted', () => {
    const ok = returnsFromInput([{ invoice_no: '١٠٤٣', photo: base + 'a.jpg', reason: 'unsatisfied' }, { invoice_no: '77', photo: base + 'b.jpg', reason: 'hack' }], safe)
    expect(ok).toEqual({ ok: true, returns: [{ invoice_no: '1043', photo: base + 'a.jpg', reason: 'unsatisfied' }, { invoice_no: '77', photo: base + 'b.jpg', reason: null }] })
    expect(returnsFromInput(undefined, safe)).toEqual({ ok: true, returns: [] })
    expect(returnsFromInput([{ invoice_no: '', photo: base + 'a.jpg' }], safe).ok).toBe(false)
    expect(returnsFromInput([{ invoice_no: '5', photo: 'https://evil.example/a.jpg' }], safe).ok).toBe(false)
    expect(returnsFromInput([{ invoice_no: '5', photo: base + 'a.jpg' }, { invoice_no: '٥', photo: base + 'b.jpg' }], safe).ok).toBe(false)
    expect(returnsFromInput('nope', safe).ok).toBe(false)
    expect(returnsFromInput(Array.from({ length: MAX_RETURNS + 1 }, (_, i) => ({ invoice_no: String(i), photo: base + i })), safe).ok).toBe(false)
  })
  it('stats: totals, closings with returns, duplicates and reasons', () => {
    const cs = [
      { returns: [{ invoice_no: '1', photo: 'p', reason: 'wrong_order' }, { invoice_no: '2', photo: 'p', reason: null, dup_of: '2026-11-10' }] },
      { returns: [] }, { returns: null }, {},
      { returns: [{ invoice_no: '3', photo: 'p', reason: 'wrong_order' }] },
    ]
    expect(returnsStats(cs)).toEqual({ total: 3, withReturns: 2, dups: 1, byReason: { wrong_order: 2, none: 1 } })
    expect(closingReturns({ returns: 'bad' })).toEqual([])
  })
  it('previous returns: first closing date per number, same branch, last 90 days', async () => {
    const calls: any[] = []
    const q: any = new Proxy({}, { get: (_t, k) => k === 'then'
      ? (res: any) => res({ data: [{ closing_date: '2026-11-01', returns: [{ invoice_no: '9', photo: 'p' }] }, { closing_date: '2026-11-05', returns: [{ invoice_no: '9', photo: 'p' }, { invoice_no: '10', photo: 'p' }] }] })
      : (...a: any[]) => { calls.push([k, ...a]); return q } })
    const db: any = { from: () => q }
    expect(await previousReturns(db, 'org', 'br', ['9', '10', '11'], '2026-11-17')).toEqual({ '9': '2026-11-01', '10': '2026-11-05' })
    expect(calls).toContainEqual(['eq', 'branch_id', 'br'])
    expect(calls).toContainEqual(['gte', 'closing_date', '2026-08-19'])
    expect(await previousReturns(db, 'org', null, [], '2026-11-17')).toEqual({})
  })
})
