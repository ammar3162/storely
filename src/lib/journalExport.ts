// تصدير القيود اليومية للمحاسب — ملف قيود عام (رقم القيد، التاريخ، الحساب، مدين، دائن، البيان) يستورده قيود ودفترة و Zoho وأودو
// كل قيد متوازن: إقفال الكاشير (مبيعات اليوم)، مصروفات الدرج، وكل فاتورة مشتريات
import type { AccClosing, AccPurchase } from '@/lib/accountantExport'

export type AccountKey = 'sales' | 'output_vat' | 'cash' | 'bank' | 'delivery' | 'shortage' | 'purchases' | 'input_vat' | 'payables' | 'paid_from' | 'petty'
export type Account = { code: string; name: string }
export type AccountMap = Record<AccountKey, Account>

// دليل حسابات افتراضي (المحاسب يغيّره مرة لكل عميل وينحفظ)
export const DEFAULT_ACCOUNTS: AccountMap = {
  cash: { code: '1101', name: 'الصندوق' },
  bank: { code: '1102', name: 'البنك - مدفوعات الشبكة' },
  delivery: { code: '1203', name: 'ذمم تطبيقات التوصيل' },
  input_vat: { code: '1301', name: 'ضريبة القيمة المضافة - المدخلات' },
  payables: { code: '2101', name: 'الموردون' },
  output_vat: { code: '2201', name: 'ضريبة القيمة المضافة - المخرجات' },
  sales: { code: '4101', name: 'إيرادات المبيعات' },
  purchases: { code: '5101', name: 'المشتريات' },
  petty: { code: '5201', name: 'مصروفات نثرية' },
  shortage: { code: '5301', name: 'عجز وزيادة الصندوق' },
  paid_from: { code: '1102', name: 'البنك - مدفوعات الشبكة' },
}
export const ACCOUNT_LABELS: Record<AccountKey, string> = {
  sales: 'المبيعات', output_vat: 'ضريبة المبيعات', cash: 'النقد في الدرج', bank: 'مبيعات الشبكة (مدى/فيزا)', delivery: 'مبيعات تطبيقات التوصيل',
  shortage: 'عجز وزيادة الكاشير', purchases: 'المشتريات', input_vat: 'ضريبة المشتريات', payables: 'المشتريات الآجلة (الموردون)',
  paid_from: 'المشتريات المدفوعة (من أين دُفعت)', petty: 'مصروفات من درج الكاشير',
}
export const ACCOUNT_KEYS = Object.keys(ACCOUNT_LABELS) as AccountKey[]

/** يدمج حسابات المحاسب المحفوظة مع الافتراضية — ويتجاهل أي شي غريب */
export function cleanMap(raw: unknown): AccountMap {
  const out = { ...DEFAULT_ACCOUNTS }
  if (raw && typeof raw === 'object') for (const k of ACCOUNT_KEYS) {
    const v = (raw as any)[k]
    if (v && typeof v === 'object') {
      const code = String(v.code ?? '').trim().slice(0, 20), name = String(v.name ?? '').trim().slice(0, 80)
      if (code && name) out[k] = { code, name }
    }
  }
  return out
}

export type JournalLine = { entry: number; date: string; account: Account; memo: string; debit: number; credit: number; ref: string }
const r2 = (n: number) => Math.round(n * 100) / 100

export function buildJournal(r: { closings: AccClosing[]; purchases: AccPurchase[]; vatRegistered: boolean; sections: string[] }, map: AccountMap): JournalLine[] {
  const lines: JournalLine[] = []
  let entry = 0
  const push = (date: string, memo: string, ref: string, rows: [Account, number, number][]) => {
    const kept = rows.map(([a, d, c]) => [a, r2(d), r2(c)] as const).filter(([, d, c]) => d > 0 || c > 0)
    if (!kept.length) return
    entry++
    for (const [account, debit, credit] of kept) lines.push({ entry, date, account, memo, debit, credit, ref })
  }
  const has = (s: string) => r.sections.includes(s)
  const salesOn = has('sales') || has('cash_diff')

  // ١) مبيعات كل إقفال: النقد + الشبكة + التوصيل (+ العجز) = المبيعات (+ الزيادة)
  if (salesOn) for (const c of r.closings) {
    const diff = r2(c.difference || 0), sales = r2(c.sales || 0)
    const net = r.vatRegistered ? r2(sales / 1.15) : sales
    const memo = `مبيعات ${c.date}${c.branch ? ` - ${c.branch}` : ''}${c.staff ? ` - ${c.staff}` : ''}`
    push(c.date, memo, c.id ? `closing:${c.id}` : '', [
      [map.cash, c.cash || 0, 0], [map.bank, c.network || 0, 0], [map.delivery, c.delivery || 0, 0],
      [map.shortage, diff < 0 ? -diff : 0, diff > 0 ? diff : 0],
      [map.sales, 0, net], ...(r.vatRegistered ? [[map.output_vat, 0, r2(sales - net)] as [Account, number, number]] : []),
    ])
    // ٢) مصروفات من الدرج
    if ((has('expenses') || has('sales')) && c.expenses > 0) push(c.date, `مصروفات من درج الكاشير ${c.date}`, c.id ? `closing:${c.id}` : '', [[map.petty, c.expenses, 0], [map.cash, 0, c.expenses]])
  }

  // ٣) فواتير المشتريات (سطور نفس الفاتورة في قيد واحد)
  if (has('purchases')) {
    const groups = new Map<string, AccPurchase[]>()
    for (const p of r.purchases) { const k = p.group || p.id || `${p.date}|${p.supplier}|${p.name}`; groups.set(k, [...(groups.get(k) || []), p]) }
    for (const [k, ps] of groups) {
      const p0 = ps[0], net = ps.reduce((s, p) => s + p.net, 0), vat = ps.reduce((s, p) => s + p.vat, 0), total = ps.reduce((s, p) => s + p.total, 0)
      const paid = ps.every(p => p.paid)
      const memo = `فاتورة ${p0.supplier || 'مورد'}${p0.invoiceNumber ? ` رقم ${p0.invoiceNumber}` : ''}${ps.length === 1 ? ` - ${p0.name}` : ` (${ps.length} أصناف)`}`
      push(p0.date, memo, `purchase:${k}`, [[map.purchases, net, 0], [map.input_vat, vat, 0], [paid ? map.paid_from : map.payables, 0, total]])
    }
  }
  // تصحيح فرق التقريب (هللة) داخل كل قيد على آخر سطر دائن
  for (let e = 1; e <= entry; e++) {
    const ls = lines.filter(l => l.entry === e)
    const gap = r2(ls.reduce((s, l) => s + l.debit - l.credit, 0))
    if (gap !== 0) { const last = [...ls].reverse().find(l => l.credit > 0); if (last) last.credit = r2(last.credit + gap) }
  }
  return lines
}

/** CSV بترميز UTF-8 (مع BOM عشان إكسل يقرأ العربي) */
export function journalCsv(lines: JournalLine[]) {
  const q = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const head = ['رقم القيد', 'التاريخ', 'رقم الحساب', 'اسم الحساب', 'البيان', 'مدين', 'دائن', 'المرجع']
  return '﻿' + [head, ...lines.map(l => [l.entry, l.date, l.account.code, l.account.name, l.memo, l.debit.toFixed(2), l.credit.toFixed(2), l.ref])].map(r => r.map(q).join(',')).join('\r\n')
}
