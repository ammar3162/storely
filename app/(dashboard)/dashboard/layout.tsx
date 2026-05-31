'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

type Lang = 'ar' | 'en'

const T = {
  ar: {
    dashboard: 'الرئيسية', inventory: 'المخزون', purchases: 'المشتريات',
    dispenses: 'الصرف', settings: 'الإعدادات', reports: 'التقارير',
    purchasesReport: 'تقرير المشتريات', dispensesReport: 'تقرير الصرف',
    logout: 'تسجيل الخروج', connected: 'متصل', basicPlan: 'الباقة الأساسية',
    menu: 'القائمة',
  },
  en: {
    dashboard: 'Dashboard', inventory: 'Inventory', purchases: 'Purchases',
    dispenses: 'Dispenses', settings: 'Settings', reports: 'Reports',
    purchasesReport: 'Purchases Report', dispensesReport: 'Dispenses Report',
    logout: 'Logout', connected: 'Connected', basicPlan: 'Basic Plan',
    menu: 'Menu',
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [orgName, setOrgName]         = useState('')
  const [lang, setLang]               = useState<Lang>('ar')
  const [reportsOpen, setReportsOpen] = useState(
    pathname.includes('/reports') || pathname.includes('/dispense-reports')
  )

  const tx = T[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    const saved = localStorage.getItem('storely-lang') as Lang
    if (saved) setLang(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('storely-lang', lang)
  }, [lang])

  useEffect(() => {
  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('profiles')
      .select('organizations(name, status)')
      .eq('id', user.id)
      .single()

    if (data?.organizations) {
      const org = data.organizations as any
      setOrgName(org.name || '')

      // إذا الحساب موقوف أو pending يطلعه
      if (org.status === 'blocked') {
        await supabase.auth.signOut()
        router.push('/login?reason=blocked')
        return
      }
      if (org.status === 'pending') {
        router.push('/pending')
        return
      }
    }
  }
  load()
}, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const mainLinks = [
    { href:'/dashboard',           label: tx.dashboard,  icon:'⊞', emoji:'📊' },
    { href:'/dashboard/inventory', label: tx.inventory,  icon:'▦', emoji:'📦' },
    { href:'/dashboard/purchases', label: tx.purchases,  icon:'↓', emoji:'🛒' },
    { href:'/dashboard/dispenses', label: tx.dispenses,  icon:'↑', emoji:'📤' },
    { href:'/dashboard/settings',  label: tx.settings,   icon:'◎', emoji:'⚙️' },
  ]

  const reportLinks = [
    { href:'/dashboard/reports',          label: tx.purchasesReport },
    { href:'/dashboard/dispense-reports', label: tx.dispensesReport },
  ]

  const isReportActive = reportLinks.some(r => pathname === r.href)

  return (
    <div style={{
      display:'flex', minHeight:'100vh',
      fontFamily:'"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
      direction: dir, background:'#f7f8fa'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes slideIn { from{transform:translateX(${lang==='ar'?'100%':'-100%'})} to{transform:translateX(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .nav-item {
          display:flex; align-items:center; gap:10px;
          padding:9px 12px; border-radius:8px; margin-bottom:1px;
          color:#6b7280; text-decoration:none; font-size:14px; font-weight:500;
          transition:all 0.15s ease; cursor:pointer; border:none; background:transparent;
          width:100%; text-align:${lang==='ar'?'right':'left'}; font-family:inherit;
        }
        .nav-item:hover  { background:#f3f4f6; color:#111827; }
        .nav-item.active { background:#eff6ff; color:#1d4ed8; font-weight:600; }

        .nav-icon {
          width:30px; height:30px; border-radius:7px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; font-size:14px;
          background:rgba(0,0,0,0.03); transition:all 0.15s;
        }
        .nav-item.active .nav-icon { background:#dbeafe; }
        .nav-item:hover  .nav-icon { background:#f3f4f6; }

        .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.2); z-index:40; animation:fadeIn 0.2s; backdrop-filter:blur(2px); }

        .hamburger {
          width:36px; height:36px; border-radius:8px; border:1px solid #e5e7eb;
          background:white; cursor:pointer; display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:4px;
          transition:all 0.15s;
        }
        .hamburger:hover { background:#f9fafb; }
        .ham-line { width:14px; height:1.5px; background:#6b7280; border-radius:99px; transition:all 0.2s; }

        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:99px; }

        .lang-btn {
          padding:5px 10px; border-radius:6px; border:1px solid #e5e7eb;
          background:white; font-size:11px; font-weight:600; cursor:pointer;
          color:#6b7280; font-family:inherit; transition:all 0.15s;
        }
        .lang-btn:hover { background:#f3f4f6; }
        .lang-btn.active { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }

        .logout-btn { color:#ef4444 !important; }
        .logout-btn:hover { background:#fef2f2 !important; }
      `}</style>

      {/* Overlay */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width:252, background:'white',
          borderLeft: lang==='ar' ? '1px solid #e5e7eb' : 'none',
          borderRight: lang==='en' ? '1px solid #e5e7eb' : 'none',
          display:'flex', flexDirection:'column',
          position:'fixed', height:'100vh',
          right: lang==='ar' ? 0 : 'auto',
          left: lang==='en' ? 0 : 'auto',
          zIndex:50, animation:'slideIn 0.22s ease',
          boxShadow: lang==='ar' ? '-4px 0 24px rgba(0,0,0,0.08)' : '4px 0 24px rgba(0,0,0,0.08)'
        }}>

          {/* Header */}
          <div style={{padding:'14px 14px 10px', borderBottom:'1px solid #f3f4f6'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
              <button onClick={() => setSidebarOpen(false)} style={{
                width:26, height:26, border:'1px solid #e5e7eb', borderRadius:6,
                background:'white', cursor:'pointer', color:'#9ca3af',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:11
              }}>✕</button>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <div style={{
                  width:26, height:26, background:'linear-gradient(135deg,#1d4ed8,#6366f1)',
                  borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12
                }}>🏪</div>
                <span style={{fontSize:14, fontWeight:700, color:'#111827', letterSpacing:'-0.2px'}}>Storely</span>
              </div>
            </div>

            {/* Org Card */}
            <div style={{
              background:'linear-gradient(135deg,#eff6ff,#eef2ff)',
              border:'1px solid #dbeafe', borderRadius:10, padding:'10px 12px',
              display:'flex', alignItems:'center', gap:10
            }}>
              <div style={{
                width:32, height:32, flexShrink:0,
                background:'linear-gradient(135deg,#1d4ed8,#6366f1)',
                borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:13, color:'white', fontWeight:700
              }}>
                {orgName?.[0]?.toUpperCase() || '؟'}
              </div>
              <div style={{minWidth:0}}>
                <div style={{
                  fontSize:13, fontWeight:700, color:'#1e293b',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
                }}>{orgName || '...'}</div>
                <div style={{fontSize:10, color:'#6366f1', fontWeight:500, marginTop:1}}>
                  {tx.basicPlan}
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{flex:1, padding:'8px', overflowY:'auto'}}>
            <div style={{
              fontSize:9, fontWeight:600, color:'#9ca3af',
              padding:'6px 12px 4px', letterSpacing:'0.1em', textTransform:'uppercase'
            }}>{tx.menu}</div>

            {mainLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <Link key={link.href} href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`nav-item ${isActive ? 'active' : ''}`}>
                  <span className="nav-icon">{link.emoji}</span>
                  {link.label}
                  {isActive && <span style={{
                    marginRight: lang==='ar' ? 'auto' : undefined,
                    marginLeft: lang==='en' ? 'auto' : undefined,
                    width:5, height:5, borderRadius:'50%', background:'#1d4ed8',
                    flexShrink:0
                  }} />}
                </Link>
              )
            })}

            <div style={{height:1, background:'#f3f4f6', margin:'6px 12px'}} />

            <div style={{
              fontSize:9, fontWeight:600, color:'#9ca3af',
              padding:'4px 12px', letterSpacing:'0.1em', textTransform:'uppercase'
            }}>{tx.reports}</div>

            <button onClick={() => setReportsOpen(!reportsOpen)}
              className={`nav-item ${isReportActive ? 'active' : ''}`}>
              <span className="nav-icon">📈</span>
              {tx.reports}
              <span style={{
                marginRight: lang==='ar' ? 'auto' : undefined,
                marginLeft: lang==='en' ? 'auto' : undefined,
                fontSize:10, color:'#9ca3af',
                transform: reportsOpen ? 'rotate(180deg)' : 'none',
                transition:'transform 0.2s', display:'inline-block'
              }}>▾</span>
            </button>

            {reportsOpen && (
              <div style={{
                paddingRight: lang==='ar' ? 12 : 0,
                paddingLeft: lang==='en' ? 12 : 0,
                borderRight: lang==='ar' ? '2px solid #e5e7eb' : 'none',
                borderLeft: lang==='en' ? '2px solid #e5e7eb' : 'none',
                marginRight: lang==='ar' ? 20 : 0,
                marginLeft: lang==='en' ? 20 : 0,
                marginBottom:4
              }}>
                {reportLinks.map(link => {
                  const isActive = pathname === link.href
                  return (
                    <Link key={link.href} href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      style={{fontSize:13}}>
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </nav>

          {/* Bottom */}
          <div style={{padding:'8px', borderTop:'1px solid #f3f4f6'}}>
            <button onClick={handleLogout} className="nav-item logout-btn">
              <span className="nav-icon" style={{background:'#fef2f2'}}>🚪</span>
              {tx.logout}
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{flex:1, minHeight:'100vh', display:'flex', flexDirection:'column'}}>

        {/* Top Bar */}
        <header style={{
          background:'white', borderBottom:'1px solid #e5e7eb',
          padding:'0 20px', height:52,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          position:'sticky', top:0, zIndex:40,
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <div className="ham-line" />
              <div className="ham-line" style={{width:10}} />
              <div className="ham-line" />
            </button>
            <div style={{width:1, height:18, background:'#e5e7eb'}} />
            <span style={{fontSize:12, color:'#9ca3af', fontWeight:400}}>
              {new Date().toLocaleDateString(lang==='ar'?'ar-SA':'en-US', {weekday:'long', month:'long', day:'numeric'})}
            </span>
          </div>

          <div style={{display:'flex', alignItems:'center', gap:8}}>
            {/* Language Toggle */}
            <div style={{display:'flex', gap:3, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:7, padding:3}}>
              <button className={`lang-btn ${lang==='ar'?'active':''}`} onClick={() => setLang('ar')}>
                🇸🇦 AR
              </button>
              <button className={`lang-btn ${lang==='en'?'active':''}`} onClick={() => setLang('en')}>
                🇺🇸 EN
              </button>
            </div>

            {/* Status */}
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'4px 10px', background:'#f0fdf4',
              border:'1px solid #bbf7d0', borderRadius:6
            }}>
              <div style={{width:5, height:5, borderRadius:'50%', background:'#10b981', animation:'blink 2s infinite'}} />
              <span style={{fontSize:11, color:'#059669', fontWeight:600}}>{tx.connected}</span>
            </div>

            {/* Avatar */}
            <div style={{
              width:30, height:30,
              background:'linear-gradient(135deg,#1d4ed8,#6366f1)',
              borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, color:'white', fontWeight:700, cursor:'pointer',
              boxShadow:'0 2px 8px rgba(29,78,216,0.25)'
            }}>
              {orgName?.[0]?.toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        {/* Page */}
        <main style={{flex:1, padding:'24px', maxWidth:1200, width:'100%', margin:'0 auto'}}>
          {children}
        </main>
      </div>
    </div>
  )
}