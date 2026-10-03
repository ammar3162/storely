import { describe, it, expect } from 'vitest'
import { deductionNoticeText } from './staffDeductionNotice'

describe('deduction notice text', () => {
  it('manual deduction with reason, in Arabic', () => {
    const t = deductionNoticeText('ar', { kind: 'manual', amount: 100, reason: 'كسر صحن' })
    expect(t.title).toBe('خصم على راتبك')
    expect(t.message).toContain('100 ر.س'); expect(t.message).toContain('كسر صحن')
  })
  it('late deduction in English with minutes', () => {
    const t = deductionNoticeText('en', { kind: 'late', amount: 1.17, minutes: 14 })
    expect(t.message).toContain('14 min'); expect(t.message).toContain('1.17 SAR')
  })
  it('falls back to Arabic and leaves no placeholders', () => {
    const t = deductionNoticeText('xx', { kind: 'deficit', amount: 50, date: '2026-10-01' })
    expect(t.message).toContain('2026-10-01')
    for (const lang of ['ar', 'en', 'ur', 'hi', 'tl', 'bn', 'fr'])
      for (const n of [{ kind: 'manual', amount: 5 }, { kind: 'late', amount: 5, minutes: 3 }, { kind: 'deficit', amount: 5, date: 'x' }, { kind: 'late_waived', amount: 5, date: 'x' }, { kind: 'late_restored', amount: 5, date: 'x' }, { kind: 'extra_paid', amount: 5, date: 'x' }, { kind: 'extra_comp', amount: 0, date: 'x', comp: 'y' }, { kind: 'extra_rejected', amount: 0, date: 'x' }] as any[])
        expect(deductionNoticeText(lang, n).message).not.toMatch(/\{[a-z]\}/)
  })
})
