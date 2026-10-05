'use client'
import { LogOut } from 'lucide-react'
import { colors, font, radius } from '@/lib/ds'

// إطار بوابة المحاسب + فلتر الفترة
export function PortalShell({ email, children }: { email?: string; children: React.ReactNode }) {
  async function logout() {
    await fetch('/api/accountant-portal/logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/accountant-portal'
  }
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f4f7f7', fontFamily: font.family, color: colors.text }}>
      <div style={{ background: '#fff', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/storely-logo.png" alt="Storely" width={36} height={36} style={{ borderRadius: 9 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>بوابة المحاسب</div>
            {email && <div style={{ fontSize: 11.5, color: colors.text4, overflow: 'hidden', textOverflow: 'ellipsis' }} dir="ltr">{email}</div>}
          </div>
          {email && <button onClick={logout} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: radius.md, border: `1px solid ${colors.border}`, background: '#fff', color: colors.text3, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
            <LogOut size={14} /> خروج</button>}
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '18px 16px 40px' }}>{children}</div>
    </div>
  )
}

const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10)
export function presetRange(key: string): { from: string; to: string } {
  const t = today(), y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7))
  if (key === 'last_month') { const end = addDays(`${t.slice(0, 8)}01`, -1); return { from: `${end.slice(0, 8)}01`, to: end } }
  if (key === 'quarter') { const qm = Math.floor((m - 1) / 3) * 3 + 1; return { from: `${y}-${String(qm).padStart(2, '0')}-01`, to: t } }
  if (key === 'last_quarter') {
    const qm = Math.floor((m - 1) / 3) * 3 + 1, end = addDays(`${y}-${String(qm).padStart(2, '0')}-01`, -1)
    const em = Number(end.slice(5, 7)), sm = em - 2
    return { from: `${end.slice(0, 4)}-${String(sm).padStart(2, '0')}-01`, to: end }
  }
  return { from: `${t.slice(0, 8)}01`, to: t }
}
const PRESETS = [{ k: 'month', l: 'هذا الشهر' }, { k: 'last_month', l: 'الشهر اللي فات' }, { k: 'quarter', l: 'هذا الربع' }, { k: 'last_quarter', l: 'الربع اللي فات' }]

export function PeriodBar({ from, to, onChange }: { from: string; to: string; onChange: (r: { from: string; to: string }) => void }) {
  const active = PRESETS.find(p => { const r = presetRange(p.k); return r.from === from && r.to === to })?.k
  const chip = (on: boolean): React.CSSProperties => ({ padding: '7px 13px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family,
    border: `1.5px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primaryLight : '#fff', color: on ? colors.primary : colors.text3 })
  const date: React.CSSProperties = { padding: '7px 9px', borderRadius: 9, border: `1px solid ${colors.border}`, fontSize: 12.5, fontFamily: font.family, background: '#fff' }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 14 }}>
      {PRESETS.map(p => <button key={p.k} onClick={() => onChange(presetRange(p.k))} style={chip(active === p.k)}>{p.l}</button>)}
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginInlineStart: 4 }}>
        <span style={{ fontSize: 12, color: colors.text4 }}>من</span>
        <input type="date" value={from} max={to} onChange={e => e.target.value && onChange({ from: e.target.value, to })} style={date} />
        <span style={{ fontSize: 12, color: colors.text4 }}>إلى</span>
        <input type="date" value={to} min={from} max={today()} onChange={e => e.target.value && onChange({ from, to: e.target.value })} style={date} />
      </span>
    </div>
  )
}
