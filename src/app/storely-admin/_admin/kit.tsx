'use client'
// مكوّنات وألوان لوحة الإدارة — مصدر واحد لكل صفحات /storely-admin
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'

// تصميم «Clean Modern SaaS»: خلفية فاتحة، بطاقات بيضاء بزوايا دائرية وظلال ناعمة وحدود خفيفة
export const A = {
  bg: '#f7f8fa',
  surface: '#ffffff',
  sidebar: '#ffffff',
  muted: '#f4f5f7',
  border: '#eaecf0',
  borderStrong: '#dfe2e7',
  text: '#101828',
  text2: '#475467',
  text3: '#667085',
  primary: '#0f8f8c',
  primaryHover: '#0b7573',
  primarySoft: '#e7f6f5',
  danger: '#d92d20',
  dangerSoft: '#fef3f2',
  warning: '#b54708',
  warningSoft: '#fffaeb',
  info: '#175cd3',
  infoSoft: '#eff8ff',
  violet: '#6941c6',
  violetSoft: '#f4f3ff',
  radius: 10,
  radiusCard: 16,
  shadowSm: '0 1px 2px rgba(16,24,40,.04)',
  shadow: '0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.03)',
  shadowLg: '0 12px 32px -8px rgba(16,24,40,.14), 0 4px 8px -4px rgba(16,24,40,.06)',
  font: "'IBM Plex Sans Arabic', system-ui, sans-serif",
}


// ── الجلسة ──
export type AdminInfo = { id: string; email: string; full_name: string; role: string; permissions?: Record<string, boolean>; totp_enabled?: boolean }
type Ctx = { admin: AdminInfo; can: (perm?: string | string[]) => boolean; logout: () => void; setAdmin: (a: AdminInfo) => void }
export const AdminContext = createContext<Ctx | null>(null)
export function useAdmin() {
  const c = useContext(AdminContext)
  if (!c) throw new Error('useAdmin outside admin layout')
  return c
}

export function adminKey() {
  try { return sessionStorage.getItem('storely_admin_pass') || '' } catch { return '' }
}

/** fetch لمسارات /api/admin/* مع مفتاح الجلسة — يرجع JSON دايماً ({success:false,error} عند الفشل) */
export async function adminFetch(path: string, opts: { method?: string; body?: unknown } = {}): Promise<any> {
  try {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: { 'x-admin-key': adminKey(), ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
    const j = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, ...j }
  } catch {
    return { ok: false, success: false, error: 'خطأ بالاتصال' }
  }
}

export const fmtDate = (d?: string | null, withTime = false) =>
  d ? new Date(d).toLocaleDateString('ar-SA', { numberingSystem: 'latn', year: 'numeric', month: 'short', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }) : '—'

export const daysLeft = (d?: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null)

// ── عناصر ──
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
      <div style={{ minWidth: 0, maxWidth: 760 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: A.text, lineHeight: 1.3 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14, color: A.text2, marginTop: 6, lineHeight: 1.7 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function Card({ title, subtitle, actions, children, pad = 20, style }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; pad?: number; style?: CSSProperties }) {
  return (
    <section style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: A.radiusCard, boxShadow: A.shadow, overflow: 'hidden', ...style }}>
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: `16px ${Math.max(pad, 20)}px`, borderBottom: `1px solid ${A.border}` }}>
          <div style={{ minWidth: 0 }}>
            {title && <div style={{ fontSize: 15, fontWeight: 600, color: A.text }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12.5, color: A.text3, marginTop: 3 }}>{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, hint, tone = 'default', onClick }: { label: string; value: ReactNode; hint?: string; tone?: 'default' | 'primary' | 'warning' | 'danger' | 'violet'; onClick?: () => void }) {
  const color = { default: A.text, primary: A.primary, warning: A.warning, danger: A.danger, violet: A.violet }[tone]
  return (
    <div onClick={onClick} className={onClick ? 'adm-hover' : undefined}
      style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: A.radiusCard, boxShadow: A.shadow, padding: '18px 20px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: A.text2 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginTop: 8, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: A.text3, marginTop: 6 }}>{hint}</div>}
    </div>
  )
}

const TONES = {
  neutral: { bg: A.muted, fg: '#344054' },
  primary: { bg: A.primarySoft, fg: A.primary },
  warning: { bg: A.warningSoft, fg: A.warning },
  danger: { bg: A.dangerSoft, fg: A.danger },
  info: { bg: A.infoSoft, fg: A.info },
  violet: { bg: A.violetSoft, fg: A.violet },
}
export type Tone = keyof typeof TONES
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: t.bg, color: t.fg, border: `1px solid ${t.fg}1f`, fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 99, whiteSpace: 'nowrap', lineHeight: 1.6 }}>{children}</span>
}

