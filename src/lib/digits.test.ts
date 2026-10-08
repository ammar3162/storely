import { describe, it, expect } from 'vitest'
import { toLatinDigits, cleanNumberText, hasArabicDigits } from './digits'

describe('digits', () => {
  it('converts Arabic-Indic and Persian digits', () => {
    expect(toLatinDigits('١٢٣٤٥٦٧٨٩٠')).toBe('1234567890')
    expect(toLatinDigits('۱۲۳')).toBe('123')
    expect(toLatinDigits('٣٫٥')).toBe('3.5')
    expect(toLatinDigits('+٩٦٦ ٥٥')).toBe('+966 55')
    expect(hasArabicDigits('abc')).toBe(false)
    expect(hasArabicDigits('٥')).toBe(true)
  })
  it('cleans number text while typing', () => {
    expect(cleanNumberText('١٢٫٥')).toBe('12.5')
    expect(cleanNumberText('12,5')).toBe('12.5')
    expect(cleanNumberText('1.2.3')).toBe('1.23')
    expect(cleanNumberText('0.')).toBe('0.')
    expect(cleanNumberText('12a')).toBe('12')
    expect(cleanNumberText('-5')).toBe('5')
    expect(cleanNumberText('-5', { negative: true })).toBe('-5')
    expect(cleanNumberText('٧.٥', { decimal: false })).toBe('75')
    expect(cleanNumberText('')).toBe('')
  })
})
