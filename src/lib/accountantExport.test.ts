import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { buildAccountantWorkbook, summarize, taxInvoices, type AccountantReport } from './accountantExport'
import { accountantEmail, accountantWhatsapp } from './accountantMessage'

const base: AccountantReport = {
  orgName: 'ركن القهوة', branchName: 'فرع العليا', currency: 'SAR', period: { start: '2026-09-01', end: '2026-09-30' }, label: 'سبتمبر 2026',
  sections: ['sales', 'purchases', 'vat', 'payables', 'payroll', 'expenses', 'cash_diff', 'stock'], vatRegistered: true,
  purchases: [
    { date: '2026-09-02', supplier: 'المراعي', name: 'حليب', category: 'ألبان', qty: 10, unit: 'لتر', net: 100, vat: 15, total: 115, paid: true, invoiceUrl: 'https://x.test/a.jpg', invoiceNumber: 'INV-1', supplierVat: '300012345678903', group: 'g1' },
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
  it('vat: output from sales incl. VAT minus claimable purchase VAT only', () => {
    const t = summarize(base)
    expect(t.outputVat).toBe(600)          // 4600 × 15/115
    expect(t.inputVat).toBe(45)
    expect(t.inputVatClaimable).toBe(15)   // الفاتورة الثانية ناقصة
    expect(t.inputVatReview).toBe(30)
    expect(t.vatNet).toBe(585)
    expect(summarize({ ...base, vatRegistered: false }).vatNet).toBe(0)
  })
  it('all sheets in order, right-to-left', async () => {
    const wb = await load(base)
    expect(wb.worksheets.map(w => w.name)).toEqual(['الملخص', 'المبيعات', 'الفواتير الضريبية', 'مشتريات بدون ضريبة', 'أصناف المشتريات', 'الضريبة', 'الموردين الآجلين', 'الرواتب', 'المصروفات', 'العجز والزيادة', 'المخزون'])
    expect(wb.worksheets.every(w => (w.views[0] as any)?.rightToLeft)).toBe(true)
  })
  it('only the sections the owner chose', async () => {
    const wb = await load({ ...base, sections: ['purchases', 'vat'] })
    expect(wb.worksheets.map(w => w.name)).toEqual(['الملخص', 'الفواتير الضريبية', 'مشتريات بدون ضريبة', 'أصناف المشتريات', 'الضريبة'])
    expect(cellsOf(wb.getWorksheet('الملخص')!)).not.toContain('صافي الرواتب')
  })
  it('only https invoice links', async () => {
    const v = cellsOf((await load(base)).getWorksheet('أصناف المشتريات')!)
    expect(v.filter((x: any) => x && typeof x === 'object' && 'hyperlink' in x).map((x: any) => x.hyperlink)).toEqual(['https://x.test/a.jpg'])
  })
  it('no payroll sheet when payroll is not applicable', async () => {
    expect((await load({ ...base, payroll: null })).worksheets.map(w => w.name)).not.toContain('الرواتب')
  })
  it('email escapes data; whatsapp is a caption for the attached file (no links)', () => {
    const evil = { ...base, orgName: '<script>x</script>' }
    const { html, subject } = accountantEmail(evil, { accountantName: 'محمد' })
    expect(html).not.toContain('<script>x</script>')
    expect(subject).toContain('سبتمبر 2026')
    const wa = accountantWhatsapp(base, { accountantName: 'محمد' })
    expect(wa).not.toContain('http')
    expect(wa).toContain('الملف المرفق')
    expect(wa).toContain('585')
    expect(wa).toContain('ناقصة')
  })
})

describe('arabic counts', () => {
  it('invoices and staff', async () => {
    const { invoicesLabel, staffLabel } = await import('./accountantExport')
    expect([1, 2, 3, 10, 11].map(invoicesLabel)).toEqual(['فاتورة', 'فاتورتين', '3 فواتير', '10 فواتير', '11 فاتورة'])
    expect([1, 2, 5].map(staffLabel)).toEqual(['موظف', 'موظفين', '5 موظفين'])
  })
})

describe('tax invoices', () => {
  const p = (o: any) => ({ date: '2026-09-02', supplier: 'المراعي', name: 'x', category: null, qty: 1, unit: null, net: 100, vat: 15, total: 115, paid: true, invoiceUrl: 'https://x.test/a.jpg', ...o })
  it('groups items of the same invoice into one row', () => {
    const list = taxInvoices([p({ group: 'g', invoiceNumber: 'A1', supplierVat: '300012345678903' }), p({ group: 'g' }), p({ group: 'h', vat: 0, total: 100 })])
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ items: 2, vat: 30, total: 230, invoiceNumber: 'A1', complete: true })
  })
  it('flags what is missing', () => {
    const [i] = taxInvoices([p({ id: '1', supplierVat: '123' })])
    expect(i.complete).toBe(false)
    expect(i.missing).toEqual(['الرقم الضريبي للمورد', 'رقم الفاتورة'])
  })
  it('old rows without a group: same image + supplier + date = one invoice', () => {
    expect(taxInvoices([p({ id: '1' }), p({ id: '2' }), p({ id: '3', invoiceUrl: 'https://x.test/b.jpg' })])).toHaveLength(2)
  })
})

describe('verified invoices', () => {
  it('verified and mismatch flags carry to the invoice', () => {
    const [i] = taxInvoices([{ date: '2026-09-02', supplier: 'x', name: 'a', category: null, qty: 1, unit: null, net: 100, vat: 15, total: 115, paid: true,
      invoiceUrl: null, group: 'g', invoiceNumber: '1', supplierVat: '300012345678903', verified: true, mismatch: true }])
    expect(i).toMatchObject({ verified: true, mismatch: true, complete: true })
  })
})

describe('watermark', () => {
  it('every sheet footer carries who downloaded it', async () => {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await buildAccountantWorkbook(base, { watermark: 'نسخة أ. محمد · 2026-10-06 21:00' }) as any)
    expect(wb.worksheets.every(w => String(w.headerFooter?.oddFooter || '').includes('أ. محمد'))).toBe(true)
  })
})