type BtnKind = 'primary' | 'secondary' | 'danger' | 'ghost'
export function Btn({ kind = 'secondary', children, onClick, disabled, loading, type = 'button', full, small, title }: {
  kind?: BtnKind; children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; type?: 'button' | 'submit'; full?: boolean; small?: boolean; title?: string
}) {
  const s: Record<BtnKind, CSSProperties> = {
    primary: { background: A.primary, color: 'white', border: `1px solid ${A.primary}`, boxShadow: '0 1px 2px rgba(15,143,140,.25)' },
    secondary: { background: A.surface, color: A.text, border: `1px solid ${A.borderStrong}`, boxShadow: A.shadowSm },
    danger: { background: A.surface, color: A.danger, border: `1px solid #fecdca`, boxShadow: A.shadowSm },
    ghost: { background: 'transparent', color: A.text2, border: '1px solid transparent' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} title={title} className={`adm-btn adm-btn-${kind}`}
      style={{ ...s[kind], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: small ? 30 : 38, padding: small ? '4px 10px' : '8px 16px', borderRadius: small ? 8 : 10,
        fontSize: small ? 12.5 : 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        width: full ? '100%' : undefined, whiteSpace: 'nowrap' }}>
      {loading && <Loader2 size={14} className="adm-spin" />}
      {children}
    </button>
  )
}

export const inputStyle: CSSProperties = {
  width: '100%', minHeight: 40, padding: '9px 12px', border: `1px solid ${A.borderStrong}`, borderRadius: 10, fontSize: 14,
  fontFamily: 'inherit', background: A.surface, color: A.text, outline: 'none', boxShadow: A.shadowSm,
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: A.text, marginBottom: 6 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 12, color: A.text3, marginTop: 5 }}>{hint}</div>}
    </label>
  )
}

export function Loading({ label = 'جاري التحميل...' }: { label?: string }) {
  return (
    <div style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: A.text3, fontSize: 13 }}>
      <Loader2 size={16} className="adm-spin" /> {label}
    </div>
  )
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: A.text }}>{title}</div>
      {hint && <div style={{ fontSize: 12.5, color: A.text3, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export function Notice({ tone = 'info', children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  const t = TONES[tone]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: t.bg, color: t.fg, border: `1px solid ${t.fg}24`, borderRadius: 12, padding: '12px 16px', fontSize: 13.5, fontWeight: 500, lineHeight: 1.7 }}>
      <div style={{ flex: 1 }}>{children}</div>
      {action}
    </div>
  )
}

/** لوحة جانبية تنزلق من اليسار (الواجهة عربية: القائمة يمين والتفاصيل يسار) */
export function Drawer({ open, onClose, title, subtitle, children, width = 520 }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; width?: number }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(16,24,40,.32)', backdropFilter: 'blur(2px)' }} />
      <aside style={{ position: 'absolute', top: 8, bottom: 8, left: 8, width: `min(${width}px, calc(100vw - 16px))`, background: A.bg, borderRadius: 20, overflow: 'hidden', border: `1px solid ${A.border}`, boxShadow: A.shadowLg, display: 'flex', flexDirection: 'column', animation: 'admDrawer .2s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', background: A.surface, borderBottom: `1px solid ${A.border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: A.text }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: A.text2, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="adm-btn" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${A.border}`, background: A.surface, boxShadow: A.shadowSm, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: A.text2 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
      </aside>
    </div>
  )
}

/** جدول بسيط: رؤوس + صفوف، مع تمرير أفقي على الشاشات الصغيرة */
export function Table({ head, children, minWidth = 720 }: { head: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} style={{ textAlign: 'right', padding: '11px 16px', fontSize: 12.5, fontWeight: 600, color: A.text3, background: '#fafbfc', borderBottom: `1px solid ${A.border}`, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export const td: CSSProperties = { padding: '14px 16px', borderBottom: `1px solid ${A.border}`, fontSize: 13.5, color: A.text, verticalAlign: 'middle' }

export const ADMIN_CSS = `
  .adm-root *{box-sizing:border-box}
  .adm-root{-webkit-font-smoothing:antialiased}
  .adm-root input:focus,.adm-root select:focus,.adm-root textarea:focus{border-color:${A.primary}!important;box-shadow:0 0 0 4px ${A.primary}1a!important;outline:none}
  .adm-root button:focus-visible,.adm-root a:focus-visible{outline:2px solid ${A.primary};outline-offset:2px}
  .adm-root tbody tr:last-child td{border-bottom:none}
  .adm-btn{transition:background .15s,border-color .15s,color .15s,box-shadow .15s}
  .adm-btn-primary:hover:not(:disabled){background:${A.primaryHover}!important}
  .adm-btn-secondary:hover:not(:disabled){background:#f9fafb!important;border-color:${A.borderStrong}!important}
  .adm-btn-danger:hover:not(:disabled){background:${A.dangerSoft}!important}
  .adm-btn-ghost:hover:not(:disabled){background:${A.muted}!important}
  .adm-hover{transition:border-color .15s,box-shadow .15s,transform .15s}
  .adm-hover:hover{border-color:${A.borderStrong}!important;box-shadow:0 6px 16px -6px rgba(16,24,40,.12)!important}
  .adm-row{cursor:pointer;transition:background .1s}
  .adm-row:hover td{background:#f9fafb}
  .adm-row-btn:hover{background:#f9fafb!important}
  .adm-row-btn:last-child{border-bottom:none!important}
  .adm-spin{animation:admSpin .8s linear infinite}
  @keyframes admSpin{to{transform:rotate(360deg)}}
  @keyframes admDrawer{from{transform:translateX(-24px);opacity:0}to{transform:none;opacity:1}}
  @media(max-width:900px){.adm-root input,.adm-root select,.adm-root textarea{font-size:16px!important}}
`
