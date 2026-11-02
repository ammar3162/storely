import { describe, it, expect } from 'vitest'
import { cleanAppList, deliveryFromInput, appChoices, rememberApps, MAX_DELIVERY_APPS } from './deliveryApps'

describe('delivery apps', () => {
  it('cleans a list of names: trims, removes duplicates and empty names, caps the count', () => {
    expect(cleanAppList([' هنقرستيشن ', 'جاهز', 'جاهز', '', null, 'ذا   شفز'])).toEqual(['هنقرستيشن', 'جاهز', 'ذا شفز'])
    expect(cleanAppList('جاهز')).toBeNull()
    expect(cleanAppList(Array.from({ length: MAX_DELIVERY_APPS + 1 }, (_, i) => `app${i}`))).toBeNull()
  })
  it('reads the cashier amounts: any app name, positive amounts merged per app, bad amounts flagged', () => {
    expect(deliveryFromInput([{ name: 'هنقرستيشن', amount: '120.5' }, { name: 'جاهز', amount: 0 }, { name: ' شاورمر ', amount: 30 }, { name: '', amount: 9 }]))
      .toEqual([{ name: 'هنقرستيشن', amount: 120.5 }, { name: 'شاورمر', amount: 30 }])
    expect(deliveryFromInput([{ name: 'جاهز', amount: 50 }, { name: 'جاهز', amount: 25 }])).toEqual([{ name: 'جاهز', amount: 75 }])
    expect(Number.isNaN(deliveryFromInput([{ name: 'جاهز', amount: -1 }])[0].amount)).toBe(true)
    expect(deliveryFromInput('x')).toEqual([])
  })
  it('shows the common apps plus the ones this org used before, and remembers only new names', () => {
    expect(appChoices(['شاورمر', 'جاهز'])).toEqual(['هنقرستيشن', 'جاهز', 'كيتا', 'مرسول', 'ذا شفز', 'تويو', 'شاورمر'])
    expect(rememberApps([], [{ name: 'جاهز', amount: 5 }])).toBeNull()
    expect(rememberApps(['شاورمر'], [{ name: 'لقمة', amount: 5 }, { name: 'شاورمر', amount: 1 }])).toEqual(['شاورمر', 'لقمة'])
  })
})
