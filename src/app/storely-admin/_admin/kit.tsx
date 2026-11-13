'use client'
// مكوّنات وألوان لوحة الإدارة — مصدر واحد لكل صفحات /storely-admin
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Inbox, Loader2, Lock, Search, X, type LucideIcon } from 'lucide-react'
import { navItemFor } from './nav'

// تصميم «Clean Modern SaaS» بألوان نظام Storely الموحّد (الكحلي — src/components/ui/design-tokens)
export const A = {
  bg: '#F7F9FA',
  surface: '#ffffff',
  sidebar: '#203640',
  muted: '#F3F5F6',
  border:'var(--storely-border)',
  borderStrong:'var(--storely-border)',
  text: '#203640',
  text2: '#4F6678',
  text3: '#66737C',
  primary: '#203640',
  primaryHover: '#16262D',
  primarySoft: '#EEF2F4',
  danger: '#B91C1C',
  dangerSoft: '#fef3f2',
  warning: '#B45309',
  warningSoft: '#fffaeb',
  info: '#175cd3',
  infoSoft: '#eff8ff',
  violet: '#6941c6',
  violetSoft: '#f4f3ff',
  radius: 10,
  radiusCard: 16,
  shadowSm: '0 1px 2px rgba(32,54,64,.04)',
  shadow: '0 1px 2px rgba(32,54,64,.04)',
  shadowLg: '0 12px 32px rgba(32,54,64,.12)',
  font: "'IBM Plex Sans Arabic', system-ui, sans-serif",
}


// ── الجلسة ──
export type AdminInfo = { id: string; email: string; full_name: string; role: string; permissions?: Record<string, boolean>; totp_enabled?: boolean }
export type AdminCounts = { addons: number; demos: number; renewals: number; support: number; inbox: number }
type Ctx = { admin: AdminInfo; can: (perm?: string | string[]) => boolean; logout: () => void; setAdmin: (a: AdminInfo) => void; counts?: AdminCounts }
/** داخل صفحة تبويبات: عنوان القسم يصير مختصر (التبويب نفسه هو العنوان) */
export const HubContext = createContext(false)
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
  d ? new Date(d).toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', year: 'numeric', month: 'short', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }) : '—'

export const daysLeft = (d?: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null)

// ── عناصر ──
/** عنوان الصفحة — أيقونته تُؤخذ تلقائياً من عنصر القائمة الجانبية للمسار الحالي */
export function PageHeader({ title, subtitle, actions, icon }: { title: string; subtitle?: ReactNode; actions?: ReactNode; icon?: LucideIcon }) {
  const pathname = usePathname() || ''
  const inHub = useContext(HubContext)
  if (inHub) return (subtitle || actions) ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      <p style={{ fontSize: 14, color: A.text2, lineHeight: 1.7, flex: '1 1 380px', minWidth: 0, maxWidth: 820 }}>{subtitle}</p>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  ) : null
  const Icon = icon || (navItemFor(pathname)?.icon as LucideIcon | undefined)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 0, maxWidth: 820, flex: '1 1 420px' }}>
        {Icon && (
          <div style={{ width: 44, height: 44, borderRadius: 12, background: A.surface, border: `1px solid ${A.border}`, boxShadow: A.shadow, color: A.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={20} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: A.text, lineHeight: 1.3 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 14, color: A.text2, marginTop: 4, lineHeight: 1.7 }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function Card({ title, subtitle, actions, children, pad = 20, style }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; pad?: number; style?: CSSProperties }) {
  return (
    <section style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: A.radiusCard, boxShadow: A.shadow, overflow: 'hidden', flexShrink: 0, ...style }}>
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

export function Stat({ label, value, hint, tone = 'default', onClick, icon: Icon, active }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'primary' | 'warning' | 'danger' | 'violet'; onClick?: () => void; icon?: LucideIcon; active?: boolean }) {
  const color = { default: A.text, primary: A.primary, warning: A.warning, danger: A.danger, violet: A.violet }[tone]
  const soft = { default: A.muted, primary: A.primarySoft, warning: A.warningSoft, danger: A.dangerSoft, violet: A.violetSoft }[tone]
  return (
    <div onClick={onClick} className={onClick ? 'adm-hover' : undefined} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      style={{ background: A.surface, border: `1px solid ${active ? A.primary : A.border}`, borderRadius: A.radiusCard, boxShadow: active ? `0 0 0 3px ${A.primary}1a` : A.shadow, padding: '18px 20px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: A.text2 }}>{label}</div>
        {Icon && <div style={{ width: 32, height: 32, borderRadius: 9, background: soft, color: tone === 'default' ? A.text2 : color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={16} /></div>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginTop: Icon ? 4 : 8, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: A.text3, marginTop: 6 }}>{hint}</div>}
    </div>
  )
}

// ألوان دلالية من نظام Storely: نجاح، تنبيه، خطر، معلومة — مع حد بلون الحالة
const TONES = {
  neutral: { bg: '#F7F9FA', fg: '#4F6678', border: '#E2E7EA' },
  primary: { bg: '#ECFDF5', fg: '#047857', border: '#A7F3D0' },
  warning: { bg: '#FFFBEB', fg: '#B45309', border: '#FDE68A' },
  danger: { bg: '#FEF2F2', fg: '#B91C1C', border: '#FECACA' },
  info: { bg: '#F3F5F6', fg: '#4F6678', border: '#CBD4DC' },
  violet: { bg: '#F3F5F6', fg: '#4F6678', border: '#CBD4DC' },
}
export type Tone = keyof typeof TONES
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: t.bg, color: t.fg, border: `1px solid ${t.border}`, fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 99, whiteSpace: 'nowrap', lineHeight: 1.6 }}>{children}</span>
}

