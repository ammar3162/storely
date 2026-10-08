'use client'
import { useEffect, useState } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { colors, font, radius } from '@/lib/ds'

// إقفال الشهور (المحاسب): بعد المراجعة يقفل الشهر — ما ينقدر يتعدّل فيه مشتريات ولا إقفالات كاشير
export default function PortalLocks({ orgId }: { orgId: string }) {
  const [months, setMonths] = useState<any[] | null>(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [showAll, setShowAll] = useState(false)
  const load = () => fetch(`/api/accountant-portal/locks?org_id=${orgId}`).then(r => r.json()).then(j => setMonths(j.months || [])).catch(() => setMonths([]))
  useEffect(() => { load() }, [orgId])
  async function act(m: any) {
    const lock = !m.locked
    if (!window.confirm(lock ? `تقفل شهر ${m.label}؟ بعدها ما ينقدر أحد يضيف أو يعدّل أو يحذف مشتريات أو إقفالات كاشير بتاريخ داخله.` : `تفتح شهر ${m.label}؟ يصير ينقدر يتعدّل.`)) return
    setBusy(m.month); setErr('')
    const j = await fetch('/api/accountant-portal/locks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, month: m.month, action: lock ? 'lock' : 'unlock' }) })
      .then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    setBusy('')
    if (j.error) { setErr(j.error); return }
    load()
  }
  const list = (months || []).slice(0, showAll ? 12 : 4)
  return (
    <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 14, fontFamily: font.family }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: colors.primary, margin: '0 0 4px' }}>إقفال الشهور</h2>
      <div style={{ fontSize: 12, color: colors.text4, marginBottom: 10 }}>بعد ما تراجع الشهر أقفله — ما ينقدر يتعدّل فيه شي إلا لو فتحته أنت.</div>
      {!months ? <div style={{ fontSize: 12.5, color: colors.text4 }}>جاري التحميل...</div> : list.map(m => (
        <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderTop: `1px solid ${colors.border}` }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.locked ? '#ecfdf5' : '#f8fafc', color: m.locked ? '#047857' : colors.text4 }}>
            {m.locked ? <Lock size={15} /> : <Unlock size={15} />}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{m.label}</div>
            <div style={{ fontSize: 11.5, color: colors.text4 }}>{m.locked ? `مقفل · ${m.locked_by_name || ''} · ${String(m.locked_at).slice(0, 10)}` : 'مفتوح'}</div>
          </div>
          <button onClick={() => act(m)} disabled={!!busy} style={{ padding: '7px 12px', borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: font.family,
            border: `1px solid ${m.locked ? colors.border : colors.primary}`, background: m.locked ? '#fff' : colors.primary, color: m.locked ? colors.text3 : '#fff', opacity: busy === m.month ? .6 : 1 }}>
            {busy === m.month ? '...' : m.locked ? 'افتح' : 'أقفل الشهر'}</button>
        </div>
      ))}
      {months && months.length > 4 && <button onClick={() => setShowAll(s => !s)} style={{ marginTop: 6, fontSize: 12.5, color: colors.text3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, padding: 0 }}>
        {showAll ? 'أقل' : 'شهور أقدم'}</button>}
      {err && <div style={{ color: colors.danger, fontSize: 12.5, marginTop: 6 }}>{err}</div>}
    </section>
  )
}
