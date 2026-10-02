import { describe, it, expect } from 'vitest'
import { payslipKeysComplete, payslipT, normalizeLang } from './payslipI18n'

describe('payslip translations', () => {
  it('every language has every key', () => {
    expect(payslipKeysComplete()).toEqual([])
  })
  it('fills variables and falls back to Arabic', () => {
    expect(payslipT('en')('lateBy', { m: '25 min' })).toBe('25 min late')
    expect(normalizeLang('xx')).toBe('ar')
    expect(normalizeLang('ur')).toBe('ur')
  })
})
