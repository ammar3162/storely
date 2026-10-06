'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ChevronRight } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { PortalShell, PeriodBar, presetRange } from '@/components/accountant/PortalShell'
import AccountantReportView from '@/components/accountant/AccountantReportView'
import AccountantRequestsPanel, { RequestDialog, type RequestTarget } from '@/components/accountant/AccountantRequests'
import PortalLocks from '@/components/accountant/PortalLocks'

// صفحة منشأة في بوابة المحاسب — قراءة فقط، بالأقسام اللي سمح فيها المالك
export default function PortalClientPage() {
  const orgId = useParams().orgId as string
  const router = useRouter()
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  // الفترة من الرابط (بعد التحميل — عشان ما يختلف عن السيرفر)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    setRange(q.get('from') && q.get('to') ? { from: q.get('from')!, to: q.get('to')! } : presetRange('month'))
  }, [])
  const [email, setEmail] = useState<string>()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [reqTarget, setReqTarget] = useState<RequestTarget | null | undefined>(undefined)   // undefined = مقفل، null = طلب عام
  const [reqKey, setReqKey] = useState(0)

  useEffect(() => { fetch('/api/accountant-portal/me').then(r => r.json()).then(j => j.success ? setEmail(j.accountant.email) : router.replace('/accountant-portal')).catch(() => {}) }, [router])
  useEffect(() => {
    if (!range) return
    setData(null); setError('')
    fetch(`/api/accountant-portal/report?org_id=${orgId}&from=${range.from}&to=${range.to}`).then(r => r.json())
      .then(j => j.success ? setData(j) : setError(j.error || 'تعذر التحميل')).catch(() => setError('تأكد من الإنترنت'))
  }, [orgId, range])

  return (
    <PortalShell email={email}>
      <button onClick={() => router.push('/accountant-portal')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: colors.primary, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, padding: 0, marginBottom: 12 }}>
        <ChevronRight size={16} /> كل العملاء
      </button>
      {range && <PeriodBar from={range.from} to={range.to} onChange={setRange} />}
      {error ? <div style={{ color: colors.danger, fontSize: 14, padding: 20 }}>{error}</div>
        : !data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={24} color={colors.primary} style={{ animation: 'spin .8s linear infinite' }} /><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>
        : <>
          <AccountantRequestsPanel orgId={orgId} refreshKey={reqKey} onNew={() => setReqTarget(null)} />
          <PortalLocks orgId={orgId} />
          <AccountantReportView data={data} kicker="بوابة المحاسب" downloadHref={`/api/accountant-portal/report?org_id=${orgId}&from=${range!.from}&to=${range!.to}&format=xlsx`}
            onRequest={inv => setReqTarget({ invoice_group: inv.group, purchase_id: inv.firstId, label: `${inv.supplier || '—'} · ${inv.date} · ${Number(inv.total).toFixed(2)}${inv.invoiceNumber ? ` · ${inv.invoiceNumber}` : ''}` })} />
        </>}
      {reqTarget !== undefined && <RequestDialog orgId={orgId} target={reqTarget} onClose={() => setReqTarget(undefined)} onSent={() => setReqKey(k => k + 1)} />}
    </PortalShell>
  )
}
