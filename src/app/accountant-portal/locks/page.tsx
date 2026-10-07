'use client'
import { useEffect, useState } from 'react'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { PortalShell, OrgLogo } from '@/components/accountant/PortalShell'

// إقفال الشهور لكل العملاء: جدول المنشآت × آخر ٦ شهور
export default function PortalLocksPage() {
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const load = () => fetch('/api/accountant-portal/locks?all=1').then(r => r.json()).then(setData).catch(() => setData({ orgs: [], months: [] }))
  useEffect(() => { load() }, [])
  async function toggle(o: any, m: any) {
    const lock = !o.locked[m.month]
    if (!window.confirm(lock ? `تقفل ${m.label} لـ ${o.name}؟ ما ينقدر يتعدّل فيه مشتريات ولا إقفالات كاشير.` : `تفتح ${m.label} لـ ${o.name}؟`)) return
    setBusy(o.org_id + m.month); setErr('')
    const j = await fetch('/api/accountant-portal/locks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: o.org_id, month: m.month, action: lock ? 'lock' : 'unlock' }) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    setBusy('')
    if (j.error) setErr(j.error); else load()
  }
  return (
    <PortalShell title="إقفال الشهور" subtitle="بعد ما تراجع الشهر أقفله — ما ينقدر يتعدّل فيه شي إلا لو فتحته أنت. تسجيل الدفع للموردين لاحقاً يبقى مسموح.">
      {err && <div style={{ color: colors.danger, fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {!data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={24} color={colors.primary} className="spin" /></div>
        : !data.orgs?.length ? <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 18, padding: 40, textAlign: 'center', color: colors.text3 }}>ما عندك عملاء مفعّلين</div>
        : <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 18, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, fontFamily: font.family }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 12.5, color: colors.text3, position: 'sticky', right: 0, background: '#f8fafc' }}>المنشأة</th>
              {data.months.map((m: any) => <th key={m.month} style={{ padding: '12px 8px', fontSize: 12.5, color: colors.text3, whiteSpace: 'nowrap' }}>{m.label}</th>)}
            </tr></thead>
            <tbody>{data.orgs.map((o: any) => (
              <tr key={o.org_id} style={{ borderTop: `1px solid ${colors.border}` }}>
                <td style={{ padding: '10px 16px', position: 'sticky', right: 0, background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><OrgLogo name={o.name} url={o.logo_url} size={30} /><b style={{ fontSize: 13.5, whiteSpace: 'nowrap' }}>{o.name}</b></div>
                </td>
                {data.months.map((m: any) => {
                  const l = o.locked[m.month], k = o.org_id + m.month
                  return <td key={m.month} style={{ textAlign: 'center', padding: 6 }}>
                    <button onClick={() => toggle(o, m)} disabled={!!busy} title={l ? `مقفل · ${l.by || ''} · ${String(l.at).slice(0, 10)}` : 'مفتوح — اضغط للإقفال'}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 10, cursor: 'pointer', fontFamily: font.family, fontSize: 12, fontWeight: 800,
                        border: `1px solid ${l ? '#a7f3d0' : colors.border}`, background: l ? '#ecfdf5' : '#fff', color: l ? '#047857' : colors.text4, opacity: busy === k ? .5 : 1 }}>
                      {l ? <Lock size={13} /> : <Unlock size={13} />}{l ? 'مقفل' : 'مفتوح'}</button>
                  </td>
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>}
    </PortalShell>
  )
}
