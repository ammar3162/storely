import { describe, it, expect } from 'vitest'
import { digestWeek, isDigestHour, digestEmail } from './accountantDigest'

describe('accountant weekly digest', () => {
  it('week starts on Sunday (Saudi time)', () => {
    expect(digestWeek(Date.parse('2026-11-10T09:00:00Z'))).toBe('2026-11-08')   // ثلاثاء → الأحد قبله
    expect(digestWeek(Date.parse('2026-11-07T22:30:00Z'))).toBe('2026-11-08')   // السبت ليلاً UTC = الأحد فجراً في السعودية
  })
  it('fires only Sunday 8am Saudi time', () => {
    expect(isDigestHour(Date.parse('2026-11-08T05:10:00Z'))).toBe(true)
    expect(isDigestHour(Date.parse('2026-11-08T06:10:00Z'))).toBe(false)
    expect(isDigestHour(Date.parse('2026-11-09T05:10:00Z'))).toBe(false)
  })
  it('subject counts clients needing action and escapes names', () => {
    const e = digestEmail({ name: 'سارة', month: 'أكتوبر', url: 'https://x', rows: [
      { name: 'مطعم <b>', missing: 2, mismatch: 0, answered: 0, open: 1, locked: false },
      { name: 'كوفي', missing: 0, mismatch: 0, answered: 0, open: 0, locked: true },
    ] })
    expect(e.subject).toContain('منشأة تحتاج')
    expect(e.html).toContain('مطعم &lt;b&gt;')
    expect(e.html).toContain('2 فاتورة ناقصة')
    expect(digestEmail({ month: 'أكتوبر', url: 'https://x', rows: [{ name: 'أ', missing: 0, mismatch: 0, answered: 0, open: 0, locked: true }] }).subject).toContain('مكتملون')
  })
})
