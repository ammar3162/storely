import { describe, it, expect } from 'vitest'
import { normalizeWhatsapp } from './phoneNormalize'

describe('normalizeWhatsapp', () => {
  it('fixes the doubled country code', () => {
    expect(normalizeWhatsapp('+966966555678224')).toBe('+966555678224')
    expect(normalizeWhatsapp('966966555678224')).toBe('+966555678224')
  })
  it('accepts the usual Saudi formats', () => {
    for (const v of ['0555678224', '555678224', '966555678224', '+966555678224', '00966555678224', '+966 55 567 8224'])
      expect(normalizeWhatsapp(v)).toBe('+966555678224')
  })
  it('keeps other countries', () => {
    expect(normalizeWhatsapp('+201155842590')).toBe('+201155842590')
    expect(normalizeWhatsapp('1155842590', '+20')).toBe('+201155842590')
  })
  it('empty stays empty', () => expect(normalizeWhatsapp('')).toBe(''))
})
