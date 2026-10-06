import { describe, it, expect } from 'vitest'
import { normalizeName, nameScore, bestMatch } from './productMatch'

const stock = [
  { id: '1', name: 'دجاج' }, { id: '2', name: 'أكواب ورقية 12oz' }, { id: '3', name: 'أغطية أكواب' },
  { id: '4', name: 'حليب كامل الدسم' }, { id: '5', name: 'خبز' }, { id: '6', name: 'رز' },
]
describe('product matching', () => {
  it('normalizes Arabic spelling', () => {
    expect(normalizeName('أكوابُ ورقيّة')).toBe(normalizeName('اكواب ورقيه'))
    expect(normalizeName('١٢ oz')).toBe('12 oz')
  })
  it('finds the stock item even when the invoice adds words', () => {
    expect(bestMatch('دجاج كامل طازج', stock)?.id).toBe('1')
    expect(bestMatch('اكواب ورقيه 12 oz', stock)?.id).toBe('2')
    expect(bestMatch('الحليب كامل الدسم 1 لتر', stock)?.id).toBe('4')
    expect(bestMatch('اغطيه اكواب', stock)?.id).toBe('3')
  })
  it('does not force a wrong match', () => {
    expect(bestMatch('مناديل', stock)).toBeNull()
    expect(bestMatch('زيت زيتون', stock)).toBeNull()
    expect(nameScore('خبز', 'رز')).toBeLessThan(0.75)
    expect(bestMatch('أكواب بلاستيك', stock)).toBeNull()   // «أكواب» بس ما تكفي — أكواب ورقية صنف ثاني
  })
})
