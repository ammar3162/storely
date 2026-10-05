import ExcelJS from 'exceljs'

// تقرير المحاسب — نموذج واحد يُبنى منه ملف الإكسل والإيميل وصفحة التقرير ورسالة الواتساب

export type AccSection = 'sales' | 'purchases' | 'vat' | 'payables' | 'payroll' | 'expenses' | 'cash_diff' | 'stock'
export const ACC_SECTIONS: { key: AccSection; label: string; hint: string }[] = [
  { key: 'sales', label: 'المبيعات', hint: 'من إقفالات الكاشير: كاش وشبكة' },
  { key: 'purchases', label: 'المشتريات', hint: 'كل فاتورة مع الضريبة وصورتها' },
  { key: 'vat', label: 'ضريبة القيمة المضافة', hint: 'ضريبة المبيعات ناقص ضريبة المشتريات' },
  { key: 'payables', label: 'الموردين الآجلين', hint: 'كم عليك لكل مورد' },
  { key: 'payroll', label: 'الرواتب', hint: 'بالتقرير الشهري فقط' },
  { key: 'expenses', label: 'المصروفات', hint: 'المسحوبات من درج الكاشير' },
  { key: 'cash_diff', label: 'العجز والزيادة', hint: 'فروقات إقفال الكاشير' },
  { key: 'stock', label: 'قيمة المخزون', hint: 'الكمية × متوسط التكلفة' },
]

export type AccPurchase = { date: string; branch?: string | null; supplier: string | null; name: string; category: string | null; qty: number | null; unit: string | null
  net: number; vat: number; total: number; paid: boolean; invoiceUrl: string | null }
export type AccClosing = { date: string; branch?: string | null; staff: string | null; sales: number; mada: number; visa: number; mastercard: number; network: number
  cash: number; expenses: number; difference: number; status: string | null; deficitReason: string | null; deficitDecision: string | null }
export type AccExpense = { date: string; branch?: string | null; staff: string | null; item: string; amount: number }
export type AccPayroll = { name: string; basic: number; housing: number; transport: number; food: number; gross: number; overtime: number; bonuses: number
  deductions: number; latePenalties: number; advances: number; net: number }
export type AccStock = { name: string; category: string | null; qty: number; unit: string | null; avgCost: number | null; branch?: string | null }
export type AccPayable = { supplier: string; invoices: number; oldest: string; nextDue: string | null; total: number }

export type AccountantReport = {
  orgName: string; branchName: string | null; currency: string
  period: { start: string; end: string }; label: string
  sections: AccSection[]; vatRegistered: boolean
  purchases: AccPurchase[]; closings: AccClosing[]; expenses: AccExpense[]
  payroll: AccPayroll[] | null   // null = ما ينطبق (الفترة مو شهر كامل، أو ما عنده إدارة الرواتب)
  stock: AccStock[]; payables: AccPayable[]
}

// عدد بالعربي: فاتورة، فاتورتين، ٣ فواتير، ١١ فاتورة
export function arCount(n: number, one: string, two: string, few: string) {
  if (n === 1) return one
  if (n === 2) return two
  return `${n} ${n >= 3 && n <= 10 ? few : one}`
}
export const invoicesLabel = (n: number) => arCount(n, 'فاتورة', 'فاتورتين', 'فواتير')
export const staffLabel = (n: number) => arCount(n, 'موظف', 'موظفين', 'موظفين')

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100
const sum = <T>(rows: T[], f: (r: T) => number) => r2(rows.reduce((s, r) => s + (Number(f(r)) || 0), 0))
export const VAT_RATE = 0.15

export function summarize(r: AccountantReport) {
  const c = r.closings
  const sales = sum(c, x => x.sales)
  const outputVat = r.vatRegistered ? r2(sales * VAT_RATE / (1 + VAT_RATE)) : 0
  const inputVat = r.vatRegistered ? sum(r.purchases, p => p.vat) : 0
  return {
    sales, network: sum(c, x => x.network), cash: sum(c, x => x.cash), mada: sum(c, x => x.mada), visa: sum(c, x => x.visa), mastercard: sum(c, x => x.mastercard),
    closingsCount: c.length,
    deficit: sum(c.filter(x => x.difference < 0), x => -x.difference), surplus: sum(c.filter(x => x.difference > 0), x => x.difference),
    purNet: sum(r.purchases, p => p.net), purVat: sum(r.purchases, p => p.vat), purTotal: sum(r.purchases, p => p.total),
    purUnpaid: sum(r.purchases.filter(p => !p.paid), p => p.total), invoices: r.purchases.length,
    expenses: sum(r.expenses, e => e.amount),
    payrollNet: r.payroll ? sum(r.payroll, p => p.net) : 0, payrollGross: r.payroll ? sum(r.payroll, p => p.gross) : 0,
    stockValue: sum(r.stock.filter(s => s.avgCost != null), s => s.qty * Number(s.avgCost)),
    salesNet: r2(sales - outputVat), outputVat, inputVat, vatNet: r2(outputVat - inputVat),
    payablesTotal: sum(r.payables, p => p.total),
  }
}

