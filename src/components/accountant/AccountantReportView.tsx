'use client'
import { Download, FileSpreadsheet } from 'lucide-react'
import { colors, radius } from '@/lib/ds'
import { invoicesLabel, staffLabel, taxInvoices } from '@/lib/accountantExport'

// عرض تقرير المحاسب — صفحة الرابط وبوابة المحاسب تستخدمه
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const DECISION: Record<string, string> = { pending: 'بانتظار قرار المالك', approved: 'خُصم من الموظف', rejected: 'ما انخصم' }

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 18, marginBottom: 14 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: colors.primary, margin: '0 0 12px' }}>{title}</h2>
      {children}
    </section>
  )
}
function Lines({ rows }: { rows: [string, number, boolean?][] }) {
  return (
    <div>
      {rows.map(([k, v, strong]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 13.5, fontWeight: strong ? 800 : 500, color: strong ? colors.text : colors.text2 }}>
          <span>{k}</span><span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</span>
        </div>
      ))}
    </div>
  )
}
function Table({ head, rows, moneyCols = [] }: { head: string[]; rows: (string | number | React.ReactNode)[][]; moneyCols?: number[] }) {
  if (!rows.length) return <div style={{ fontSize: 12.5, color: colors.text4, padding: '8px 0' }}>ما فيه بيانات لهذي الفترة</div>
  return (
    <div style={{ overflowX: 'auto', marginTop: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 420 }}>
        <thead><tr>{head.map((h, i) => <th key={i} style={{ textAlign: 'right', padding: '7px 8px', background: colors.primaryLight, color: colors.primaryDark, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} dir={moneyCols.includes(j) ? 'ltr' : undefined} style={{ padding: '7px 8px', borderBottom: `1px solid ${colors.border}`, textAlign: moneyCols.includes(j) ? 'left' : 'right', whiteSpace: moneyCols.includes(j) ? 'nowrap' : undefined }}>{moneyCols.includes(j) ? fmt(Number(c)) : c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export default function AccountantReportView({ data, downloadHref, kicker = 'تقرير المحاسب' }: { data: any; downloadHref: string; kicker?: string }) {
  const r = data.report, t = data.totals
  const has = (s: string) => r.sections.includes(s)
  const multi = !r.branchName
  const diffs = r.closings.filter((c: any) => c.difference !== 0)

  return (<>
    <header style={{ background: 'linear-gradient(135deg,#029FA2,#0f3f40)', color: '#fff', borderRadius: radius.xl, padding: '20px 22px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 12, opacity: .85 }}>{kicker}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0' }}>{r.orgName}</h1>
        <div style={{ fontSize: 13, opacity: .9 }}>{r.label} · {r.branchName || 'كل الفروع'} · العملة {r.currency}</div>
      </div>
      <a href={downloadHref}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: colors.primary, fontWeight: 800, fontSize: 14, padding: '11px 18px', borderRadius: 12, textDecoration: 'none' }}>
        <FileSpreadsheet size={18} /> تحميل ملف الإكسل <Download size={15} />
      </a>
    </header>

    {has('sales') && <Card title="المبيعات">
      <Lines rows={[['إجمالي المبيعات', t.sales, true], ['مدى', t.mada], ['فيزا', t.visa], ['ماستركارد', t.mastercard], ['الكاش', t.cash]]} />
      <Table head={['التاريخ', ...(multi ? ['الفرع'] : []), 'الكاشير', 'المبيعات', 'الشبكة', 'الكاش']} moneyCols={multi ? [3, 4, 5] : [2, 3, 4]}
        rows={r.closings.map((c: any) => [c.date, ...(multi ? [c.branch] : []), c.staff || '—', c.sales, c.network, c.cash])} />
    </Card>}

    {(has('purchases') || has('vat')) && <Card title={`الفواتير الضريبية (${invoicesLabel(t.taxInvoices)})`}>
      {t.taxInvoices > 0 && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: t.taxInvoices === t.taxComplete ? '#059669' : '#b45309' }}>
        {t.taxInvoices === t.taxComplete ? '✓ كل الفواتير مكتملة البيانات' : `${t.taxInvoices - t.taxComplete} ناقصة — تحتاج الرقم الضريبي أو رقم الفاتورة قبل الإقفال`}
        {t.taxVerified > 0 && <span style={{ color: '#059669' }}> · {t.taxVerified} موثقة من باركود الهيئة</span>}
      </div>}
      {t.taxMismatch > 0 && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#dc2626' }}>⚠️ {t.taxMismatch} فاتورة مبلغها المسجّل أكبر من الأصلية — راجعها</div>}
      <Table head={['التاريخ', 'رقم الفاتورة', 'المورد', 'الرقم الضريبي', 'الضريبة', 'الإجمالي', 'الحالة', 'الفاتورة']} moneyCols={[4, 5]}
        rows={taxInvoices(r.purchases).map(i => [i.date, i.invoiceNumber || '—', i.supplier || '—', i.supplierVat || '—', i.vat, i.total, (i.mismatch ? '⚠️ أكبر من الأصلية · ' : '') + (!i.complete ? `ناقص: ${i.missing.filter(m => m !== 'صورة الفاتورة').join('، ')}` : i.verified ? '✓ موثقة' : '✓ مكتملة'),
          i.invoiceUrl && /^https:\/\//.test(i.invoiceUrl) ? <a href={i.invoiceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>عرض</a> : '—'])} />
    </Card>}

    {has('purchases') && <Card title={`المشتريات (${invoicesLabel(t.invoices)})`}>
      <Lines rows={[['قبل الضريبة', t.purNet], ['الضريبة', t.purVat], ['الإجمالي', t.purTotal, true], ['منها آجلة', t.purUnpaid]]} />
      <Table head={['التاريخ', ...(multi ? ['الفرع'] : []), 'المورد', 'الصنف', 'قبل الضريبة', 'الضريبة', 'الإجمالي', 'الدفع']} moneyCols={multi ? [4, 5, 6] : [3, 4, 5]}
        rows={r.purchases.map((p: any) => [p.date, ...(multi ? [p.branch] : []), p.supplier || '—', p.name, p.net, p.vat, p.total, p.paid ? 'مدفوعة' : 'آجلة'])} />
    </Card>}

    {has('vat') && <Card title="ضريبة القيمة المضافة">
      {r.vatRegistered
        ? <><Lines rows={[['المبيعات قبل الضريبة', t.salesNet], ['ضريبة المبيعات (المخرجات)', t.outputVat], ['ضريبة المشتريات القابلة للخصم', t.inputVatClaimable], ['صافي الضريبة المستحقة', t.vatNet, true],
              ...(t.inputVatReview > 0 ? [['ضريبة بفواتير ناقصة — تحتاج مراجعة', t.inputVatReview] as [string, number]] : [])]} />
            <div style={{ fontSize: 11.5, color: colors.text4, marginTop: 8 }}>تقدير من إقفالات الكاشير وفواتير المشتريات المسجلة — راجعه قبل تقديم الإقرار.</div></>
        : <div style={{ fontSize: 13, color: colors.text3 }}>المنشأة غير مسجلة في ضريبة القيمة المضافة.</div>}
    </Card>}

    {has('payables') && <Card title="الموردين الآجلين">
      <Lines rows={[['إجمالي المستحق للموردين', t.payablesTotal, true]]} />
      <Table head={['المورد', 'عدد الفواتير', 'أقدم فاتورة', 'أقرب استحقاق', 'المبلغ']} moneyCols={[4]}
        rows={r.payables.map((p: any) => [p.supplier, p.invoices, p.oldest, p.nextDue || '—', p.total])} />
    </Card>}

    {has('payroll') && r.payroll && <Card title={`الرواتب (${staffLabel(r.payroll.length)})`}>
      <Lines rows={[['إجمالي الرواتب', t.payrollGross], ['صافي الرواتب', t.payrollNet, true]]} />
      <Table head={['الموظف', 'الإجمالي', 'الإضافي', 'مكافآت', 'خصومات', 'سلف', 'الصافي']} moneyCols={[1, 2, 3, 4, 5, 6]}
        rows={r.payroll.map((p: any) => [p.name, p.gross, p.overtime, p.bonuses, p.deductions, p.advances, p.net])} />
    </Card>}

    {has('expenses') && <Card title="المصروفات من الدرج">
      <Lines rows={[['الإجمالي', t.expenses, true]]} />
      <Table head={['التاريخ', ...(multi ? ['الفرع'] : []), 'الموظف', 'البند', 'المبلغ']} moneyCols={multi ? [4] : [3]} rows={r.expenses.map((e: any) => [e.date, ...(multi ? [e.branch] : []), e.staff || '—', e.item, e.amount])} />
    </Card>}

    {has('cash_diff') && <Card title="فروقات الكاشير">
      <Lines rows={[['العجز', t.deficit], ['الزيادة', t.surplus]]} />
      <Table head={['التاريخ', 'الكاشير', 'النوع', 'السبب', 'القرار', 'المبلغ']} moneyCols={[5]}
        rows={diffs.map((c: any) => [c.date, c.staff || '—', c.difference < 0 ? 'عجز' : 'زيادة', c.deficitReason || '—', c.difference < 0 ? DECISION[c.deficitDecision] || '—' : '—', Math.abs(c.difference)])} />
    </Card>}

    {has('stock') && <Card title="المخزون">
      <Lines rows={[['قيمة المخزون الحالية', t.stockValue, true]]} />
      <Table head={['الصنف', ...(multi ? ['الفرع'] : []), 'الكمية', 'الوحدة', 'متوسط التكلفة', 'القيمة']} moneyCols={multi ? [4, 5] : [3, 4]}
        rows={r.stock.filter((s: any) => s.avgCost != null).map((s: any) => [s.name, ...(multi ? [s.branch] : []), s.qty, s.unit || '', s.avgCost, Math.round(s.qty * s.avgCost * 100) / 100])} />
    </Card>}

  </>)
}