type BtnKind = 'primary' | 'secondary' | 'danger' | 'ghost'
export function Btn({ kind = 'secondary', children, onClick, disabled, loading, type = 'button', full, small, title }: {
  kind?: BtnKind; children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; type?: 'button' | 'submit'; full?: boolean; small?: boolean; title?: string
}) {
  const s: Record<BtnKind, CSSProperties> = {
    primary: { background: A.primary, color: 'white', border: `1px solid ${A.primary}` },
    secondary: { background: A.surface, color: A.text, border: `1px solid ${A.borderStrong}`, boxShadow: A.shadowSm },
    danger: { background: A.surface, color: A.danger, border:`1px solid #fecdca`, boxShadow: A.shadowSm },
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

export function Loading({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return (
    <div style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: A.text3, fontSize: 13 }}>
      <Loader2 size={16} className="adm-spin" /> {label}
    </div>
  )
}

export function Empty({ title, hint, icon: Icon = Inbox, action }: { title: string; hint?: ReactNode; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: A.muted, color: A.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Icon size={22} /></div>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: A.text }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: A.text3, marginTop: 4, maxWidth: 420, lineHeight: 1.7 }}>{hint}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

export function Notice({ tone = 'info', children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  const t = TONES[tone]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: A.surface, color: t.fg, border: `1px solid ${t.border}`, borderRadius: 12, padding: '12px 16px', fontSize: 13.5, fontWeight: 500, lineHeight: 1.7 }}>
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
              <th key={i} style={{ textAlign: 'right', padding: '11px 16px', fontSize: 12.5, fontWeight: 600, color: A.text3, background:'#fafbfc', borderBottom: `1px solid ${A.border}`, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export const td: CSSProperties = { padding: '14px 16px', borderBottom: `1px solid ${A.border}`, fontSize: 13.5, color: A.text, verticalAlign: 'middle' }

// ── مكوّنات مشتركة إضافية ──

/** شبكة بطاقات الأرقام */
export function StatGrid({ children, min = 200 }: { children: ReactNode; min?: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(min(${min}px,100%),1fr))`, gap: 16 }}>{children}</div>
}

/** عمود بمسافات ثابتة بين الأقسام */
export function Stack({ children, gap = 20, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>{children}</div>
}

/** حقل بحث بأيقونة وزر مسح */
export function SearchBox({ value, onChange, placeholder = 'بحث', onSubmit, style }: { value: string; onChange: (v: string) => void; placeholder?: string; onSubmit?: () => void; style?: CSSProperties }) {
  return (
    <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 0, ...style }}>
      <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: A.text3, pointerEvents: 'none' }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        onKeyDown={e => { if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit() } }}
        style={{ ...inputStyle, paddingRight: 38, paddingLeft: value ? 34 : 12 }} />
      {value && (
        <button type="button" onClick={() => { onChange(''); if (onSubmit) setTimeout(onSubmit, 0) }} aria-label="مسح البحث"
          style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: 6, border: 'none', background: A.muted, color: A.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={13} />
        </button>
      )}
    </div>
  )
}

/** تبويبات مقسّمة (Segmented) — للتصفية بين الحالات */
export function Tabs<K extends string>({ items, value, onChange }: { items: { k: K; l: string; n?: number }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div role="tablist" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 2, padding: 3, background: A.muted, border: `1px solid ${A.border}`, borderRadius: 11, maxWidth: '100%' }}>
      {items.map(it => {
        const on = it.k === value
        return (
          <button key={it.k} role="tab" aria-selected={on} type="button" onClick={() => onChange(it.k)} className="adm-tab"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
              background: on ? A.primary : 'transparent', color: on ? '#fff' : A.text2, boxShadow: 'none' }}>
            {it.l}
            {it.n !== undefined && <span style={{ fontSize: 11.5, fontWeight: 600, minWidth: 20, padding: '0 6px', height: 18, borderRadius: 99, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'rgba(255,255,255,.18)' : A.surface, color: on ? '#fff' : A.text3 }}>{it.n}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** شريط أدوات داخل البطاقة (بحث + تصفية) */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${A.border}` }}>{children}</div>
}

