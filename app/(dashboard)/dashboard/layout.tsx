'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [reportsOpen, setReportsOpen]   = useState(
    pathname.includes('/reports') || pathname.includes('/dispense-reports')
  )

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const mainLinks = [
    { href: '/dashboard',           label: 'الرئيسية',       icon: '📊', color: '#6366f1' },
    { href: '/dashboard/inventory', label: 'المخزون',        icon: '📦', color: '#0891b2' },
    { href: '/dashboard/purchases', label: 'تسجيل مشتريات', icon: '🛒', color: '#10b981' },
    { href: '/dashboard/dispenses', label: 'تسجيل صرف',     icon: '📤', color: '#ef4444' },
    { href: '/dashboard/settings',  label: 'الإعدادات',     icon: '⚙️', color: '#8b5cf6' },
  ]

  const reportLinks = [
    { href: '/dashboard/reports',          label: 'تقرير المشتريات', icon: '📈', color: '#f59e0b' },
    { href: '/dashboard/dispense-reports', label: 'تقرير الصرف',     icon: '📉', color: '#ec4899' },
  ]

  const isReportActive = reportLinks.some(r => pathname === r.href)

  return (
    <div style={{display:'flex',minHeight:'100vh',fontFamily:'system-ui',direction:'rtl',background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)'}}>
      <style>{`
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        .nav-link:hover{background:rgba(255,255,255,0.08) !important;transform:translateX(-4px)}
        .nav-link{transition:all 0.2s ease}
        .logout-btn:hover{background:rgba(239,68,68,0.2) !important;border-color:rgba(239,68,68,0.4) !important}
        .hamburger:hover{background:rgba(255,255,255,0.1) !important}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
      `}</style>

      {/* Overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',
          zIndex:40,backdropFilter:'blur(4px)',animation:'fadeIn 0.2s ease'
        }} />
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width:260,
          background:'rgba(15,12,41,0.95)',
          backdropFilter:'blur(20px)',
          borderLeft:'1px solid rgba(255,255,255,0.08)',
          color:'white',display:'flex',flexDirection:'column',
          position:'fixed',height:'100vh',right:0,zIndex:50,
          animation:'slideIn 0.25s ease forwards',
          boxShadow:'-8px 0 40px rgba(0,0,0,0.4)'
        }}>

          {/* Logo */}
          <div style={{padding:'20px 18px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{
                width:38,height:38,
                background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
                boxShadow:'0 4px 16px rgba(99,102,241,0.4)',
                border:'1px solid rgba(255,255,255,0.15)'
              }}>🏪</div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'white',letterSpacing:'-0.3px'}}>Storely</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontWeight:500}}>نظام المخزون</div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{
              background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:8,width:28,height:28,cursor:'pointer',color:'rgba(255,255,255,0.5)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,
              transition:'all 0.2s'
            }}>✕</button>
          </div>

          {/* Nav */}
          <nav style={{flex:1,padding:'12px 10px',overflowY:'auto'}}>
            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.25)',padding:'8px 10px 6px',letterSpacing:'0.12em',textTransform:'uppercase'}}>
              القائمة الرئيسية
            </div>

            {mainLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <Link key={link.href} href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className="nav-link"
                  style={{
                    display:'flex',alignItems:'center',gap:10,
                    padding:'11px 12px',borderRadius:12,marginBottom:3,
                    color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                    background: isActive ? `linear-gradient(135deg,${link.color}33,${link.color}22)` : 'transparent',
                    textDecoration:'none',fontWeight: isActive ? 700 : 400,
                    fontSize:14,
                    borderRight: isActive ? `3px solid ${link.color}` : '3px solid transparent',
                    boxShadow: isActive ? `inset 0 1px 0 rgba(255,255,255,0.05)` : 'none'
                  }}>
                  <span style={{
                    width:30,height:30,borderRadius:8,
                    background: isActive ? `${link.color}33` : 'rgba(255,255,255,0.05)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
                    flexShrink:0
                  }}>{link.icon}</span>
                  {link.label}
                  {isActive && <span style={{marginRight:'auto',width:6,height:6,borderRadius:'50%',background:link.color,boxShadow:`0 0 8px ${link.color}`}} />}
                </Link>
              )
            })}

            {/* Reports */}
            <div style={{marginTop:8}}>
              <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.25)',padding:'8px 10px 6px',letterSpacing:'0.12em',textTransform:'uppercase'}}>
                التقارير
              </div>
              <button onClick={() => setReportsOpen(!reportsOpen)} style={{
                display:'flex',alignItems:'center',gap:10,justifyContent:'space-between',
                padding:'11px 12px',borderRadius:12,marginBottom:3,
                color: isReportActive ? 'white' : 'rgba(255,255,255,0.5)',
                background: isReportActive ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
                border: isReportActive ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(255,255,255,0.04)',
                width:'100%',textAlign:'right',
                fontWeight: isReportActive ? 700 : 400,fontSize:14,
                cursor:'pointer',fontFamily:'system-ui',transition:'all 0.2s',
                borderRight: isReportActive ? '3px solid #f59e0b' : '3px solid transparent'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{width:30,height:30,borderRadius:8,background:isReportActive?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>📊</span>
                  التقارير
                </div>
                <span style={{fontSize:9,transition:'transform 0.2s',transform:reportsOpen?'rotate(180deg)':'rotate(0)',color:'rgba(255,255,255,0.3)'}}>▼</span>
              </button>

              {reportsOpen && (
                <div style={{marginRight:14,borderRight:'1px solid rgba(255,255,255,0.06)',paddingRight:8,marginBottom:4}}>
                  {reportLinks.map(link => {
                    const isActive = pathname === link.href
                    return (
                      <Link key={link.href} href={link.href}
                        onClick={() => setSidebarOpen(false)}
                        className="nav-link"
                        style={{
                          display:'flex',alignItems:'center',gap:8,
                          padding:'9px 10px',borderRadius:10,marginBottom:2,
                          color: isActive ? link.color : 'rgba(255,255,255,0.4)',
                          background: isActive ? `${link.color}15` : 'transparent',
                          textDecoration:'none',fontWeight: isActive ? 700 : 400,
                          fontSize:13,transition:'all 0.15s'
                        }}>
                        <span style={{fontSize:14}}>{link.icon}</span>
                        {link.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Logout */}
          <div style={{padding:'12px 10px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            <button onClick={handleLogout} className="logout-btn" style={{
              width:'100%',padding:'11px 14px',borderRadius:12,
              background:'rgba(239,68,68,0.08)',color:'rgba(239,68,68,0.7)',
              border:'1px solid rgba(239,68,68,0.15)',cursor:'pointer',
              fontSize:13,fontWeight:600,fontFamily:'system-ui',
              display:'flex',alignItems:'center',gap:8,justifyContent:'center',
              transition:'all 0.2s'
            }}>🚪 تسجيل الخروج</button>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{flex:1,minHeight:'100vh',transition:'margin-right 0.25s ease'}}>

        {/* Top Bar */}
        <div style={{
          background:'rgba(15,12,41,0.8)',
          backdropFilter:'blur(20px)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          padding:'12px 20px',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          position:'sticky',top:0,zIndex:40,
          boxShadow:'0 4px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {/* Hamburger */}
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10,width:38,height:38,cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',gap:4,padding:10,
              transition:'all 0.2s'
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: i===1 ? 12 : 16,height:2,
                  background:sidebarOpen?'#6366f1':'rgba(255,255,255,0.5)',
                  borderRadius:99,transition:'all 0.2s'
                }} />
              ))}
            </button>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',fontWeight:500}}>
              {new Date().toLocaleDateString('ar-SA',{weekday:'long',month:'long',day:'numeric'})}
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {/* Logo small */}
            <div style={{
              width:28,height:28,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
              borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:14,boxShadow:'0 2px 10px rgba(99,102,241,0.4)'
            }}>🏪</div>
            <span style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>Storely</span>
            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:50,padding:'4px 10px'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 8px rgba(16,185,129,0.6)',animation:'pulse 2s infinite'}} />
              <span style={{fontSize:11,color:'#6ee7b7',fontWeight:600}}>متصل</span>
            </div>
          </div>
        </div>

        {/* Page */}
        <div style={{padding:'24px',minHeight:'calc(100vh - 62px)'}}>
          {children}
        </div>
      </div>
    </div>
  )
}