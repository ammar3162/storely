'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [reportsOpen, setReportsOpen]   = useState(
    pathname.includes('/reports') || pathname.includes('/dispense-reports')
  )

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

  return (
    <div style={{display:'flex',minHeight:'100vh',fontFamily:'system-ui',direction:'rtl'}}>
      <style>{`
        @keyframes slideIn  { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes slideOut { from{transform:translateX(0);opacity:1} to{transform:translateX(100%);opacity:0} }
        .sidebar-open  { animation: slideIn  0.25s ease forwards; }
        .sidebar-close { animation: slideOut 0.25s ease forwards; }
      `}</style>

      {/* Overlay عند الإغلاق على الجوال */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',
          zIndex:40,display:'none'
        }} />
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width:240,background:'#0f172a',color:'white',
          display:'flex',flexDirection:'column',
          position:'fixed',height:'100vh',right:0,zIndex:50,
          boxShadow:'-4px 0 24px rgba(0,0,0,0.2)',
          animation:'slideIn 0.25s ease forwards'
        }}>

          {/* Logo + Close */}
          <div style={{padding:'20px 16px',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏪</div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'white'}}>Storely</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>نظام المخزون</div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{
              background:'rgba(255,255,255,0.08)',border:'none',color:'rgba(255,255,255,0.6)',
              width:30,height:30,borderRadius:8,cursor:'pointer',fontSize:16,
              display:'flex',alignItems:'center',justifyContent:'center'
            }}>✕</button>
          </div>

          {/* Nav */}
          <nav style={{flex:1,padding:'12px 10px',overflowY:'auto'}}>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',padding:'8px 10px',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4}}>
              القائمة الرئيسية
            </div>
            {mainLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <Link key={link.href} href={link.href} style={{
                  display:'flex',alignItems:'center',gap:10,
                  padding:'11px 12px',borderRadius:10,marginBottom:2,
                  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                  background: isActive ? 'rgba(99,102,241,0.25)' : 'transparent',
                  textDecoration:'none',fontWeight: isActive ? 700 : 500,
                  fontSize:14,transition:'all 0.15s',
                  borderRight: isActive ? '3px solid #818cf8' : '3px solid transparent'
                }}>
                  <span style={{fontSize:17}}>{link.icon}</span>
                  {link.label}
                </Link>
              )
            })}

            {/* Reports */}
            <div style={{marginTop:8}}>
              <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',padding:'8px 10px',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4}}>
                التقارير
              </div>
              <button onClick={() => setReportsOpen(!reportsOpen)} style={{
                display:'flex',alignItems:'center',gap:10,justifyContent:'space-between',
                padding:'11px 12px',borderRadius:10,marginBottom:2,
                color: isReportActive ? 'white' : 'rgba(255,255,255,0.55)',
                background: isReportActive ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                border:'none',width:'100%',textAlign:'right',
                fontWeight: isReportActive ? 700 : 500,fontSize:14,
                cursor:'pointer',fontFamily:'system-ui',transition:'all 0.15s',
                borderRight: isReportActive ? '3px solid #818cf8' : '3px solid transparent'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:17}}>📊</span>التقارير
                </div>
                <span style={{fontSize:10,transition:'transform 0.2s',transform:reportsOpen?'rotate(180deg)':'rotate(0)',display:'inline-block'}}>▼</span>
              </button>

              {reportsOpen && (
                <div style={{marginRight:12,borderRight:'2px solid rgba(99,102,241,0.3)',paddingRight:8,marginBottom:4}}>
                  {reportLinks.map(link => {
                    const isActive = pathname === link.href
                    return (
                      <Link key={link.href} href={link.href} style={{
                        display:'flex',alignItems:'center',gap:8,
                        padding:'9px 10px',borderRadius:8,marginBottom:2,
                        color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                        background: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                        textDecoration:'none',fontWeight: isActive ? 700 : 400,
                        fontSize:13,transition:'all 0.15s'
                      }}>
                        <span style={{fontSize:15}}>{link.icon}</span>
                        {link.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Logout */}
          <div style={{padding:'12px 10px',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
            <button onClick={handleLogout} style={{
              width:'100%',padding:'11px 14px',borderRadius:10,
              background:'rgba(239,68,68,0.12)',color:'#f87171',
              border:'1px solid rgba(239,68,68,0.2)',cursor:'pointer',
              fontSize:13,fontWeight:700,fontFamily:'system-ui',
              display:'flex',alignItems:'center',gap:8,justifyContent:'center'
            }}>🚪 تسجيل الخروج</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        flex:1,
        marginRight: sidebarOpen ? 240 : 0,
        background:'#f8fafc',minHeight:'100vh',
        transition:'margin-right 0.25s ease'
      }}>

        {/* Top Bar */}
        <div style={{
          background:'white',padding:'14px 20px',
          borderBottom:'1px solid #e2e8f0',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          position:'sticky',top:0,zIndex:40,
          boxShadow:'0 1px 4px rgba(0,0,0,0.04)'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {/* Hamburger */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              background:'#f1f5f9',border:'1.5px solid #e2e8f0',
              borderRadius:10,width:38,height:38,cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',gap:5,padding:10,transition:'all 0.2s'
            }}>
              <div style={{width:16,height:2,background:sidebarOpen?'#6366f1':'#475569',borderRadius:99,transition:'all 0.2s'}} />
              <div style={{width:16,height:2,background:sidebarOpen?'#6366f1':'#475569',borderRadius:99,transition:'all 0.2s'}} />
              <div style={{width:16,height:2,background:sidebarOpen?'#6366f1':'#475569',borderRadius:99,transition:'all 0.2s'}} />
            </button>
            <div style={{fontSize:13,color:'#64748b',fontWeight:600}}>
              {new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 0 3px rgba(16,185,129,0.2)'}} />
            <span style={{fontSize:12,color:'#64748b',fontWeight:600}}>متصل</span>
          </div>
        </div>

        {/* Page */}
        <div style={{padding:'28px'}}>
          {children}
        </div>
      </div>
    </div>
  )
}