'use client'
import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, TrendingUp, Inbox, Truck, Handshake, Bell, Megaphone,
  Activity, Gauge, MessageCircle, HardDrive, ScrollText, FileCheck, ShieldAlert,
  Package, UserCog, Settings, LogOut, Menu, X,
} from 'lucide-react'
import AdminLogin from './_admin/Login'
import { A, ADMIN_CSS, AdminContext, adminKey, type AdminInfo } from './_admin/kit'

type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }>; perm?: string | string[] }

// perm: صلاحية مطلوبة (أو أي وحدة من القائمة). بدون perm = للمشرف الكامل فقط
const NAV: { title: string; items: NavItem[] }[] = [
  { title: 'الرئيسية', items: [
    { href: '/storely-admin', label: 'نظرة عامة', icon: LayoutDashboard, perm: ['manage_users', 'view_analytics', 'view_metrics'] },
    { href: '/storely-admin/customers', label: 'العملاء', icon: Users, perm: 'manage_users' },
    { href: '/storely-admin/metrics', label: 'مقاييس الإيراد', icon: TrendingUp, perm: 'view_metrics' },
  ] },
  { title: 'المبيعات والشراكات', items: [
    { href: '/storely-admin/demo-requests', label: 'طلبات العرض', icon: Inbox },
    { href: '/storely-admin/supplier-applications', label: 'طلبات الموردين', icon: Truck, perm: 'manage_suppliers' },
    { href: '/storely-admin/partners', label: 'الشركاء', icon: Handshake },
  ] },
  { title: 'التواصل', items: [
    { href: '/storely-admin/notifications', label: 'إشعارات العملاء', icon: Bell },
    { href: '/storely-admin/marquee-messages', label: 'الشريط الإخباري', icon: Megaphone },
  ] },
  { title: 'النظام', items: [
    { href: '/storely-admin/health', label: 'صحة النظام', icon: Activity },
    { href: '/storely-admin/monitoring', label: 'المراقبة', icon: Gauge },
    { href: '/storely-admin/notification-health', label: 'صحة واتساب', icon: MessageCircle },
    { href: '/storely-admin/backups', label: 'النسخ الاحتياطية', icon: HardDrive, perm: 'manage_backups' },
  ] },
  { title: 'الأمان', items: [
    { href: '/storely-admin/audit-log', label: 'سجل التدقيق', icon: ScrollText },
    { href: '/storely-admin/consent-logs', label: 'سجلات الموافقة', icon: FileCheck },
    { href: '/storely-admin/duplicate-registrations', label: 'تسجيلات مشبوهة', icon: ShieldAlert },
  ] },
  { title: 'الإعدادات', items: [
    { href: '/storely-admin/packages', label: 'الباقات والأسعار', icon: Package, perm: 'manage_packages' },
    { href: '/storely-admin/admins', label: 'المشرفون', icon: UserCog },
    { href: '/storely-admin/settings', label: 'إعدادات المنصة', icon: Settings },
  ] },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<AdminInfo | null>(null)
  const [checking, setChecking] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  // الجلسة تبقى بعد تحديث الصفحة: نتحقق من الرمز المحفوظ بدل ما نطلب دخول من جديد
  useEffect(() => {
    let cancelled = false
    const key = adminKey()
    if (!key) { setChecking(false); return }
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.authenticated) {
          let saved: Partial<AdminInfo> = {}
          try { saved = JSON.parse(sessionStorage.getItem('storely_admin_info') || '{}') } catch {}
          setAdmin({ ...saved, ...d.admin })
        } else {
          sessionStorage.removeItem('storely_admin_pass')
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const can = useCallback((perm?: string | string[]) => {
    if (!admin) return false
    if (admin.role === 'super_admin') return true
    if (!perm) return false
    const perms = Array.isArray(perm) ? perm : [perm]
    return perms.some(p => admin.permissions?.[p])
  }, [admin])

  function logout() {
    sessionStorage.removeItem('storely_admin_pass')
    sessionStorage.removeItem('storely_admin_session_token')
    sessionStorage.removeItem('storely_admin_info')
    document.cookie = 'storely_admin_token=;path=/;max-age=0'
    document.cookie = 'storely_admin_auth=;path=/;max-age=0'
    setAdmin(null)
    router.push('/storely-admin')
  }

  const shell = (content: React.ReactNode) => (
    <div className="adm-root" dir="rtl" style={{ minHeight: '100vh', background: A.bg, fontFamily: A.font, color: A.text }}>
      <style>{ADMIN_CSS + SHELL_CSS}</style>
      {content}
    </div>
  )

  if (checking) return shell(null)
  if (!admin) return shell(<AdminLogin onLogin={a => setAdmin(a)} />)

  const groups = NAV.map(g => ({ ...g, items: g.items.filter(i => can(i.perm)) })).filter(g => g.items.length)
  const isActive = (href: string) => href === '/storely-admin' ? pathname === href : pathname.startsWith(href)

  const sidebar = (
    <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/icon-192.png" alt="" width={32} height={32} style={{ borderRadius: 8 }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Storely</div>
          <div style={{ fontSize: 11, color: '#8fb3b1' }}>لوحة الإدارة</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 12px' }}>
        {groups.map(g => (
          <div key={g.title} style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6f9593', padding: '0 10px 6px' }}>{g.title}</div>
            {g.items.map(item => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <a key={item.href} href={item.href} onClick={e => { e.preventDefault(); router.push(item.href) }}
                  className={`adm-nav${active ? ' on' : ''}`}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                </a>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 99, background: 'rgba(255,255,255,.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
          {admin.full_name?.[0] || '؟'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.full_name}</div>
          <div style={{ fontSize: 11, color: '#8fb3b1' }}>{admin.role === 'super_admin' ? 'مشرف كامل' : 'مشرف'}</div>
        </div>
        <button onClick={logout} title="تسجيل الخروج" aria-label="تسجيل الخروج"
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: '#b9d3d2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  )

  return shell(
    <AdminContext.Provider value={{ admin, can: p => can(p), logout, setAdmin }}>
      <aside className="adm-side">{sidebar}</aside>
      {menuOpen && (
        <div className="adm-mob-menu">
          <div onClick={() => setMenuOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(16,24,40,.45)' }} />
          <aside style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 264, background: A.sidebar }}>{sidebar}</aside>
        </div>
      )}
      <header className="adm-topbar">
        <button onClick={() => setMenuOpen(v => !v)} aria-label="القائمة"
          style={{ width: 38, height: 38, borderRadius: 8, border: `1px solid ${A.border}`, background: A.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: A.text }}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div style={{ fontSize: 15, fontWeight: 800 }}>لوحة الإدارة</div>
      </header>
      <main className="adm-main">{children}</main>
    </AdminContext.Provider>
  )
}

const SHELL_CSS = `
  .adm-side{position:fixed;top:0;right:0;bottom:0;width:248px;background:${A.sidebar};z-index:50}
  .adm-main{margin-right:248px;padding:28px 32px 48px;max-width:1360px}
  .adm-topbar{display:none}
  .adm-nav{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;color:#c4d8d7;font-size:13.5px;font-weight:600;text-decoration:none;margin-bottom:2px}
  .adm-nav:hover{background:rgba(255,255,255,.06);color:white}
  .adm-nav.on{background:rgba(45,212,191,.14);color:white}
  .adm-nav.on svg{color:#5eead4}
  .adm-mob-menu{position:fixed;inset:0;z-index:900}
  @media(max-width:900px){
    .adm-side{display:none}
    .adm-main{margin-right:0;padding:16px 16px 40px}
    .adm-topbar{display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:40;padding:10px 16px;background:${A.surface};border-bottom:1px solid ${A.border}}
  }
`
