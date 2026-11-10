'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, FileSpreadsheet, MessageSquarePlus } from 'lucide-react'
import { colors } from '@/lib/ds'
import { PortalShell, PeriodBar, presetRange } from '@/components/accountant/PortalShell'
import AccountantReportView, { type ReportBlock } from '@/components/accountant/AccountantReportView'
import ClientSummary from '@/components/accountant/ClientSummary'
import AccountantRequestsPanel, { RequestDialog, type RequestTarget } from '@/components/accountant/AccountantRequests'
import PortalLocks from '@/components/accountant/PortalLocks'
import CashierClosingEditor from '@/components/CashierClosingEditor'
import PurchaseEditDialog, { type PurchaseEditTarget } from '@/components/accountant/PurchaseEditDialog'

// صفحة منشأة في بوابة المحاسب — بالأقسام اللي سمح فيها المالك، والمحاسب يقدر يعدّل الإقفالات والمصروفات والمشتريات (يطلع «معدّل من المحاسب»)
// تبويبات المنشأة — مثل برامج المحاسبين: ملخص أولاً، وكل قسم في تبويبه بدل صفحة طويلة
type Tab = 'summary' | 'sales' | 'purchases' | 'vat' | 'payroll' | 'stock' | 'requests' | 'locks'
const TAB_KEYS: Tab[] = ['summary', 'sales', 'purchases', 'vat', 'payroll', 'stock', 'requests', 'locks']
const BLOCKS: Partial<Record<Tab, ReportBlock[]>> = { sales: ['sales', 'cash_diff', 'expenses'], purchases: ['tax_invoices', 'purchases', 'payables'], vat: ['vat'], payroll: ['payroll'], stock: ['stock'] }
export default function PortalClientPage() {
  const orgId = useParams().orgId as string
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [tab, setTabState] = useState<Tab>('summary')
  const [missingKey, setMissingKey] = useState(0)   // >0 = افتح المشتريات على الفواتير الناقصة
  const [reqCounts, setReqCounts] = useState({ open: 0, answered: 0 })
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [reqTarget, setReqTarget] = useState<RequestTarget | null | undefined>(undefined)   // undefined = مقفل، null = طلب عام
  const [reqKey, setReqKey] = useState(0)
  const [reload, setReload] = useState(0)
  const [editClosing, setEditClosing] = useState<any>(null)
  const [editPurchase, setEditPurchase] = useState<PurchaseEditTarget | null>(null)

  // الفترة والتبويب من الرابط (بعد التحميل — عشان ما يختلف عن السيرفر)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    setRange(q.get('from') && q.get('to') ? { from: q.get('from')!, to: q.get('to')! } : presetRange('month'))
    const t = q.get('tab') as Tab; if (TAB_KEYS.includes(t)) setTabState(t)
  }, [orgId])
  useEffect(() => {
    if (!range) return
    setData(null); setError('')
    fetch(`/api/accountant-portal/report?org_id=${orgId}&from=${range.from}&to=${range.to}`).then(r => r.json())
      .then(j => j.success ? setData(j) : setError(j.error || 'تعذر التحميل')).catch(() => setError('تأكد من الإنترنت'))
  }, [orgId, range, reload])
  // عدد الطلبات للتبويب والملخص
  useEffect(() => {
    fetch(`/api/accountant-portal/requests?org_id=${orgId}`).then(r => r.json()).then(j => {
      const l = (j.requests || []) as any[]; setReqCounts({ open: l.filter(x => x.status === 'open').length, answered: l.filter(x => x.status === 'answered').length })
    }).catch(() => {})
  }, [orgId, reqKey])
  // التبويب في الرابط — التحديث يرجع لنفس المكان
  function setTab(t: Tab, opts?: { missing?: boolean }) {
    setTabState(t); setMissingKey(opts?.missing ? Date.now() : 0)
    const q = new URLSearchParams(window.location.search); if (t === 'summary') q.delete('tab'); else q.set('tab', t)
    window.history.replaceState(null, '', `${window.location.pathname}${q.toString() ? `?${q}` : ''}`)
  }

  // تعديل المحاسب يتطبّق على طول — بعده نعيد تحميل التقرير
  const sendEdit = (payload: Record<string, unknown>) => fetch('/api/accountant-portal/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, ...payload }) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
  // بيانات الإقفال بنفس شكل محرر الإقفال
  const closingForEditor = (c: any) => ({ id: c.id, staff_name: c.staff, closing_date: c.date, total_sales: c.sales, mada_amount: c.mada, visa_amount: c.visa,
    mastercard_amount: c.mastercard, network_amount: c.network, cash_amount: c.cash, purchases: c.drawer || [], delivery: c.deliveryApps || [],
    deficit_reason: c.deficitReason, deficit_decision: c.deficitDecision, status: c.status })

  const name = data?.report?.orgName || ''
  const xlsx = range ? `/api/accountant-portal/report?org_id=${orgId}&from=${range.from}&to=${range.to}&format=xlsx` : '#'
  const sec: string[] = data?.report?.sections || []
  const vatReg = !!data?.report?.vatRegistered
  const TABS: { k: Tab; l: string; show: boolean; count?: number; hot?: boolean }[] = [
    { k: 'summary', l: 'الملخص', show: true },
    { k: 'sales', l: 'المبيعات والصندوق', show: ['sales', 'cash_diff', 'expenses'].some(x => sec.includes(x)) },
    { k: 'purchases', l: 'المشتريات والموردين', show: sec.includes('purchases') || sec.includes('payables') || (sec.includes('vat') && vatReg) },
    { k: 'vat', l: 'الإقرار الضريبي', show: sec.includes('vat') },
    { k: 'payroll', l: 'الرواتب', show: sec.includes('payroll') },
    { k: 'stock', l: 'المخزون', show: sec.includes('stock') },
    { k: 'requests', l: 'الطلبات', show: true, count: reqCounts.open + reqCounts.answered, hot: reqCounts.answered > 0 },
    { k: 'locks', l: 'إقفال الأشهر', show: true },
  ]
  const dataTab = tab !== 'requests' && tab !== 'locks'

  // طلب واحد لكل فاتورة ناقصة (الرقم الضريبي أو رقم الفاتورة) — المنشأة يوصلها إشعار واحد وتعبّيها من «طلبات المحاسب»
  async function requestMissing(invs: any[]) {
    if (!invs.length || !window.confirm(`سنرسل إلى المنشأة طلباً لإكمال الرقم الضريبي أو رقم الفاتورة لـ ${invs.length === 1 ? 'فاتورة واحدة' : `${invs.length} فواتير`}؟`)) return
    const j = await fetch('/api/accountant-portal/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, targets: invs.map(i => ({ invoice_group: i.group || null, purchase_id: i.firstId || null })) }) })
      .then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    if (j.error) { window.alert(j.error); return }
    if (!j.created) { window.alert('جميع الفواتير الناقصة عليها طلبات مفتوحة مسبقاً — تابعها من «الطلبات»'); setTab('requests'); return }
    window.alert(`أُرسل إلى المنشأة ${j.created === 1 ? 'طلب واحد' : `${j.created} طلبات`}${j.skipped ? ` (${j.skipped} عليها طلب مسبقاً)` : ''} `)
    setReqKey(k => k + 1); setTab('requests')
  }

  return (
    <PortalShell title={name || 'المنشأة'} subtitle={data ? `${data.report.branchName || 'كل الفروع'} · ${data.report.label}` : undefined}
      orgLogo={name ? { name, url: data?.logo_url || null } : undefined}
      actions={data ? <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setReqTarget(null)} className="ap-btn sec" title="طلب للمنشأة"><MessageSquarePlus size={16} /><span className="ap-lbl">طلب للمنشأة</span></button>
        <a href={xlsx} className="ap-btn pri" title="تحميل إكسل"><FileSpreadsheet size={16} /><span className="ap-lbl">تحميل إكسل</span></a>
      </div> : undefined}>

      <nav className="ap-tabs" role="tablist">
        {TABS.filter(t => t.show).map(t => (
          <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)} className={`ap-tab${tab === t.k ? ' on' : ''}`}>
            {t.l}{t.count ? <span className={`ap-count${t.hot ? ' hot' : ''}`}>{t.count}</span> : null}
          </button>
        ))}
      </nav>

      {dataTab && <>
        {range && <PeriodBar from={range.from} to={range.to} onChange={setRange} />}
        {error ? <div style={{ color: colors.danger, fontSize: 14, padding: 20 }}>{error}</div>
          : !data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={24} color={colors.primary} className="spin" /></div>
          : tab === 'summary' ? <ClientSummary data={data} requests={reqCounts} go={(t, o) => setTab(t as Tab, o)} onRequestMissing={requestMissing} />
          : <AccountantReportView key={`${tab}-${missingKey}`} data={data} kicker="بوابة المحاسب" hideHeader downloadHref={xlsx} only={BLOCKS[tab]}
              startMissing={tab === 'purchases' && missingKey > 0} onShowMissing={() => setTab('purchases', { missing: true })}
              onRequest={inv => setReqTarget({ invoice_group: inv.group, purchase_id: inv.firstId, label: `${inv.supplier || '—'} · ${inv.date} · ${Number(inv.total).toFixed(2)}${inv.invoiceNumber ? ` · ${inv.invoiceNumber}` : ''}` })}
              onRequestMissing={requestMissing}
              onEditClosing={c => setEditClosing(closingForEditor(c))} onEditPurchase={setEditPurchase} />}
      </>}
      {tab === 'requests' && <AccountantRequestsPanel orgId={orgId} refreshKey={reqKey} onNew={() => setReqTarget(null)} />}
      {tab === 'locks' && <PortalLocks orgId={orgId} />}

      {editClosing && <CashierClosingEditor orgId={orgId} closing={editClosing} curr={data?.report?.currency || '⃁'} onClose={() => setEditClosing(null)}
        onSaved={() => { setEditClosing(null); setReload(x => x + 1) }}
        submit={payload => sendEdit({ kind: 'closing', id: editClosing.id, total_sales: payload.total_sales, mada_amount: payload.mada_amount, visa_amount: payload.visa_amount,
          mastercard_amount: payload.mastercard_amount, cash_amount: payload.cash_amount, purchases: payload.purchases, delivery: payload.delivery, deficit_reason: payload.deficit_reason })} />}
      {editPurchase && <PurchaseEditDialog target={editPurchase} onClose={() => setEditPurchase(null)}
        submit={async payload => { const j = await sendEdit({ kind: 'purchase', id: editPurchase.id, ...payload }); if (j.success) setReload(x => x + 1); return j }} />}
      {reqTarget !== undefined && <RequestDialog orgId={orgId} target={reqTarget} onClose={() => setReqTarget(undefined)} onSent={() => { setReqKey(k => k + 1); setTab('requests') }} />}
    </PortalShell>
  )
}
