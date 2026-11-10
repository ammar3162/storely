import { describe, it, expect } from 'vitest'
import { looksLikeExpense } from './expenseHint'

describe('looks like an expense, not stock', () => {
  it('flags cleaning, gas, maintenance, fees', () => {
    for (const n of ['منظف أرضيات', 'صابون سائل', 'تعبئة غاز', 'صيانة ثلاجة', 'رسوم توصيل', 'أكياس قمامة كبيرة', 'Dettol ديتول'])
      expect(looksLikeExpense(n)).toBe(true)
  })
  it('leaves stock items alone', () => {
    for (const n of ['سكر أبيض', 'أكواب بلاستيك', 'حليب كامل الدسم', 'زيت طبخ', 'بن إسبريسو', 'مناديل', 'أكياس تغليف'])
      expect(looksLikeExpense(n)).toBe(false)
  })
})
