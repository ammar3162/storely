'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

const NAV = [
  { href:'/dashboard', label:'الرئيسية', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href:'/inventory',  label:'المخزون',  icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { href:'/purchases',  label:'مشتريات', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
  { href:'/dispense',   label:'الصرف',   icon:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  { href:'/reports',    label:'التقارير', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

const SIDEBAR_EXTRA = [
  { href:'/dispense-report', label:'تقرير الصرف',    icon:'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href:'/purchase-report', label:'تقرير المشتريات', icon:'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href:'/notifications', label:'الإشعارات', icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { href:'/settings',      label:'الإعدادات', icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

let _cache: {orgName:string;userName:string;userInit:string;lowCount:number;unread:number;ts:number}|null = null
const TTL = 5*60*1000

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [orgName, setOrgName]   = useState(_cache?.orgName||'')
  const [userName, setUserName] = useState(_cache?.userName||'')
  const [userInit, setUserInit] = useState(_cache?.userInit||'م')
  const [lowCount, setLowCount] = useState(_cache?.lowCount||0)
  const [unread, setUnread]     = useState(_cache?.unread||0)
  const [drawer, setDrawer]     = useState(false)
  const [orgForm, setOrgForm]   = useState({name:'',whatsapp:''})
  const [dSaving, setDSaving]   = useState(false)
  const [dMsg, setDMsg]         = useState('')
  const router   = useRouter()
  const pathname = usePathname()
  const sb = createClient()

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
    load()
  }, [])

  const load = useCallback(async (force=false) => {
    if (!force && _cache && Date.now()-_cache.ts < TTL) return
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { data: p } = await sb.from('profiles').select('id,full_name,org_id,organizations(name)').eq('id', user.id).single()
    if (!p) { router.replace('/login'); return }
    sessionStorage.setItem('s_org_id', p.org_id)
    sessionStorage.setItem('s_profile_id', p.id)
    const orgN = (p.organizations as any)?.name||''
    const userN = p.full_name||''
    const init = userN[0]||'م'
    setOrgName(orgN); setUserName(userN); setUserInit(init)
    const [{ data: prods }, { data: notifs }] = await Promise.all([
      sb.from('products').select('qty,reorder_point').eq('org_id', p.org_id).eq('is_active', true),
      sb.from('notifications').select('id').eq('org_id', p.org_id).eq('read', false),
    ])
    const low = (prods||[]).filter((x:any)=>x.qty<=x.reorder_point).length
    const unr = (notifs||[]).length
    setLowCount(low); setUnread(unr)
    _cache = { orgName:orgN, userName:userN, userInit:init, lowCount:low, unread:unr, ts:Date.now() }
  }, [])

  async function openDrawer() {
    setDrawer(true); setDMsg('')
    const oid = sessionStorage.getItem('s_org_id')
    if (!oid) return
    const { data: org } = await sb.from('organizations').select('name,whatsapp_number').eq('id', oid).single()
    if (org) setOrgForm({name:org.name||'', whatsapp:org.whatsapp_number||''})
  }

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault(); setDSaving(true)
    const oid = sessionStorage.getItem('s_org_id')
    if (!oid) { setDSaving(false); return }
    await sb.from('organizations').update({name:orgForm.name, whatsapp_number:orgForm.whatsapp}).eq('id', oid)
    if (_cache) { _cache.orgName=orgForm.name; _cache.ts=0 }
    setOrgName(orgForm.name); setDMsg('✅ تم الحفظ'); setDSaving(false)
    setTimeout(()=>setDMsg(''),3000)
  }

  async function sendWhatsapp() {
    const oid = sessionStorage.getItem('s_org_id')
    if (!oid) return; setDMsg('⏳ جاري الإرسال...')
    const res = await fetch('/api/notify-low-stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid})})
    const d = await res.json()
    setDMsg(d.success?'✅ تم الإرسال':'❌ فشل الإرسال')
    setTimeout(()=>setDMsg(''),4000)
  }

  async function logout() {
    _cache=null; sessionStorage.clear()
    await sb.auth.signOut(); router.replace('/login')
  }

  function Icon({ d, size=20 }: { d:string; size?:number }) {
    return (
      <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        {d.split(' M').map((s,i)=><path key={i} d={(i===0?'':' M')+s}/>)}
      </svg>
    )
  }

  const inp = {width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,outline:'none',fontFamily:'inherit',background:'white',color:'#0f172a',boxSizing:'border-box' as const}
  const dColor = dMsg.includes('✅')?{bg:'#f0fdf4',border:'#bbf7d0',color:'#166534'}: dMsg.includes('⏳')?{bg:'#fffbeb',border:'#fde68a',color:'#92400e'}:{bg:'#fef2f2',border:'#fecaca',color:'#991b1b'}

  return (
    <div style={{minHeight:'100vh',background:'#f5f7fa',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',display:'flex'}}>
      <style>{`
        html,body{overflow-x:hidden;max-width:100vw}

        /* ── Sidebar Desktop ── */
        .sidebar{
          position:fixed;right:0;top:0;bottom:0;width:260px;
          background:white;border-left:1px solid #f1f5f9;
          display:flex;flex-direction:column;z-index:100;
          box-shadow:none;
        }
        .main-content{margin-right:260px;min-height:100vh;display:flex;flex-direction:column;}
        .topbar{display:flex;}
        .mob-nav{display:none!important;}
        .mob-header{display:none!important;}

        /* ── Mobile ── */
        @media(max-width:768px){
          .sidebar{display:none!important;}
          .main-content{margin-right:0!important;}
          .topbar{display:none!important;}
          .mob-nav{display:flex!important;}
          .mob-header{display:flex!important;}
          .page-wrap{padding:14px!important;padding-bottom:90px!important;padding-top:70px!important;}
        }

        /* Nav link */
        .nav-link{
          display:flex;align-items:center;gap:12px;padding:11px 14px;
          border-radius:12px;margin-bottom:2px;cursor:pointer;
          transition:all .15s;color:#64748b;font-size:14px;font-weight:500;
          text-decoration:none;border:none;background:transparent;width:100%;text-align:right;
        }
        .nav-link:hover{background:#f8fafc;color:#0f172a;}
        .nav-link.active{background:#f0fdf4;color:#16a34a;font-weight:700;}
        .nav-link.active svg{stroke:#16a34a;}

        /* Page animations */
        .page-content{animation:fadeUp .25s ease both;}

        /* Cards */
        .card{background:white;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,.05);}
        .card-hover{transition:all .2s ease;cursor:pointer;}
        .card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)!important;}

        /* Buttons */
        .btn-primary{
          background:linear-gradient(135deg,#16a34a,#15803d);
          color:white;border:none;border-radius:12px;padding:12px 20px;
          font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;
          box-shadow:0 4px 14px rgba(22,163,74,.3);transition:all .15s;
          display:inline-flex;align-items:center;justify-content:center;gap:8px;
        }
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(22,163,74,.4);}
        .btn-secondary{
          background:white;color:#334155;border:1.5px solid #e2e8f0;
          border-radius:12px;padding:11px 18px;font-size:14px;font-weight:600;
          cursor:pointer;font-family:inherit;transition:all .15s;
          display:inline-flex;align-items:center;gap:8px;
        }
        .btn-secondary:hover{border-color:#16a34a;color:#16a34a;background:#f0fdf4;}
        .btn-danger{background:#fef2f2;color:#ef4444;border:1.5px solid #fecaca;border-radius:12px;padding:11px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;}

        /* Table */
        .trow:hover td{background:#fafafa!important;}

        /* Drawer */
        @keyframes drawerIn{from{transform:translateX(100%)}to{transform:none}}
        @keyframes overlayIn{from{opacity:0}to{opacity:1}}

        /* Mobile nav active */
        .mob-item{display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;padding:8px 4px;border-radius:12px;text-decoration:none;color:#94a3b8;font-size:10px;font-weight:500;transition:all .15s;border:none;background:transparent;cursor:pointer;}
        .mob-item.active{color:#16a34a;font-weight:700;}
        .mob-item.active .mob-icon{background:#f0fdf4;border-radius:12px;padding:6px;}

        @media(max-width:380px){.mob-item{font-size:9px;}}
      `}</style>

      {/* ══════════ SIDEBAR ══════════ */}
      <aside className="sidebar">
        {/* Logo */}
        <button onClick={openDrawer} style={{padding:'20px 18px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid #f1f5f9',background:'none',border:'none',cursor:'pointer',width:'100%',textAlign:'right' as const,transition:'background .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0,boxShadow:'0 4px 12px rgba(22,163,74,.25)'}}>🏪</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>Storely</div>
            {orgName&&<div style={{fontSize:11,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{orgName}</div>}
          </div>
          <svg width="14" height="14" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>

        {/* Main Nav */}
        <nav style={{flex:1,padding:'12px 12px',overflowY:'auto'}}>
          <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase',padding:'4px 6px 8px'}}>القائمة</div>
          {NAV.map(n=>{
            const active = pathname===n.href || (n.href!=='/dashboard' && pathname.startsWith(n.href))
            return (
              <a key={n.href} href={n.href} className={`nav-link${active?' active':''}`}>
                <Icon d={n.icon} size={18}/>
                <span style={{flex:1}}>{n.label}</span>
                {n.href==='/inventory'&&lowCount>0&&<span style={{background:'#ef4444',color:'white',fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:20,minWidth:20,textAlign:'center'}}>{lowCount}</span>}
                {n.href==='/reports'&&unread>0&&<span style={{background:'#ef4444',color:'white',fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:20,minWidth:20,textAlign:'center'}}>{unread}</span>}
              </a>
            )
          })}

          <div style={{height:1,background:'#f1f5f9',margin:'10px 4px'}}/>
          <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase',padding:'4px 6px 8px'}}>التقارير والنظام</div>
          {SIDEBAR_EXTRA.map(n=>{
            const active = pathname===n.href
            return (
              <a key={n.href} href={n.href} className={`nav-link${active?' active':''}`}>
                <Icon d={n.icon} size={18}/>
                <span>{n.label}</span>
                {n.href==='/notifications'&&unread>0&&<span style={{background:'#ef4444',color:'white',fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:20}}>{unread}</span>}
              </a>
            )
          })}
        </nav>

        {/* User */}
        <div style={{padding:'12px',borderTop:'1px solid #f1f5f9'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:'#f8fafc',marginBottom:8}}>
            <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'white',flexShrink:0}}>{userInit}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName||'مدير النظام'}</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>owner</div>
            </div>
          </div>
          <button onClick={logout} style={{width:'100%',padding:'10px 14px',background:'none',border:'1.5px solid #fecaca',borderRadius:12,color:'#ef4444',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8,justifyContent:'center',transition:'all .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <div className="main-content" style={{flex:1}}>
        {/* Desktop Topbar */}
        <header className="topbar" style={{height:60,background:'white',borderBottom:'1px solid #f1f5f9',alignItems:'center',justifyContent:'space-between',padding:'0 24px',position:'sticky',top:0,zIndex:50}}>
          <div style={{fontSize:16,fontWeight:700,color:'#0f172a'}}>
            {[...NAV,...SIDEBAR_EXTRA].find(n=>n.href===pathname)?.label||'Storely'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {lowCount>0&&(
              <a href="/inventory" style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:20,background:'#fef2f2',border:'1px solid #fecaca',color:'#ef4444',fontSize:12,fontWeight:700}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#ef4444',animation:'pulse 1.5s infinite',display:'block'}}/>
                {lowCount} ناقص
              </a>
            )}
            <a href="/notifications" style={{position:'relative',width:38,height:38,borderRadius:11,border:'1.5px solid #f1f5f9',background:'#fafafa',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'}
              onMouseLeave={e=>e.currentTarget.style.background='#fafafa'}>
              <Icon d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" size={17}/>
              {unread>0&&<span style={{position:'absolute',top:-3,right:-3,background:'#ef4444',color:'white',fontSize:8,fontWeight:800,borderRadius:'50%',width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 0 2px white'}}>{unread}</span>}
            </a>
            <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'white'}}>{userInit}</div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="mob-header" style={{position:'fixed',top:0,right:0,left:0,height:58,background:'white',borderBottom:'1px solid #f1f5f9',alignItems:'center',justifyContent:'space-between',padding:'0 16px',zIndex:100}}>
          <button onClick={openDrawer} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',padding:'4px'}}>
            <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🏪</div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>Storely</div>
              {orgName&&<div style={{fontSize:10,color:'#94a3b8'}}>{orgName}</div>}
            </div>
          </button>
          <div style={{display:'flex',gap:8}}>
            <a href="/notifications" style={{position:'relative',width:34,height:34,borderRadius:9,border:'1.5px solid #f1f5f9',background:'#fafafa',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b'}}>
              <Icon d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" size={16}/>
              {unread>0&&<span style={{position:'absolute',top:-3,right:-3,background:'#ef4444',color:'white',fontSize:7,fontWeight:800,borderRadius:'50%',width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white'}}>{unread}</span>}
            </a>
            <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'white'}}>{userInit}</div>
          </div>
        </header>

        {/* Page */}
        <main style={{flex:1,padding:'28px'}} className="page-wrap">
          <div className="page-content">{children}</div>
        </main>
      </div>

      {/* ══════════ MOBILE BOTTOM NAV ══════════ */}
      <nav className="mob-nav" style={{position:'fixed',bottom:0,right:0,left:0,background:'white',borderTop:'1px solid #f1f5f9',zIndex:100,alignItems:'center',padding:'6px 8px calc(6px + env(safe-area-inset-bottom,0px))',gap:0,boxShadow:'0 -4px 20px rgba(0,0,0,.06)'}}>
        {NAV.map(n=>{
          const active = pathname===n.href||(n.href!=='/dashboard'&&pathname.startsWith(n.href))
          return (
            <a key={n.href} href={n.href} className={`mob-item${active?' active':''}`}>
              <span className="mob-icon" style={{position:'relative',padding:active?'6px':'0',borderRadius:12,background:active?'#f0fdf4':'transparent',transition:'all .2s'}}>
                <svg width={active?20:19} height={active?20:19} fill="none" stroke={active?'#16a34a':'#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  {n.icon.split(' M').map((s,i)=><path key={i} d={(i===0?'':' M')+s}/>)}
                </svg>
                {n.href==='/inventory'&&lowCount>0&&<span style={{position:'absolute',top:-4,right:-4,background:'#ef4444',color:'white',fontSize:7,fontWeight:900,borderRadius:'50%',width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white'}}>{lowCount>9?'9+':lowCount}</span>}
                {n.href==='/reports'&&unread>0&&<span style={{position:'absolute',top:-4,right:-4,background:'#ef4444',color:'white',fontSize:7,fontWeight:900,borderRadius:'50%',width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white'}}>{unread}</span>}
              </span>
              <span style={{color:active?'#16a34a':'#94a3b8',marginTop:2}}>{n.label}</span>
            </a>
          )
        })}
      </nav>

      {/* ══════════ SETTINGS DRAWER ══════════ */}
      {drawer && (
        <div style={{position:'fixed',inset:0,zIndex:500}}>
          <div onClick={()=>setDrawer(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.4)',backdropFilter:'blur(4px)',animation:'overlayIn .2s ease'}}/>
          <div style={{position:'absolute',top:0,right:0,bottom:0,width:320,background:'white',display:'flex',flexDirection:'column',animation:'drawerIn .25s ease',boxShadow:'-8px 0 40px rgba(0,0,0,.12)'}}>
            <div style={{padding:'18px 20px',background:'linear-gradient(135deg,#0f3d24,#0a2416)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#22c55e,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏪</div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:'white'}}>الإعدادات</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>إعدادات المؤسسة</div>
                </div>
              </div>
              <button onClick={()=>setDrawer(false)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.1)',border:'none',color:'rgba(255,255,255,.7)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
            </div>

            <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
              {dMsg&&<div style={{background:dColor.bg,border:`1.5px solid ${dColor.border}`,borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:13,fontWeight:600,color:dColor.color}}>{dMsg}</div>}

              <form onSubmit={saveOrg}>
                <div style={{background:'#f8fafc',borderRadius:12,padding:'16px',marginBottom:12,border:'1px solid #f1f5f9'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:12}}>🏢 بيانات المؤسسة</div>
                  <div style={{marginBottom:10}}>
                    <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>اسم المؤسسة</label>
                    <input required value={orgForm.name} onChange={e=>setOrgForm({...orgForm,name:e.target.value})} style={inp}/>
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>رقم الواتساب</label>
                    <input value={orgForm.whatsapp} onChange={e=>setOrgForm({...orgForm,whatsapp:e.target.value})} placeholder="05XXXXXXXX" style={inp}/>
                  </div>
                  <button type="submit" disabled={dSaving} style={{width:'100%',padding:'11px',background:dSaving?'#94a3b8':'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    {dSaving?'جاري الحفظ...':'💾 حفظ'}
                  </button>
                </div>
              </form>

              <div style={{background:'#f8fafc',borderRadius:12,padding:'16px',marginBottom:12,border:'1px solid #f1f5f9'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:8}}>📲 إشعار واتساب</div>
                <p style={{fontSize:12,color:'#64748b',marginBottom:10}}>إرسال تنبيه بالمخزون الناقص</p>
                <button onClick={sendWhatsapp} style={{width:'100%',padding:'11px',background:'#25d366',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>📲 إرسال الآن</button>
              </div>

              <div style={{background:'#f8fafc',borderRadius:12,padding:'16px',marginBottom:12,border:'1px solid #f1f5f9'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:8}}>🔔 إشعارات الجهاز</div>
                <button onClick={async()=>{
                  if(!('Notification' in window)){setDMsg('❌ متصفحك لا يدعم الإشعارات');return}
                  const p=await Notification.requestPermission()
                  if(p==='granted'){new Notification('Storely 🎉',{body:'تم تفعيل الإشعارات!',dir:'rtl'});setDMsg('✅ تم تفعيل الإشعارات')}
                  else setDMsg('❌ لم يتم السماح')
                }} style={{width:'100%',padding:'11px',background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  🔔 تفعيل الإشعارات
                </button>
              </div>

              <div style={{background:'#f8fafc',borderRadius:12,padding:'16px',border:'1px solid #f1f5f9'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:10}}>⚡ روابط سريعة</div>
                {[{href:'/settings',l:'⚙️ إعدادات متقدمة'},{href:'/notifications',l:'🔔 الإشعارات'},{href:'/reports',l:'📊 التقارير'}].map(x=>(
                  <a key={x.href} href={x.href} onClick={()=>setDrawer(false)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderRadius:9,background:'white',border:'1px solid #f1f5f9',marginBottom:6,fontSize:13,fontWeight:600,color:'#334155',cursor:'pointer',textDecoration:'none',transition:'all .12s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    {x.l}
                    <svg width="12" height="12" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                ))}
              </div>
            </div>

            <div style={{padding:'12px 16px',borderTop:'1px solid #f1f5f9',display:'flex',gap:8,flexShrink:0}}>
              <button onClick={logout} style={{flex:1,padding:'10px',background:'#fef2f2',color:'#ef4444',border:'1px solid #fecaca',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                خروج
              </button>
              <button onClick={()=>setDrawer(false)} style={{flex:1,padding:'10px',background:'#f8fafc',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
