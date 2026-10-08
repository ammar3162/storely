'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, FileSpreadsheet, BarChart3, MessageSquareText, Lock } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { PortalShell, PeriodBar, presetRange } from '@/components/accountant/PortalShell'
import AccountantReportView from '@/components/accountant/AccountantReportView'
import AccountantRequestsPanel, { RequestDialog, type RequestTarget } from '@/components/accountant/AccountantRequests'
import PortalLocks from '@/components/accountant/PortalLocks'

// صفحة منشأة في بوابة المحاسب — قراءة فقط، بالأقسام اللي سمح فيها المالك
type Tab = 'report' | 'requests' | 'locks'
export default function PortalClientPage() {
  const orgId = useParams().orgId as string
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [tab, setTab] = useState<Tab>('report')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [reqTarget, setReqTarget] = useState<RequestTarget | null | undefined>(undefined)   // undefined = مقفل، null = طلب عام
  const [reqKey, setReqKey] = useState(0)

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
  }, [orgId, range])

  const name = data?.report?.orgName || ''
  const xlsx = range ? `/api/accountant-portal/report?org_id=${orgId}&from=${range.from}&to=${range.to}&format=xlsx` : '#'
  const TABS: { k: Tab; l: string; icon: any }[] = [{ k: 'report', l: 'التقرير', icon: BarChart3 }, { k: 'requests', l: 'الطلبات', icon: MessageSquareText }, { k: 'locks', l: 'إقفال الشهور', icon: Lock }]

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
              onRequest={inv => setReqTarget({ invoice_group: inv.group, purchase_id: inv.firstId, label: `${inv.supplier || '—'} · ${inv.date} · ${Number(inv.total).toFixed(2)}${inv.invoiceNumber ? ` · ${inv.invoiceNumber}` : ''}` })} />}
      </>}
      {tab === 'requests' && <AccountantRequestsPanel orgId={orgId} refreshKey={reqKey} onNew={() => setReqTarget(null)} />}
      {tab === 'locks' && <PortalLocks orgId={orgId} />}

      {reqTarget !== undefined && <RequestDialog orgId={orgId} target={reqTarget} onClose={() => setReqTarget(undefined)} onSent={() => { setReqKey(k => k + 1); setTab('requests') }} />}
    </PortalShell>
  )
}
