import { brandEmail, esc, sar } from '@/lib/emailTemplates'
import { summarize, deficitDecisionLabel, type AccountantReport } from '@/lib/accountantExport'

// رسائل تقرير المحاسب: إيميل مرتب (ملخص + جداول مختصرة + الملف مرفق) ورسالة واتساب قصيرة برابط

const C = { brand: '#029FA2', ink: '#0f172a', muted: '#64748b', line: '#e2e8f0', soft: '#f8fafc' }
const money = (v: number) => `<td style="padding:7px 0;font-size:13px;text-align:left;white-space:nowrap;font-weight:bold" dir="ltr">${esc(sar(v))}</td>`

function block(title: string, rows: [string, number, boolean?][], extra = '') {
  return `<tr><td style="padding:12px 28px 4px">
    <div style="font-size:13px;font-weight:bold;color:${C.brand};margin-bottom:6px">${esc(title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};border:1px solid ${C.line};border-radius:12px;padding:6px 14px">
      ${rows.map(([k, v, strong]) => `<tr><td style="padding:7px 0;font-size:13px;color:${strong ? C.ink : '#334155'};${strong ? 'font-weight:bold' : ''}">${esc(k)}</td>${money(v)}</tr>`).join('')}
    </table>${extra}</td></tr>`
}
function miniTable(head: string[], rows: string[][], more: number) {
  if (!rows.length) return ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;font-size:12px">
    <tr>${head.map((h, i) => `<td style="color:${C.muted};padding:4px 0;border-bottom:1px solid ${C.line};${i === head.length - 1 ? 'text-align:left' : ''}">${esc(h)}</td>`).join('')}</tr>
    ${rows.map(r => `<tr>${r.map((c, i) => `<td style="padding:5px 0;border-bottom:1px solid ${C.line};${i === r.length - 1 ? 'text-align:left;white-space:nowrap' : ''}" ${i === r.length - 1 ? 'dir="ltr"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}
    ${more > 0 ? `<tr><td colspan="${head.length}" style="padding:6px 0;color:${C.muted}">و${more} غيرها في الملف المرفق</td></tr>` : ''}
  </table>`
}

export function accountantEmail(r: AccountantReport, o: { accountantName: string; reportUrl: string; isTest?: boolean }) {
  const t = summarize(r)
  const has = (s: string) => r.sections.includes(s as any)
  let html = ''
  if (has('sales')) html += block('المبيعات', [['إجمالي المبيعات', t.sales, true], ['الشبكة', t.network], ['الكاش', t.cash]])
  if (has('purchases')) html += block(`المشتريات (${t.invoices} فاتورة)`, [['قبل الضريبة', t.purNet], ['الضريبة', t.purVat], ['الإجمالي', t.purTotal, true], ['منها آجلة', t.purUnpaid]])
  if (has('vat')) html += r.vatRegistered
    ? block('ضريبة القيمة المضافة', [['ضريبة المبيعات', t.outputVat], ['ضريبة المشتريات', t.inputVat], ['صافي الضريبة المستحقة', t.vatNet, true]])
    : `<tr><td style="padding:12px 28px 4px;font-size:12px;color:${C.muted}">المنشأة غير مسجلة في ضريبة القيمة المضافة.</td></tr>`
  if (has('payables')) html += block('الموردين الآجلين', [['إجمالي المستحق', t.payablesTotal, true]],
    miniTable(['المورد', 'فواتير', 'المبلغ'], r.payables.slice(0, 5).map(p => [p.supplier, String(p.invoices), sar(p.total)]), r.payables.length - 5))
  if (has('payroll') && r.payroll) html += block(`الرواتب (${r.payroll.length} موظف)`, [['إجمالي الرواتب', t.payrollGross], ['صافي الرواتب', t.payrollNet, true]])
  if (has('expenses')) html += block('المصروفات من الدرج', [['الإجمالي', t.expenses, true]])
  if (has('cash_diff')) {
    const diffs = r.closings.filter(c => c.difference !== 0)
    html += block('فروقات الكاشير', [['العجز', t.deficit], ['الزيادة', t.surplus]],
      miniTable(['التاريخ', 'السبب', 'المبلغ'], diffs.slice(0, 5).map(c => [c.date, c.difference < 0 ? `عجز${c.deficitReason ? ' — ' + c.deficitReason : ''}${c.deficitDecision ? ' (' + deficitDecisionLabel(c.deficitDecision) + ')' : ''}` : 'زيادة', sar(Math.abs(c.difference))]), diffs.length - 5))
  }
  if (has('stock')) html += block('المخزون', [['قيمة المخزون الحالية', t.stockValue, true]])

  return {
    subject: `${o.isTest ? '[تجربة] ' : ''}تقرير ${r.orgName} — ${r.label}`,
    html: brandEmail({
      title: `تقرير ${r.label}`,
      preheader: `تقرير ${r.orgName} المحاسبي — ${r.label}`,
      eyebrow: r.orgName + (r.branchName ? ` · ${r.branchName}` : ''),
      headerSide: { title: 'تقرير المحاسب', sub: `${r.period.start} → ${r.period.end}` },
      greeting: `هلا ${o.accountantName}،`,
      paragraphs: [`هذا تقرير ${r.orgName} عن ${r.label}، والتفاصيل كاملة في ملف الإكسل المرفق.`],
      rawSections: html,
      button: { label: 'عرض التقرير كامل', url: o.reportUrl },
      note: o.isTest ? 'هذي رسالة تجربة أرسلها المالك عشان يتأكد إن الربط شغال.' : undefined,
      small: 'يوصلك هذا التقرير تلقائياً لأن المنشأة أضافتك محاسباً لها في Storely. للإيقاف تواصل مع المنشأة.',
    }),
  }
}

export function accountantWhatsapp(r: AccountantReport, o: { accountantName: string; reportUrl: string; isTest?: boolean }) {
  const t = summarize(r)
  const has = (s: string) => r.sections.includes(s as any)
  const L = [`${o.isTest ? '*[تجربة]* ' : ''}📊 *تقرير ${r.orgName}*${r.branchName ? ` — ${r.branchName}` : ''}`, `الفترة: ${r.label}`, '']
  if (has('sales')) L.push(`المبيعات: *${sar(t.sales)}*`)
  if (has('purchases')) L.push(`المشتريات: *${sar(t.purTotal)}* (${t.invoices} فاتورة)`)
  if (has('vat') && r.vatRegistered) L.push(`صافي الضريبة المستحقة: *${sar(t.vatNet)}*`)
  if (has('payables')) L.push(`المستحق للموردين: *${sar(t.payablesTotal)}*`)
  if (has('payroll') && r.payroll) L.push(`صافي الرواتب: *${sar(t.payrollNet)}*`)
  if (has('expenses')) L.push(`المصروفات: *${sar(t.expenses)}*`)
  if (has('cash_diff') && (t.deficit || t.surplus)) L.push(`فروقات الكاشير: عجز ${sar(t.deficit)} · زيادة ${sar(t.surplus)}`)
  if (has('stock')) L.push(`قيمة المخزون: *${sar(t.stockValue)}*`)
  L.push('', 'التقرير كامل وملف الإكسل:', o.reportUrl, '', '_الرابط صالح ٧ أيام — من Storely_')
  return L.join('\n')
}
