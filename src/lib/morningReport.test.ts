import { describe, it, expect } from 'vitest'
import { branchBlock, reportMessage, fullView } from './morningReport'

const r = {
  branchId: 'b1', branchName: 'الفرع الرئيسي',
  decisions: ['اطلب حليب (يخلص خلال يومين)'],
  sales: ['الإجمالي: 4,230 ريال', 'كاش 1,800 | شبكة 2,430', 'عجز: 20 ريال'],
  staff: ['غياب أمس: خالد', 'دوام اليوم: 5 موظفين'], staffNotable: true,
  stock: ['نفد: طماطم'], purchases: '850 ريال (3 فواتير)',
}
const all = fullView({ ai: true, cashier: true, hr: true, profitability: true })

describe('morning report', () => {
  it('sales first, then today’s actions, staff, stock, purchases — each as a titled list', () => {
    const t = branchBlock(r, all)!
    const order = ['*المبيعات (أمس)*', '*المطلوب اليوم*', '*الموظفين*', '*المخزون*', '*المشتريات (أمس)*'].map(h => t.indexOf(h))
    expect(order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1]))).toBe(true)
    expect(t).toContain('• غياب أمس: خالد')
    expect(t).toContain('• عجز: 20 ريال')
  })
  it('hides sections whose feature is off (basic without add-ons: stock and purchases only)', () => {
    const t = branchBlock(r, fullView({ ai: false, cashier: false, hr: false, profitability: false }))!
    expect(t).not.toContain('المطلوب اليوم')
    expect(t).not.toContain('المبيعات')
    expect(t).not.toContain('خالد')
    expect(t).toContain('*المشتريات (أمس)*')
  })
  it('a manager without the reports permission does not get sales', () => {
    expect(branchBlock(r, { ...all, sales: false })).not.toContain('المبيعات')
  })
  it('staff only shows when someone was absent or late; nothing worth sending → no message', () => {
    expect(branchBlock({ ...r, staffNotable: false }, all)).not.toContain('الموظفين')
    const quiet = { ...r, decisions: null, sales: null, stock: null, purchases: null, staffNotable: false }
    expect(branchBlock(quiet, all)).toBeNull()
    expect(reportMessage('مطعم', [], false)).toBeNull()
  })
  it('owner message has a header and one titled block per branch', () => {
    const m = reportMessage('مطعم الأصيل', [{ name: 'أ', text: 'x' }, { name: 'ب', text: 'y' }], true)!
    expect(m.startsWith('*التقرير الصباحي*\nمطعم الأصيل | ')).toBe(true)
    expect(m).toContain('▬▬ *أ* ▬▬')
    expect(m).toContain('▬▬ *ب* ▬▬')
  })
})
