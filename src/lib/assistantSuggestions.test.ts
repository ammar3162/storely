import { describe, it, expect } from 'vitest'
import { buildSuggestions, vatDueInDays, type SuggestionFacts } from './assistantSuggestions'

const ALL = ['cashier_closings', 'attendance', 'inventory', 'vat', 'purchases']
const base: SuggestionFacts = { hour: 9, tools: ALL, owner: true, staffCount: 6, checkedInToday: 4, lateToday: 1, closingsToday: 0, closingsYesterday: 2, lowStock: 3, vatRegistered: false, payablesDueWeek: 0, subscriptionDaysLeft: 40 }
const ids = (f: SuggestionFacts) => buildSuggestions(f).map(s => s.id)

describe('assistant suggestions', () => {
  it('morning: attendance first, then late staff, yesterday closings and low stock', () => {
    expect(ids(base)).toEqual(['attendance', 'late', 'closings-yesterday', 'stock'])
    expect(buildSuggestions(base)[0]).toMatchObject({ label: 'من داوم اليوم؟', count: 4, icon: 'attendance' })
  })
  it('evening: today closings and returns lead; missing closing late at night is urgent', () => {
    expect(ids({ ...base, hour: 21, closingsToday: 2, returnsToday: 3 }).slice(0, 2)).toEqual(['closings', 'returns'])
    const night = buildSuggestions({ ...base, hour: 23, closingsToday: 0 })
    expect(night[0]).toMatchObject({ id: 'closings-missing', urgent: true })
  })
  it('an ending subscription comes first and is urgent; a pending deficit is a decision card now, not a suggestion', () => {
    const s = buildSuggestions({ ...base, subscriptionDaysLeft: 3 })
    expect(s[0]).toMatchObject({ id: 'subscription', urgent: true, label: 'اشتراكك ينتهي خلال 3 أيام' })
    expect(ids({ ...base, deficitPending: 2 } as any)).not.toContain('deficit')
  })
  it('only suggests what the user’s tools can answer (manager without attendance, no AI tools)', () => {
    expect(ids({ ...base, tools: ['cashier_closings'], owner: false, subscriptionDaysLeft: 2 })).toEqual(['closings-yesterday'])
    expect(buildSuggestions({ ...base, tools: [] })).toEqual([])
  })
  it('VAT: filing month raises it, with the days left', () => {
    const s = buildSuggestions({ ...base, vatRegistered: true, vatDueInDays: 6 })
    expect(s[0]).toMatchObject({ id: 'vat', urgent: true, label: 'الإقرار الضريبي (باقي 6 أيام)' })
    expect(buildSuggestions({ ...base, vatRegistered: true, vatDueInDays: 70 }).find(x => x.id === 'vat')?.label).toBe('ضريبة هذا الربع')
  })
  it('at most 5 suggestions', () => {
    expect(buildSuggestions({ ...base, returnsToday: 2, payablesDueWeek: 3, vatRegistered: true, vatDueInDays: 20, subscriptionDaysLeft: 5 }).length).toBe(5)
  })
  it('quarterly VAT deadline: end of the month after the quarter', () => {
    expect(vatDueInDays('2026-11-17')).toBe(75)     // الربع الرابع ← 31 يناير
    expect(vatDueInDays('2027-01-10')).toBe(21)     // شهر التقديم ← 31 يناير
    expect(vatDueInDays('2026-10-31')).toBe(0)
    expect(vatDueInDays('2026-02-15')).toBe(74)     // الربع الأول ← 30 أبريل
  })
})
