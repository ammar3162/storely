'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, MessageSquareText, Lock, Smartphone, UserRound, Users, LogOut, Menu, X } from 'lucide-react'
import { colors, font, radius } from '@/lib/ds'
import { ListSkeleton } from '@/components/PageSkeleton'

// إطار بوابة المحاسب (App Shell): قائمة جانبية بهوية Storely + شعارات المنشآت + شريط علوي
// نفس ألوان وقياسات قائمة لوحة المالك عشان التجربة وحدة

type Org = { org_id: string; name: string; logo_url: string | null; branch: string | null; expired: boolean; open: number; answered: number }
let cache: { at: number; orgs: Org[]; me: { name: string | null; email: string }; lead?: boolean } | null = null

const SIDEBAR = 248
const PALETTE = ['#203640', '#4F6678', '#3b5563', '#2c4a57', '#5b6f7c', '#1f3a4a', '#465a66']   // درجات كحلية هادئة

/** شعار المنشأة — أو أول حرف من اسمها بلون ثابت */
export function OrgLogo({ name, url, size = 34 }: { name: string; url?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false)
  const bg = PALETTE[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length]
  if (url && /^https:\/\//.test(url) && !broken)
    return <img src={url} alt={name} width={size} height={size} onError={() => setBroken(true)} style={{ width: size, height: size, borderRadius: size * .28, objectFit: 'cover', background: '#fff', flexShrink: 0, border: '1px solid rgba(0,0,0,.06)' }} />
  return <span style={{ width: size, height: size, borderRadius: size * .28, background: bg, color: '#fff', fontWeight:600, fontSize: size * .42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{name.trim()[0] || '؟'}</span>
}

export function PortalShell({ title, subtitle, actions, children, orgLogo, subnav }: {
  title?: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; orgLogo?: { name: string; url: string | null }
  subnav?: React.ReactNode   // تبويبات الصفحة — داخل الرأس الثابت فتبقى ظاهرة مع التمرير
}) {
  const router = useRouter()
  const path = usePathname() || ''
  const [data, setData] = useState(cache)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (cache && Date.now() - cache.at < 60e3) return
    fetch('/api/accountant-portal/orgs').then(r => r.json()).then(j => {
      if (!j.success) { router.replace('/accountant-portal'); return }
      cache = { at: Date.now(), orgs: j.orgs, me: j.accountant, lead: !!j.lead }; setData(cache)
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
    { href: '/accountant-portal/locks', label: 'إقفال الأشهر', icon: Lock },
    ...(data?.lead ? [{ href: '/accountant-portal/team', label: 'فريق المكتب', icon: Users }] : []),
    { href: '/accountant-portal/devices', label: 'حسابي', icon: UserRound },
  ]
  const isActive = (h: string) => h === '/accountant-portal' ? path === h : path.startsWith(h)

  const sidebar = (
    <aside className={`ap-side${open ? ' open' : ''}`} style={{ background: colors.surface, color: colors.text, borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 18px 14px' }}>
        <img src="/storely-logo.png" alt="Storely" width={34} height={34} style={{ borderRadius: 10, background: '#fff', border: `1px solid ${colors.border}` }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: colors.primary }} dir="ltr">Storely</div>
          <div style={{ fontSize: 13, color: colors.text3 }}>بوابة المحاسب</div>
        </div>
        <button className="ap-close" onClick={() => setOpen(false)} aria-label="إغلاق" style={{ background: 'none', border: 'none', color: colors.text, cursor: 'pointer' }}><X size={20} /></button>
      </div>

      <nav style={{ padding: '6px 12px' }}>
        <div className="ap-sec">العمل</div>
        {NAV.map(n => {
          const on = isActive(n.href), Icon = n.icon
          return (
            <a key={n.href} href={n.href} onClick={e => { e.preventDefault(); router.push(n.href) }} className={`ap-item${on ? ' on' : ''}`}>
              <Icon size={18} strokeWidth={on ? 2 : 1.75} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge ? <span className="ap-badge">{n.badge}</span> : null}
            </a>
          )
        })}
      </nav>

      <div style={{ padding: '10px 12px 6px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div className="ap-sec">عملاؤك {data ? `(${data.orgs.length})` : ''}</div>
        {!data ? <ListSkeleton/>
          : !data.orgs.length ? <div style={{ fontSize: 13, color: colors.text3, padding: '6px 10px', lineHeight: 1.6 }}>لا يوجد لديك عملاء بعد — تظهر المنشآت هنا فور دعوتك</div>
          : data.orgs.map(o => {
            const href = `/accountant-portal/${o.org_id}`, on = path === href
            return (
              <a key={o.org_id} href={href} onClick={e => { e.preventDefault(); if (!o.expired) router.push(href) }} className={`ap-org${on ? ' on' : ''}`} style={{ opacity: o.expired ? .45 : 1 }}>
                <OrgLogo name={o.name} url={o.logo_url} size={28} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                {o.expired ? <span style={{ fontSize: 12, color: colors.text3 }}>انتهى</span> : o.answered ? <span className="ap-dot" style={{ background: 'var(--storely-navy)' }} title="رد جديد" /> : o.open ? <span className="ap-dot" style={{ background: '#fbbf24' }} title="بانتظار الرد" /> : null}
              </a>
            )
          })}
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--storely-fill)', color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{(data?.me.name || data?.me.email || '؟').trim()[0]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data?.me.name || 'المحاسب'}</div>
          <div style={{ fontSize: 12, color: colors.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">{data?.me.email}</div>
        </div>
        <button onClick={logout} title="خروج" aria-label="خروج" style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--storely-fill)', border: 'none', color: colors.text, borderRadius: 999, cursor: 'pointer', flexShrink: 0 }}><LogOut size={16} /></button>
      </div>
    </aside>
  )

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: colors.bg, fontFamily: font.family, color: colors.text }}>
      <style>{`
        .ap-side{position:fixed;top:0;right:0;bottom:0;width:${SIDEBAR}px;z-index:60}
        .ap-sec{display:block;font-size:13px;font-weight:600;color:${colors.text3};padding:14px 10px 6px}
        .ap-item,.ap-org{position:relative;display:flex;align-items:center;gap:10px;min-height:38px;padding:8px 10px;border-radius:10px;color:${colors.text};text-decoration:none;font-size:15px;font-weight:400;margin-bottom:2px;transition:background-color .15s,color .15s}
        .ap-item svg{color:${colors.text3};flex-shrink:0;transition:color .15s}
        .ap-item:hover,.ap-org:hover{background:var(--storely-fill)}
        .ap-item.on{background:var(--storely-fill);color:${colors.primary};font-weight:600}
        .ap-item.on svg{color:${colors.primary}}
        .ap-org{padding:7px 10px}
        .ap-org.on{background:var(--storely-fill);font-weight:600}
        .ap-badge{background:var(--storely-fill);color:${colors.text};font-size:12px;font-weight:600;border-radius:99px;min-width:20px;height:20px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center}
        .ap-item.on .ap-badge{background:#fff;color:${colors.primary}}
        .ap-dot{width:8px;height:8px;border-radius:99px;flex-shrink:0}
        .ap-main{margin-right:${SIDEBAR}px;min-height:100vh}
        .ap-top{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.82);-webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px);border-bottom:1px solid ${colors.border}}
        .ap-burger,.ap-close{display:none}
        .ap-veil{display:none}
        @media (max-width:900px){
          .ap-side{transform:translateX(100%);transition:transform .25s ease,box-shadow .25s;width:min(86vw,300px)}
          .ap-side.open{transform:none;box-shadow:-20px 0 40px rgba(0,0,0,.25)}
          .ap-main{margin-right:0}
          .ap-burger,.ap-close{display:inline-flex}
          .ap-veil.open{display:block;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:55}
        }
        .ap-mob{display:none}
        @media (max-width:760px){.ap-desk{display:none!important}.ap-mob{display:block}}
        @media (max-width:600px){.ap-lbl{display:none}.ap-body{padding:16px 16px 40px!important}.ap-head{padding:12px 16px!important}.ap-subnav{padding:0 12px!important}}
        .ap-row{cursor:pointer;transition:background .12s}.ap-row:hover{background:var(--storely-background)}
        .ap-tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;margin-bottom:-1px}
        .ap-tabs::-webkit-scrollbar{display:none}
        .ap-tab{position:relative;display:inline-flex;align-items:center;gap:6px;padding:10px 12px 12px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:15px;font-weight:500;color:${colors.text3};white-space:nowrap}
        .ap-tab:hover{color:${colors.text}}
        .ap-tab.on{color:${colors.primary};font-weight:600}.ap-tab.on::after{content:'';position:absolute;inset-inline:8px;bottom:-1px;height:2px;border-radius:2px;background:${colors.primary}}
        .ap-tab .ap-count{font-size:12px;font-weight:600;border-radius:99px;padding:0 6px;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;background:var(--storely-fill);color:${colors.text3}}
        .ap-tab .ap-count.hot{background:${colors.primary};color:#fff}
        .ap-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:8px 18px;border-radius:999px;font-size:15px;font-weight:500;text-decoration:none;white-space:nowrap;cursor:pointer;font-family:inherit;transition:background-color .15s}
        .ap-btn.pri{background:${colors.primary};color:#fff;border:1px solid ${colors.primary}}
        .ap-btn.pri:hover{background:${colors.primaryDark}}
        .ap-btn.sec{background:var(--storely-fill);color:${colors.text};border:1px solid transparent}
        .ap-btn.sec:hover{background:var(--storely-control-border)}
        @keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .8s linear infinite}
      `}</style>
      <div className={`ap-veil${open ? ' open' : ''}`} onClick={() => setOpen(false)} />
      {/* القائمة: ثابتة على الكمبيوتر، وتنزلق من اليمين على الجوال */}
      {sidebar}

      <main className="ap-main">
        <header className="ap-top">
          <div className="ap-head" style={{ maxWidth: 1320, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="ap-burger" onClick={() => setOpen(true)} aria-label="القائمة" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', border: 'none', background: 'var(--storely-fill)', color: colors.text, borderRadius: 999, cursor: 'pointer', flexShrink: 0 }}><Menu size={19} /></button>
            {orgLogo && <OrgLogo name={orgLogo.name} url={orgLogo.url} size={40} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && <h1 style={{ fontSize: 20, fontWeight:600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>}
              {subtitle && <div style={{ fontSize:13, color: colors.text3, marginTop: 2 }}>{subtitle}</div>}
            </div>
            {actions}
          </div>
          {subnav && <div className="ap-subnav" style={{ maxWidth: 1320, margin: '0 auto', padding: '0 24px' }}>{subnav}</div>}
        </header>
        <div className="ap-body" style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 24px 48px' }}>{children}</div>
      </main>
    </div>
  )
}

/** بطاقة رقم (KPI) — هادئة: عنوان ورقم كبير، واللون للتنبيه بس (ناقص/متأخر). onClick = تصفية */
export function Stat({ label, value, hint, tone = 'teal', icon, onClick, active }: { label: string; value: string; hint?: string; tone?: 'teal' | 'amber' | 'red' | 'blue'; icon?: React.ReactNode; onClick?: () => void; active?: boolean }) {
  const valueColor = tone === 'red' ? '#B42318' : tone === 'amber' ? '#B54708' : tone === 'blue' ? 'var(--storely-navy)' : colors.text
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} aria-pressed={onClick ? !!active : undefined} style={{ background: '#fff', border: `1px solid ${active ? colors.primary : 'transparent'}`, boxShadow: active ? `0 0 0 1px ${colors.primary}` : 'none', borderRadius: radius.lg, padding: 16,
      textAlign: 'start', fontFamily: 'inherit', cursor: onClick ? 'pointer' : 'default', width: '100%', color: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.text3, fontSize:13, fontWeight: 600 }}>
        {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: valueColor, marginTop: 8, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }} dir="ltr">{value}</div>
      {hint && <div style={{ fontSize:13, color: colors.text3, marginTop: 2 }}>{hint}</div>}
    </Tag>
  )
}

/** شارة حالة صغيرة بنقطة — الألوان للمعنى فقط */
export type BadgeTone = 'red' | 'amber' | 'blue' | 'green' | 'grey'
const BADGE: Record<BadgeTone, [string, string]> = { red: ['#FEF3F2', '#B42318'], amber: ['#FFFAEB', '#B54708'], blue: ['var(--storely-fill)', 'var(--storely-navy)'], green: ['#ECFDF3', '#067647'], grey: ['var(--storely-fill)', 'var(--storely-muted)'] }
export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  const [bg, fg] = BADGE[tone]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color: fg, fontSize:13, fontWeight: 600, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>
    <span style={{ width: 6, height: 6, borderRadius: 99, background: fg }} />{children}</span>
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
const PRESETS = [{ k: 'month', l: 'هذا الشهر' }, { k: 'last_month', l: 'الشهر الماضي' }, { k: 'quarter', l: 'هذا الربع' }, { k: 'last_quarter', l: 'الربع الماضي' }]

export function PeriodBar({ from, to, onChange }: { from: string; to: string; onChange: (r: { from: string; to: string }) => void }) {
  const active = PRESETS.find(p => { const r = presetRange(p.k); return r.from === from && r.to === to })?.k
  const seg = (on: boolean): React.CSSProperties => ({ flex: '1 1 auto', padding: '7px 14px', borderRadius: 999, fontSize: 15, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: font.family,
    border: 'none', background: on ? '#fff' : 'transparent', color: colors.text, boxShadow: on ? '0 1px 3px rgba(0,0,0,.12)' : 'none', whiteSpace: 'nowrap' })
  const date: React.CSSProperties = { padding: '7px 12px', borderRadius: 12, border: `1px solid var(--storely-control-border)`, fontSize: 15, fontFamily: font.family, background: '#fff', color: colors.text }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--storely-fill)', border: 'none', borderRadius: 999, overflowX: 'auto' as const }}>
        {PRESETS.map(p => <button key={p.k} onClick={() => onChange(presetRange(p.k))} aria-pressed={active === p.k} style={seg(active === p.k)}>{p.l}</button>)}
      </div>
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginInlineStart: 4 }}>
        <span style={{ fontSize:13, color: colors.text4 }}>من</span>
        <input type="date" value={from} max={to} onChange={e => e.target.value && onChange({ from: e.target.value, to })} style={date} />
        <span style={{ fontSize:13, color: colors.text4 }}>إلى</span>
        <input type="date" value={to} min={from} max={today()} onChange={e => e.target.value && onChange({ from, to: e.target.value })} style={date} />
      </span>
    </div>
  )
}
