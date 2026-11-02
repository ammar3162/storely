import { describe, it, expect } from 'vitest'
import { cleanAppList, deliveryFromInput, deliveryNames, MAX_DELIVERY_APPS } from './deliveryApps'

describe('delivery apps', () => {
  it('cleans the owner list: trims, removes duplicates and empty names, caps the count', () => {
    expect(cleanAppList([' هنقرستيشن ', 'جاهز', 'جاهز', '', null, 'ذا   شفز'])).toEqual(['هنقرستيشن', 'جاهز', 'ذا شفز'])
    expect(cleanAppList('جاهز')).toBeNull()
    expect(cleanAppList(Array.from({ length: MAX_DELIVERY_APPS + 1 }, (_, i) => `app${i}`))).toBeNull()
  })
  it('keeps only the org apps with positive amounts, and flags bad amounts', () => {
    const allowed = ['هنقرستيشن', 'جاهز']
    expect(deliveryFromInput([{ name: 'هنقرستيشن', amount: '120.5' }, { name: 'جاهز', amount: 0 }, { name: 'تطبيق غريب', amount: 999 }], allowed))
      .toEqual([{ name: 'هنقرستيشن', amount: 120.5 }])
    expect(deliveryFromInput([{ name: 'جاهز', amount: 50 }, { name: 'جاهز', amount: 25 }], allowed)).toEqual([{ name: 'جاهز', amount: 75 }])
    expect(Number.isNaN(deliveryFromInput([{ name: 'جاهز', amount: -1 }], allowed)[0].amount)).toBe(true)
    expect(deliveryFromInput('x', allowed)).toEqual([])
  })
  it('reads app names from a saved closing', () => {
    expect(deliveryNames([{ name: 'كيتا', amount: 10 }, { amount: 5 }])).toEqual(['كيتا'])
    expect(deliveryNames(null)).toEqual([])
  })
})
