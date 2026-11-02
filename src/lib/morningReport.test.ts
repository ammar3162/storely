import { describe, it, expect } from 'vitest'
import { branchBlock, reportMessage, fullView, invoicesAr } from './morningReport'

const r = {
  branchId: 'b1', branchName: 'الفرع الرئيسي',
  decisions: ['اطلب حليب (يخلص خلال يومين)'],
  sales: ['عجز — راجع التفاصيل في صفحة الإقفال'],
  staff: ['غياب أمس: خالد', 'دوام اليوم: 5 موظفين'], staffNotable: true,
  stockOut: 'طماطم', stockLow: ['خس (باقي 1 من 5 كيس)'], purchases: null,
}
const all = fullView({ ai: true, cashier: true, hr: true, profitability: true })

describe('morning report', () => {
  it('cashier status first, then out of stock, today’s actions, staff, running low, purchases — each as a titled list', () => {
    const t = branchBlock(r, all)!
    const order = ['*إقفال الكاشير (أمس)*', '*خلصت — اطلبها اليوم*', '*المطلوب اليوم*', '*الموظفين*', '*قربت تخلص*'].map(h => t.indexOf(h))
    expect(order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1]))).toBe(true)
    expect(t).toContain('• غياب أمس: خالد')
    expect(t).toContain('*خلصت — اطلبها اليوم*\n• طماطم')
    expect(t).toContain('*قربت تخلص*\n• خس (باقي 1 من 5 كيس)')
    expect(t).toContain('*إقفال الكاشير (أمس)*\n• عجز')
    expect(t).not.toContain('ريال')   // إقفال الكاشير بدون أرقام
  })
  it('hides sections whose feature is off (basic without add-ons: stock and purchases only)', () => {
    const t = branchBlock(r, fullView({ ai: false, cashier: false, hr: false, profitability: false }))!
    expect(t).not.toContain('المطلوب اليوم')
    expect(t).not.toContain('إقفال الكاشير')
    expect(t).not.toContain('خالد')
    expect(t).toContain('*خلصت — اطلبها اليوم*')
    expect(t).toContain('*قربت تخلص*')
  })
  it('a manager without the reports permission does not get sales', () => {
    expect(branchBlock(r, { ...all, sales: false })).not.toContain('إقفال الكاشير')
  })
  it('staff only shows when someone was absent or late; nothing worth sending → no message', () => {
    expect(branchBlock({ ...r, staffNotable: false }, all)).not.toContain('الموظفين')
    const quiet = { ...r, decisions: null, sales: null, stockOut: null, stockLow: null, purchases: null, staffNotable: false }
    expect(branchBlock(quiet, all)).toBeNull()
    expect(reportMessage('مطعم', [], false)).toBeNull()
  })
  it('owner message has a header and one titled block per branch', () => {
    const m = reportMessage('مطعم الأصيل', [{ name: 'أ', text: 'x' }, { name: 'ب', text: 'y' }], true)!
    expect(m.startsWith('*التقرير الصباحي*\nمطعم الأصيل | ')).toBe(true)
    expect(m).toContain('▬▬ *أ* ▬▬')
    expect(m).toContain('▬▬ *ب* ▬▬')
  })
  it('invoice count uses correct Arabic counting', () => {
    expect([1, 2, 3, 10, 11, 13].map(invoicesAr)).toEqual(['فاتورة وحدة', 'فاتورتين', '3 فواتير', '10 فواتير', '11 فاتورة', '13 فاتورة'])
  })
})
