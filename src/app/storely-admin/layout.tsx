'use client'
import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PackagePlus, Menu, X, LogOut, ChevronLeft } from 'lucide-react'
import AdminLogin from './_admin/Login'
import { A, ADMIN_CSS, AdminContext, adminKey, type AdminInfo } from './_admin/kit'
import { NAV } from './_admin/nav'

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

  // طلبات الإضافات المعلّقة: عدّاد بالقائمة + تنبيه لما يوصل طلب جديد
  const [pendingAddons, setPendingAddons] = useState(0)
  const [pendingDemos, setPendingDemos] = useState(0)   // طلبات عرض جديدة ما انتواصل معها
  const [pendingRenewals, setPendingRenewals] = useState(0)   // طلبات تجديد بانتظار الدفع
  const [newAlert, setNewAlert] = useState<false | 'addon' | 'renewal'>(false)
  useEffect(() => {
    if (!admin || !can('manage_users')) return
    let last = -1
    // طلبات الإضافات + طلبات الترقية بعدّاد واحد
    const count = (url: string) => fetch(url, { headers: { 'x-admin-key': adminKey() } }).then(r => r.ok ? r.json() : null).then(j => j?.pending || 0).catch(() => 0)
    const tick = () => Promise.all([count('/api/admin/addon-requests?count=1'), count('/api/admin/plan-requests?count=1')]).then(([a, b]) => {
      const n = a + b
      if (last >= 0 && n > last) setNewAlert('addon')
      last = n; setPendingAddons(n)
    })
    const tickDemos = () => count('/api/admin/demo-requests?count=1').then(setPendingDemos)
    let lastR = -1
    const tickRenewals = () => count('/api/admin/renewals?count=1').then(n => { if (lastR >= 0 && n > lastR) setNewAlert('renewal'); lastR = n; setPendingRenewals(n) })
    const all = () => { tick(); tickDemos(); tickRenewals() }
    all()
    const t = setInterval(all, 60_000)
    // صفحة طلبات العرض تطلب تحديث العدّاد فوراً لما تتغير حالة طلب
    const refresh = () => { tickDemos(); tickRenewals() }
    window.addEventListener('admin-counts-refresh', refresh)
    return () => { clearInterval(t); window.removeEventListener('admin-counts-refresh', refresh) }
  }, [admin, pathname])

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
      {newAlert && (
        <div role="alert" style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 1000, background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, boxShadow: A.shadowLg, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 'calc(100vw - 40px)' }}>
          <PackagePlus size={20} color={A.primary} />
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{newAlert === 'renewal' ? 'وصل طلب تجديد اشتراك — تواصل مع العميل للدفع' : 'وصل طلب جديد (إضافة أو ترقية)'}</div>
          <button onClick={() => { setNewAlert(false); router.push(newAlert === 'renewal' ? '/storely-admin/renewals' : '/storely-admin/addon-requests') }} style={{ background: A.primary, color: 'white', border: 'none', borderRadius: 10, padding: '7px 14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>عرض</button>
          <button onClick={() => setNewAlert(false)} aria-label="إغلاق" style={{ background: 'none', border: 'none', cursor: 'pointer', color: A.text3 }}><X size={16} /></button>
        </div>
      )}
    </div>
  )

  if (checking) return shell(null)
  if (!admin) return shell(<AdminLogin onLogin={a => setAdmin(a)} />)

  const groups = NAV.map(g => ({ ...g, items: g.items.filter(i => can(i.perm)) })).filter(g => g.items.length)
  const isActive = (href: string) => href === '/storely-admin' ? pathname === href : pathname.startsWith(href)
  const current = groups.flatMap(g => g.items.map(i => ({ ...i, group: g.title }))).find(i => isActive(i.href))

  const sidebar = (
    <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ height: 64, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,.1)' }}>
        <img src="/icon-192.png" alt="" width={32} height={32} style={{ borderRadius: 9, boxShadow: A.shadowSm }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Storely</div>
          <div style={{ fontSize: 12, color: '#CBD4DC' }}>لوحة الإدارة</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 16px' }}>
        {groups.map(g => (
          <div key={g.title} style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.6)', padding: '0 10px 8px' }}>{g.title}</div>
            {g.items.map(item => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <a key={item.href} href={item.href} onClick={e => { e.preventDefault(); router.push(item.href) }}
                  className={`adm-nav${active ? ' on' : ''}`}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {(() => {
                    const n = item.href === '/storely-admin/addon-requests' ? pendingAddons : item.href === '/storely-admin/demo-requests' ? pendingDemos : item.href === '/storely-admin/renewals' ? pendingRenewals : 0
                    return n > 0 && (
                      <span style={{ marginInlineStart: 'auto', background: A.danger, color: 'white', borderRadius: 99, fontSize: 11, fontWeight: 600, minWidth: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{n}</span>
                    )
                  })()}
                </a>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ margin: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, background: 'rgba(255,255,255,.06)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 99, background: 'rgba(255,255,255,.14)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
          {admin.full_name?.[0] || '؟'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.full_name}</div>
          <div style={{ fontSize: 12, color: '#CBD4DC' }}>{admin.role === 'super_admin' ? 'مشرف كامل' : 'مشرف'}</div>
        </div>
        <button onClick={logout} title="تسجيل الخروج" aria-label="تسجيل الخروج" className="adm-btn adm-side-btn"
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: '#CBD4DC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <div onClick={() => setMenuOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(16,24,40,.32)', backdropFilter: 'blur(2px)' }} />
          <aside style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 272, background: A.sidebar, boxShadow: A.shadowLg }}>{sidebar}</aside>
        </div>
      )}
      <header className="adm-topbar">
        <button onClick={() => setMenuOpen(v => !v)} aria-label="القائمة" className="adm-menu-btn"
          style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${A.border}`, background: A.surface, boxShadow: A.shadowSm, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: A.text }}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, minWidth: 0 }}>
          {current && <span className="adm-crumb-group" style={{ color: A.text3 }}>{current.group}</span>}
          {current && <ChevronLeft size={14} className="adm-crumb-group" color={A.text3} />}
          <span style={{ fontWeight: 600, color: A.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current?.label || 'لوحة الإدارة'}</span>
        </div>
        <div style={{ marginInlineStart: 'auto', fontSize: 12.5, color: A.text3 }} className="adm-crumb-group">
          {new Date().toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </header>
      <main className="adm-main">{children}</main>
    </AdminContext.Provider>
  )
}

const SHELL_CSS = `
  .adm-side{position:fixed;top:0;right:0;bottom:0;width:264px;background:${A.sidebar};color-scheme:dark;z-index:50}
  .adm-topbar{display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:40;height:64px;padding:0 32px;margin-right:264px;background:rgba(247,248,250,.85);backdrop-filter:saturate(180%) blur(10px);-webkit-backdrop-filter:saturate(180%) blur(10px);border-bottom:1px solid ${A.border}}
  .adm-menu-btn{display:none!important}
  .adm-main{margin-right:264px;padding:32px 32px 56px;max-width:1440px}
  .adm-nav{display:flex;align-items:center;gap:10px;height:36px;padding:0 10px;border-radius:9px;color:rgba(255,255,255,.88);font-size:14px;font-weight:500;text-decoration:none;margin-bottom:2px;transition:background .15s,color .15s}
  .adm-nav svg{color:rgba(255,255,255,.65);flex-shrink:0;transition:color .15s}
  .adm-nav:hover{background:rgba(255,255,255,.07);color:#fff}
  .adm-nav:hover svg{color:#fff}
  .adm-nav.on{background:#fff;color:${A.primary};font-weight:600}
  .adm-nav.on svg{color:${A.primary}}
  .adm-side-btn:hover{background:rgba(255,255,255,.08)!important;color:#fff!important}
  .adm-mob-menu{position:fixed;inset:0;z-index:900}
  @media(max-width:900px){
    .adm-side{display:none}
    .adm-topbar{margin-right:0;padding:0 16px;height:56px}
    .adm-menu-btn{display:flex!important}
    .adm-crumb-group{display:none}
    .adm-main{margin-right:0;padding:20px 16px 40px}
  }
`
