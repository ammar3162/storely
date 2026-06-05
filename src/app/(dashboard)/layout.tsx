'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

const NAV_MAIN = [
  { href:'/dashboard', label:'لوحة التحكم' },
  { href:'/inventory',  label:'المخزون' },
  { href:'/purchases',  label:'المشتريات' },
  { href:'/dispense',   label:'الصرف' },
]
const NAV_REPORTS = [
  { href:'/reports',         label:'تقرير الصرف' },
  { href:'/purchase-report', label:'تقرير المشتريات' },
]
const NAV_SYSTEM = [
  { href:'/settings', label:'الإعدادات' },
]
const ALL = [...NAV_MAIN, ...NAV_REPORTS, ...NAV_SYSTEM]

const ICONS: Record<string,string> = {
  '/dashboard':       'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  '/inventory':       'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  '/purchases':       'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  '/dispense':        'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
  '/reports':         'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  '/purchase-report': 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  '/settings':        'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [org, setOrg]     = useState('')
  const [init, setInit]   = useState('م')
  const [low, setLow]     = useState(0)
  const [open, setOpen]   = useState(false)
  const router   = useRouter()
  const pathname = usePathname()
  const sb       = createClient()

  useEffect(() => {
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data: p } = await sb.from('profiles').select('full_name,org_id,organizations(name)').eq('id', user.id).single()
      if (p?.organizations) setOrg((p.organizations as any).name)
      if (p?.full_name) setInit(p.full_name[0])
      const { data: pr } = await sb.from('products').select('qty,reorder_point')
      if (pr) setLow(pr.filter((x:any) => x.qty <= x.reorder_point).length)
    })
  }, [])

  const logout = async () => { await sb.auth.signOut(); router.replace('/login') }

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  useEffect(() => {
    const all = [...NAV_MAIN, ...NAV_REPORTS, ...NAV_SYSTEM]
    all.forEach(n => router.prefetch(n.href))
  }, [])

  const Icon = ({ path }: { path: string }) => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      {path.split(' M').map((d,j) => <path key={j} d={(j===0?'':' M')+d}/>)}
    </svg>
  )

  const NavGroup = ({ label, items }: { label: string; items: typeof NAV_MAIN }) => (
    <div style={{marginBottom:8}}>
      <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:'0.12em',textTransform:'uppercase' as const,padding:'8px 16px 4px'}}>{label}</div>
      {items.map(n => {
        const active = pathname === n.href
        return (
          <button key={n.href} onClick={() => navigate(n.href)}
            style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',width:'100%',border:'none',borderRadius:0,background:active?'rgba(255,255,255,0.12)':'transparent',borderRight:active?'3px solid #4abe7a':'3px solid transparent',cursor:'pointer',transition:'all 0.15s',textAlign:'right' as const}}>
            <span style={{color:active?'#4abe7a':'rgba(255,255,255,0.6)',flexShrink:0}}><Icon path={ICONS[n.href]||''}/></span>
            <span style={{fontSize:13,color:active?'white':'rgba(255,255,255,0.72)',fontWeight:active?600:400,flex:1,textAlign:'right' as const}}>{n.label}</span>
            {n.href==='/inventory' && low>0 && <span style={{background:'#ef4444',color:'white',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:10}}>{low}</span>}
          </button>
        )
      })}
    </div>
  )

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f0f2f5',fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl'}}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        .overlay { position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:150;opacity:0;pointer-events:none;transition:opacity 0.25s; }
        .overlay.show { opacity:1;pointer-events:all; }
        .sidebar { position:fixed;right:0;top:0;bottom:0;width:240px;background:linear-gradient(160deg,#1a4731,#0d2818);z-index:200;display:flex;flex-direction:column;transform:translateX(100%);transition:transform 0.28s cubic-bezier(0.4,0,0.2,1);box-shadow:-4px 0 24px rgba(0,0,0,0.2); }
        .sidebar.open { transform:translateX(0); }
        .main { flex:1;display:flex;flex-direction:column;min-width:0; }
        .topbar { height:56px;background:white;border-bottom:1px solid #e8ecf0;display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,0.05); }
        .menu-btn { width:36px;height:36px;border-radius:8px;border:1px solid #e2e8f0;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;flex-shrink:0; }
        .menu-btn:hover { background:#f1f5f9;border-color:#cbd5e1; }
        .content { flex:1;padding:20px;overflow-y:auto; }
        @media(min-width:1024px) {
          .sidebar { transform:translateX(0) !important; position:fixed; }
          .overlay { display:none !important; }
          .main { margin-right:240px; }
          .menu-btn { display:none; }
        }
        @media(max-width:1023px) {
          .content { padding:16px; }
        }
        @media(max-width:640px) {
          .content { padding:12px; }
          .topbar { padding:0 14px; }
        }
        button:focus-visible { outline:2px solid #4abe7a;outline-offset:2px; }
        .nav-btn:hover { background:rgba(255,255,255,0.09) !important; }
      `}</style>

      {/* Overlay */}
      <div className={'overlay' + (open?' show':'')} onClick={() => setOpen(false)}/>

      {/* Sidebar */}
      <div className={'sidebar' + (open?' open':'')}>
        {/* Logo */}
        <div style={{padding:'18px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:34,height:34,background:'#2d7a4f',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>🏪</div>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:'white',letterSpacing:'-0.3px'}}>Storely</div>
              {org && <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>{org}</div>}
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{width:28,height:28,borderRadius:7,border:'none',background:'rgba(255,255,255,0.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.5)'}}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Nav */}
        <div style={{flex:1,overflowY:'auto',padding:'12px 0'}}>
          <NavGroup label="الرئيسية" items={NAV_MAIN}/>
          <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'4px 16px 8px'}}/>
          <NavGroup label="التقارير" items={NAV_REPORTS}/>
          <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'4px 16px 8px'}}/>
          <NavGroup label="النظام" items={NAV_SYSTEM}/>
        </div>

        {/* User */}
        <div style={{padding:'12px 16px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',marginBottom:8}}>
            <div style={{width:32,height:32,background:'#2d7a4f',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white',flexShrink:0}}>{init}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.85)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{org||'مدير النظام'}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>owner</div>
            </div>
          </div>
          <button onClick={logout} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',width:'100%',border:'none',borderRadius:8,background:'rgba(239,68,68,0.12)',cursor:'pointer',color:'#fca5a5',fontSize:12,fontWeight:600,transition:'background 0.15s'}}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button className="menu-btn" onClick={() => setOpen(true)} aria-label="فتح القائمة">
              <svg width="18" height="18" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>
              {ALL.find(n => n.href === pathname)?.label || 'Storely'}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {low > 0 && (
              <button onClick={() => navigate('/inventory')} style={{position:'relative',width:36,height:36,borderRadius:8,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                <span style={{position:'absolute',top:-4,left:-4,background:'#ef4444',color:'white',fontSize:9,fontWeight:700,padding:'1px 4px',borderRadius:8,minWidth:16,textAlign:'center'}}>{low}</span>
              </button>
            )}
            <div style={{width:32,height:32,background:'#1a4731',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white'}}>{init}</div>
          </div>
        </div>

        {/* Content */}
        <div className="content">{children}</div>
      </div>
    </div>
  )
}
