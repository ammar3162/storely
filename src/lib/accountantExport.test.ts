import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { buildAccountantWorkbook, summarize, type AccountantReport } from './accountantExport'
import { accountantEmail, accountantWhatsapp } from './accountantMessage'

const base: AccountantReport = {
  orgName: 'ركن القهوة', branchName: 'فرع العليا', currency: 'SAR', period: { start: '2026-09-01', end: '2026-09-30' }, label: 'سبتمبر 2026',
  sections: ['sales', 'purchases', 'vat', 'payables', 'payroll', 'expenses', 'cash_diff', 'stock'], vatRegistered: true,
  purchases: [
    { date: '2026-09-02', supplier: 'المراعي', name: 'حليب', category: 'ألبان', qty: 10, unit: 'لتر', net: 100, vat: 15, total: 115, paid: true, invoiceUrl: 'https://x.test/a.jpg' },
    { date: '2026-09-05', supplier: null, name: 'أكواب', category: null, qty: 500, unit: 'حبة', net: 200, vat: 30, total: 230, paid: false, invoiceUrl: 'javascript:alert(1)' },
  ],
  closings: [{ date: '2026-09-02', staff: 'خالد', sales: 4600, mada: 2150, visa: 640, mastercard: 210, network: 3000, cash: 1560, expenses: 0, difference: -40, status: 'deficit', deficitReason: 'فاتورة ما تحاسبت', deficitDecision: 'approved' }],
  expenses: [{ date: '2026-09-02', staff: 'خالد', item: 'ثلج', amount: 25 }],
  payroll: [{ name: 'خالد', basic: 4500, housing: 1125, transport: 450, food: 0, gross: 6075, overtime: 187.5, bonuses: 150, deductions: 4.67, latePenalties: 4.67, advances: 500, net: 5907.83 }],
  stock: [{ name: 'حليب', category: 'ألبان', qty: 4, unit: 'لتر', avgCost: 10 }, { name: 'سكر', category: null, qty: 3, unit: 'كجم', avgCost: null }],
  payables: [{ supplier: 'مؤسسة التغليف', invoices: 2, oldest: '2026-08-20', nextDue: '2026-10-10', total: 460 }],
}

async function load(r: AccountantReport) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildAccountantWorkbook(r) as any)
  return wb
}
const cellsOf = (ws: ExcelJS.Worksheet) => { const out: unknown[] = []; ws.eachRow(r => r.eachCell(c => out.push(c.value))); return out }

describe('accountant report', () => {
  it('vat: output from sales incl. VAT minus purchase VAT', () => {
    const t = summarize(base)
    expect(t.outputVat).toBe(600)          // 4600 × 15/115
    expect(t.inputVat).toBe(45)
    expect(t.vatNet).toBe(555)
    expect(summarize({ ...base, vatRegistered: false }).vatNet).toBe(0)
  })
  it('all sheets in order, right-to-left', async () => {
    const wb = await load(base)
    expect(wb.worksheets.map(w => w.name)).toEqual(['الملخص', 'المبيعات', 'المشتريات', 'الضريبة', 'الموردين الآجلين', 'الرواتب', 'المصروفات', 'العجز والزيادة', 'المخزون'])
    expect(wb.worksheets.every(w => (w.views[0] as any)?.rightToLeft)).toBe(true)
  })
  it('only the sections the owner chose', async () => {
    const wb = await load({ ...base, sections: ['purchases', 'vat'] })
    expect(wb.worksheets.map(w => w.name)).toEqual(['الملخص', 'المشتريات', 'الضريبة'])
    expect(cellsOf(wb.getWorksheet('الملخص')!)).not.toContain('صافي الرواتب')
  })
  it('only https invoice links', async () => {
    const v = cellsOf((await load(base)).getWorksheet('المشتريات')!)
    expect(v.filter((x: any) => x && typeof x === 'object' && 'hyperlink' in x).map((x: any) => x.hyperlink)).toEqual(['https://x.test/a.jpg'])
  })
  it('no payroll sheet when payroll is not applicable', async () => {
    expect((await load({ ...base, payroll: null })).worksheets.map(w => w.name)).not.toContain('الرواتب')
  })
  it('email escapes data and whatsapp has the link', () => {
    const evil = { ...base, orgName: '<script>x</script>' }
    const { html, subject } = accountantEmail(evil, { accountantName: 'محمد', reportUrl: 'https://storely.dev/accountant/abc' })
    expect(html).not.toContain('<script>x</script>')
    expect(subject).toContain('سبتمبر 2026')
    const wa = accountantWhatsapp(base, { accountantName: 'محمد', reportUrl: 'https://storely.dev/accountant/abc' })
    expect(wa).toContain('https://storely.dev/accountant/abc')
    expect(wa).toContain('555')
  })
})
