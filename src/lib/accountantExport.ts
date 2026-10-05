import ExcelJS from 'exceljs'

// ملف المحاسب الشهري — ورقة لكل جزء (ملخص، مشتريات، مبيعات، مصروفات، رواتب، مخزون) بصيغة إكسل عربية

export type AccPurchase = { date: string; branch?: string | null; supplier: string | null; name: string; category: string | null; qty: number | null; unit: string | null
  net: number; vat: number; total: number; paid: boolean; invoiceUrl: string | null }
export type AccClosing = { date: string; branch?: string | null; staff: string | null; sales: number; mada: number; visa: number; mastercard: number; network: number
  cash: number; expenses: number; difference: number; status: string | null; deficitReason: string | null; deficitDecision: string | null }
export type AccExpense = { date: string; branch?: string | null; staff: string | null; item: string; amount: number }
export type AccPayroll = { name: string; basic: number; housing: number; transport: number; food: number; gross: number; overtime: number; bonuses: number
  deductions: number; latePenalties: number; advances: number; net: number }
export type AccStock = { name: string; category: string | null; qty: number; unit: string | null; avgCost: number | null; branch?: string | null }

export type AccountantInput = {
  orgName: string; branchName: string | null; month: string; currency: string
  purchases: AccPurchase[]; closings: AccClosing[]; expenses: AccExpense[]
  payroll: AccPayroll[] | null   // null = المنشأة ما عندها إدارة الرواتب
  stock: AccStock[]
}

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100
const sum = <T>(rows: T[], f: (r: T) => number) => r2(rows.reduce((s, r) => s + (Number(f(r)) || 0), 0))

const BRAND = 'FF0F766E', HEAD_TXT = 'FFFFFFFF', TOTAL_BG = 'FFF0FDFA', MONEY = '#,##0.00'

const CLOSING_STATUS: Record<string, string> = { balanced: 'مطابق', deficit: 'عجز', surplus: 'زيادة' }
const DEFICIT_DECISION: Record<string, string> = { pending: 'بانتظار قرار المالك', approved: 'خُصم من الموظف', rejected: 'ما انخصم' }

type Col = { header: string; key: string; width: number; money?: boolean }

function addTable(wb: ExcelJS.Workbook, title: string, cols: Col[], rows: Record<string, unknown>[], totals?: Record<string, unknown>) {
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
    const row = ws.addRow({ [cols[0].key]: 'ما فيه بيانات لهذا الشهر' })
    row.font = { italic: true, color: { argb: 'FF667085' } }
  } else if (totals) {
    const row = ws.addRow(totals)
    row.font = { bold: true }
    row.eachCell({ includeEmpty: true }, cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } } })
  }
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } }
  return ws
}

