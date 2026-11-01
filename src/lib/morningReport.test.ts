import { describe, it, expect } from 'vitest'
import { branchBlock, reportMessage, fullView } from './morningReport'

const r = {
  branchId: 'b1', branchName: 'الفرع الرئيسي',
  decisions: ['اطلب حليب — يخلص خلال 2 أيام'], sales: '4,230 ريال (كاش 1,800 · شبكة 2,430) · عجز 20 ريال',
  staff: 'ما سجّل حضور أمس: خالد\nدوام اليوم: 5 موظفين', stock: 'نفد: طماطم', purchases: '850 ريال (3 فواتير)',
}
const all = fullView({ ai: true, cashier: true, hr: true, profitability: true })

describe('morning report', () => {
  it('shows every enabled section, in order', () => {
    const t = branchBlock(r, all)!
    expect(t.indexOf('قرارات اليوم')).toBeLessThan(t.indexOf('مبيعات أمس'))
    expect(t).toContain('ما سجّل حضور أمس: خالد')
    expect(t).toContain('نفد: طماطم')
  })
  it('hides sections whose feature is off (basic without add-ons: stock and purchases only)', () => {
    const t = branchBlock(r, fullView({ ai: false, cashier: false, hr: false, profitability: false }))!
    expect(t).not.toContain('قرارات اليوم')
    expect(t).not.toContain('مبيعات أمس')
    expect(t).not.toContain('خالد')
    expect(t).toContain('مشتريات أمس')
  })
  it('a manager without the reports permission does not get sales', () => {
    expect(branchBlock(r, { ...all, sales: false })).not.toContain('مبيعات')
  })
  it('nothing worth sending → no message (only "staff today" is not enough)', () => {
    const quiet = { ...r, decisions: null, sales: null, stock: null, purchases: null, staff: 'دوام اليوم: 5 موظفين' }
    expect(branchBlock(quiet, all)).toBeNull()
    expect(reportMessage('مطعم', [], false)).toBeNull()
  })
  it('owner message has a header and one block per branch', () => {
    const m = reportMessage('مطعم الأصيل', [{ name: 'أ', text: 'x' }, { name: 'ب', text: 'y' }], true)!
    expect(m).toContain('التقرير الصباحي — مطعم الأصيل')
    expect(m).toContain('━━ *أ* ━━')
    expect(m).toContain('━━ *ب* ━━')
  })
})
