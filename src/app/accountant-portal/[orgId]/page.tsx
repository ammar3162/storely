'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, FileSpreadsheet, BarChart3, MessageSquareText, Lock } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { PortalShell, PeriodBar, presetRange } from '@/components/accountant/PortalShell'
import AccountantReportView from '@/components/accountant/AccountantReportView'
import AccountantRequestsPanel, { RequestDialog, type RequestTarget } from '@/components/accountant/AccountantRequests'
import PortalLocks from '@/components/accountant/PortalLocks'
import CashierClosingEditor from '@/components/CashierClosingEditor'
import PurchaseEditDialog, { type PurchaseEditTarget } from '@/components/accountant/PurchaseEditDialog'

// صفحة منشأة في بوابة المحاسب — بالأقسام اللي سمح فيها المالك، والمحاسب يقدر يعدّل الإقفالات والمصروفات والمشتريات (يطلع «معدّل من المحاسب»)
type Tab = 'report' | 'requests' | 'locks'
export default function PortalClientPage() {
  const orgId = useParams().orgId as string
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [tab, setTab] = useState<Tab>('report')
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
    const t = q.get('tab'); if (t === 'requests' || t === 'locks') setTab(t)
  }, [orgId])
  useEffect(() => {
    if (!range) return
    setData(null); setError('')
    fetch(`/api/accountant-portal/report?org_id=${orgId}&from=${range.from}&to=${range.to}`).then(r => r.json())
      .then(j => j.success ? setData(j) : setError(j.error || 'تعذر التحميل')).catch(() => setError('تأكد من الإنترنت'))
  }, [orgId, range, reload])

  // تعديل المحاسب يتطبّق على طول — بعده نعيد تحميل التقرير
  const sendEdit = (payload: Record<string, unknown>) => fetch('/api/accountant-portal/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, ...payload }) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
  // بيانات الإقفال بنفس شكل محرر الإقفال
  const closingForEditor = (c: any) => ({ id: c.id, staff_name: c.staff, closing_date: c.date, total_sales: c.sales, mada_amount: c.mada, visa_amount: c.visa,
    mastercard_amount: c.mastercard, network_amount: c.network, cash_amount: c.cash, purchases: c.drawer || [], delivery: c.deliveryApps || [],
    deficit_reason: c.deficitReason, deficit_decision: c.deficitDecision, status: c.status })

  const name = data?.report?.orgName || ''
  const xlsx = range ? `/api/accountant-portal/report?org_id=${orgId}&from=${range.from}&to=${range.to}&format=xlsx` : '#'
  const TABS: { k: Tab; l: string; icon: any }[] = [{ k: 'report', l: 'التقرير', icon: BarChart3 }, { k: 'requests', l: 'الطلبات', icon: MessageSquareText }, { k: 'locks', l: 'إقفال الأشهر', icon: Lock }]

  // طلب واحد لكل فاتورة ناقصة (الرقم الضريبي أو رقم الفاتورة) — المنشأة يوصلها إشعار واحد وتعبّيها من «طلبات المحاسب»
  async function requestMissing(invs: any[]) {
    if (!invs.length || !window.confirm(`سنرسل إلى المنشأة طلباً لإكمال الرقم الضريبي أو رقم الفاتورة لـ ${invs.length === 1 ? 'فاتورة واحدة' : `${invs.length} فواتير`}؟`)) return
    const j = await fetch('/api/accountant-portal/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, targets: invs.map(i => ({ invoice_group: i.group || null, purchase_id: i.firstId || null })) }) })
      .then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    if (j.error) { window.alert(j.error); return }
    if (!j.created) { window.alert('جميع الفواتير الناقصة عليها طلبات مفتوحة مسبقاً — تابعها من «الطلبات»'); setTab('requests'); return }
    window.alert(`أُرسل إلى المنشأة ${j.created === 1 ? 'طلب واحد' : `${j.created} طلبات`}${j.skipped ? ` (${j.skipped} عليها طلب مسبقاً)` : ''} ✓`)
    setReqKey(k => k + 1); setTab('requests')
  }

  return (
    <PortalShell title={name || 'المنشأة'} subtitle={data ? `${data.report.branchName || 'كل الفروع'} · ${data.report.label}` : undefined}
      orgLogo={name ? { name, url: data?.logo_url || null } : undefined}
      actions={data ? <a href={xlsx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 11, background: colors.primary, color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
        <FileSpreadsheet size={16} /> تحميل إكسل</a> : undefined}>

      <div style={{ display: 'flex', gap: 4, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 4, marginBottom: 16, width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
        {TABS.map(t => {
          const on = tab === t.k, Icon = t.icon
          return <button key={t.k} onClick={() => setTab(t.k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: font.family,
            fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap' as const, background: on ? colors.primary : 'transparent', color: on ? '#fff' : colors.text3 }}><Icon size={15} /> {t.l}</button>
        })}
      </div>

      {tab === 'report' && <>
        {range && <PeriodBar from={range.from} to={range.to} onChange={setRange} />}
        {error ? <div style={{ color: colors.danger, fontSize: 14, padding: 20 }}>{error}</div>
          : !data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={24} color={colors.primary} className="spin" /></div>
          : <AccountantReportView data={data} kicker="بوابة المحاسب" hideHeader downloadHref={xlsx}
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
