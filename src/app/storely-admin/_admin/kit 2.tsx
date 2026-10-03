'use client'
// مكوّنات وألوان لوحة الإدارة — مصدر واحد لكل صفحات /storely-admin
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'

export const A = {
  bg: '#f6f7f9',
  surface: '#ffffff',
  sidebar: '#0b1f1e',
  border: '#e6e8ec',
  borderStrong: '#d5d9df',
  text: '#101828',
  text2: '#475467',
  text3: '#98a2b3',
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
  font: "'IBM Plex Sans Arabic', system-ui, sans-serif",
}

// ألوان الصفحات القديمة (كانت داكنة) — نفس المفاتيح، بثيم اللوحة الفاتح
export const LEGACY_C = {
  bg: A.bg, card: A.surface, border: A.border, text: A.text, text2: A.text2, text3: A.text3,
  green: A.primary, blue: A.info, purple: A.violet, red: A.danger, amber: A.warning, yellow: A.warning,
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
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text, letterSpacing: '-.2px' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: A.text2, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function Card({ title, subtitle, actions, children, pad = 20, style }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; pad?: number; style?: CSSProperties }) {
  return (
    <section style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 12, ...style }}>
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: `14px ${Math.max(pad, 18)}px`, borderBottom: `1px solid ${A.border}` }}>
          <div>
            {title && <div style={{ fontSize: 14, fontWeight: 700, color: A.text }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, color: A.text3, marginTop: 2 }}>{subtitle}</div>}
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
      style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 12, padding: '16px 18px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: A.text2 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {hint && <div style={{ fontSize: 11.5, color: A.text3, marginTop: 2 }}>{hint}</div>}
    </div>
  )
}

const TONES = {
  neutral: { bg: '#f2f4f7', fg: '#344054' },
  primary: { bg: A.primarySoft, fg: A.primary },
  warning: { bg: A.warningSoft, fg: A.warning },
  danger: { bg: A.dangerSoft, fg: A.danger },
  info: { bg: A.infoSoft, fg: A.info },
  violet: { bg: A.violetSoft, fg: A.violet },
}
export type Tone = keyof typeof TONES
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: t.bg, color: t.fg, fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, whiteSpace: 'nowrap' }}>{children}</span>
}

type BtnKind = 'primary' | 'secondary' | 'danger' | 'ghost'
export function Btn({ kind = 'secondary', children, onClick, disabled, loading, type = 'button', full, small, title }: {
  kind?: BtnKind; children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; type?: 'button' | 'submit'; full?: boolean; small?: boolean; title?: string
}) {
  const s: Record<BtnKind, CSSProperties> = {
    primary: { background: A.primary, color: 'white', border: `1px solid ${A.primary}` },
    secondary: { background: A.surface, color: A.text, border: `1px solid ${A.borderStrong}` },
    danger: { background: A.surface, color: A.danger, border: `1px solid #fecdca` },
    ghost: { background: 'transparent', color: A.text2, border: '1px solid transparent' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} title={title} className={`adm-btn adm-btn-${kind}`}
      style={{ ...s[kind], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: small ? '6px 10px' : '9px 14px', borderRadius: 8,
        fontSize: small ? 12 : 13, fontWeight: 700, fontFamily: 'inherit', cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        width: full ? '100%' : undefined, whiteSpace: 'nowrap' }}>
      {loading && <Loader2 size={14} className="adm-spin" />}
      {children}
    </button>
  )
}

export const inputStyle: CSSProperties = {
  width: '100%', padding: '9px 12px', border: `1px solid ${A.borderStrong}`, borderRadius: 8, fontSize: 13,
  fontFamily: 'inherit', background: A.surface, color: A.text, outline: 'none',
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: A.text2, marginBottom: 6 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: A.text3, marginTop: 4 }}>{hint}</div>}
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
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: A.text2 }}>{title}</div>
      {hint && <div style={{ fontSize: 12.5, color: A.text3, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export function Notice({ tone = 'info', children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  const t = TONES[tone]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: t.bg, color: t.fg, border: `1px solid ${t.fg}22`, borderRadius: 10, padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>
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
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(16,24,40,.35)' }} />
      <aside style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `min(${width}px, 100vw)`, background: A.bg, boxShadow: '8px 0 32px rgba(16,24,40,.15)', display: 'flex', flexDirection: 'column', animation: 'admDrawer .2s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: A.surface, borderBottom: `1px solid ${A.border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: A.text }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: A.text2, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="adm-btn" style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${A.border}`, background: A.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: A.text2 }}>
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
              <th key={i} style={{ textAlign: 'right', padding: '10px 16px', fontSize: 12, fontWeight: 700, color: A.text2, background: '#f9fafb', borderBottom: `1px solid ${A.border}`, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export const td: CSSProperties = { padding: '12px 16px', borderBottom: `1px solid ${A.border}`, fontSize: 13, color: A.text, verticalAlign: 'middle' }

export const ADMIN_CSS = `
  .adm-root *{box-sizing:border-box}
  .adm-root input:focus,.adm-root select:focus,.adm-root textarea:focus{border-color:${A.primary}!important;box-shadow:0 0 0 3px ${A.primary}22!important;outline:none}
  .adm-btn{transition:background .12s,border-color .12s,color .12s}
  .adm-btn-primary:hover:not(:disabled){background:${A.primaryHover}!important}
  .adm-btn-secondary:hover:not(:disabled){background:#f9fafb!important}
  .adm-btn-danger:hover:not(:disabled){background:${A.dangerSoft}!important}
  .adm-btn-ghost:hover:not(:disabled){background:#f2f4f7!important}
  .adm-hover{transition:border-color .12s,box-shadow .12s}
  .adm-hover:hover{border-color:${A.borderStrong}!important;box-shadow:0 1px 3px rgba(16,24,40,.08)}
  .adm-row{cursor:pointer;transition:background .1s}
  .adm-row:hover td{background:#f9fafb}
  .adm-row-btn:hover{background:#f9fafb!important}
  .adm-row-btn:last-child{border-bottom:none!important}
  .adm-spin{animation:admSpin .8s linear infinite}
  @keyframes admSpin{to{transform:rotate(360deg)}}
  @keyframes admDrawer{from{transform:translateX(-24px);opacity:0}to{transform:none;opacity:1}}
`
