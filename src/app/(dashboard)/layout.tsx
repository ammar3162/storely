'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

import AIAssistant from '@/components/AIAssistant'

const C = {
  primary: '#16a34a', primaryD: '#15803d', primaryL: '#f0fdf4', primaryB: '#bbf7d0',
  danger:  '#ef4444', dangerL:  '#fef2f2',
  text:    '#111827', text2: '#374151', text3: '#6b7280', text4: '#9ca3af',
  bg:      '#f5f7fa', surface: '#ffffff', border: '#f0f0f0',
}

const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [
      { href:'/dashboard', label:'الرئيسية', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ]
  },
  {
    label: 'المخزون',
    items: [
      { href:'/inventory',  label:'المخزون',  icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href:'/dispense',   label:'الصرف',   icon:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
      { href:'/purchases',  label:'مشتريات', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    ]
  },
  {
    label: 'الإدارة',
    items: [
      { href:'/reports',    label:'التقارير', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href:'/staff-management', label:'الموظفون', icon:'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 11-8 0' },
      { href:'/suppliers',  label:'الموردين', icon:'M3 7h13l3 5v5h-3m-10 0H3v-7m13-3v10m-13 0a2 2 0 104 0m-4 0a2 2 0 114 0m9 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
    ]
  },
  {
    label: 'الأدوات',
    items: [
      { href:'/ai-tools',   label:'أدوات الذكاء', icon:'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z' },
      { href:'/notifications', label:'الإشعارات', icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    ]
  },
  {
    label: 'الإعدادات',
    items: [
      { href:'/settings',   label:'الإعدادات', icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { href:'https://wa.me/966594351667?text=أحتاج مساعدة في Storely', label:'الدعم الفني', icon:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347' },
    ]
  },
]

const NAV_MAIN = NAV_GROUPS.flatMap(g=>g.items)
const NAV_MORE: {href:string;label:string;icon:string}[] = []

let _cache: any = null

function Icon({ d, size=20, stroke='currentColor', width=2 }: { d:string; size?:number; stroke?:string; width?:number }) {
  return (
    <svg width={size} height={size} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      {d.split(' M').map((p,i)=><path key={i} d={(i===0?'':' M')+p}/>)}
    </svg>
  )
}

// لا نضيف شيء هنا — الإشعار سيكون في الداشبورد مباشرة
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [orgName, setOrgName]       = useState('')
  const [orgLogo, setOrgLogo]       = useState<string|null>(null)
  const [branchName, setBranchName] = useState('')
  const [userName, setUserName]     = useState('')
  const [userInit, setUserInit]     = useState('م')
  const [lowCount, setLowCount]     = useState(0)
  const [unread, setUnread]         = useState(0)
  const [branches, setBranches]     = useState<any[]>([])
  const [showMore, setShowMore]     = useState(false)
  const [showBranch, setShowBranch] = useState(false)
  const [ready, setReady]           = useState(false)
  const [theme, setTheme]           = useState<'light'|'dark'>('light')
  const router   = useRouter()
  const pathname = usePathname()
  const sb = createClient()

  useEffect(()=>{
    const saved = localStorage.getItem('storely_theme') as 'light'|'dark' || 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
    load()
  },[])

  function toggleTheme() {
    const next = theme==='light'?'dark':'light'
    setTheme(next)
    localStorage.setItem('storely_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const load = useCallback(async()=>{
    const{data:{user}}=await sb.auth.getUser()
    if(!user){router.replace('/login');return}
    const{data:p}=await sb.from('profiles').select('id,full_name,org_id,organizations(name,logo_url)').eq('id',user.id).single()
    if(!p){router.replace('/login');return}
    if(!p.org_id){router.replace('/pending');return}
    // فحص انتهاء الاشتراك
    const{data:subData}=await (sb as any).from('profiles').select('subscription_ends_at,subscription_type').eq('id',user.id).single()
    if(subData?.subscription_ends_at){
      const ends=new Date(subData.subscription_ends_at)
      if(ends<new Date()&&subData.subscription_type!=='paid'){
        router.replace('/expired');return
      }
    }
    const orgN=(p.organizations as any)?.name||''
    const orgLogoUrl=(p.organizations as any)?.logo_url||null
    const userN=p.full_name||''
    setOrgName(orgN); setUserName(userN); setUserInit(userN[0]||'م'); setOrgLogo(orgLogoUrl)
    sessionStorage.setItem('s_org_id',p.org_id)
    sessionStorage.setItem('s_profile_id',p.id)
    const{data:orgData}=await (sb as any).from('organizations').select('plan,max_staff,max_suppliers,country_code').eq('id',p.org_id).single()
    const orgPlan=(orgData as any)?.plan||'basic'
    sessionStorage.setItem('s_plan',orgPlan)
    sessionStorage.setItem('s_country_code',(orgData as any)?.country_code||'+966')
    sessionStorage.setItem('s_max_staff',String((orgData as any)?.max_staff||1))
    sessionStorage.setItem('s_max_suppliers',String((orgData as any)?.max_suppliers||1))
    const{data:bList}=await sb.from('branches').select('*').eq('org_id',p.org_id).eq('is_active',true).order('created_at')
    const bl=bList||[]
    setBranches(bl)
    sessionStorage.setItem('s_branches',JSON.stringify(bl))
    if(bl.length<=1){
      const b=bl[0]||null
      if(b){sessionStorage.setItem('s_branch_id',b.id);sessionStorage.setItem('s_branch_name',b.name);setBranchName(b.name)}
    } else {
      const saved=sessionStorage.getItem('s_branch_id')
      if(saved&&bl.find((x:any)=>x.id===saved)){
        setBranchName(bl.find((x:any)=>x.id===saved)?.name||'')
      } else {
        const def=bl[0]
        if(def){sessionStorage.setItem('s_branch_id',def.id);sessionStorage.setItem('s_branch_name',def.name);setBranchName(def.name)}
      }
    }
    setReady(true)
    const[{data:prods},{data:notifs}]=await Promise.all([
      sb.from('products').select('qty,reorder_point').eq('org_id',p.org_id).eq('is_active',true),
      sb.from('notifications').select('id').eq('org_id',p.org_id).eq('read',false),
    ])
    setLowCount((prods||[]).filter((x:any)=>x.qty<=x.reorder_point).length)
    setUnread((notifs||[]).length)
  },[])

  function selectBranch(b:any){
    sessionStorage.setItem('s_branch_id',b.id)
    sessionStorage.setItem('s_branch_name',b.name)
    setBranchName(b.name); setShowBranch(false)
    window.location.reload()
  }

  const isActive=(href:string)=>pathname===href||(href!=='/dashboard'&&pathname.startsWith(href))

  // Bottom nav items
  const BOT_NAV = [
    { href:'/dashboard', label:'الرئيسية', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href:'/inventory',  label:'المخزون',  icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', badge:lowCount },
    { href:'/dispense',   label:'الصرف',   icon:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
    { href:'/purchases',  label:'مشتريات', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
  ]

  return (
    <>
      {/* Branch selector */}
      {showBranch && branches.length>1 && (
        <div style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,.5)',backdropFilter:'blur(6px)',display:'flex',alignItems:'flex-end',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:24}}>
            <div style={{width:36,height:4,borderRadius:99,background:'#e5e7eb',margin:'0 auto 20px'}}/>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:16}}>اختر الفرع</div>
            {branches.map((b:any)=>(
              <button key={b.id} onClick={()=>selectBranch(b)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:12,border:`1.5px solid ${sessionStorage.getItem('s_branch_id')===b.id?C.primary:'#e5e7eb'}`,background:sessionStorage.getItem('s_branch_id')===b.id?C.primaryL:'white',marginBottom:8,cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                <div style={{width:36,height:36,borderRadius:10,background:C.primaryL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🏪</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{b.name}</div>
                  {b.location&&<div style={{fontSize:11,color:C.text3}}>{b.location}</div>}
                </div>
                {sessionStorage.getItem('s_branch_id')===b.id&&<span style={{fontSize:12,color:C.primary,fontWeight:700}}>✓</span>}
              </button>
            ))}
            <button onClick={()=>setShowBranch(false)} style={{width:'100%',padding:'13px',background:'#f9fafb',border:'1.5px solid #e5e7eb',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:C.text2,marginTop:4}}>إلغاء</button>
          </div>
        </div>
      )}

      {/* More drawer — mobile */}
      {showMore && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'flex-end',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.4)',backdropFilter:'blur(4px)'}} onClick={()=>setShowMore(false)}/>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',padding:'12px 20px 32px',position:'relative',animation:'slideUp .3s ease'}}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}`}</style>
            <div style={{width:36,height:4,borderRadius:99,background:'#e5e7eb',margin:'0 auto 20px'}}/>

            {/* User info */}
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:C.primaryL,borderRadius:14,marginBottom:16,border:`1px solid ${C.primaryB}`}}>
              <div style={{width:44,height:44,borderRadius:12,background:C.primary,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'white',flexShrink:0}}>{userInit}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{userName}</div>
                <div style={{fontSize:11,color:C.primary,fontWeight:600}}>{orgName}</div>
                {branchName&&<div style={{fontSize:10,color:C.text3}}>{branchName}</div>}
              </div>
              {branches.length>1&&(
                <button onClick={()=>{setShowMore(false);setShowBranch(true)}} style={{padding:'6px 12px',background:'white',border:`1px solid ${C.primaryB}`,borderRadius:8,fontSize:11,fontWeight:700,color:C.primary,cursor:'pointer',fontFamily:'inherit'}}>تغيير</button>
              )}
            </div>

            {/* Nav items */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
              {[...NAV_MAIN,...NAV_MORE].map(item=>{
                const active=isActive(item.href)
                return (
                  <button key={item.href} onClick={()=>{router.push(item.href);setShowMore(false)}} onMouseEnter={()=>router.prefetch(item.href)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:12,border:`1.5px solid ${active?C.primary:'#e5e7eb'}`,background:active?C.primaryL:'#f9fafb',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                    <div style={{width:32,height:32,borderRadius:9,background:active?C.primary:'#e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon d={item.icon} size={15} stroke={active?'white':'#6b7280'} width={2}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:active?700:600,color:active?C.primary:C.text2}}>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Actions */}
            <div style={{display:'flex',gap:8}}>
              <button onClick={toggleTheme} style={{flex:1,padding:'11px',background:'#f9fafb',border:'1.5px solid #e5e7eb',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:C.text2,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                {theme==='light'?'🌙 داكن':'☀️ فاتح'}
              </button>
              <button onClick={async()=>{await sb.auth.signOut();_cache=null;sessionStorage.clear();router.replace('/login')}}
                style={{flex:1,padding:'11px',background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',color:'#ef4444',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" size={15} stroke="#ef4444" width={2.5}/>
                خروج
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',minHeight:'100vh',background:C.bg}}>
        <style>{`
          *{box-sizing:border-box}
          @keyframes spin{to{transform:rotate(360deg)}}

          /* Mobile — default */
          .desk-layout{display:none}
          .mob-layout{display:flex;flex-direction:column;min-height:100vh}
          .mob-header{display:flex}
          .mob-content{flex:1;padding:0 12px 80px;margin-top:70px}
          .mob-bottom-nav{display:flex}
          .desk-sidebar{display:none}

          /* Desktop */
          @media(min-width:768px){
            .desk-layout{display:flex;min-height:100vh}
            .mob-layout{display:none}
            .desk-sidebar{display:flex;flex-direction:column;width:220px;position:fixed;top:0;right:0;bottom:0;background:#0d2818;z-index:100;border-left:1px solid rgba(255,255,255,.06)}
            .desk-content{flex:1;margin-right:220px;padding:20px 20px;min-height:100vh;width:calc(100vw - 220px);max-width:calc(100vw - 220px)}
          }
        `}</style>

        {/* ═══ MOBILE LAYOUT ═══ */}
        <div className="mob-layout">
          {/* Mobile Header — Zid style */}
          <header className="mob-header" style={{position:'fixed',top:0,right:0,left:0,zIndex:100,background:`linear-gradient(135deg,${C.primary},${C.primaryD})`,padding:'12px 16px',alignItems:'center',gap:10}}>
            <div style={{flex:1,display:'flex',alignItems:'center',gap:8,minWidth:0}}>
              <img src={orgLogo||"/storely-logo.png"} alt="Storely" style={{maxWidth:40,maxHeight:40,height:'auto',width:'auto',flexShrink:0}}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{orgName||'Storely'}</div>
                {branchName&&(
                  <button onClick={()=>branches.length>1&&setShowBranch(true)}
                    style={{fontSize:10,color:'rgba(255,255,255,.8)',background:'none',border:'none',cursor:branches.length>1?'pointer':'default',padding:0,fontFamily:'inherit',display:'flex',alignItems:'center',gap:2}}>
                    {branchName}{branches.length>1&&' ▾'}
                  </button>
                )}
              </div>
            </div>
            {lowCount>0&&(
              <button onClick={()=>router.push('/inventory')} style={{background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.3)',borderRadius:99,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#fbbf24',display:'inline-block'}}/>
                <span style={{fontSize:10,fontWeight:700,color:'white'}}>{lowCount} ناقص</span>
              </button>
            )}
            <button onClick={()=>router.push('/notifications')}
              style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,position:'relative'}}>
              <Icon d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" size={18} stroke="white" width={2}/>
              {unread>0&&<span style={{position:'absolute',top:4,right:4,width:8,height:8,borderRadius:'50%',background:'#ef4444',border:'1.5px solid transparent'}}/>}
            </button>
            <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'white',cursor:'pointer',flexShrink:0}} onClick={()=>setShowMore(true)}>
              {userInit}
            </div>
          </header>

          {/* Mobile Content */}
          <div className="mob-content">
            {ready ? children : (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
                <div style={{width:32,height:32,border:`3px solid #e5e7eb`,borderTopColor:C.primary,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
              </div>
            )}
          </div>

          {/* Mobile Bottom Nav — Zid style */}
          <nav className="mob-bottom-nav" style={{position:'fixed',bottom:0,right:0,left:0,zIndex:100,background:'white',borderTop:'1px solid #f0f0f0',paddingBottom:'env(safe-area-inset-bottom)',justifyContent:'space-around',alignItems:'stretch',boxShadow:'0 -4px 20px rgba(0,0,0,.06)'}}>
            {BOT_NAV.map(item=>{
              const active=isActive(item.href)
              return(
                <button key={item.href} onClick={()=>router.push(item.href)} onMouseEnter={()=>router.prefetch(item.href)}
                  style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,padding:'10px 4px 8px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',color:active?C.primary:'#9ca3af',position:'relative',transition:'color .15s'}}>
                  {active&&<div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:28,height:3,borderRadius:99,background:C.primary}}/>}
                  <div style={{position:'relative'}}>
                    <Icon d={item.icon} size={22} stroke={active?C.primary:'#9ca3af'} width={active?2.5:1.8}/>
                    {(item as any).badge>0&&<span style={{position:'absolute',top:-4,right:-6,background:'#ef4444',color:'white',fontSize:8,fontWeight:700,padding:'1px 4px',borderRadius:99,minWidth:14,textAlign:'center'}}>{(item as any).badge}</span>}
                  </div>
                  <span style={{fontSize:9,fontWeight:active?700:400}}>{item.label}</span>
                </button>
              )
            })}
            {/* More button */}
            <button onClick={()=>setShowMore(true)}
              style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,padding:'10px 4px 8px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',color:'#9ca3af',position:'relative',transition:'color .15s'}}>
              <div style={{position:'relative'}}>
                <Icon d="M4 6h16M4 12h16M4 18h16" size={22} stroke="#9ca3af" width={1.8}/>
                {(unread>0||lowCount>0)&&<span style={{position:'absolute',top:-3,right:-4,width:7,height:7,borderRadius:'50%',background:'#ef4444',border:'1.5px solid white'}}/>}
              </div>
              <span style={{fontSize:9,fontWeight:400}}>المزيد</span>
            </button>
          </nav>
        </div>

        {/* ═══ DESKTOP LAYOUT ═══ */}
        <div className="desk-layout">
          {/* Desktop Sidebar */}
          <aside className="desk-sidebar">
            <div style={{padding:'18px 16px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,.92)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:5}}><img src={orgLogo||"/storely-logo.png"} alt="Storely" style={{maxWidth:'100%',maxHeight:'100%',width:'auto',height:'auto',objectFit:'contain'}}/></div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,color:'rgba(255,255,255,.9)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{orgName||'Storely'}</div>
                {branchName&&<button onClick={()=>branches.length>1&&setShowBranch(true)} style={{fontSize:10,color:C.primary,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}>{branchName}{branches.length>1&&' ▾'}</button>}
              </div>
            </div>

            <nav style={{flex:1,padding:'8px 8px',overflowY:'auto'}}>
              {NAV_GROUPS.map((group,gi)=>(
                <div key={gi} style={{marginBottom:4}}>
                  <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.25)',letterSpacing:'.1em',textTransform:'uppercase',padding:'8px 10px 4px'}}>{group.label}</div>
                  {group.items.map(item=>{
                    const active=isActive(item.href)
                    const badge=item.href==='/inventory'?lowCount:item.href==='/notifications'?unread:0
                    const isExternal=item.href.startsWith('http')
                    return(
                      <button key={item.href}
                        onClick={()=>isExternal?window.open(item.href,'_blank'):router.push(item.href)}
                        onMouseEnter={()=>!isExternal&&router.prefetch(item.href)}
                        style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',marginBottom:1,background:active?`${C.primary}22`:'transparent',color:active?C.primary:'rgba(255,255,255,.55)',transition:'all .15s',textAlign:'right'}}>
                        <div style={{width:28,height:28,borderRadius:7,background:active?`${C.primary}33`:'rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <Icon d={item.icon} size={15} stroke={active?C.primary:'rgba(255,255,255,.55)'} width={active?2.5:2}/>
                        </div>
                        <span style={{fontSize:12,fontWeight:active?700:500,flex:1}}>{item.label}</span>
                        {badge>0&&<span style={{background:C.danger,color:'white',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:99,minWidth:18,textAlign:'center'}}>{badge}</span>}
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>

            <div style={{padding:'12px 14px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:C.primary,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'white',flexShrink:0}}>{userInit}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.8)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName}</div>
              </div>
              <button onClick={toggleTheme} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',fontSize:14,padding:4}}>{theme==='light'?'🌙':'☀️'}</button>
              <button onClick={async()=>{await sb.auth.signOut();_cache=null;sessionStorage.clear();router.replace('/login')}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',padding:4}}>
                <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" size={15} stroke="rgba(255,255,255,.5)" width={2}/>
              </button>
            </div>
          </aside>



          {/* Desktop Content */}
          <main className="desk-content">
            {ready ? children : (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
                <div style={{width:32,height:32,border:`3px solid #e5e7eb`,borderTopColor:C.primary,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
              </div>
            )}
          </main>
        </div>
      </div>
      <AIAssistant/>
    </>
  )
}
