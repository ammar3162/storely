'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, MessageSquareText, Lock, Smartphone, LogOut, Menu, X } from 'lucide-react'
import { colors, font, radius } from '@/lib/ds'

// إطار بوابة المحاسب (App Shell): قائمة جانبية بهوية Storely + شعارات المنشآت + شريط علوي
// نفس ألوان وقياسات قائمة لوحة المالك عشان التجربة وحدة

type Org = { org_id: string; name: string; logo_url: string | null; branch: string | null; expired: boolean; open: number; answered: number }
let cache: { at: number; orgs: Org[]; me: { name: string | null; email: string } } | null = null

const SIDEBAR = 248
const GRAD = 'linear-gradient(180deg,#0d4543 0%,#0b3b3a 45%,#0a3231 100%)'
const PALETTE = ['#0f766e', '#7c3aed', '#b45309', '#1d4ed8', '#be185d', '#0369a1', '#15803d']

/** شعار المنشأة — أو أول حرف من اسمها بلون ثابت */
export function OrgLogo({ name, url, size = 34 }: { name: string; url?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false)
  const bg = PALETTE[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length]
  if (url && /^https:\/\//.test(url) && !broken)
    return <img src={url} alt={name} width={size} height={size} onError={() => setBroken(true)} style={{ width: size, height: size, borderRadius: size * .28, objectFit: 'cover', background: '#fff', flexShrink: 0, border: '1px solid rgba(0,0,0,.06)' }} />
  return <span style={{ width: size, height: size, borderRadius: size * .28, background: bg, color: '#fff', fontWeight: 800, fontSize: size * .42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{name.trim()[0] || '؟'}</span>
}

export function PortalShell({ title, subtitle, actions, children, orgLogo }: {
  title?: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; orgLogo?: { name: string; url: string | null }
}) {
  const router = useRouter()
  const path = usePathname() || ''
  const [data, setData] = useState(cache)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (cache && Date.now() - cache.at < 60e3) return
    fetch('/api/accountant-portal/orgs').then(r => r.json()).then(j => {
      if (!j.success) { router.replace('/accountant-portal'); return }
      cache = { at: Date.now(), orgs: j.orgs, me: j.accountant }; setData(cache)
    }).catch(() => {})
  }, [path])
  useEffect(() => { setOpen(false) }, [path])

  async function logout() {
    cache = null
    await fetch('/api/accountant-portal/logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/accountant-portal'
  }
  const pending = (data?.orgs || []).reduce((s, o) => s + o.open + o.answered, 0)
  const NAV = [
    { href: '/accountant-portal', label: 'نظرة عامة', icon: LayoutGrid },
    { href: '/accountant-portal/requests', label: 'الطلبات', icon: MessageSquareText, badge: pending },
    { href: '/accountant-portal/locks', label: 'إقفال الشهور', icon: Lock },
    { href: '/accountant-portal/devices', label: 'أجهزتي', icon: Smartphone },
  ]
  const isActive = (h: string) => h === '/accountant-portal' ? path === h : path.startsWith(h)

  const sidebar = (
    <aside className={`ap-side${open ? ' open' : ''}`} style={{ background: GRAD, color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 18px 14px' }}>
        <img src="/storely-logo.png" alt="Storely" width={38} height={38} style={{ borderRadius: 10, background: '#fff' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: .3 }} dir="ltr">Storely</div>
          <div style={{ fontSize: 11.5, opacity: .7 }}>بوابة المحاسب</div>
        </div>
        <button className="ap-close" onClick={() => setOpen(false)} aria-label="إغلاق" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
      </div>

      <nav style={{ padding: '6px 12px' }}>
        <div className="ap-sec">العمل</div>
        {NAV.map(n => {
          const on = isActive(n.href), Icon = n.icon
          return (
            <a key={n.href} href={n.href} onClick={e => { e.preventDefault(); router.push(n.href) }} className={`ap-item${on ? ' on' : ''}`}>
              <Icon size={17} strokeWidth={on ? 2.3 : 1.9} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge ? <span className="ap-badge">{n.badge}</span> : null}
            </a>
          )
        })}
      </nav>

      <div style={{ padding: '10px 12px 6px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div className="ap-sec">عملاؤك {data ? `(${data.orgs.length})` : ''}</div>
        {!data ? <div style={{ fontSize: 12, opacity: .6, padding: '6px 10px' }}>جاري التحميل...</div>
          : !data.orgs.length ? <div style={{ fontSize: 12, opacity: .6, padding: '6px 10px', lineHeight: 1.7 }}>ما عندك عملاء للحين — تطلع المنشآت هنا أول ما تدعوك</div>
          : data.orgs.map(o => {
            const href = `/accountant-portal/${o.org_id}`, on = path === href
            return (
              <a key={o.org_id} href={href} onClick={e => { e.preventDefault(); if (!o.expired) router.push(href) }} className={`ap-org${on ? ' on' : ''}`} style={{ opacity: o.expired ? .45 : 1 }}>
                <OrgLogo name={o.name} url={o.logo_url} size={28} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                {o.expired ? <span style={{ fontSize: 10, opacity: .8 }}>انتهى</span> : o.answered ? <span className="ap-dot" style={{ background: '#60a5fa' }} title="رد جديد" /> : o.open ? <span className="ap-dot" style={{ background: '#fbbf24' }} title="بانتظار الرد" /> : null}
              </a>
            )
          })}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{(data?.me.name || data?.me.email || '؟').trim()[0]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data?.me.name || 'المحاسب'}</div>
          <div style={{ fontSize: 11, opacity: .6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">{data?.me.email}</div>
        </div>
        <button onClick={logout} title="خروج" aria-label="خروج" style={{ background: 'rgba(255,255,255,.08)', border: 'none', color: '#fff', borderRadius: 9, padding: 8, cursor: 'pointer' }}><LogOut size={16} /></button>
      </div>
    </aside>
  )

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f3f6f6', fontFamily: font.family, color: colors.text }}>
      <style>{`
        .ap-side{position:fixed;top:0;right:0;bottom:0;width:${SIDEBAR}px;z-index:60}
        .ap-sec{font-size:11px;font-weight:700;opacity:.55;padding:10px 10px 6px;display:flex;align-items:center;gap:6px}
        .ap-sec::before{content:'';width:5px;height:5px;border-radius:99px;background:#5eead4}
        .ap-item,.ap-org{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;color:rgba(255,255,255,.82);text-decoration:none;font-size:13.5px;font-weight:600;margin-bottom:2px;transition:background .15s}
        .ap-item:hover,.ap-org:hover{background:rgba(255,255,255,.07)}
        .ap-item.on{background:#fff;color:#0f766e;font-weight:800;box-shadow:0 6px 16px rgba(0,0,0,.18)}
        .ap-org{padding:7px 10px;font-size:13px}
        .ap-org.on{background:rgba(255,255,255,.14);color:#fff}
        .ap-badge{background:#f59e0b;color:#1f1300;font-size:11px;font-weight:800;border-radius:99px;padding:1px 8px}
        .ap-item.on .ap-badge{background:#0f766e;color:#fff}
        .ap-dot{width:8px;height:8px;border-radius:99px;flex-shrink:0}
        .ap-main{margin-right:${SIDEBAR}px;min-height:100vh}
        .ap-top{position:sticky;top:0;z-index:40;background:rgba(243,246,246,.92);backdrop-filter:blur(8px);border-bottom:1px solid ${colors.border}}
        .ap-burger,.ap-close{display:none}
        .ap-veil{display:none}
        @media (max-width:900px){
          .ap-side{transform:translateX(100%);transition:transform .25s ease;box-shadow:-20px 0 40px rgba(0,0,0,.25);width:min(86vw,300px)}
          .ap-side.open{transform:none}
          .ap-main{margin-right:0}
          .ap-burger,.ap-close{display:inline-flex}
          .ap-veil.open{display:block;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:55}
        }
        @keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .8s linear infinite}
      `}</style>
      <div className={`ap-veil${open ? ' open' : ''}`} onClick={() => setOpen(false)} />
      {/* القائمة: ثابتة على الكمبيوتر، وتنزلق من اليمين على الجوال */}
      {sidebar}

      <main className="ap-main">
        <header className="ap-top">
          <div style={{ maxWidth: 1320, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="ap-burger" onClick={() => setOpen(true)} aria-label="القائمة" style={{ border: `1px solid ${colors.border}`, background: '#fff', borderRadius: 10, padding: 8, cursor: 'pointer' }}><Menu size={19} /></button>
            {orgLogo && <OrgLogo name={orgLogo.name} url={orgLogo.url} size={40} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>}
              {subtitle && <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 2 }}>{subtitle}</div>}
            </div>
            {actions}
          </div>
        </header>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 24px 48px' }}>{children}</div>
      </main>
    </div>
  )
}

/** بطاقة رقم (KPI) */
export function Stat({ label, value, hint, tone = 'teal', icon }: { label: string; value: string; hint?: string; tone?: 'teal' | 'amber' | 'red' | 'blue'; icon?: React.ReactNode }) {
  const T = { teal: ['#0f766e', '#f0fdfa'], amber: ['#b45309', '#fffbeb'], red: ['#b91c1c', '#fef2f2'], blue: ['#1d4ed8', '#eff6ff'] }[tone]
  return (
    <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', insetInlineStart: -30, bottom: -30, width: 90, height: 90, borderRadius: 99, background: T[1] }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, color: colors.text3, fontSize: 12.5, fontWeight: 700 }}>
        {icon && <span style={{ width: 30, height: 30, borderRadius: 9, background: T[1], color: T[0], display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>}{label}
      </div>
      <div style={{ position: 'relative', fontSize: 24, fontWeight: 800, color: T[0], marginTop: 8 }} dir="ltr">{value}</div>
      {hint && <div style={{ position: 'relative', fontSize: 11.5, color: colors.text4, marginTop: 2 }}>{hint}</div>}
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
    border: `1.5px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primary : '#fff', color: on ? '#fff' : colors.text3 })
  const date: React.CSSProperties = { padding: '7px 9px', borderRadius: 10, border: `1px solid ${colors.border}`, fontSize: 12.5, fontFamily: font.family, background: '#fff' }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 16 }}>
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