const AVATAR_TINTS = [['#F3F5F6', '#203640']]
/** دائرة بالحرف الأول من الاسم — لونها ثابت لنفس الاسم */
export function Avatar({ name, size = 36 }: { name?: string | null; size?: number }) {
  const n = (name || '').trim()
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
  const [bg, fg] = AVATAR_TINTS[h % AVATAR_TINTS.length]
  return <div aria-hidden style={{ width: size, height: size, borderRadius: size >= 40 ? 12 : 10, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: size * 0.4, flexShrink: 0 }}>{n[0] || '؟'}</div>
}

/** صف داخل بطاقة (قائمة) — مع حد علوي بين الصفوف */
export function Row({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  const st: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${A.border}`, width: '100%', ...style }
  if (onClick) return <button type="button" onClick={onClick} className="adm-row-btn" style={{ ...st, border: 'none', borderBottom: `1px solid ${A.border}`, background: 'transparent', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'right', color: 'inherit' }}>{children}</button>
  return <div className="adm-list-row" style={st}>{children}</div>
}

/** صفحة بدون صلاحية */
export function NoAccess({ title }: { title?: string }) {
  return <Card><Empty icon={Lock} title={title || 'لا تملك صلاحية الوصول إلى هذه الصفحة'} hint="تواصل مع المشرف الكامل لمنحك الصلاحية المطلوبة" /></Card>
}

/** رابط بشكل زر (للروابط الخارجية مثل واتساب والتحميل) */
export function LinkBtn({ href, children, kind = 'secondary', small }: { href: string; children: ReactNode; kind?: 'primary' | 'secondary'; small?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`adm-btn adm-btn-${kind}`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: small ? 30 : 38, padding: small ? '4px 10px' : '8px 16px', borderRadius: small ? 8 : 10, fontSize: small ? 12.5 : 13.5, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
        ...(kind === 'primary' ? { background: A.primary, color: 'white', border: `1px solid ${A.primary}` } : { background: A.surface, color: A.text, border: `1px solid ${A.borderStrong}`, boxShadow: A.shadowSm }) }}>
      {children}
    </a>
  )
}

export const ADMIN_CSS = `
  .adm-root *{box-sizing:border-box}
  .adm-root{-webkit-font-smoothing:antialiased}
  .adm-root input:focus,.adm-root select:focus,.adm-root textarea:focus{border-color:${A.primary}!important;box-shadow:0 0 0 3px rgba(32,54,64,.14)!important;outline:none}
  .adm-root button:focus-visible,.adm-root a:focus-visible{outline:2px solid ${A.primary};outline-offset:2px}
  .adm-root tbody tr:last-child td{border-bottom:none}
  .adm-btn{transition:background .15s,border-color .15s,color .15s,box-shadow .15s}
  .adm-btn-primary:hover:not(:disabled){background:${A.primaryHover}!important}
  .adm-btn-secondary:hover:not(:disabled){background:var(--storely-background)!important;border-color:${A.borderStrong}!important}
  .adm-btn-danger:hover:not(:disabled){background:${A.dangerSoft}!important}
  .adm-btn-ghost:hover:not(:disabled){background:${A.muted}!important}
  .adm-hover{transition:border-color .15s,box-shadow .15s,transform .15s}
  .adm-hover:hover{border-color:${A.borderStrong}!important;box-shadow:0 6px 16px -6px rgba(16,24,40,.12)!important}
  .adm-row{cursor:pointer;transition:background .1s}
  .adm-row:hover td{background:var(--storely-background)}
  .adm-row-btn:hover{background:var(--storely-background)!important}
  .adm-row-btn:last-child,.adm-list-row:last-child{border-bottom:none!important}
  .adm-tab:hover[aria-selected=false]{color:${A.text}!important;background:rgba(255,255,255,.6)!important}
  .adm-bar{transition:opacity .12s}
  .adm-bar:hover{opacity:1!important}
  .adm-spin{animation:admSpin .8s linear infinite}
  @keyframes admSpin{to{transform:rotate(360deg)}}
  @keyframes admDrawer{from{transform:translateX(-24px);opacity:0}to{transform:none;opacity:1}}
  @media(max-width:1000px){.adm-two{grid-template-columns:1fr!important}}
  @media(max-width:900px){.adm-root input,.adm-root select,.adm-root textarea{font-size:16px!important}}
`
