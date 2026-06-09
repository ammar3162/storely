'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { colors, radius, shadow, font, card } from '@/lib/ds'

const NAV = [
  { href:'/dashboard', label:'الرئيسية', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href:'/inventory',  label:'المخزون',  icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { href:'/purchases',  label:'مشتريات', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
  { href:'/dispense',   label:'الصرف',   icon:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  { href:'/reports',    label:'التقارير', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

const EXTRA = [
  { href:'/notifications', label:'الإشعارات', icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { href:'/settings',      label:'الإعدادات', icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

let _cache: any = null
const TTL = 5*60*1000

function BranchSelector({ branches, orgName, onSelect }: { branches:any[]; orgName:string; onSelect:(b:any)=>void }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,.5)',backdropFilter:'blur(6px)',fontFamily:font.family,direction:'rtl'}}>
      <div style={{...card,padding:28,width:'100%',maxWidth:420,boxShadow:shadow.lg}}>
        <div style={{textAlign:'center' as const,marginBottom:24}}>
          <div style={{width:56,height:56,borderRadius:radius.lg,background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,margin:'0 auto 12px'}}>🏪</div>
          <div style={{fontSize:font.lg,fontWeight:800,color:colors.text}}>{orgName}</div>
          <div style={{fontSize:font.sm,color:colors.text4,marginTop:4}}>اختر الفرع للمتابعة</div>
        </div>
        <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
          {branches.map((b:any,i:number)=>(
            <button key={b.id} onClick={()=>onSelect(b)}
              style={{padding:'14px 18px',borderRadius:radius.md,border:`1.5px solid ${colors.border2}`,background:colors.surface,cursor:'pointer',fontFamily:font.family,display:'flex',alignItems:'center',gap:12,transition:'all .15s',textAlign:'right' as const}}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=colors.primary;(e.currentTarget as HTMLButtonElement).style.background=colors.primaryLight}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=colors.border2;(e.currentTarget as HTMLButtonElement).style.background=colors.surface}}>
              <div style={{width:40,height:40,borderRadius:radius.md,background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18}}>{i===0?'🏠':'🏪'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:font.base,fontWeight:700,color:colors.text}}>{b.name}</div>
                {b.location&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>{b.location}</div>}
              </div>
              <svg width={16} height={16} fill="none" stroke={colors.text4} strokeWidth={2} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [orgName, setOrgName]         = useState(_cache?.orgName||'')
  const [branchName, setBranchName]   = useState(typeof window!=='undefined'?sessionStorage.getItem('s_branch_name')||'':'')
  const [userName, setUserName]       = useState(_cache?.userName||'')
  const [userInit, setUserInit]       = useState(_cache?.userInit||'م')
  const [lowCount, setLowCount]       = useState(_cache?.lowCount||0)
  const [unread, setUnread]           = useState(_cache?.unread||0)
  const [drawer, setDrawer]           = useState(false)
  const [branches, setBranches]       = useState<any[]>([])
  const [showBranchSel, setShowBranchSel] = useState(false)
  const [ready, setReady]             = useState(false)
  const router   = useRouter()
  const pathname = usePathname()
  const sb = createClient()

  useEffect(()=>{
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
    load()
  },[])

  const load = useCallback(async()=>{
    const{data:{user}}=await sb.auth.getUser()
    if(!user){router.replace('/login');return}
    const{data:p}=await sb.from('profiles').select('id,full_name,org_id,organizations(name)').eq('id',user.id).single()
    if(!p){router.replace('/login');return}
    const orgN=(p.organizations as any)?.name||''
    const userN=p.full_name||''
    setOrgName(orgN); setUserName(userN); setUserInit(userN[0]||'م')
    sessionStorage.setItem('s_org_id',p.org_id)
    sessionStorage.setItem('s_profile_id',p.id)

    const{data:bList}=await sb.from('branches').select('*').eq('org_id',p.org_id).eq('is_active',true).order('created_at')
    const bl=bList||[]
    setBranches(bl)

    // إذا تغير عدد الفروع امسح الاختيار القديم
    const savedBranchCount = sessionStorage.getItem('s_branch_count')
    if(savedBranchCount && Number(savedBranchCount) !== bl.length) {
      sessionStorage.removeItem('s_branch_id')
      sessionStorage.removeItem('s_branch_name')
    }
    sessionStorage.setItem('s_branch_count', String(bl.length))

    if(bl.length<=1){
      const b=bl[0]||null
      if(b){sessionStorage.setItem('s_branch_id',b.id);sessionStorage.setItem('s_branch_name',b.name);setBranchName(b.name)}
      setReady(true)
    } else {
      const saved=sessionStorage.getItem('s_branch_id')
      if(saved&&bl.find((x:any)=>x.id===saved)){
        const b=bl.find((x:any)=>x.id===saved)
        setBranchName(b?.name||''); setReady(true)
      } else {
        setShowBranchSel(true)
      }
    }

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
    setBranchName(b.name); setShowBranchSel(false); setReady(true)
  }

  const C={bg:'#0f172a',bg2:'#1e293b',border:'rgba(255,255,255,.08)',text:'rgba(255,255,255,.9)',text2:'rgba(255,255,255,.5)'}
  const isActive=(href:string)=>pathname===href||(href!=='/dashboard'&&pathname.startsWith(href))

  function NavBtn({item,badge}:{item:any;badge?:number}){
    const active=isActive(item.href)
    return(
      <button onClick={()=>router.push(item.href)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 10px',borderRadius:radius.md,border:'none',cursor:'pointer',fontFamily:font.family,marginBottom:2,background:active?colors.primary+'22':'transparent',color:active?colors.primary:C.text2,transition:'all .15s',textAlign:'right' as const}}>
        <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{item.icon.split(' M').map((d:string,j:number)=><path key={j} d={(j===0?'':' M')+d}/>)}</svg>
        <span style={{fontSize:font.sm,fontWeight:active?700:500}}>{item.label}</span>
        {badge&&badge>0&&<span style={{marginRight:'auto',background:colors.danger,color:'white',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:99}}>{badge}</span>}
      </button>
    )
  }

  return (
    <>
      {showBranchSel&&<BranchSelector branches={branches} orgName={orgName} onSelect={selectBranch}/>}
      <div style={{display:'flex',minHeight:'100vh',background:colors.bg,fontFamily:font.family,direction:'rtl'}}>
        <style>{`
          @media(max-width:768px){.desk-side{display:none!important}.mob-header{display:flex!important}.mob-nav{display:flex!important}.main-pad{margin-right:0!important;padding:72px 16px 80px!important}}
          .mob-header{display:none}.mob-nav{display:none}
        `}</style>

        {/* Sidebar */}
        <aside className="desk-side" style={{width:220,background:C.bg,display:'flex',flexDirection:'column' as const,position:'fixed',top:0,right:0,bottom:0,zIndex:100}}>
          <div style={{padding:'20px 16px 16px',borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,borderRadius:radius.md,background:colors.primary,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🏪</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:font.sm,fontWeight:800,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{orgName||'Storely'}</div>
                {branchName&&<button onClick={()=>branches.length>1&&setShowBranchSel(true)} style={{fontSize:font.xs,color:colors.primary,background:'none',border:'none',cursor:branches.length>1?'pointer':'default',padding:0,fontFamily:font.family}}>{branchName}{branches.length>1?' ▼':''}</button>}
              </div>
            </div>
          </div>
          <nav style={{flex:1,padding:'12px 8px',overflowY:'auto'}}>
            {NAV.map(item=><NavBtn key={item.href} item={item} badge={item.href==='/inventory'?lowCount:undefined}/>)}
            <div style={{height:1,background:C.border,margin:'8px 0'}}/>
            {EXTRA.map(item=><NavBtn key={item.href} item={item} badge={item.href==='/notifications'?unread:undefined}/>)}
          </nav>
          <div style={{padding:'12px 16px',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:colors.primary,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'white',flexShrink:0}}>{userInit}</div>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:font.xs,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{userName}</div></div>
            <button onClick={async()=>{await sb.auth.signOut();_cache=null;sessionStorage.clear();router.replace('/login')}} style={{background:'none',border:'none',cursor:'pointer',color:C.text2,padding:4}}>
              <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="mob-header" style={{position:'fixed',top:0,right:0,left:0,zIndex:100,background:C.bg,padding:'12px 16px',borderBottom:`1px solid ${C.border}`,alignItems:'center',gap:12}}>
          <button onClick={()=>setDrawer(true)} style={{background:'none',border:'none',cursor:'pointer',color:C.text,padding:4}}>
            <svg width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div style={{flex:1,fontSize:font.base,fontWeight:700,color:C.text,textAlign:'center' as const}}>{orgName}</div>
          {branchName&&branches.length>1&&<button onClick={()=>setShowBranchSel(true)} style={{fontSize:font.xs,color:colors.primary,background:'none',border:'none',cursor:'pointer',fontFamily:font.family}}>{branchName} ▼</button>}
        </header>

        {/* Drawer */}
        {drawer&&(
          <div style={{position:'fixed',inset:0,zIndex:200}}>
            <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)'}} onClick={()=>setDrawer(false)}/>
            <div style={{position:'absolute',top:0,right:0,bottom:0,width:260,background:C.bg,padding:'20px 8px',display:'flex',flexDirection:'column' as const}}>
              <div style={{padding:'0 8px 16px',borderBottom:`1px solid ${C.border}`,marginBottom:8}}>
                <div style={{fontSize:font.base,fontWeight:800,color:C.text}}>{orgName}</div>
                {branchName&&<div style={{fontSize:font.xs,color:colors.primary}}>{branchName}</div>}
              </div>
              {[...NAV,...EXTRA].map(item=>(
                <button key={item.href} onClick={()=>{router.push(item.href);setDrawer(false)}} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 12px',borderRadius:radius.md,border:'none',cursor:'pointer',fontFamily:font.family,marginBottom:2,background:isActive(item.href)?colors.primary+'22':'transparent',color:isActive(item.href)?colors.primary:C.text2,textAlign:'right' as const}}>
                  <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{item.icon.split(' M').map((d:string,j:number)=><path key={j} d={(j===0?'':' M')+d}/>)}</svg>
                  <span style={{fontSize:font.sm}}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main */}
        <main className="main-pad" style={{flex:1,marginRight:220,minHeight:'100vh',padding:24}}>
          {ready?children:(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column' as const,gap:12}}>
              <div style={{width:36,height:36,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
        </main>

        {/* Bottom Nav Mobile */}
        <nav className="mob-nav" style={{position:'fixed',bottom:0,right:0,left:0,zIndex:100,background:C.bg,borderTop:`1px solid ${C.border}`,padding:'8px 0',justifyContent:'space-around'}}>
          {NAV.map(item=>{
            const active=isActive(item.href)
            return(
              <button key={item.href} onClick={()=>router.push(item.href)} style={{display:'flex',flexDirection:'column' as const,alignItems:'center',gap:3,padding:'4px 8px',background:'none',border:'none',cursor:'pointer',fontFamily:font.family,color:active?colors.primary:C.text2,position:'relative' as const}}>
                <svg width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{item.icon.split(' M').map((d:string,j:number)=><path key={j} d={(j===0?'':' M')+d}/>)}</svg>
                <span style={{fontSize:9,fontWeight:active?700:400}}>{item.label}</span>
                {item.href==='/inventory'&&lowCount>0&&<span style={{position:'absolute' as const,top:0,right:4,background:colors.danger,color:'white',fontSize:8,fontWeight:700,padding:'1px 4px',borderRadius:99}}>{lowCount}</span>}
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
