// حساب الربحية الشهرية (دالة صافية) — يستخدمها /api/profitability
//  - المنشأة المسجّلة بالضريبة: الإيرادات والمشتريات بدون الضريبة، والضريبة المستحقة = ضريبة المبيعات − ضريبة المشتريات
//  - غير المسجّلة: كل شي بالمبلغ الكامل (الضريبة اللي تدفعها على المشتريات تكلفة عليها)، وما فيه ضريبة مبيعات
//  - مبيعات تطبيقات التوصيل داخل إقفال الكاشير أصلاً → «دخل التوصيل» المسجّل يدوياً لنفس التطبيق بنفس الشهر ما ينحسب مرتين
//  - مسحوبات درج الكاشير (ثلج، غاز...) مصروف على المنشأة — إلا السلف (جزء من الراتب المحسوب أصلاً)
//    وسحب المالك والإيداع بالبنك (فلوس انتقلت، مو مصروف). سببها نص حر فنميّزها بكلمات السبب
//  - الرواتب: من حساب الرواتب الفعلي لكل موظف بذاك الشهر (lib/payroll)

export const VAT_RATE = 0.15
const r2 = (n: number) => Math.round(n * 100) / 100
const num = (v: unknown) => Number(v) || 0
const normApp = (s: unknown) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

export type ProfitClosing = { total_sales: unknown; delivery?: unknown; total_purchases?: unknown; purchases?: unknown }

/** مسحوبة الدرج ما تنحسب مصروف: سلفة موظف، سحب المالك، إيداع بالبنك */
export const NOT_EXPENSE_RE = /سلف|مالك|ايداع|إيداع|بنك|تحويل/
export const isDrawerExpense = (reason: unknown) => !NOT_EXPENSE_RE.test(String(reason ?? ''))
export type ProfitPurchase = { category: string | null; amount: unknown; total_amount: unknown }
export type ProfitDelivery = { id?: string; platform: string; amount: unknown }
export type ProfitStaffCost = { gross: number; overtime: number; bonuses: number; deductions: number }

export function computeProfit(i: {
  vatRegistered: boolean
  closings: ProfitClosing[]
  purchases: ProfitPurchase[]
  fixedExpensesTotal: number
  deliveryIncome: ProfitDelivery[]
  staff: ProfitStaffCost[]
}) {
  const vat = i.vatRegistered
  const exVat = (gross: number) => (vat ? gross / (1 + VAT_RATE) : gross)

  // المبيعات (شاملة الضريبة كما يدخلها الكاشير)
  const totalIn = r2(i.closings.reduce((s, c) => s + num(c.total_sales), 0))

  // تطبيقات التوصيل المسجّلة داخل الإقفالات بهالشهر
  const appsInClosings = new Set<string>()
  let deliveryInSales = 0
  for (const c of i.closings) {
    for (const d of (Array.isArray(c.delivery) ? c.delivery : []) as { name?: unknown; amount?: unknown }[]) {
      if (num(d?.amount) > 0) { appsInClosings.add(normApp(d?.name)); deliveryInSales += num(d?.amount) }
    }
  }
  const deliveryIncomeList = i.deliveryIncome.map(d => ({ ...d, amount: num(d.amount), duplicate: appsInClosings.has(normApp(d.platform)) }))
  const deliveryIncomeTotal = r2(deliveryIncomeList.filter(d => !d.duplicate).reduce((s, d) => s + d.amount, 0))
  const deliveryDuplicateTotal = r2(deliveryIncomeList.filter(d => d.duplicate).reduce((s, d) => s + d.amount, 0))

  // المشتريات: المسجّلة بالضريبة تحسب الصافي (amount)، غير المسجّلة المبلغ الكامل
  const purchaseCost = (p: ProfitPurchase) => (vat ? num(p.amount) : num(p.total_amount ?? p.amount))
  const inventoryPurchases = r2(i.purchases.filter(p => p.category === 'مخزون').reduce((s, p) => s + purchaseCost(p), 0))
  // مسحوبات الدرج: بنودها مع السبب (الإقفالات القديمة بدون بنود → الإجمالي كمصروف)
  let drawerPurchases = 0, drawerExcluded = 0
  for (const c of i.closings) {
    const items = (Array.isArray(c.purchases) ? c.purchases : []) as { amount?: unknown; reason?: unknown }[]
    if (!items.length) { drawerPurchases += num(c.total_purchases); continue }
    for (const it of items) { if (isDrawerExpense(it?.reason)) drawerPurchases += num(it?.amount); else drawerExcluded += num(it?.amount) }
  }
  drawerPurchases = r2(drawerPurchases); drawerExcluded = r2(drawerExcluded)
  const otherPurchases = r2(i.purchases.filter(p => p.category !== 'مخزون').reduce((s, p) => s + purchaseCost(p), 0) + drawerPurchases)
  const totalPurchases = r2(inventoryPurchases + otherPurchases)

  // الضريبة المستحقة (تقديرية): ضريبة المبيعات − ضريبة المشتريات اللي عليها فاتورة ضريبية
  const salesGross = totalIn + deliveryIncomeTotal
  const outputVat = vat ? r2(salesGross - salesGross / (1 + VAT_RATE)) : 0
  const inputVat = vat ? r2(i.purchases.reduce((s, p) => s + Math.max(0, num(p.total_amount) - num(p.amount)), 0)) : 0
  const vatAmount = r2(outputVat - inputVat)

  // الرواتب: الإجمالي + الأوفر تايم + المكافآت − الخصومات (السلف جزء من الراتب نفسه، مو تكلفة إضافية)
  const salaryExpenseTotal = r2(Math.max(0, i.staff.reduce((s, m) => s + m.gross + m.overtime + m.bonuses - m.deductions, 0)))

  const revenue = r2(exVat(totalIn) + exVat(deliveryIncomeTotal))
  const fixedExpensesTotal = r2(i.fixedExpensesTotal)
  const totalOut = r2(totalPurchases + fixedExpensesTotal + salaryExpenseTotal)
  const netProfit = r2(revenue - totalOut)

  return {
    vatRegistered: vat,
    totalIn, closingsCount: i.closings.length, revenue,
    deliveryInSales: r2(deliveryInSales), deliveryIncomeList, deliveryIncomeTotal, deliveryDuplicateTotal,
    inventoryPurchases, otherPurchases, drawerPurchases, drawerExcluded, totalPurchases,
    fixedExpensesTotal, salaryExpenseTotal, salaryStaffCount: i.staff.length,
    outputVat, inputVat, vatAmount,
    totalOut, netProfit,
  }
}
