import { describe, it, expect, beforeAll } from 'vitest'
import EN from './en.json'
import { loadDict, translateText } from './autoTranslate'

describe('autoTranslate', () => {
  beforeAll(() => loadDict(EN as Record<string, string>))
  it('exact strings', () => {
    expect(translateText('إضافة منتج')).toBe('Add product')
    expect(translateText('  الإعدادات ')).toBe('  Settings ')
  })
  it('numbers are kept in place', () => {
    expect(translateText('قبل 5 دقيقة')).toBe('5 min ago')
    expect(translateText('أدخل الرمز المكوّن من 6 أرقام')).toBe('Enter the 6-digit code')
  })
  it('variable parts (names) stay as they are', () => {
    expect(translateText('آخر دخول قبل 3 ساعة')).toBe('Last login 3 hours ago')
    expect(translateText('تم إضافة "حليب طازج" للمخزون')).toBe('"Fresh milk" added to inventory')
  })
  it('dates and units', () => {
    expect(translateText('9 نوفمبر')).toBe('9 Nov')
    expect(translateText('الاثنين، 9 نوفمبر')).toBe('Monday, 9 Nov')
    expect(translateText('9:13 م')).toBe('9:13 PM')
  })
  it('unknown Arabic (data) is left alone', () => {
    expect(translateText('مطعم الريحان')).toBeNull()
  })
})
