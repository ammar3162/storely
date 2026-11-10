'use client'
import { useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { colors, radius } from '@/lib/ds'
import { invoicesLabel, staffLabel, taxInvoices, vatReturn, payrollName } from '@/lib/accountantExport'
import { fileLink } from '@/lib/invoiceUrl'

// عرض تقرير المحاسب — صفحة الرابط وبوابة المحاسب تستخدمه
// only: البوابة تعرض كل تبويب بأقسامه (المبيعات، المشتريات…)؛ صفحة الرابط تعرض الكل
export type ReportBlock = 'sales' | 'tax_invoices' | 'purchases' | 'vat' | 'payables' | 'payroll' | 'expenses' | 'cash_diff' | 'stock'
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const DECISION: Record<string, string> = { pending: 'بانتظار قرار المالك', approved: 'خُصم من الموظف', rejected: 'لم يُخصم' }

// wide = بعرض الصفحة (الجداول الكبيرة)؛ الباقي عمودين على الشاشات العريضة
function Card({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={wide ? 'rv-wide' : undefined} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18, minWidth: 0 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: colors.text, margin: '0 0 12px' }}>{title}</h2>
      {children}
    </section>
  )
}
// أرقام القسم كبلاطات جنب بعض (العنوان فوق والرقم تحته) — أوضح من سطور ممدودة بعرض الشاشة
function Lines({ rows }: { rows: [string, number, boolean?][] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
      {rows.map(([k, v, strong]) => (
        <div key={k} style={{ borderRadius: 12, padding: '10px 12px', background: strong ? colors.primaryLight : '#fff', border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 12, color: colors.text3, fontWeight: 600 }}>{k}</div>
          <div dir="ltr" style={{ fontSize: strong ? 19 : 16, fontWeight: 700, color: colors.text, marginTop: 3, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{fmt(v)}</div>
        </div>
      ))}
    </div>
  )
}
function Table({ head, rows, moneyCols = [], limit = 25 }: { head: string[]; rows: (string | number | React.ReactNode)[][]; moneyCols?: number[]; limit?: number }) {
  const [all, setAll] = useState(false)
  if (!rows.length) return <div style={{ fontSize: 13, color: colors.text3, padding: '10px 0' }}>لا توجد بيانات لهذه الفترة</div>
  const shown = all ? rows : rows.slice(0, limit)
  return (
    <div style={{ marginTop: 12, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="rv-t" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
          <thead><tr>{head.map((h, i) => <th key={i} style={{ textAlign: moneyCols.includes(i) ? 'left' : 'right', padding: '9px 10px', background: '#F6F8F9', color: colors.text3, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', borderBottom: `1px solid ${colors.border}` }}>{h}</th>)}</tr></thead>
          <tbody>{shown.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} dir={moneyCols.includes(j) ? 'ltr' : undefined} style={{ padding: '9px 10px', borderBottom: i === shown.length - 1 ? 'none' : `1px solid ${colors.border}`, textAlign: moneyCols.includes(j) ? 'left' : 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: moneyCols.includes(j) || j === 0 ? 'nowrap' : undefined }}>{moneyCols.includes(j) ? fmt(Number(c)) : c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {rows.length > limit && <button onClick={() => setAll(a => !a)} style={{ width: '100%', padding: 10, border: 'none', borderTop: `1px solid ${colors.border}`, background: '#fff', color: colors.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        {all ? 'عرض أقل' : `عرض الكل (${rows.length})`}</button>}
    </div>
  )
}

// شارة التعديل جنب التاريخ: «معدّل من المحاسب» أو «معدّل من المنشأة»
function Edited({ date, src }: { date: string; src?: string | null }) {
  if (!src) return <>{date}</>
  const acc = src === 'accountant'
  return <>{date}<div style={{ marginTop: 3 }}><span style={{ fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap',
    color: acc ? '#7c3aed' : colors.warning, background: acc ? '#f5f3ff' : colors.warningLight }}>{acc ? 'معدّل من المحاسب' : 'معدّل من المنشأة'}</span></div></>
}
const editBtn = (onClick: () => void) => <button onClick={onClick} style={{ fontSize: 12, fontWeight: 600, color: colors.primary, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>تعديل</button>

export default function AccountantReportView({ data, downloadHref, kicker = 'تقرير المحاسب', onRequest, onRequestMissing, hideHeader, onEditClosing, onEditPurchase, only, startMissing, onShowMissing, onBulkEdit }: { data: any; downloadHref: string; kicker?: string; onRequest?: (inv: any) => void; onRequestMissing?: (invs: any[]) => void; hideHeader?: boolean
  only?: ReportBlock[]; startMissing?: boolean; onShowMissing?: () => void
  onBulkEdit?: (ids: string[], fields: { has_vat?: boolean; supplier_vat_number?: string; supplier?: string }) => Promise<{ success?: boolean; error?: string; changed?: number }>
  onEditClosing?: (c: any) => void; onEditPurchase?: (t: { id: string; mode: 'invoice' | 'line'; label: string; amount?: number; hasVat?: boolean; invoiceNumber?: string | null; supplierVat?: string | null }) => void }) {
  const r = data.report, t = data.totals
  // «اعرض الناقصة»: من تنبيه الإقرار ينزل لجدول الفواتير الضريبية ويعرض الناقصة بس
  const [onlyMissing, setOnlyMissing] = useState(!!startMissing)
  const allTax = taxInvoices(r.purchases)
  const missing = allTax.filter(i => !i.complete)
  const showMissing = onShowMissing || (() => { setOnlyMissing(true); requestAnimationFrame(() => document.getElementById('rv-tax')?.scrollIntoView({ behavior: 'smooth', block: 'start' })) })
  const show = (b: ReportBlock) => !only || only.includes(b)
  const has = (s: string) => r.sections.includes(s) && show(s as ReportBlock)
  const multi = !r.branchName
  const diffs = r.closings.filter((c: any) => c.difference !== 0)
  // تحديد سطور المشتريات للتعديل الجماعي
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const selectable = onBulkEdit ? (r.purchases as any[]).filter(p => p.id).map(p => p.id as string) : []
  const toggle = (id: string) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  async function bulkVat(has_vat: boolean) {
    if (!onBulkEdit || !sel.size) return
    if (!window.confirm(`سنجعل ${sel.size} سطر ${has_vat ? 'عليها ضريبة 15٪' : 'بدون ضريبة'}. يصل إلى المنشأة إشعار ويمكنها التراجع. متابعة؟`)) return
    setBulkBusy(true); const j = await onBulkEdit([...sel], { has_vat }); setBulkBusy(false)
    if (!j.success || j.error) { window.alert(j.error || 'تعذر حفظ التعديل'); return }
    setSel(new Set())
  }
  const check = (on: boolean, onChange: () => void, label: string) => <input type="checkbox" checked={on} onChange={onChange} onClick={e => e.stopPropagation()} aria-label={label} style={{ width: 16, height: 16, accentColor: colors.primary, cursor: 'pointer' }} />

  return (<>
    <style>{'.rv-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}@media(min-width:1100px){.rv-grid:not(.rv-one){grid-template-columns:repeat(2,minmax(0,1fr))}.rv-wide{grid-column:1/-1}}'}</style>
    {!hideHeader && <header style={{ background: colors.primary, color: '#fff', borderRadius: radius.xl, padding: '20px 22px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 12, opacity: .85 }}>{kicker}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0' }}>{r.orgName}</h1>
        <div style={{ fontSize: 13, opacity: .9 }}>{r.label} · {r.branchName || 'كل الفروع'} · العملة {r.currency}</div>
      </div>
      <a href={downloadHref}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: colors.primary, fontWeight: 800, fontSize: 14, padding: '11px 18px', borderRadius: 12, textDecoration: 'none' }}>
        <FileSpreadsheet size={18} /> تحميل ملف الإكسل <Download size={15} />
      </a>
    </header>}

    {/* داخل تبويبات البوابة: كل بطاقة بعرض الصفحة */}
    <div className={only ? 'rv-grid rv-one' : 'rv-grid'}>
    {has('sales') && <Card wide title="المبيعات">
      <Lines rows={[['إجمالي المبيعات', t.sales, true], ['مدى', t.mada], ['فيزا', t.visa], ['ماستركارد', t.mastercard], ...(t.delivery > 0 ? [['تطبيقات التوصيل', t.delivery] as [string, number]] : []), ['الكاش', t.cash]]} />
      <Table head={['التاريخ', ...(multi ? ['الفرع'] : []), 'الكاشير', 'المبيعات', 'الشبكة', ...(t.delivery > 0 ? ['التوصيل'] : []), 'الكاش', ...(onEditClosing ? [''] : [])]}
        moneyCols={(multi ? [3, 4, 5] : [2, 3, 4]).concat(t.delivery > 0 ? [multi ? 6 : 5] : [])}
        rows={r.closings.map((c: any) => [<Edited key="d" date={c.date} src={c.editedSource} />, ...(multi ? [c.branch] : []), c.staff || '—', c.sales, c.network, ...(t.delivery > 0 ? [c.delivery || 0] : []), c.cash,
          ...(onEditClosing && c.id ? [editBtn(() => onEditClosing(c))] : onEditClosing ? [''] : [])])} />
    </Card>}

    {(r.sections.includes('purchases') || r.sections.includes('vat')) && show('tax_invoices') && r.vatRegistered && <div id="rv-tax" className="rv-wide" style={{ scrollMarginTop: 16 }}><Card wide title={`الفواتير الضريبية (${invoicesLabel(t.taxInvoices)})`}>
      {t.taxInvoices > 0 && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: t.taxInvoices === t.taxComplete ? '#059669' : '#b45309' }}>
        {t.taxInvoices === t.taxComplete ? 'كل الفواتير مكتملة البيانات' : `${t.taxInvoices - t.taxComplete} ناقصة — تحتاج الرقم الضريبي أو رقم الفاتورة قبل الإقفال`}
        {t.taxVerified > 0 && <span style={{ color: '#059669' }}> · {t.taxVerified} موثقة من باركود الهيئة</span>}
      </div>}
      {t.taxMismatch > 0 && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#dc2626' }}>{t.taxMismatch} فاتورة مبلغها المسجّل أكبر من الأصلية — راجعها</div>}
      {onBulkEdit && <SupplierVatFix invoices={missing} onApply={(ids, vat, supplier) => onBulkEdit(ids, { supplier_vat_number: vat, supplier })} />}
      {onlyMissing && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', marginTop: 6 }}>
        يتم عرض الفواتير الناقصة فقط ({missing.length})
        {onRequestMissing && missing.length > 0 && <button onClick={() => onRequestMissing(missing)} style={btn(true)}>اطلب من المنشأة إكمالها</button>}
        <button onClick={() => setOnlyMissing(false)} style={btn(false)}>اعرض الكل</button>
      </div>}
      <Table head={['التاريخ', 'رقم الفاتورة', 'المورد', 'الرقم الضريبي', 'الضريبة', 'الإجمالي', 'الحالة', 'الفاتورة', ...(onRequest ? [''] : []), ...(onEditPurchase ? [''] : [])]} moneyCols={[4, 5]}
        rows={(onlyMissing ? missing : allTax).map(i => [<Edited key="d" date={i.date} src={i.editedSource} />, <span key="n" style={{ whiteSpace: 'nowrap' }}>{i.invoiceNumber || '—'}</span>, i.supplier || '—', <span key="v" dir="ltr" style={{ whiteSpace: 'nowrap' }}>{i.supplierVat || '—'}</span>, i.vat, i.total,
          <Pill key="s" bad={i.mismatch || !i.complete}>{(i.mismatch ? 'أكبر من الأصلية · ' : '') + (!i.complete ? `ينقصها ${i.missing.filter(m => m !== 'صورة الفاتورة').join(' و')}` : i.verified ? 'موثقة' : 'مكتملة')}</Pill>,
          i.invoiceUrl && /^https:\/\//.test(i.invoiceUrl) ? <a href={fileLink(i.invoiceUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>عرض</a> : '—',
          ...(onRequest ? [<button key="rq" onClick={() => onRequest(i)} style={{ fontSize: 12, fontWeight: 600, color: colors.primary, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>اطلب</button>] : []), ...(onEditPurchase ? [i.firstId ? editBtn(() => onEditPurchase({ id: i.firstId!, mode: 'invoice', label: `${i.supplier || '—'} · ${i.date}`, invoiceNumber: i.invoiceNumber, supplierVat: i.supplierVat })) : ''] : [])])} />
    </Card></div>}

    {has('purchases') && <Card wide title={`المشتريات (${invoicesLabel(t.invoices)})`}>
      <Lines rows={[['قبل الضريبة', t.purNet], ['الضريبة', t.purVat], ['الإجمالي', t.purTotal, true], ['منها آجلة', t.purUnpaid]]} />
      {onBulkEdit && selectable.length > 0 && <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: colors.text3, fontSize: 13, marginTop: 12 }}>
        {check(sel.size > 0 && sel.size === selectable.length, () => setSel(sel.size === selectable.length ? new Set() : new Set(selectable)), 'تحديد الكل')}
        {sel.size ? `تم تحديد ${sel.size} من ${selectable.length}` : 'حدد سطوراً لتعديلها دفعة واحدة'}
      </label>}
      {/* شريط التعديل الجماعي يطفو أسفل الشاشة ما دام فيه تحديد */}
      {sel.size > 0 && <div role="toolbar" aria-label="تعديل جماعي" style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
        background: colors.primary, color: '#fff', borderRadius: 14, padding: '10px 14px', boxShadow: '0 12px 32px rgba(15,23,42,.25)', maxWidth: 'calc(100vw - 32px)', fontSize: 13 }}>
        <span style={{ fontWeight: 600, marginInlineEnd: 4 }}>تم تحديد {sel.size}</span>
        <button disabled={bulkBusy} onClick={() => bulkVat(false)} style={barBtn}>اجعلها بدون ضريبة</button>
        <button disabled={bulkBusy} onClick={() => bulkVat(true)} style={barBtn}>اجعلها عليها ضريبة</button>
        <button onClick={() => setSel(new Set())} style={{ ...barBtn, background: 'transparent', border: 'none' }}>إلغاء</button>
      </div>}
      <Table head={[...(onBulkEdit ? [''] : []), 'التاريخ', ...(multi ? ['الفرع'] : []), 'المورد', 'الصنف', 'قبل الضريبة', 'الضريبة', 'الإجمالي', 'الدفع', ...(onEditPurchase ? [''] : [])]} moneyCols={(multi ? [4, 5, 6] : [3, 4, 5]).map(x => x + (onBulkEdit ? 1 : 0))}
        rows={r.purchases.map((p: any) => [...(onBulkEdit ? [p.id ? check(sel.has(p.id), () => toggle(p.id), `تحديد ${p.name}`) : ''] : []), <Edited key="d" date={p.date} src={p.editedSource} />, ...(multi ? [p.branch] : []), p.supplier || '—', p.name, p.net, p.vat, p.total, p.paid ? 'مدفوعة' : 'آجلة',
          ...(onEditPurchase ? [p.id ? editBtn(() => onEditPurchase({ id: p.id, mode: 'line', label: `${p.supplier || '—'} · ${p.name}`, amount: p.net, hasVat: p.hasVat !== false && p.vat > 0, invoiceNumber: p.invoiceNumber, supplierVat: p.supplierVat })) : ''] : [])])} />
    </Card>}

    {has('vat') && <Card wide title="الإقرار الضريبي — ضريبة القيمة المضافة">
      {r.vatRegistered ? <VatReturnView r={r} onShowMissing={showMissing} onRequestMissing={onRequestMissing ? () => onRequestMissing(missing) : undefined} /> : <div style={{ fontSize: 13, color: colors.text3 }}>المنشأة غير مسجلة في ضريبة القيمة المضافة.</div>}
    </Card>}

    {has('payables') && <Card title="الموردين الآجلين">
      <Lines rows={[['إجمالي المستحق للموردين', t.payablesTotal, true]]} />
      <Table head={['المورد', 'عدد الفواتير', 'أقدم فاتورة', 'أقرب استحقاق', 'المبلغ']} moneyCols={[4]}
        rows={r.payables.map((p: any) => [p.supplier, p.invoices, p.oldest, p.nextDue || '—', p.total])} />
    </Card>}

    {has('payroll') && r.payroll && <Card wide title={`الرواتب (${staffLabel(r.payroll.length)})`}>
      <Lines rows={[['إجمالي الرواتب', t.payrollGross], ['صافي الرواتب', t.payrollNet, true]]} />
      <Table head={['الموظف', 'الإجمالي', 'الإضافي', 'مكافآت', 'خصومات', 'سلف', 'الصافي']} moneyCols={[1, 2, 3, 4, 5, 6]}
        rows={r.payroll.map((p: any) => [payrollName(p), p.gross, p.overtime, p.bonuses, p.deductions, p.advances, p.net])} />
    </Card>}

    {has('expenses') && <Card title="المصروفات من الدرج">
      <Lines rows={[['الإجمالي', t.expenses, true]]} />
      <Table head={['التاريخ', ...(multi ? ['الفرع'] : []), 'الموظف', 'البند', 'المبلغ', ...(onEditClosing ? [''] : [])]} moneyCols={multi ? [4] : [3]}
        rows={r.expenses.map((e: any) => [<Edited key="d" date={e.date} src={e.editedSource} />, ...(multi ? [e.branch] : []), e.staff || '—', e.item, e.amount,
          ...(onEditClosing ? [(() => { const c = r.closings.find((x: any) => x.id && x.id === e.closingId); return c ? editBtn(() => onEditClosing(c)) : '' })()] : [])])} />
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

    </div>
  </>)
}

// نفس خانات نموذج الإقرار في بوابة الهيئة — المحاسب ينقل الأرقام مباشرة
function VatReturnView({ r, onShowMissing, onRequestMissing }: { r: any; onShowMissing?: () => void; onRequestMissing?: () => void }) {
  const v = vatReturn(r)
  const cell = (x: number | null) => x == null ? <span style={{ color: colors.text4 }}>—</span> : fmt(x)
  const due = v.netDue
  return <>
    <Lines rows={[['ضريبة المبيعات (خانة ٦)', v.boxes.find(b => b.no === 6)?.vat || 0], ['ضريبة المشتريات القابلة للخصم (خانة ١٢)', v.boxes.find(b => b.no === 12)?.vat || 0],
      [due >= 0 ? 'صافي الضريبة المستحقة (خانة ١٦)' : 'ضريبة مستردة (خانة ١٦)', Math.abs(due), true]]} />
    {v.deadline && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: colors.warning, background: colors.warningLight, borderRadius: 10, padding: '8px 12px' }}>
      آخر موعد لتقديم الإقرار وسداد الضريبة: {new Date(`${v.deadline}T12:00:00Z`).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
    <div style={{ overflowX: 'auto', marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 560 }}>
        <thead><tr>{['الخانة', 'البند', 'المبلغ (⃁)', 'التعديلات', 'ضريبة القيمة المضافة'].map(h =>
          <th key={h} style={{ textAlign: 'right', padding: '9px 10px', background: '#F6F8F9', color: colors.text3, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
        <tbody>{v.boxes.map(b => (
          <tr key={b.no} style={{ background: b.total ? '#f8fafc' : undefined, fontWeight: b.total ? 800 : 400 }}>
            <td style={{ padding: '7px 8px', borderBottom: `1px solid ${colors.border}`, textAlign: 'center', fontWeight: 700, color: colors.text3 }}>{b.no}</td>
            <td style={{ padding: '7px 8px', borderBottom: `1px solid ${colors.border}` }}>{b.label}</td>
            {[b.amount, b.adjust, b.vat].map((x, k) => <td key={k} dir="ltr" style={{ padding: '7px 8px', borderBottom: `1px solid ${colors.border}`, textAlign: 'left', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{cell(x)}</td>)}
          </tr>))}</tbody>
      </table>
    </div>
    <div style={{ display: 'grid', gap: 6, marginTop: 12, fontSize: 12, color: colors.text3, lineHeight: 1.7 }}>
      <div>«—» تعني أن النظام لا يسجّل هذا البند — عبّئه من سجلاتك إن وُجد.</div>
      {v.hidden.length > 0 && <div>الخانات {v.hidden.join(' و')} لا تخص المطاعم والمقاهي — مخفية، وتبقى فارغة في نموذج الهيئة.</div>}
      {v.review.count > 0 && <div style={{ color: colors.danger, fontWeight: 700, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px' }}>
        {invoicesLabel(v.review.count)} فيها ضريبة <span dir="ltr">{fmt(v.review.vat)}</span> لم تدخل الخانة 7 لنقص الرقم الضريبي أو رقم الفاتورة.
        {(onShowMissing || onRequestMissing) && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {onShowMissing && <button onClick={onShowMissing} style={btn(false)}>اعرض الفواتير الناقصة</button>}
          {onRequestMissing && <button onClick={onRequestMissing} style={btn(true)}>اطلب من المنشأة إكمالها</button>}
        </div>}
      </div>}
      {v.nonVat.count > 0 && <div>مشتريات بدون ضريبة: {invoicesLabel(v.nonVat.count)} بـ <span dir="ltr">{fmt(v.nonVat.total)}</span> — حدد ما إذا كانت تدخل الخانة 10 أو 11 أو خارج النطاق.</div>}
      {v.drawerExpenses > 0 && <div>مصروفات من درج الكاشير <span dir="ltr">{fmt(v.drawerExpenses)}</span> — دون فواتير ضريبية، فلم تدخل الإقرار.</div>}
      <div style={{ color: colors.text4 }}>المبيعات من إقفالات الكاشير (شاملة ضريبة ١٥٪) والمشتريات من الفواتير المسجلة — راجعها قبل التقديم.</div>
    </div>
  </>
}

// «أكمل الرقم الضريبي للمورد»: كل مورد فواتيره بدون رقم ضريبي في سطر — يكتبه مرة وينطبق على كل فواتيره (ويُحفظ للمورد)
function SupplierVatFix({ invoices, onApply }: { invoices: any[]; onApply: (ids: string[], vat: string, supplier: string) => Promise<{ success?: boolean; error?: string; changed?: number }> }) {
  const groups = new Map<string, string[]>()
  for (const i of invoices) if (i.supplier && i.firstId && i.missing.includes('الرقم الضريبي للمورد')) groups.set(i.supplier, [...(groups.get(i.supplier) || []), i.firstId])
  const [vals, setVals] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(''), [msg, setMsg] = useState<Record<string, string>>({})
  if (!groups.size) return null
  async function apply(sup: string, ids: string[]) {
    const v = (vals[sup] || '').replace(/\s/g, '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    if (!/^3\d{13}3$/.test(v)) { setMsg(m => ({ ...m, [sup]: 'يتكون من 15 رقماً ويبدأ وينتهي بالرقم 3' })); return }
    setBusy(sup); setMsg(m => ({ ...m, [sup]: '' }))
    const j = await onApply(ids, v, sup); setBusy('')
    if (!j.success || j.error) setMsg(m => ({ ...m, [sup]: j.error || 'تعذر الحفظ' }))
  }
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, marginTop: 10, marginBottom: 4 }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${colors.border}`, fontSize: 13, fontWeight: 600 }}>أكمل الرقم الضريبي للموردين
        <span style={{ fontWeight: 400, color: colors.text3 }}> — اكتبه مرة واحدة لكل مورد، فيُطبَّق على كل فواتيره ويُحفظ للفواتير القادمة</span></div>
      {[...groups].map(([sup, ids], k) => (
        <div key={sup} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px', borderTop: k ? `1px solid ${colors.border}` : 'none' }}>
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{sup}</div>
            <div style={{ fontSize: 12, color: colors.text3 }}>{ids.length === 1 ? 'فاتورة واحدة' : ids.length === 2 ? 'فاتورتان' : `${ids.length} ${ids.length <= 10 ? 'فواتير' : 'فاتورة'}`} بدون رقم ضريبي</div>
            {msg[sup] && <div style={{ fontSize: 12, color: '#B42318', marginTop: 2 }}>{msg[sup]}</div>}
          </div>
          <input value={vals[sup] || ''} onChange={e => setVals(v => ({ ...v, [sup]: e.target.value }))} inputMode="numeric" dir="ltr" placeholder="3XXXXXXXXXXXXX3" aria-label={`الرقم الضريبي ${sup}`}
            onKeyDown={e => e.key === 'Enter' && apply(sup, ids)}
            style={{ width: 190, padding: '8px 10px', borderRadius: 9, border: `1px solid ${colors.border}`, fontSize: 16, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
          <button disabled={busy === sup} onClick={() => apply(sup, ids)} style={btn(true)}>{busy === sup ? 'جاري الحفظ...' : 'طبّق على الكل'}</button>
        </div>
      ))}
    </div>
  )
}

// حالة الفاتورة: أحمر للناقصة، أخضر للمكتملة
function Pill({ bad, children }: { bad: boolean; children: React.ReactNode }) {
  return <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, borderRadius: 99, padding: '2px 9px', background: bad ? '#FEF3F2' : '#ECFDF3', color: bad ? '#B42318' : '#067647', lineHeight: 1.6 }}>{children}</span>
}

const barBtn: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', borderRadius: 9, padding: '7px 12px', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.1)', color: '#fff' }

// زر صغير لتنبيهات التقرير — أساسي (تعبئة) أو ثانوي (حد)
function btn(primary: boolean): React.CSSProperties {
  return { fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', borderRadius: 9, padding: '6px 12px', whiteSpace: 'nowrap',
    border: `1px solid ${primary ? colors.primary : colors.border}`, background: primary ? colors.primary : '#fff', color: primary ? '#fff' : colors.primary }
}
