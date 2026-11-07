'use client'
// مكوّنات وألوان لوحة الإدارة — مصدر واحد لكل صفحات /storely-admin
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

export const A = {
  bg: storelyTokens.color.background,
  surface: storelyTokens.color.surface,
  sidebar: storelyTokens.color.navy,
  border: storelyTokens.color.border,
  borderStrong: storelyTokens.color.border,
  text: storelyTokens.color.text,
  text2: storelyTokens.color.textMuted,
  text3: storelyTokens.color.textMuted,
  primary: storelyTokens.color.navy,
  primaryHover: storelyTokens.color.navyHover,
  primarySoft: storelyTokens.color.background,
  danger: storelyTokens.color.danger,
  dangerSoft: storelyTokens.color.dangerBg,
  warning: storelyTokens.color.warning,
  warningSoft: storelyTokens.color.warningBg,
  info: storelyTokens.color.info,
  infoSoft: storelyTokens.color.infoBg,
  violet: storelyTokens.color.info,
  violetSoft: storelyTokens.color.infoBg,
  radius: storelyTokens.radius.card,
  font: storelyTokens.typography.family,
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
  return <StorelyPageHeader title={title} description={subtitle} actions={actions} />
}

export function Card({ title, subtitle, actions, children, pad = 20, style }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; pad?: number; style?: CSSProperties }) {
  return <StorelyCard title={title} description={(title || actions) ? subtitle : undefined} actions={actions} style={style}>
    <div style={{ padding: pad }}>{children}</div>
  </StorelyCard>
}

export function Stat({ label, value, hint, tone = 'default', onClick }: { label: string; value: ReactNode; hint?: string; tone?: 'default' | 'primary' | 'warning' | 'danger' | 'violet'; onClick?: () => void }) {
  const color = { default: A.text, primary: A.primary, warning: A.warning, danger: A.danger, violet: A.violet }[tone]
  return (
    <div onClick={onClick} className={`storely-metric${onClick ? ' adm-hover' : ''}`} style={{cursor:onClick?'pointer':'default'}}>
      <div className="storely-metric-label">{label}</div>
      <div className="storely-metric-value" style={{color}}>{value}</div>
      {hint && <div className="storely-metric-helper">{hint}</div>}
    </div>
  )
}

const TONES = {
  neutral: { bg: storelyTokens.color.background, fg: A.text2, border: A.border },
  primary: { bg: storelyTokens.color.successBg, fg: storelyTokens.color.success, border: storelyTokens.color.successBorder },
  warning: { bg: A.warningSoft, fg: A.warning, border: storelyTokens.color.warningBorder },
  danger: { bg: A.dangerSoft, fg: A.danger, border: storelyTokens.color.dangerBorder },
  info: { bg: A.infoSoft, fg: A.info, border: storelyTokens.color.infoBorder },
  violet: { bg: A.violetSoft, fg: A.violet, border: storelyTokens.color.infoBorder },
}
export type Tone = keyof typeof TONES
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone]
  return <span className="storely-badge" style={{background:t.bg,color:t.fg,borderColor:t.border}}>{children}</span>
}

type BtnKind = 'primary' | 'secondary' | 'danger' | 'ghost'
export function Btn({ kind = 'secondary', children, onClick, disabled, loading, type = 'button', full, small, title }: {
  kind?: BtnKind; children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; type?: 'button' | 'submit'; full?: boolean; small?: boolean; title?: string
}) {
  return (
    <StorelyButton type={type} onClick={onClick} disabled={disabled || loading} title={title} variant={kind} size={small?'sm':'md'} className={`adm-btn adm-btn-${kind}`} style={{width:full?'100%':undefined}}>
      {loading && <Loader2 size={14} className="adm-spin" />}
      {children}
    </StorelyButton>
  )
}

export const inputStyle: CSSProperties = {
  width: '100%', minHeight: storelyTokens.control.medium,
  padding: `${storelyTokens.spacing[2]}px ${storelyTokens.spacing[3]}px`,
  border: `1px solid ${A.borderStrong}`, borderRadius: storelyTokens.radius.control,
  fontSize: storelyTokens.typography.body, fontFamily: 'inherit', background: A.surface, color: A.text, outline: 'none',
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="storely-field block">
    <div className="storely-field-label">{label}</div>
    <div className="storely-field-control">{children}</div>
    {hint && <div className="storely-field-description">{hint}</div>}
  </label>
}

export function Loading({ label = 'جاري التحميل...' }: { label?: string }) {
  return <div className="storely-loading"><Loader2 size={16} className="adm-spin" /> {label}</div>
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return <StorelyEmptyState title={title} description={hint} className="!border-0" />
}

export function Notice({ tone = 'info', children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  const t = TONES[tone]
  return <div className="storely-notice" style={{color:t.fg,borderColor:t.fg+'44'}}>
    <div className="storely-notice-body">{children}</div>{action}
  </div>
}

/** Keep the existing left-hand drawer workflow. */
export function Drawer({ open, onClose, title, subtitle, children, width = 520 }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; width?: number }) {
  if (!open) return null
  return (
    <div className="storely-drawer">
      <div onClick={onClose} className="storely-drawer-backdrop" />
      <aside className="storely-drawer-panel" style={{width:`min(${width}px, 100vw)`}}>
        <div className="storely-drawer-header">
          <div className="min-w-0 flex-1 break-words">
            <div className="storely-dialog-title">{title}</div>
            {subtitle && <div className="storely-card-description">{subtitle}</div>}
          </div>
          <StorelyButton onClick={onClose} aria-label="إغلاق" size="sm" className="!w-9 !px-0"><X size={16} /></StorelyButton>
        </div>
        <div className="storely-drawer-body">{children}</div>
      </aside>
    </div>
  )
}

export function Table({ head, children, minWidth = 720 }: { head: string[]; children: ReactNode; minWidth?: number }) {
  return <div className="storely-table-scroll"><table className="storely-table" style={{minWidth}}>
    <thead><tr>{head.map((h,i)=><th key={i}>{h}</th>)}</tr></thead>
    <tbody>{children}</tbody>
  </table></div>
}

export const td: CSSProperties = {
  padding: `${storelyTokens.spacing[5]}px`, borderBottom: `1px solid ${A.border}`,
  fontSize: storelyTokens.typography.body, color: A.text, verticalAlign: 'middle',
}

export const ADMIN_CSS = `
  .adm-root *{box-sizing:border-box}
  .adm-root input:focus,.adm-root select:focus,.adm-root textarea:focus{border-color:${A.primary}!important;box-shadow:${storelyTokens.shadow.focus}!important;outline:none}
  .adm-btn{transition:background .12s,border-color .12s,color .12s}
  .adm-hover{transition:border-color .12s,box-shadow .12s}
  .adm-hover:hover{border-color:${A.borderStrong}!important;box-shadow:0 1px 3px rgba(16,24,40,.08)}
  .adm-row{cursor:pointer;transition:background .1s}
  .adm-row:hover td{background:${storelyTokens.color.background}}
  .adm-row-btn:hover{background:${storelyTokens.color.background}!important}
  .adm-row-btn:last-child{border-bottom:none!important}
  .adm-spin{animation:admSpin .8s linear infinite}
  @keyframes admSpin{to{transform:rotate(360deg)}}
  @keyframes admDrawer{from{transform:translateX(-24px);opacity:0}to{transform:none;opacity:1}}
`
