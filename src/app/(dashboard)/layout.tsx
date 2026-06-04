'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

const NAV = [
  { href:'/dashboard', label:'الرئيسية',   icon:'⊞' },
  { href:'/inventory',  label:'المخزون',    icon:'◫' },
  { href:'/purchases',  label:'المشتريات',  icon:'⊕' },
  { href:'/dispense',   label:'الصرف',      icon:'↑' },
  { href:'/reports',    label:'التقارير',   icon:'≡' },
  { href:'/settings',   label:'الإعدادات',  icon:'◎' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [orgName, setOrgName] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('org_id, organizations(name)')
        .eq('id', user.id).single()
      if (profile?.organizations) setOrgName((profile.organizations as any).name)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const sideW = collapsed ? 64 : 220

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f0f2f5',fontFamily:'system-ui',direction:'rtl'}}>
      <style>{`
        * { box-sizing: border-box; }
        .nav-item { display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:10px;text-decoration:none;transition:all 0.18s;cursor:pointer;margin-bottom:2px; }
        .nav-item:hover { background:rgba(255,255,255,0.12); }
        .nav-item.active { background:rgba(255,255,255,0.18);box-shadow:0 2px 8px rgba(0,0,0,0.15); }
        .nav-label { font-size:14px;font-weight:600;color:white;white-space:nowrap;overflow:hidden; }
        .nav-icon { font-size:18px;color:rgba(255,255,255,0.85);flex-shrink:0;width:24px;text-align:center; }
        .main-content { flex:1;overflow:auto;transition:all 0.2s; }
        @media(max-width:768px){ .sidebar{display:none} .main-content{margin-right:0 !important} }
      `}</style>

      {/* Sidebar */}
      <div className="sidebar" style={{width:sideW,minHeight:'100vh',background:'linear-gradient(180deg,#1a4731 0%,#0f2d1e 100%)',display:'flex',flexDirection:'column',position:'fixed',right:0,top:0,bottom:0,zIndex:200,transition:'width 0.2s',overflow:'hidden'}}>
        
        {/* Logo */}
        <div style={{padding:'20px 16px 16px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,background:'#2d7a4f',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🏪</div>
            {!collapsed && (
              <div style={{overflow:'hidden'}}>
                <div style={{fontSize:16,fontWeight:900,color:'white',lineHeight:1.2}}>Storely</div>
                {orgName && <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>{orgName}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <div style={{flex:1,padding:'12px 10px',overflowY:'auto'}}>
          {!collapsed && <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.35)',letterSpacing:'0.1em',textTransform:'uppercase',padding:'8px 8px 4px',marginBottom:4}}>القائمة الرئيسية</div>}
          {NAV.map(n => (
            <a key={n.href} href={n.href} className={'nav-item' + (pathname===n.href?' active':'')}>
              <span className="nav-icon">{n.icon}</span>
              {!collapsed && <span className="nav-label">{n.label}</span>}
            </a>
          ))}
        </div>

        {/* Bottom */}
        <div style={{padding:'12px 10px',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <button onClick={handleLogout} className="nav-item" style={{width:'100%',background:'rgba(239,68,68,0.15)',border:'none',justifyContent:collapsed?'center':'flex-start'}}>
            <span className="nav-icon" style={{color:'#fca5a5'}}>⏻</span>
            {!collapsed && <span className="nav-label" style={{color:'#fca5a5'}}>خروج</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="nav-item" style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'none',marginTop:4,justifyContent:collapsed?'center':'flex-start'}}>
            <span className="nav-icon" style={{transform:collapsed?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.2s'}}>◁</span>
            {!collapsed && <span className="nav-label" style={{color:'rgba(255,255,255,0.6)',fontSize:12}}>طي القائمة</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="main-content" style={{marginRight:sideW,transition:'margin 0.2s'}}>
        {/* Top bar */}
        <div style={{background:'white',borderBottom:'1px solid #e8ecf0',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:13,color:'#6b7280'}}>
            {NAV.find(n => n.pathname===pathname)?.label || NAV.find(n => n.href===pathname)?.label || 'لوحة التحكم'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:32,height:32,background:'#1a4731',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'white',fontWeight:700}}>
              {orgName ? orgName[0] : 'S'}
            </div>
          </div>
        </div>
        <div style={{padding:'24px 28px',minHeight:'calc(100vh - 56px)'}}>
          {children}
        </div>
      </div>
    </div>
  )
}
