'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, RotateCcw } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { PortalShell, OrgLogo } from '@/components/accountant/PortalShell'
import { REQUEST_KINDS, type RequestKind } from '@/lib/accountantRequests'

// كل طلبات المحاسب عند كل المنشآت
const ST: Record<string, [string, string, string]> = { open: ['بانتظار الرد', '#fffbeb', '#b45309'], answered: ['ردّت المنشأة', '#eff6ff', '#1d4ed8'], resolved: ['انحل', '#ecfdf5', '#047857'] }
const FILTERS = [{ k: 'active', l: 'تحتاج متابعة' }, { k: 'answered', l: 'ردود جديدة' }, { k: 'open', l: 'بانتظار الرد' }, { k: 'resolved', l: 'انحلت' }]
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PortalRequestsPage() {
  const router = useRouter()
  const [list, setList] = useState<any[] | null>(null)
  const [f, setF] = useState('active')
  const load = () => fetch('/api/accountant-portal/requests').then(r => r.json()).then(j => setList(j.requests || [])).catch(() => setList([]))
  useEffect(() => { load() }, [])
  async function setStatus(r: any, status: string) {
    await fetch('/api/accountant-portal/requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: r.org_id, id: r.id, status }) }).catch(() => {})
    load()
  }
  const shown = (list || []).filter(r => f === 'active' ? r.status !== 'resolved' : r.status === f)
  const count = (k: string) => (list || []).filter(r => k === 'active' ? r.status !== 'resolved' : r.status === k).length
  return (
    <PortalShell title="الطلبات" subtitle="طلباتك من كل المنشآت — والردود عليها">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 16 }}>
        {FILTERS.map(x => <button key={x.k} onClick={() => setF(x.k)} style={{ padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font.family,
          border: `1.5px solid ${f === x.k ? colors.primary : colors.border}`, background: f === x.k ? colors.primary : '#fff', color: f === x.k ? '#fff' : colors.text3 }}>{x.l} ({count(x.k)})</button>)}
      </div>
      {!list ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={24} color={colors.primary} className="spin" /></div>
        : !shown.length ? <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 18, padding: 40, textAlign: 'center', color: colors.text3, fontSize: 14 }}>
            {f === 'active' ? 'كل شي تمام — ما فيه طلبات تحتاج متابعة 👌' : 'ما فيه طلبات هنا'}<div style={{ fontSize: 12.5, color: colors.text4, marginTop: 6 }}>تقدر تطلب من صفحة أي منشأة، جنب أي فاتورة ضريبية.</div></div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 12 }}>
          {shown.map(r => (
            <div key={r.id} style={{ background: '#fff', border: `1px solid ${r.status === 'answered' ? '#bfdbfe' : colors.border}`, borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <OrgLogo name={r.org_name} url={r.org_logo} size={34} />
                <button onClick={() => router.push(`/accountant-portal/${r.org_id}?tab=requests`)} style={{ flex: 1, textAlign: 'right', background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, padding: 0, fontSize: 14, fontWeight: 800, color: colors.text }}>{r.org_name}</button>
                <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: ST[r.status][1], color: ST[r.status][2] }}>{ST[r.status][0]}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{REQUEST_KINDS[r.kind as RequestKind]}</div>
              {r.invoice && <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 3 }}>فاتورة {r.invoice.supplier || '—'} · {r.invoice.date} · <span dir="ltr">{fmt(r.invoice.total)}</span></div>}
              {r.message && <div style={{ fontSize: 13.5, marginTop: 6 }}>{r.message}</div>}
              {r.owner_reply && <div style={{ fontSize: 13, marginTop: 8, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '8px 10px', whiteSpace: 'pre-line' as const }}><b>رد المنشأة:</b> {r.owner_reply}</div>}
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 11.5, color: colors.text4 }} dir="ltr">{r.created_at.slice(0, 10)}</span>
                {r.status !== 'resolved'
                  ? <button onClick={() => setStatus(r, 'resolved')} style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 800, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 9, padding: '6px 11px', cursor: 'pointer', fontFamily: font.family }}><CheckCircle2 size={14} /> انحل</button>
                  : <button onClick={() => setStatus(r, 'open')} style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: colors.text3, background: 'none', border: `1px solid ${colors.border}`, borderRadius: 9, padding: '6px 11px', cursor: 'pointer', fontFamily: font.family }}><RotateCcw size={13} /> افتحه</button>}
              </div>
            </div>
          ))}
        </div>}
    </PortalShell>
  )
}
