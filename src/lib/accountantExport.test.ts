import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { buildAccountantWorkbook, type AccountantInput } from './accountantExport'

const base: AccountantInput = {
  orgName: 'ركن القهوة', branchName: 'فرع العليا', month: '2026-09', currency: 'SAR',
  purchases: [
    { date: '2026-09-02', supplier: 'المراعي', name: 'حليب', category: 'ألبان', qty: 10, unit: 'لتر', net: 100, vat: 15, total: 115, paid: true, invoiceUrl: 'https://x.test/a.jpg' },
    { date: '2026-09-05', supplier: null, name: 'أكواب', category: null, qty: 500, unit: 'حبة', net: 200, vat: 30, total: 230, paid: false, invoiceUrl: 'javascript:alert(1)' },
  ],
  closings: [{ date: '2026-09-02', staff: 'خالد', sales: 4820, mada: 2150, visa: 640, mastercard: 210, network: 3000, cash: 1780, expenses: 0, difference: -40, status: 'deficit', deficitReason: 'فاتورة ما تحاسبت', deficitDecision: 'approved' }],
  expenses: [{ date: '2026-09-02', staff: 'خالد', item: 'ثلج', amount: 25 }],
  payroll: [{ name: 'خالد', basic: 4500, housing: 1125, transport: 450, food: 0, gross: 6075, overtime: 187.5, bonuses: 150, deductions: 4.67, latePenalties: 4.67, advances: 500, net: 5907.83 }],
  stock: [{ name: 'حليب', category: 'ألبان', qty: 4, unit: 'لتر', avgCost: 10 }, { name: 'سكر', category: null, qty: 3, unit: 'كجم', avgCost: null }],
}

async function load(input: AccountantInput) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildAccountantWorkbook(input) as any)
  return wb
}
const cellsOf = (ws: ExcelJS.Worksheet) => { const out: unknown[] = []; ws.eachRow(r => r.eachCell(c => out.push(c.value))); return out }

describe('accountant workbook', () => {
  it('has all sheets in order, right-to-left', async () => {
    const wb = await load(base)
    expect(wb.worksheets.map(w => w.name)).toEqual(['الملخص', 'المشتريات', 'المبيعات', 'المصروفات', 'الرواتب', 'المخزون'])
    expect(wb.worksheets.every(w => (w.views[0] as any)?.rightToLeft)).toBe(true)
  })
  it('summary totals add up', async () => {
    const v = cellsOf((await load(base)).getWorksheet('الملخص')!)
    for (const n of [4820, 3000, 1780, 40, 300, 45, 345, 230, 25, 5907.83, 40]) expect(v).toContain(n)
  })
  it('purchase totals row and only https invoice links', async () => {
    const ws = (await load(base)).getWorksheet('المشتريات')!
    const v = cellsOf(ws)
    expect(v).toContain(345)
    expect(v.filter((x: any) => x && typeof x === 'object' && 'hyperlink' in x).map((x: any) => x.hyperlink)).toEqual(['https://x.test/a.jpg'])
    expect(v).toContain('آجلة')
  })
  it('no payroll sheet without the HR feature, and branch column when all branches', async () => {
    const wb = await load({ ...base, payroll: null, branchName: null, purchases: base.purchases.map(p => ({ ...p, branch: 'العليا' })) })
    expect(wb.worksheets.map(w => w.name)).not.toContain('الرواتب')
    expect(wb.getWorksheet('المشتريات')!.getRow(1).values).toContain('الفرع')
  })
  it('empty month says so instead of a blank sheet', async () => {
    const wb = await load({ ...base, purchases: [], closings: [], expenses: [] })
    expect(cellsOf(wb.getWorksheet('المشتريات')!)).toContain('ما فيه بيانات لهذا الشهر')
  })
})
