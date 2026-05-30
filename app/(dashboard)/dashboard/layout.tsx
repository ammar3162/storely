'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(
    pathname.includes('/reports') || pathname.includes('/dispense-reports')
  )
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // On desktop: sidebar always visible. On mobile: drawer.
  const showSidebar = !isMobile || sidebarOpen

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const mainLinks = [
    { href: '/dashboard',           label: 'الرئيسية',       icon: '📊' },
    { href: '/dashboard/inventory', label: 'المخزون',        icon: '📦' },
    { href: '/dashboard/purchases', label: 'تسجيل مشتريات', icon: '🛒' },
    { href: '/dashboard/dispenses', label: 'تسجيل صرف',     icon: '📤' },
  ]

  const reportLinks = [
    { href: '/dashboard/reports',          label: 'تقرير المشتريات', icon: '📈' },
    { href: '/dashboard/dispense-reports', label: 'تقرير الصرف',     icon: '📉' },
  ]

  const isReportActive = reportLinks.some(r => pathname === r.href)

  const pageTitles: Record<string, string> = {
    '/dashboard':                   'الرئيسية',
    '/dashboard/inventory':         'المخزون',
    '/dashboard/purchases':         'تسجيل مشتريات',
    '/dashboard/dispenses':         'تسجيل صرف',
    '/dashboard/reports':           'تقرير المشتريات',
    '/dashboard/dispense-reports':  'تقرير الصرف',
  }
  const currentTitle = pageTitles[pathname] || 'Storely'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Tajawal', system-ui, sans-serif", direction: 'rtl', background: '#f1f5f9' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');

        * { box-sizing: border-box; }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          margin-bottom: 2px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.18s ease;
          color: #64748b;
          border-right: 3px solid transparent;
        }
        .nav-link:hover {
          background: #f1f5f9;
          color: #1e293b;
        }
        .nav-link.active {
          background: #ede9fe;
          color: #6d28d9;
          font-weight: 700;
          border-right-color: #7c3aed;
        }

        .sub-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          margin-bottom: 2px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 400;
          transition: all 0.15s;
          color: #94a3b8;
        }
        .sub-link:hover { background: #f8fafc; color: #475569; }
        .sub-link.active { background: #ede9fe; color: #7c3aed; font-weight: 700; }

        .icon-btn {
          background: #f1f5f9;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          width: 38px;
          height: 38px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          color: #475569;
          font-size: 16px;
          flex-shrink: 0;
        }
        .icon-btn:hover { background: #e2e8f0; }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 40;
          animation: fadeIn 0.2s ease;
          backdrop-filter: blur(2px);
        }

        @media (min-width: 768px) {
          .sidebar { position: sticky !important; top: 0 !important; height: 100vh !important; flex-shrink: 0; }
          .main-content { margin-right: 0 !important; }
          .hamburger { display: none !important; }
        }
      `}</style>

      {/* Overlay — mobile only */}
      {isMobile && sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Sidebar ─── */}
      {showSidebar && (
        <aside className="sidebar" style={{
          width: 256,
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #e2e8f0',
          boxShadow: isMobile ? '-4px 0 32px rgba(0,0,0,0.12)' : 'none',
          position: isMobile ? 'fixed' : 'relative',
          right: 0,
          top: 0,
          height: '100vh',
          zIndex: 50,
          animation: isMobile ? 'slideInRight 0.25s ease' : 'none',
          overflowY: 'auto',
        }}>

          {/* Logo */}
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40,
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
              }}>🏪</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>Storely</div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>نظام المخزون</div>
              </div>
            </div>
            {isMobile && (
              <button className="icon-btn" onClick={() => setSidebarOpen(false)} style={{ width: 32, height: 32, fontSize: 14 }}>✕</button>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>

            <div style={{ fontSize: 10, fontWeight: 700, color: '#cbd5e1', padding: '6px 10px 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              القائمة الرئيسية
            </div>

            {mainLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={`nav-link${pathname === link.href ? ' active' : ''}`}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{link.icon}</span>
                {link.label}
              </Link>
            ))}

            {/* Reports section */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#cbd5e1', padding: '6px 10px 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                التقارير
              </div>

              <button
                onClick={() => setReportsOpen(!reportsOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 12, marginBottom: 2, width: '100%',
                  background: isReportActive ? '#ede9fe' : 'transparent',
                  color: isReportActive ? '#6d28d9' : '#64748b',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 14, fontWeight: isReportActive ? 700 : 500,
                  transition: 'all 0.15s',
                  borderRight: `3px solid ${isReportActive ? '#7c3aed' : 'transparent'}`,
                  textAlign: 'right',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>📊</span>
                  التقارير
                </div>
                <span style={{
                  fontSize: 10, display: 'inline-block',
                  transition: 'transform 0.2s',
                  transform: reportsOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>▼</span>
              </button>

              {reportsOpen && (
                <div style={{ marginRight: 16, borderRight: '2px solid #ede9fe', paddingRight: 8 }}>
                  {reportLinks.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className={`sub-link${pathname === link.href ? ' active' : ''}`}
                    >
                      <span style={{ fontSize: 16 }}>{link.icon}</span>
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Logout */}
          <div style={{ padding: '12px 10px', borderTop: '1px solid #f1f5f9' }}>
            <button onClick={handleLogout} style={{
              width: '100%', padding: '11px 14px', borderRadius: 12,
              background: '#fff1f2', color: '#e11d48',
              border: '1.5px solid #fecdd3', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              🚪 تسجيل الخروج
            </button>
          </div>
        </aside>
      )}

      {/* ─── Main Content ─── */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>

        {/* Top Bar */}
        <header style={{
          background: 'white',
          padding: '12px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {/* Hamburger — mobile only */}
            <button
              className="hamburger icon-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="القائمة"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ width: 16, height: 2, background: '#475569', borderRadius: 99 }} />
                <div style={{ width: 12, height: 2, background: '#475569', borderRadius: 99 }} />
                <div style={{ width: 16, height: 2, background: '#475569', borderRadius: 99 }} />
              </div>
            </button>

            {/* Page title */}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>{currentTitle}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 99, padding: '5px 12px',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
              <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>متصل</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '20px 16px', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}