export async function buildAccountantWorkbook(d: AccountantInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Storely'
  wb.created = new Date()
  const multiBranch = !d.branchName
  const branchCol: Col[] = multiBranch ? [{ header: 'الفرع', key: 'branch', width: 16 }] : []

  // الأرقام الإجمالية
  const salesTotal = sum(d.closings, c => c.sales), networkTotal = sum(d.closings, c => c.network), cashTotal = sum(d.closings, c => c.cash)
  const deficitTotal = sum(d.closings.filter(c => c.difference < 0), c => -c.difference)
  const surplusTotal = sum(d.closings.filter(c => c.difference > 0), c => c.difference)
  const purNet = sum(d.purchases, p => p.net), purVat = sum(d.purchases, p => p.vat), purTotal = sum(d.purchases, p => p.total)
  const unpaid = sum(d.purchases.filter(p => !p.paid), p => p.total)
  const expTotal = sum(d.expenses, e => e.amount)
  const payNet = d.payroll ? sum(d.payroll, p => p.net) : 0
  const stockValue = sum(d.stock.filter(s => s.avgCost != null), s => s.qty * Number(s.avgCost))

  // 1) الملخص
  const ws = wb.addWorksheet('الملخص', { views: [{ rightToLeft: true }] })
  ws.columns = [{ width: 38 }, { width: 22 }]
  ws.addRow(['ملف المحاسب الشهري']).font = { bold: true, size: 16, color: { argb: BRAND } }
  ws.addRow([d.orgName]).font = { bold: true, size: 13 }
  ws.addRow([`${monthLabel(d.month)} · ${d.branchName || 'كل الفروع'}`]).font = { color: { argb: 'FF667085' } }
  ws.addRow([`العملة: ${d.currency}`]).font = { color: { argb: 'FF667085' } }
  ws.addRow([])
  const section = (t: string) => { const r = ws.addRow([t]); r.font = { bold: true, color: { argb: HEAD_TXT } }; r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }; r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } } }
  const line = (label: string, v: number, bold = false) => { const r = ws.addRow([label, v]); r.getCell(2).numFmt = MONEY; if (bold) r.font = { bold: true } }
  section('المبيعات (من إقفالات الكاشير)')
  line('إجمالي المبيعات', salesTotal, true); line('الشبكة (مدى، فيزا، ماستركارد)', networkTotal); line('الكاش الفعلي', cashTotal)
  line('عجز الكاشير', deficitTotal); line('زيادة الكاشير', surplusTotal)
  ws.addRow([])
  section('المشتريات')
  line('قبل الضريبة', purNet); line('ضريبة القيمة المضافة', purVat); line('الإجمالي', purTotal, true); line('منها آجلة (غير مدفوعة)', unpaid)
  ws.addRow([])
  section('المصروفات والرواتب')
  line('مصروفات من الدرج', expTotal)
  if (d.payroll) line('صافي الرواتب', payNet, true)
  ws.addRow([])
  section('المخزون')
  line('قيمة المخزون الحالية (بمتوسط التكلفة)', stockValue)
  ws.addRow([])
  ws.addRow(['قيمة المخزون محسوبة وقت إصدار الملف، وللأصناف اللي لها تكلفة بس.']).font = { italic: true, size: 9, color: { argb: 'FF98A2B3' } }
  ws.addRow([`صدر من Storely بتاريخ ${new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)}`]).font = { italic: true, size: 9, color: { argb: 'FF98A2B3' } }

  // 2) المشتريات
  const pws = addTable(wb, 'المشتريات', [
    { header: 'التاريخ', key: 'date', width: 12 }, ...branchCol, { header: 'المورد', key: 'supplier', width: 20 }, { header: 'الصنف', key: 'name', width: 26 },
    { header: 'الفئة', key: 'category', width: 14 }, { header: 'الكمية', key: 'qty', width: 9 }, { header: 'الوحدة', key: 'unit', width: 9 },
    { header: 'قبل الضريبة', key: 'net', width: 13, money: true }, { header: 'الضريبة', key: 'vat', width: 11, money: true }, { header: 'الإجمالي', key: 'total', width: 13, money: true },
    { header: 'الدفع', key: 'paid', width: 10 }, { header: 'صورة الفاتورة', key: 'invoice', width: 16 },
  ], d.purchases.map(p => ({ ...p, supplier: p.supplier || '—', category: p.category || '—', paid: p.paid ? 'مدفوعة' : 'آجلة', invoice: null })),
  { date: 'الإجمالي', net: purNet, vat: purVat, total: purTotal })
  // روابط الفواتير — نص قابل للضغط
  d.purchases.forEach((p, i) => {
    if (!p.invoiceUrl || !/^https:\/\//.test(p.invoiceUrl)) return
    const cell = pws.getRow(i + 2).getCell('invoice')
    cell.value = { text: 'عرض الفاتورة', hyperlink: p.invoiceUrl }
    cell.font = { color: { argb: 'FF2563EB' }, underline: true }
  })

  // 3) المبيعات
  addTable(wb, 'المبيعات', [
    { header: 'التاريخ', key: 'date', width: 12 }, ...branchCol, { header: 'الكاشير', key: 'staff', width: 16 },
    { header: 'إجمالي المبيعات', key: 'sales', width: 15, money: true }, { header: 'مدى', key: 'mada', width: 12, money: true }, { header: 'فيزا', key: 'visa', width: 12, money: true },
    { header: 'ماستركارد', key: 'mastercard', width: 12, money: true }, { header: 'الشبكة', key: 'network', width: 12, money: true }, { header: 'الكاش', key: 'cash', width: 12, money: true },
    { header: 'مصروفات', key: 'expenses', width: 11, money: true }, { header: 'الفرق', key: 'difference', width: 11, money: true },
    { header: 'الحالة', key: 'status', width: 9 }, { header: 'سبب العجز', key: 'deficitReason', width: 26 }, { header: 'قرار العجز', key: 'deficitDecision', width: 18 },
  ], d.closings.map(c => ({ ...c, staff: c.staff || '—', status: CLOSING_STATUS[c.status || ''] || '—', deficitReason: c.deficitReason || '',
    deficitDecision: c.difference < 0 ? DEFICIT_DECISION[c.deficitDecision || ''] || '' : '' })),
  { date: 'الإجمالي', sales: salesTotal, mada: sum(d.closings, c => c.mada), visa: sum(d.closings, c => c.visa), mastercard: sum(d.closings, c => c.mastercard),
    network: networkTotal, cash: cashTotal, expenses: sum(d.closings, c => c.expenses), difference: sum(d.closings, c => c.difference) })

  // 4) المصروفات
  addTable(wb, 'المصروفات', [
    { header: 'التاريخ', key: 'date', width: 12 }, ...branchCol, { header: 'الموظف', key: 'staff', width: 16 }, { header: 'البند', key: 'item', width: 32 },
    { header: 'المبلغ', key: 'amount', width: 13, money: true },
  ], d.expenses.map(e => ({ ...e, staff: e.staff || '—' })), { date: 'الإجمالي', amount: expTotal })

  // 5) الرواتب
  if (d.payroll) {
    addTable(wb, 'الرواتب', [
      { header: 'الموظف', key: 'name', width: 20 }, { header: 'الأساسي', key: 'basic', width: 12, money: true }, { header: 'بدل سكن', key: 'housing', width: 11, money: true },
      { header: 'بدل نقل', key: 'transport', width: 11, money: true }, { header: 'بدل طعام', key: 'food', width: 11, money: true }, { header: 'إجمالي الراتب', key: 'gross', width: 13, money: true },
      { header: 'الإضافي', key: 'overtime', width: 11, money: true }, { header: 'مكافآت', key: 'bonuses', width: 11, money: true }, { header: 'خصومات', key: 'deductions', width: 11, money: true },
      { header: 'منها غرامات تأخير', key: 'latePenalties', width: 14, money: true }, { header: 'سلف', key: 'advances', width: 11, money: true }, { header: 'الصافي', key: 'net', width: 13, money: true },
    ], d.payroll, { name: 'الإجمالي', basic: sum(d.payroll, p => p.basic), housing: sum(d.payroll, p => p.housing), transport: sum(d.payroll, p => p.transport),
      food: sum(d.payroll, p => p.food), gross: sum(d.payroll, p => p.gross), overtime: sum(d.payroll, p => p.overtime), bonuses: sum(d.payroll, p => p.bonuses),
      deductions: sum(d.payroll, p => p.deductions), latePenalties: sum(d.payroll, p => p.latePenalties), advances: sum(d.payroll, p => p.advances), net: payNet })
  }

  // 6) المخزون
  addTable(wb, 'المخزون', [
    { header: 'الصنف', key: 'name', width: 26 }, ...branchCol, { header: 'الفئة', key: 'category', width: 14 }, { header: 'الكمية الحالية', key: 'qty', width: 12 },
    { header: 'الوحدة', key: 'unit', width: 9 }, { header: 'متوسط التكلفة', key: 'avgCost', width: 13, money: true }, { header: 'القيمة', key: 'value', width: 13, money: true },
  ], d.stock.map(s => ({ ...s, category: s.category || '—', value: s.avgCost != null ? r2(s.qty * Number(s.avgCost)) : null })), { name: 'الإجمالي', value: stockValue })

  return Buffer.from(await wb.xlsx.writeBuffer())
}