const BRAND = 'FF0F766E', HEAD_TXT = 'FFFFFFFF', TOTAL_BG = 'FFF0FDFA', MUTED = 'FF667085', MONEY = '#,##0.00'
const CLOSING_STATUS: Record<string, string> = { balanced: 'مطابق', deficit: 'عجز', surplus: 'زيادة' }
const DEFICIT_DECISION: Record<string, string> = { pending: 'بانتظار قرار المالك', approved: 'خُصم من الموظف', rejected: 'ما انخصم' }
export const deficitDecisionLabel = (d: string | null) => DEFICIT_DECISION[d || ''] || ''

type Col = { header: string; key: string; width: number; money?: boolean }

function addTable(wb: ExcelJS.Workbook, title: string, cols: Col[], rows: Record<string, unknown>[], totals?: Record<string, unknown>, empty = 'ما فيه بيانات لهذي الفترة') {
  const ws = wb.addWorksheet(title, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] })
  ws.columns = cols.map(c => ({ header: c.header, key: c.key, width: c.width, style: c.money ? { numFmt: MONEY } : {} }))
  const head = ws.getRow(1)
  head.height = 24
  head.eachCell(cell => {
    cell.font = { bold: true, color: { argb: HEAD_TXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  for (const r of rows) ws.addRow(r)
  if (!rows.length) {
    ws.addRow({ [cols[0].key]: empty }).font = { italic: true, color: { argb: MUTED } }
  } else if (totals) {
    const row = ws.addRow(totals)
    row.font = { bold: true }
    row.eachCell({ includeEmpty: true }, cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } } })
  }
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } }
  return ws
}

