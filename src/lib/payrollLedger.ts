// كشف بنود الراتب (للتقرير الشهري و PDF) — كل بند بنوعه وتاريخه وتفاصيله، بنفس أرقام كشف راتب الموظف
type Pay = {
  basic: number; allowances: { housing: number; transport: number; food: number }
  overtime: { minutes: number; pay: number; hourRate: number; days: { date: string; minutes: number; pay: number }[] }
  latePenalties: { date: string; minutes: number; amount: number }[]
  deductions: { amount: number; reason: string | null; date: string; source: string }[]
  advances: { amount: number; reason: string | null; date: string }[]
  pendingAdvances: { amount: number; date: string }[]
  pendingDeficits: { date: string; amount: number; reason: string | null }[]
}

export type LedgerRow = { section: 'earning' | 'deduction' | 'pending'; label: string; date: string | null; detail: string; amount: number }

export const fmtDuration = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60
  return h && m ? `${h} س ${m} د` : h ? `${h} ساعة` : `${m} دقيقة`
}

// «عجز إقفال الكاشير YYYY-MM-DD — السبب» → التاريخ والسبب
const deficitParts = (reason: string | null) => {
  const m = /^عجز إقفال الكاشير (\d{4}-\d{2}-\d{2})(?: — (.*))?$/.exec(reason || '')
  return m ? { date: m[1], reason: m[2] || '' } : null
}

const isoDay = (d: string) => (d.length === 10 ? d : new Date(new Date(d).getTime() + 3 * 3600e3).toISOString().slice(0, 10))

export function payrollLedger(p: Pay): LedgerRow[] {
  const rows: LedgerRow[] = []
  rows.push({ section: 'earning', label: 'الراتب الأساسي', date: null, detail: '', amount: p.basic })
  if (p.allowances.housing) rows.push({ section: 'earning', label: 'بدل سكن', date: null, detail: '', amount: p.allowances.housing })
  if (p.allowances.transport) rows.push({ section: 'earning', label: 'بدل مواصلات', date: null, detail: '', amount: p.allowances.transport })
  if (p.allowances.food) rows.push({ section: 'earning', label: 'بدل طعام', date: null, detail: '', amount: p.allowances.food })
  for (const d of p.overtime.days) rows.push({ section: 'earning', label: 'أوفر تايم', date: d.date, detail: `${fmtDuration(d.minutes)} × ${p.overtime.hourRate} للساعة`, amount: d.pay })

  for (const l of p.latePenalties) rows.push({ section: 'deduction', label: 'غرامة تأخير', date: l.date, detail: `تأخير ${fmtDuration(l.minutes)}`, amount: l.amount })
  for (const d of p.deductions) {
    if (d.source === 'cashier_deficit') {
      const df = deficitParts(d.reason)
      rows.push({ section: 'deduction', label: 'عجز إقفال الكاشير', date: df?.date || isoDay(d.date), detail: df?.reason || '', amount: d.amount })
    } else if (d.source === 'late_bundle') {
      rows.push({ section: 'deduction', label: 'غرامات تأخير (مجمّعة)', date: isoDay(d.date), detail: d.reason || '', amount: d.amount })
    } else {
      rows.push({ section: 'deduction', label: 'خصم إداري', date: isoDay(d.date), detail: d.reason || '', amount: d.amount })
    }
  }
  for (const a of p.advances) rows.push({ section: 'deduction', label: 'سلفة', date: isoDay(a.date), detail: a.reason || '', amount: a.amount })

  for (const d of p.pendingDeficits) rows.push({ section: 'pending', label: 'عجز كاشير بانتظار القرار', date: d.date, detail: d.reason || '', amount: d.amount })
  for (const a of p.pendingAdvances) rows.push({ section: 'pending', label: 'طلب سلفة بانتظار القرار', date: isoDay(a.date), detail: '', amount: a.amount })

  // داخل كل قسم: البنود الثابتة أول ثم حسب التاريخ
  const order = { earning: 0, deduction: 1, pending: 2 }
  return rows.map((r, i) => ({ r, i })).sort((a, b) =>
    order[a.r.section] - order[b.r.section] || (a.r.date ? 1 : 0) - (b.r.date ? 1 : 0) || String(a.r.date).localeCompare(String(b.r.date)) || a.i - b.i
  ).map(x => x.r)
}
