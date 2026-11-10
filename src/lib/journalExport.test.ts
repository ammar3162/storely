import { describe, it, expect } from 'vitest'
import { buildJournal, cleanMap, DEFAULT_ACCOUNTS, journalCsv } from './journalExport'

const closing = (o: any) => ({ date: '2026-10-02', staff: 'خالد', sales: 4600, mada: 2150, visa: 640, mastercard: 210, network: 3000, cash: 1560, delivery: 0, expenses: 0, difference: -40, status: 'deficit', deficitReason: null, deficitDecision: null, id: 'c1', ...o })
const pur = (o: any) => ({ date: '2026-10-03', supplier: 'الوادي', name: 'دجاج', net: 100, vat: 15, total: 115, paid: false, id: 'p1', group: 'g1', ...o })
const balanced = (lines: any[]) => { const by = new Map<number, number>(); for (const l of lines) by.set(l.entry, Math.round(((by.get(l.entry) || 0) + l.debit - l.credit) * 100) / 100); return [...by.values()].every(v => v === 0) }
const ALL = ['sales', 'purchases', 'expenses', 'cash_diff', 'vat']

describe('journal export', () => {
  it('closing with deficit balances and splits VAT', () => {
    const l = buildJournal({ closings: [closing({})], purchases: [], vatRegistered: true, sections: ALL } as any, DEFAULT_ACCOUNTS)
    expect(balanced(l)).toBe(true)
    expect(l.find(x => x.account.code === '5301')?.debit).toBe(40)
    expect(l.find(x => x.account.code === '4101')!.credit + l.find(x => x.account.code === '2201')!.credit).toBe(4600)
  })
  it('surplus, delivery, drawer expenses and odd cents all balance', () => {
    const l = buildJournal({ closings: [closing({ sales: 1000.03, network: 400, delivery: 250.5, cash: 360, difference: 10.47, expenses: 35 })], purchases: [], vatRegistered: true, sections: ALL } as any, DEFAULT_ACCOUNTS)
    expect(balanced(l)).toBe(true)
    expect(l.filter(x => x.account.code === '5201')).toHaveLength(1)
  })
  it('one entry per invoice; unpaid → payables, paid → paid_from', () => {
    const l = buildJournal({ closings: [], purchases: [pur({}), pur({ id: 'p2', name: 'حليب', net: 50, vat: 7.5, total: 57.5 }), pur({ id: 'p3', group: 'g2', paid: true })], vatRegistered: true, sections: ALL } as any, DEFAULT_ACCOUNTS)
    expect(new Set(l.map(x => x.entry)).size).toBe(2)
    expect(balanced(l)).toBe(true)
    expect(l.find(x => x.entry === 1 && x.credit > 0)?.account.code).toBe('2101')
    expect(l.find(x => x.entry === 2 && x.credit > 0)?.account.code).toBe(DEFAULT_ACCOUNTS.paid_from.code)
  })
  it('respects allowed sections and non-VAT orgs', () => {
    const l = buildJournal({ closings: [closing({ difference: 0, sales: 4560 })], purchases: [pur({})], vatRegistered: false, sections: ['sales'] } as any, DEFAULT_ACCOUNTS)
    expect(l.some(x => x.account.code === '5101')).toBe(false)
    expect(l.some(x => x.account.code === '2201')).toBe(false)
    expect(balanced(l)).toBe(true)
  })
  it('cleanMap keeps valid overrides only', () => {
    const m = cleanMap({ sales: { code: '41001', name: 'مبيعات المطعم' }, cash: { code: '', name: 'x' }, evil: { code: '1', name: 'y' } })
    expect(m.sales.code).toBe('41001'); expect(m.cash).toEqual(DEFAULT_ACCOUNTS.cash); expect((m as any).evil).toBeUndefined()
  })
  it('csv has BOM and quotes commas', () => {
    const csv = journalCsv(buildJournal({ closings: [], purchases: [pur({ supplier: 'أ, ب' })], vatRegistered: true, sections: ALL } as any, DEFAULT_ACCOUNTS))
    expect(csv.charCodeAt(0)).toBe(0xFEFF); expect(csv).toContain('"فاتورة أ, ب')
  })
})

describe('journal workbook', () => {
  it('builds an xlsx with entries and the chart sheet', async () => {
    const { buildJournalWorkbook } = await import('./journalWorkbook')
    const lines = buildJournal({ closings: [closing({})], purchases: [pur({})], vatRegistered: true, sections: ALL } as any, DEFAULT_ACCOUNTS)
    const buf = await buildJournalWorkbook(lines, { title: 'قيود تجربة', map: DEFAULT_ACCOUNTS })
    const Excel = (await import('exceljs')).default
    const wb = new Excel.Workbook(); await wb.xlsx.load(buf as any)
    expect(wb.getWorksheet('القيود')!.rowCount).toBe(lines.length + 2)
    expect(wb.getWorksheet('دليل الحسابات')!.getRow(2).getCell(2).value).toBe(DEFAULT_ACCOUNTS.sales.code)
  })
})
