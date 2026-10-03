import { describe, it, expect } from 'vitest'
import { normalizePhone, lockedMessage, samePhone } from './loginThrottle'

describe('normalizePhone', () => {
  it('treats all Saudi formats as the same number', () => {
    for (const p of ['0501234567', '501234567', '966501234567', '+966 50 123 4567', '00966501234567'])
      expect(normalizePhone(p)).toBe('501234567')
  })
  it('does not shorten to a suffix', () => {
    expect(normalizePhone('1234567')).toBe('1234567')
  })
})

describe('lockedMessage', () => {
  it('is friendly and shows the wait', () => {
    expect(lockedMessage(new Date(Date.now() + 14.2 * 60000))).toContain('15 دقيقة')
    expect(lockedMessage(new Date(Date.now() + 90 * 60000))).toContain('2 ساعة')
  })
})

describe('samePhone', () => {
  it('matches Saudi formats and international numbers with/without country code', () => {
    expect(samePhone('0501234567', '+966 501234567')).toBe(true)
    expect(samePhone('01001234567', '201001234567')).toBe(true)   // مصري مكتوب بدون رمز الدولة
  })
  it('rejects short or different numbers', () => {
    expect(samePhone('1234567', '501234567')).toBe(false)
    expect(samePhone('0501234567', '0501234568')).toBe(false)
  })
})