export async function buildAccountantWorkbook(r: AccountantReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Storely'
  wb.created = new Date()
  const has = (s: AccSection) => r.sections.includes(s)
  const t = summarize(r)
  const branchCol: Col[] = r.branchName ? [] : [{ header: 'الفرع', key: 'branch', width: 16 }]

  // الملخص
  const ws = wb.addWorksheet('الملخص', { views: [{ rightToLeft: true }] })
  ws.columns = [{ width: 40 }, { width: 22 }]
  ws.addRow(['تقرير المحاسب']).font = { bold: true, size: 16, color: { argb: BRAND } }
  ws.addRow([r.orgName]).font = { bold: true, size: 13 }
  ws.addRow([`${r.label} · ${r.branchName || 'كل الفروع'}`]).font = { color: { argb: MUTED } }
  ws.addRow([`الفترة: ${r.period.start} إلى ${r.period.end} · العملة: ${r.currency}`]).font = { color: { argb: MUTED } }
  const section = (title: string) => {
    ws.addRow([])
    const row = ws.addRow([title])
    row.font = { bold: true, color: { argb: HEAD_TXT } }
    for (const i of [1, 2]) row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
  }
  const line = (label: string, v: number, bold = false) => { const row = ws.addRow([label, v]); row.getCell(2).numFmt = MONEY; if (bold) row.font = { bold: true } }
  if (has('sales')) { section('المبيعات'); line('إجمالي المبيعات', t.sales, true); line('الشبكة (مدى، فيزا، ماستركارد)', t.network); line('الكاش الفعلي', t.cash) }
  if (has('purchases')) { section('المشتريات'); line('قبل الضريبة', t.purNet); line('الضريبة', t.purVat); line('الإجمالي', t.purTotal, true); line('منها آجلة', t.purUnpaid) }
  if (has('vat')) {
    section('ضريبة القيمة المضافة')
    if (r.vatRegistered) { line('ضريبة المبيعات (المخرجات)', t.outputVat); line('ضريبة المشتريات (المدخلات)', t.inputVat); line('صافي الضريبة المستحقة', t.vatNet, true) }
    else ws.addRow(['المنشأة غير مسجلة في ضريبة القيمة المضافة'])
  }
  if (has('payables')) { section('الموردين الآجلين'); line('إجمالي المستحق للموردين', t.payablesTotal, true) }
  if (has('payroll') && r.payroll) { section('الرواتب'); line('إجمالي الرواتب', t.payrollGross); line('صافي الرواتب', t.payrollNet, true) }
  if (has('expenses')) { section('المصروفات'); line('مصروفات من الدرج', t.expenses, true) }
  if (has('cash_diff')) { section('فروقات الكاشير'); line('العجز', t.deficit); line('الزيادة', t.surplus) }
  if (has('stock')) { section('المخزون'); line('قيمة المخزون الحالية', t.stockValue, true) }
  ws.addRow([])
  if (has('vat') && r.vatRegistered) ws.addRow(['ضريبة المبيعات محسوبة من إجمالي المبيعات شامل الضريبة (15%).']).font = { italic: true, size: 9, color: { argb: 'FF98A2B3' } }
  if (has('stock')) ws.addRow(['قيمة المخزون وقت إصدار التقرير، للأصناف اللي لها تكلفة.']).font = { italic: true, size: 9, color: { argb: 'FF98A2B3' } }
  ws.addRow(['صدر من Storely']).font = { italic: true, size: 9, color: { argb: 'FF98A2B3' } }

  if (has('sales')) addTable(wb, 'المبيعات', [
    { header: 'التاريخ', key: 'date', width: 12 }, ...branchCol, { header: 'الكاشير', key: 'staff', width: 16 },
    { header: 'إجمالي المبيعات', key: 'sales', width: 15, money: true }, { header: 'مدى', key: 'mada', width: 12, money: true }, { header: 'فيزا', key: 'visa', width: 12, money: true },
    { header: 'ماستركارد', key: 'mastercard', width: 12, money: true }, { header: 'الشبكة', key: 'network', width: 12, money: true }, { header: 'الكاش', key: 'cash', width: 12, money: true },
    { header: 'مصروفات', key: 'expenses', width: 11, money: true }, { header: 'الفرق', key: 'difference', width: 11, money: true }, { header: 'الحالة', key: 'status', width: 9 },
  ], r.closings.map(c => ({ ...c, staff: c.staff || '—', status: CLOSING_STATUS[c.status || ''] || '—' })),
  { date: 'الإجمالي', sales: t.sales, mada: t.mada, visa: t.visa, mastercard: t.mastercard, network: t.network, cash: t.cash, expenses: sum(r.closings, c => c.expenses), difference: sum(r.closings, c => c.difference) })

  if (has('purchases')) {
    const pws = addTable(wb, 'المشتريات', [
      { header: 'التاريخ', key: 'date', width: 12 }, ...branchCol, { header: 'المورد', key: 'supplier', width: 20 }, { header: 'الصنف', key: 'name', width: 26 },
      { header: 'الفئة', key: 'category', width: 14 }, { header: 'الكمية', key: 'qty', width: 9 }, { header: 'الوحدة', key: 'unit', width: 9 },
      { header: 'قبل الضريبة', key: 'net', width: 13, money: true }, { header: 'الضريبة', key: 'vat', width: 11, money: true }, { header: 'الإجمالي', key: 'total', width: 13, money: true },
      { header: 'الدفع', key: 'paid', width: 10 }, { header: 'صورة الفاتورة', key: 'invoice', width: 16 },
    ], r.purchases.map(p => ({ ...p, supplier: p.supplier || '—', category: p.category || '—', paid: p.paid ? 'مدفوعة' : 'آجلة', invoice: null })),
    { date: 'الإجمالي', net: t.purNet, vat: t.purVat, total: t.purTotal })
    r.purchases.forEach((p, i) => {
      if (!p.invoiceUrl || !/^https:\/\//.test(p.invoiceUrl)) return
      const cell = pws.getRow(i + 2).getCell('invoice')
      cell.value = { text: 'عرض الفاتورة', hyperlink: p.invoiceUrl }
      cell.font = { color: { argb: 'FF2563EB' }, underline: true }
    })
  }

  if (has('vat')) {
    const vws = wb.addWorksheet('الضريبة', { views: [{ rightToLeft: true }] })
    vws.columns = [{ width: 42 }, { width: 20 }]
    const head = vws.addRow(['البند', 'المبلغ'])
    head.eachCell(c => { c.font = { bold: true, color: { argb: HEAD_TXT } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } } })
    if (!r.vatRegistered) vws.addRow(['المنشأة غير مسجلة في ضريبة القيمة المضافة', ''])
    else {
      const rows: [string, number, boolean?][] = [
        ['المبيعات شاملة الضريبة', t.sales], ['المبيعات قبل الضريبة', t.salesNet], ['ضريبة المبيعات (المخرجات)', t.outputVat, true],
        ['المشتريات قبل الضريبة', t.purNet], ['ضريبة المشتريات (المدخلات)', t.inputVat, true], ['صافي الضريبة المستحقة', t.vatNet, true],
      ]
      for (const [k, v, b] of rows) { const row = vws.addRow([k, v]); row.getCell(2).numFmt = MONEY; if (b) row.font = { bold: true } }
      vws.addRow([])
      vws.addRow(['تقدير من إقفالات الكاشير وفواتير المشتريات المسجلة — راجعه قبل تقديم الإقرار.']).font = { italic: true, size: 9, color: { argb: 'FF98A2B3' } }
    }
  }

  if (has('payables')) addTable(wb, 'الموردين الآجلين', [
    { header: 'المورد', key: 'supplier', width: 24 }, { header: 'عدد الفواتير', key: 'invoices', width: 12 }, { header: 'أقدم فاتورة', key: 'oldest', width: 13 },
    { header: 'أقرب استحقاق', key: 'nextDue', width: 13 }, { header: 'المبلغ المستحق', key: 'total', width: 15, money: true },
  ], r.payables.map(p => ({ ...p, nextDue: p.nextDue || '—' })), { supplier: 'الإجمالي', total: t.payablesTotal }, 'ما فيه فواتير آجلة')

  if (has('payroll') && r.payroll) addTable(wb, 'الرواتب', [
    { header: 'الموظف', key: 'name', width: 20 }, { header: 'الأساسي', key: 'basic', width: 12, money: true }, { header: 'بدل سكن', key: 'housing', width: 11, money: true },
    { header: 'بدل نقل', key: 'transport', width: 11, money: true }, { header: 'بدل طعام', key: 'food', width: 11, money: true }, { header: 'إجمالي الراتب', key: 'gross', width: 13, money: true },
    { header: 'الإضافي', key: 'overtime', width: 11, money: true }, { header: 'مكافآت', key: 'bonuses', width: 11, money: true }, { header: 'خصومات', key: 'deductions', width: 11, money: true },
    { header: 'منها غرامات تأخير', key: 'latePenalties', width: 14, money: true }, { header: 'سلف', key: 'advances', width: 11, money: true }, { header: 'الصافي', key: 'net', width: 13, money: true },
  ], r.payroll, { name: 'الإجمالي', basic: sum(r.payroll, p => p.basic), housing: sum(r.payroll, p => p.housing), transport: sum(r.payroll, p => p.transport),
    food: sum(r.payroll, p => p.food), gross: t.payrollGross, overtime: sum(r.payroll, p => p.overtime), bonuses: sum(r.payroll, p => p.bonuses),
    deductions: sum(r.payroll, p => p.deductions), latePenalties: sum(r.payroll, p => p.latePenalties), advances: sum(r.payroll, p => p.advances), net: t.payrollNet })

  if (has('expenses')) addTable(wb, 'المصروفات', [
    { header: 'التاريخ', key: 'date', width: 12 }, ...branchCol, { header: 'الموظف', key: 'staff', width: 16 }, { header: 'البند', key: 'item', width: 32 },
    { header: 'المبلغ', key: 'amount', width: 13, money: true },
  ], r.expenses.map(e => ({ ...e, staff: e.staff || '—' })), { date: 'الإجمالي', amount: t.expenses })

  if (has('cash_diff')) {
    const diffs = r.closings.filter(c => c.difference !== 0)
    addTable(wb, 'العجز والزيادة', [
      { header: 'التاريخ', key: 'date', width: 12 }, ...branchCol, { header: 'الكاشير', key: 'staff', width: 16 }, { header: 'النوع', key: 'kind', width: 9 },
      { header: 'المبلغ', key: 'amount', width: 12, money: true }, { header: 'السبب', key: 'reason', width: 30 }, { header: 'القرار', key: 'decision', width: 18 },
    ], diffs.map(c => ({ date: c.date, branch: c.branch, staff: c.staff || '—', kind: c.difference < 0 ? 'عجز' : 'زيادة', amount: Math.abs(c.difference),
      reason: c.deficitReason || '', decision: c.difference < 0 ? deficitDecisionLabel(c.deficitDecision) : '' })), undefined, 'ما فيه عجز ولا زيادة')
  }

  if (has('stock')) addTable(wb, 'المخزون', [
    { header: 'الصنف', key: 'name', width: 26 }, ...branchCol, { header: 'الفئة', key: 'category', width: 14 }, { header: 'الكمية الحالية', key: 'qty', width: 12 },
    { header: 'الوحدة', key: 'unit', width: 9 }, { header: 'متوسط التكلفة', key: 'avgCost', width: 13, money: true }, { header: 'القيمة', key: 'value', width: 13, money: true },
  ], r.stock.map(s => ({ ...s, category: s.category || '—', value: s.avgCost != null ? r2(s.qty * Number(s.avgCost)) : null })), { name: 'الإجمالي', value: t.stockValue })

  return Buffer.from(await wb.xlsx.writeBuffer())
}
