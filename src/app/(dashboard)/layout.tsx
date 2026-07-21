'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
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
    label: 'راقب أداءك',
    items: [
      { href:'/dashboard', label:'الرئيسية', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href:'/reports',    label:'التقارير', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href:'/notifications', label:'الإشعارات', icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    ]
  },
  {
    label: 'إدارة المخزون',
    items: [
      { href:'/inventory',  label:'المخزون',  icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href:'/dispense',   label:'الصرف',   icon:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
      { href:'/purchases',  label:'مشتريات', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    ]
  },
  {
    label: 'إدارة الفريق',
    items: [
      { href:'/staff-management', label:'الموظفون', icon:'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 11-8 0' },
      { href:'/branches', label:'إدارة الفروع', icon:'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4' },
      { href:'/suppliers',  label:'الموردين', icon:'M3 7h13l3 5v5h-3m-10 0H3v-7m13-3v10m-13 0a2 2 0 104 0m-4 0a2 2 0 114 0m9 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
      { href:'/marketplace', label:'موردون معتمدون', icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    ]
  },
  {
    label: 'نمّ أعمالك',
    items: [
      { href:'/ai-tools',   label:'أدوات الذكاء', icon:'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z' },
    ]
  },
  {
    label: 'إدارة حسابك',
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
  const [subDaysLeft, setSubDaysLeft] = useState<number|null>(null)
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
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)
  const [profileId, setProfileId] = useState('')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [theme, setTheme]           = useState<'light'|'dark'>('light')
  const router   = useRouter()
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const [pillStyle, setPillStyle] = useState<{top:number,height:number,opacity:number}>({top:0,height:0,opacity:0})

  useEffect(()=>{
    const raf = requestAnimationFrame(()=>{
      if(!navRef.current) return
      const activeEl = navRef.current.querySelector('[data-active="true"]') as HTMLElement|null
      if(!activeEl){ setPillStyle(s=>({...s,opacity:0})); return }
      const navRect = navRef.current.getBoundingClientRect()
      const itemRect = activeEl.getBoundingClientRect()
      setPillStyle({
        top: itemRect.top - navRect.top + navRef.current.scrollTop,
        height: itemRect.height,
        opacity: 1,
      })
    })
    return ()=>cancelAnimationFrame(raf)
  },[pathname])
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
    const{data:p}=await (sb as any).from('profiles').select('id,full_name,org_id,whatsapp_consent,organizations(name,logo_url)').eq('id',user.id).single()
    if(!p){router.replace('/login');return}
    if(!p.org_id){router.replace('/pending');return}
    // فحص انتهاء الاشتراك
    const{data:subData}=await (sb as any).from('profiles').select('subscription_ends_at,subscription_type').eq('id',user.id).single()
    if(subData?.subscription_ends_at){
      const ends=new Date(subData.subscription_ends_at)
      if(ends<new Date()&&subData.subscription_type!=='paid'){
        router.replace('/expired');return
      }
      // تحذير استباقي قبل انتهاء الاشتراك (خلال 7 أيام أو أقل)
      const daysLeft=Math.ceil((ends.getTime()-Date.now())/(1000*60*60*24))
      if(daysLeft<=7&&daysLeft>=0) setSubDaysLeft(daysLeft)
    }
    const orgN=(p.organizations as any)?.name||''
    const orgLogoUrl=(p.organizations as any)?.logo_url||null
    const userN=p.full_name||''
    setOrgName(orgN); setUserName(userN); setUserInit(userN[0]||'م'); setOrgLogo(orgLogoUrl)
    sessionStorage.setItem('s_org_id',p.org_id)
    sessionStorage.setItem('s_profile_id',p.id)
    setProfileId(p.id)
    if((p as any).whatsapp_consent !== true){ setShowConsent(true) }
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
    // استمع لتحديث اللوجو
    window.addEventListener('logo-updated', (e:any)=>{
      setOrgLogo(e.detail)
    })
    window.addEventListener('notifications-updated', async ()=>{
      const oid = sessionStorage.getItem('s_org_id')
      if(!oid) return
      const { data: notifData } = await sb.from('notifications').select('id').eq('org_id',oid).eq('read',false)
      setUnread(notifData?.length||0)
    })
    if(typeof window !== "undefined" && "serviceWorker" in navigator) {
      // طلب إذن الإشعارات
      if(Notification.permission === "default") {
        Notification.requestPermission()
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js")
        const existing = await reg.pushManager.getSubscription()
        if(!existing) {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          })
          await fetch("/api/push-subscribe", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ subscription: sub, org_id: p?.org_id })
          })
        }
      } catch(e) { console.log("Push:", e) }
    }
    // polling للإشعارات كل 30 ثانية
    const orgId = p?.org_id
    if(orgId){
      const notifInterval = setInterval(async()=>{
        const{data:notifData}=await sb.from('notifications').select('id').eq('org_id',orgId).eq('read',false)
        setUnread(notifData?.length||0)
      }, 30000)
    }
    const _bidLayout = sessionStorage.getItem('s_branch_id')
    let _prodsQ = sb.from('products').select('qty,reorder_point').eq('org_id',p.org_id).eq('is_active',true)
    if (_bidLayout) _prodsQ = _prodsQ.eq('branch_id', _bidLayout)
    const[{data:prods},{data:notifs}]=await Promise.all([
      _prodsQ,
      sb.from('notifications').select('id').eq('org_id',p.org_id).eq('read',false),
    ])
    setLowCount((prods||[]).filter((x:any)=>x.qty<=x.reorder_point).length)
    setUnread((notifs||[]).length)
  },[])

  async function acceptConsent(){
    if(!consentChecked || !profileId) return
    setConsentSaving(true)
    await sb.from('profiles').update({ whatsapp_consent:true, whatsapp_consent_at:new Date().toISOString() } as any).eq('id',profileId)
    setConsentSaving(false)
    setShowConsent(false)
  }

  function selectBranch(b:any){
    sessionStorage.setItem('s_branch_id',b.id)
    sessionStorage.setItem('s_branch_name',b.name)
    setBranchName(b.name); setShowBranch(false)
    window.location.reload()
  }

  const [confirmStopBranch, setConfirmStopBranch] = useState<any|null>(null)
  const [stoppingBranch, setStoppingBranch] = useState(false)

  async function stopBranch(b:any) {
    if (branches.length <= 1) { alert('لا يمكن إيقاف الفرع الوحيد المتبقي'); return }
    setStoppingBranch(true)
    await sb.from('branches').update({ is_active:false } as any).eq('id', b.id)
    const remaining = branches.filter((x:any)=>x.id!==b.id)
    setBranches(remaining)
    sessionStorage.setItem('s_branches', JSON.stringify(remaining))
    // لو كان الفرع الموقوف هو المختار حالياً، ننقل المستخدم لأول فرع متبقي
    if (sessionStorage.getItem('s_branch_id') === b.id) {
      const next = remaining[0]
      if (next) { sessionStorage.setItem('s_branch_id', next.id); sessionStorage.setItem('s_branch_name', next.name) }
    }
    setStoppingBranch(false)
    setConfirmStopBranch(null)
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
      {/* Consent Modal — نافذة موافقة واتساب */}
      {showConsent && (
        <div style={{position:'fixed',inset:0,zIndex:3000,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
          <div style={{background:'white',borderRadius:20,width:'100%',maxWidth:420,padding:28,boxShadow:'0 24px 60px rgba(0,0,0,.3)'}}>
            <div style={{fontSize:36,textAlign:'center',marginBottom:12}}>🟢</div>
            <div style={{fontSize:17,fontWeight:800,color:C.text,textAlign:'center',marginBottom:8}}>تحديث مهم بخصوص الخصوصية</div>
            <div style={{fontSize:13,color:C.text3,textAlign:'center',lineHeight:1.8,marginBottom:20}}>
              عشان نقدر نرسل لك تنبيهات مهمة زي نقص المخزون، إقفال الكاشير اليومي، وطلبات التوريد، نحتاج موافقتك على استلام رسائل واتساب من Storely.
            </div>
            <label style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',background:C.primaryL,borderRadius:12,border:`1px solid ${C.primaryB}`,cursor:'pointer',marginBottom:16}}>
              <input type="checkbox" checked={consentChecked} onChange={e=>setConsentChecked(e.target.checked)} style={{marginTop:2,width:18,height:18,flexShrink:0,cursor:'pointer'}}/>
              <span style={{fontSize:12,color:C.text2,lineHeight:1.6}}>أوافق على استلام رسائل واتساب من Storely المتعلقة بإدارة متجري</span>
            </label>
            <button onClick={acceptConsent} disabled={!consentChecked||consentSaving}
              style={{width:'100%',padding:13,background:consentChecked?C.primary:'#e5e7eb',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:consentChecked?'pointer':'not-allowed',fontFamily:'inherit'}}>
              {consentSaving?'جاري الحفظ...':'متابعة'}
            </button>
          </div>
        </div>
      )}

      {/* Branch selector */}
      {showBranch && branches.length>1 && (
        <div style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,.5)',backdropFilter:'blur(6px)',display:'flex',alignItems:'flex-end',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:24}}>
            <div style={{width:36,height:4,borderRadius:99,background:'#e5e7eb',margin:'0 auto 20px'}}/>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:16}}>اختر الفرع</div>
            {branches.map((b:any)=>(
              <div key={b.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <button onClick={()=>selectBranch(b)}
                  style={{flex:1,display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:12,border:`1.5px solid ${sessionStorage.getItem('s_branch_id')===b.id?C.primary:'#e5e7eb'}`,background:sessionStorage.getItem('s_branch_id')===b.id?C.primaryL:'white',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                  <div style={{width:36,height:36,borderRadius:10,background:C.primaryL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🏪</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{b.name}</div>
                    {b.location&&<div style={{fontSize:11,color:C.text3}}>{b.location}</div>}
                  </div>
                  {sessionStorage.getItem('s_branch_id')===b.id&&<span style={{fontSize:12,color:C.primary,fontWeight:700}}>✓</span>}
                </button>
                {branches.length>1 && (
                  <button onClick={()=>setConfirmStopBranch(b)} title="إيقاف الفرع"
                    style={{width:40,height:40,borderRadius:10,background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',cursor:'pointer',fontSize:14,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    ⏸
                  </button>
                )}
              </div>
            ))}
            <button onClick={()=>setShowBranch(false)} style={{width:'100%',padding:'13px',background:'#f9fafb',border:'1.5px solid #e5e7eb',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:C.text2,marginTop:4}}>إلغاء</button>
          </div>
        </div>
      )}

      {/* تأكيد إيقاف الفرع */}
      {confirmStopBranch && (
        <div style={{position:'fixed',inset:0,zIndex:2100,display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(6px)'}} onClick={()=>{if(!stoppingBranch)setConfirmStopBranch(null)}}/>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:360,position:'relative',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
            <div style={{width:48,height:48,borderRadius:12,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:22}}>⏸</div>
            <div style={{fontSize:15,fontWeight:800,color:C.text,textAlign:'center',marginBottom:6}}>إيقاف الفرع</div>
            <div style={{fontSize:13,color:C.text3,textAlign:'center',lineHeight:1.7,marginBottom:20}}>
              راح يختفي فرع <b style={{color:C.text}}>{confirmStopBranch.name}</b> من القائمة والتقارير. بياناته تبقى محفوظة بأمان ويمكن تفعيله من جديد لاحقاً من صفحة الإعدادات.
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setConfirmStopBranch(null)} disabled={stoppingBranch}
                style={{flex:1,padding:'11px',background:'#f9fafb',color:C.text2,border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                إلغاء
              </button>
              <button onClick={()=>stopBranch(confirmStopBranch)} disabled={stoppingBranch}
                style={{flex:2,padding:'11px',background:'#dc2626',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {stoppingBranch?'جاري الإيقاف...':'تأكيد الإيقاف'}
              </button>
            </div>
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
            .desk-sidebar{display:flex;flex-direction:column;width:220px;position:fixed;top:0;right:0;bottom:0;background:#0d2818;z-index:100;border-left:1px solid rgba(255,255,255,.06)}.desk-topbar{display:flex}
            .desk-content{flex:1;margin-right:220px;padding:20px 20px;min-height:100vh;width:calc(100vw - 220px);max-width:calc(100vw - 220px)}
          }
        `}</style>

        {/* ═══ MOBILE LAYOUT ═══ */}
        <div className="mob-layout">
          {/* Mobile Header — Zid style */}
        {/* Onboarding Modal */}
      {showOnboarding && (
        <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:24,width:'100%',maxWidth:480,fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,.3)'}}>
            <div style={{background:'linear-gradient(135deg,#0d2818,#1a4731)',padding:'28px 28px 24px',textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:12}}>{onboardingStep===0?'👋':onboardingStep===1?'📦':onboardingStep===2?'👥':onboardingStep===3?'🚚':'🎉'}</div>
              <div style={{fontSize:18,fontWeight:800,color:'white',marginBottom:6}}>
                {onboardingStep===0?'أهلاً بك في Storely!':onboardingStep===1?'أضف منتجاتك':onboardingStep===2?'أضف موظفيك':onboardingStep===3?'أضف موردينك':'أنت جاهز!'}
              </div>
              <div style={{fontSize:13,color:'rgba(255,255,255,.7)'}}>
                {onboardingStep===0?'دليل سريع لتبدأ في 4 خطوات':onboardingStep===1?'أضف أصناف مخزونك وكمياتها':onboardingStep===2?'أعط موظفيك صلاحيات الصرف':onboardingStep===3?'ربط موردينك لطلبات أسرع':'يمكنك البدء الآن'}
              </div>
              <div style={{display:'flex',gap:6,justifyContent:'center',marginTop:16}}>
                {[0,1,2,3,4].map(i=>(
                  <div key={i} style={{width:i===onboardingStep?20:6,height:6,borderRadius:99,background:i===onboardingStep?'#4abe7a':'rgba(255,255,255,.3)',transition:'all .3s'}}/>
                ))}
              </div>
            </div>
            <div style={{padding:'24px 28px'}}>
              {onboardingStep===0 && (
                <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
                  {[
                    {icon:'📦',title:'أضف منتجاتك',desc:'سجّل أصناف مخزونك وكمياتها والحد الأدنى'},
                    {icon:'👥',title:'أضف موظفيك',desc:'أعط كل موظف PIN ليدخل ويصرف'},
                    {icon:'🚚',title:'أضف موردينك',desc:'ربط المورد بالمنتج لطلبات تلقائية'},
                    {icon:'📲',title:'فعّل الإشعارات',desc:'استقبل تنبيهات واتساب عند نقص المخزون'},
                  ].map((s,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',background:'#f8fafc',borderRadius:10}}>
                      <span style={{fontSize:20,flexShrink:0}}>{s.icon}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{s.title}</div>
                        <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {onboardingStep===1 && <div style={{textAlign:'center' as const}}><p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:16}}>من صفحة <b>المخزون</b> اضغط <b>"+ إضافة منتج"</b> وأدخل اسم المنتج والكمية وحد إعادة الطلب</p><button onClick={()=>router.push('/inventory')} style={{padding:'10px 20px',background:'#f0fdf4',color:'#16a34a',border:'1.5px solid #bbf7d0',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>اذهب للمخزون ←</button></div>}
              {onboardingStep===2 && <div style={{textAlign:'center' as const}}><p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:16}}>من صفحة <b>الموظفون</b> اضغط <b>"+ موظف جديد"</b> وأدخل اسمه ورقم جواله</p><button onClick={()=>router.push('/staff-management')} style={{padding:'10px 20px',background:'#f0fdf4',color:'#16a34a',border:'1.5px solid #bbf7d0',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>اذهب للموظفين ←</button></div>}
              {onboardingStep===3 && <div style={{textAlign:'center' as const}}><p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:16}}>من صفحة <b>الموردين</b> أضف موردينك لطلبات تلقائية عبر واتساب</p><button onClick={()=>router.push('/suppliers')} style={{padding:'10px 20px',background:'#f0fdf4',color:'#16a34a',border:'1.5px solid #bbf7d0',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>اذهب للموردين ←</button></div>}
              {onboardingStep===4 && <div style={{textAlign:'center' as const}}><p style={{fontSize:14,color:'#64748b',lineHeight:1.8}}>كل شيء جاهز! ابدأ بإدارة مخزونك الآن 🚀</p></div>}
            </div>
            <div style={{padding:'0 28px 24px',display:'flex',gap:8}}>
              {onboardingStep<4 ? <>
                <button onClick={()=>{localStorage.setItem('onboarding_done','1');setShowOnboarding(false)}} style={{flex:1,padding:'11px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>تخطي</button>
                <button onClick={()=>setOnboardingStep(s=>s+1)} style={{flex:2,padding:'11px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>التالي ←</button>
              </> : <button onClick={()=>{localStorage.setItem('onboarding_done','1');setShowOnboarding(false)}} style={{flex:1,padding:'12px',background:'#16a34a',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>🚀 ابدأ الآن</button>}
            </div>
          </div>
        </div>
      )}

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

            <nav ref={navRef} style={{flex:1,padding:'8px 8px',overflowY:'auto',position:'relative' as const}}>
              <div style={{
                position:'absolute' as const, right:8, left:8,
                top:pillStyle.top, height:pillStyle.height, opacity:pillStyle.opacity,
                background:`${C.primary}22`, borderRadius:9,
                transition:'top .38s cubic-bezier(0.34,1.56,0.64,1), height .3s cubic-bezier(0.34,1.56,0.64,1), opacity .2s ease',
                pointerEvents:'none' as const, zIndex:0,
              }}/>
              {NAV_GROUPS.map((group,gi)=>(
                <div key={gi} style={{marginBottom:4}}>
                  <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.25)',letterSpacing:'.1em',textTransform:'uppercase',padding:'8px 10px 4px'}}>{group.label}</div>
                  {group.items.filter(item=>item.href!=='/branches'||branches.length>1).map(item=>{
                    const active=isActive(item.href)
                    const badge=item.href==='/inventory'?lowCount:item.href==='/notifications'?unread:0
                    const isExternal=item.href.startsWith('http')
                    return(
                      <button key={item.href} data-active={active} data-navitem={item.href}
                        onClick={()=>isExternal?window.open(item.href,'_blank'):router.push(item.href)}
                        onMouseEnter={()=>!isExternal&&router.prefetch(item.href)}
                        style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',marginBottom:1,background:'transparent',color:active?C.primary:'rgba(255,255,255,.55)',transition:'color .25s ease',textAlign:'right',position:'relative' as const,zIndex:1}}>
                        <div style={{width:28,height:28,borderRadius:7,background:active?`${C.primary}33`:'rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .3s cubic-bezier(0.34,1.56,0.64,1)',transform:active?'scale(1.06)':'scale(1)'}}>
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



          {/* Top bar */}
          <div className="desk-topbar" style={{position:'fixed',top:0,right:220,left:0,zIndex:99,background:'white',borderBottom:'1px solid #f0f0ee',padding:'0 24px',height:52,alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:13,color:'#94a3b8',fontWeight:500}}>مرحباً، {userName} 👋</div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <button onClick={()=>router.push('/notifications')} style={{position:'relative',width:36,height:36,borderRadius:10,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s'}}
                onMouseEnter={e=>(e.currentTarget.style.background='#f5f5f4')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                <Icon d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" size={18} stroke="#64748b" width={2}/>
                {unread>0&&<span style={{position:'absolute',top:5,right:5,width:7,height:7,background:'#ef4444',borderRadius:'50%',border:'2px solid white'}}/>}
              </button>
              <button onClick={()=>router.push('/settings')} style={{width:36,height:36,borderRadius:10,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s'}}
                onMouseEnter={e=>(e.currentTarget.style.background='#f5f5f4')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                <Icon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" size={18} stroke="#64748b" width={2}/>
              </button>
              <button onClick={()=>window.open('https://wa.me/966594351667','_blank')} style={{width:36,height:36,borderRadius:10,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s'}}
                onMouseEnter={e=>(e.currentTarget.style.background='#f5f5f4')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                <Icon d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} stroke="#64748b" width={2}/>
              </button>
            </div>
          </div>

          {/* Desktop Content */}
          <main className="desk-content" style={{paddingTop:52}}>
            {subDaysLeft!==null && (
              <div style={{width:'100%',background:'#fffbeb',borderBottom:'1px solid #fac775',padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'center',gap:10,flexWrap:'wrap' as const,textAlign:'center' as const}}>
                <svg width={16} height={16} fill="none" stroke="#854f0b" strokeWidth={2.5} viewBox="0 0 24 24" style={{flexShrink:0}}><path strokeLinecap="round" d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                <span style={{fontSize:13,fontWeight:600,color:'#633806'}}>
                  {subDaysLeft===0?'ينتهي اشتراكك اليوم!':`سيتم تعطيل حسابك خلال ${subDaysLeft} ${subDaysLeft===1?'يوم':'أيام'}.`} قم بالتجديد الآن لتجنب التعطيل!
                </span>
                <button onClick={()=>router.push('/settings')} style={{background:'#854f0b',color:'white',border:'none',borderRadius:8,padding:'5px 14px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
                  جدد الآن
                </button>
              </div>
            )}
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
