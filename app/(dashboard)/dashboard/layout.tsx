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
  const [orgName, setOrgName]         = useState('')
  const [reportsOpen, setReportsOpen] = useState(
    pathname.includes('/reports') || pathname.includes('/dispense-reports')
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('organizations(name)').eq('id', user.id).single()
      if (data?.organizations) setOrgName((data.organizations as any).name || '')
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const mainLinks = [
    { href:'/dashboard',           label:'الرئيسية',       icon:'⊞',  active: pathname === '/dashboard' },
    { href:'/dashboard/inventory', label:'المخزون',        icon:'▦',  active: pathname === '/dashboard/inventory' },
    { href:'/dashboard/purchases', label:'المشتريات',      icon:'↓',  active: pathname === '/dashboard/purchases' },
    { href:'/dashboard/dispenses', label:'الصرف',          icon:'↑',  active: pathname === '/dashboard/dispenses' },
    { href:'/dashboard/settings',  label:'الإعدادات',      icon:'◎',  active: pathname === '/dashboard/settings' },
  ]

  const reportLinks = [
    { href:'/dashboard/reports',          label:'تقرير المشتريات', active: pathname === '/dashboard/reports' },
    { href:'/dashboard/dispense-reports', label:'تقرير الصرف',     active: pathname === '/dashboard/dispense-reports' },
  ]

  const isReportActive = reportLinks.some(r => r.active)

  return (
    <div style={{display:'flex',minHeight:'100vh',fontFamily:'"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',direction:'rtl',background:'#f7f8fa'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}

        .nav-item{
          display:flex;align-items:center;gap:10px;
          padding:9px 12px;border-radius:8px;margin-bottom:1px;
          color:#6b7280;text-decoration:none;font-size:14px;font-weight:500;
          transition:all 0.15s ease;cursor:pointer;border:none;background:transparent;
          width:100%;text-align:right;font-family:inherit;
        }
        .nav-item:hover{background:#f3f4f6;color:#111827}
        .nav-item.active{background:#eff6ff;color:#1d4ed8;font-weight:600}
        .nav-icon{
          width:32px;height:32px;border-radius:7px;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;flex-shrink:0;transition:all 0.15s;
        }
        .nav-item.active .nav-icon{background:#dbeafe;color:#1d4ed8}
        .nav-item:hover .nav-icon{background:#f3f4f6}

        .top-bar-btn{
          padding:7px 12px;border-radius:8px;border:1px solid #e5e7eb;
          background:white;color:#374151;font-size:13px;font-weight:500;
          cursor:pointer;font-family:inherit;transition:all 0.15s;
          display:flex;align-items:center;gap:6px;
        }
        .top-bar-btn:hover{background:#f9fafb;border-color:#d1d5db}

        .hamburger{
          width:36px;height:36px;border-radius:8px;border:1px solid #e5e7eb;
          background:white;cursor:pointer;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
          transition:all 0.15s;
        }
        .hamburger:hover{background:#f9fafb}
        .hamburger-line{width:14px;height:1.5px;background:#6b7280;border-radius:99px;transition:all 0.2s}

        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:#d1d5db}

        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.25);z-index:40;animation:fadeIn 0.2s ease;backdrop-filter:blur(2px)}

        @media(max-width:768px){
          .sidebar-desktop{display:none !important}
          .main-content{margin-right:0 !important}
        }
      `}</style>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width:248,background:'white',
          borderLeft:'1px solid #e5e7eb',
          display:'flex',flexDirection:'column',
          position:'fixed',height:'100vh',right:0,zIndex:50,
          animation:'slideIn 0.2s ease',
          boxShadow:'-4px 0 24px rgba(0,0,0,0.08)'
        }}>
          {/* Sidebar Header */}
          <div style={{padding:'16px 16px 12px',borderBottom:'1px solid #f3f4f6'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <button onClick={() => setSidebarOpen(false)} style={{
                width:28,height:28,border:'1px solid #e5e7eb',borderRadius:6,
                background:'white',cursor:'pointer',color:'#6b7280',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:12
              }}>✕</button>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{
                  width:28,height:28,background:'#1d4ed8',borderRadius:7,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:13
                }}>🏪</div>
                <span style={{fontSize:14,fontWeight:700,color:'#111827'}}>Storely</span>
              </div>
            </div>

            {/* Org Badge */}
            <div style={{
              background:'#f8faff',border:'1px solid #e0e7ff',
              borderRadius:8,padding:'8px 12px',
              display:'flex',alignItems:'center',gap:8
            }}>
              <div style={{width:24,height:24,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>
                {orgName?.[0] || '🏪'}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{orgName || 'مؤسستك'}</div>
                <div style={{fontSize:10,color:'#6366f1',fontWeight:500}}>الباقة الأساسية</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{flex:1,padding:'8px',overflowY:'auto'}}>
            <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',padding:'8px 12px 4px',letterSpacing:'0.08em',textTransform:'uppercase'}}>
              القائمة
            </div>

            {mainLinks.map(link => (
              <Link key={link.href} href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`nav-item ${link.active ? 'active' : ''}`}>
                <span className="nav-icon">{link.icon}</span>
                {link.label}
                {link.active && <span style={{marginRight:'auto',width:5,height:5,borderRadius:'50%',background:'#1d4ed8'}} />}
              </Link>
            ))}

            <div style={{height:'1px',background:'#f3f4f6',margin:'8px 12px'}} />

            <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',padding:'4px 12px',letterSpacing:'0.08em',textTransform:'uppercase'}}>
              التقارير
            </div>

            <button
              onClick={() => setReportsOpen(!reportsOpen)}
              className={`nav-item ${isReportActive ? 'active' : ''}`}>
              <span className="nav-icon">📊</span>
              التقارير
              <span style={{marginRight:'auto',fontSize:10,color:'#9ca3af',transform:reportsOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▾</span>
            </button>

            {reportsOpen && (
              <div style={{paddingRight:12,borderRight:'2px solid #e5e7eb',marginRight:20,marginBottom:4}}>
                {reportLinks.map(link => (
                  <Link key={link.href} href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`nav-item ${link.active ? 'active' : ''}`}
                    style={{paddingRight:8,fontSize:13}}>
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* Bottom */}
          <div style={{padding:'8px',borderTop:'1px solid #f3f4f6'}}>
            <button onClick={handleLogout} className="nav-item" style={{color:'#ef4444',width:'100%'}}>
              <span className="nav-icon" style={{background:'#fef2f2'}}>🚪</span>
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{flex:1,minHeight:'100vh',display:'flex',flexDirection:'column'}}>

        {/* Top Bar */}
        <header style={{
          background:'white',
          borderBottom:'1px solid #e5e7eb',
          padding:'0 20px',height:52,
          display:'flex',alignItems:'center',justifyContent:'space-between',
          position:'sticky',top:0,zIndex:40,
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <div className="hamburger-line" />
              <div className="hamburger-line" style={{width:10}} />
              <div className="hamburger-line" />
            </button>
            <div style={{height:20,width:1,background:'#e5e7eb'}} />
            <span style={{fontSize:12,color:'#9ca3af',fontWeight:400}}>
              {new Date().toLocaleDateString('ar-SA',{weekday:'long',month:'long',day:'numeric'})}
            </span>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:6}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#10b981'}} />
              <span style={{fontSize:11,color:'#059669',fontWeight:600}}>متصل</span>
            </div>
            <div style={{
              width:28,height:28,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
              borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:12,color:'white',fontWeight:700,cursor:'pointer'
            }}>
              {orgName?.[0] || 'S'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{flex:1,padding:'24px',maxWidth:1200,width:'100%',margin:'0 auto'}}>
          {children}
        </main>
      </div>
    </div>
  )
}