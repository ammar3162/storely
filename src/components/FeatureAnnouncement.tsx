'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font } from '@/lib/ds'

const FEATURES = [
  { icon:'📦', title:'المخزون',      desc:'أضف منتجاتك وحدد الحد الأدنى — سنبلّغك قبل أن ينفد أي صنف',    color:'#16a34a', page:'/inventory' },
  { icon:'📤', title:'الصرف',        desc:'سجّل الصرف اليومي بضغطة واحدة — سريع ومرتب بالفئات',           color:'#dc2626', page:'/dispense' },
  { icon:'🛒', title:'المشتريات',    desc:'سجّل فواتير الشراء مع احتساب ضريبة 15% تلقائياً',               color:'#2563eb', page:'/purchases' },
  { icon:'📊', title:'التقارير',     desc:'تقارير الصرف والمشتريات والجرد — صدّر بـ CSV بضغطة',            color:'#7c3aed', page:'/reports' },
  { icon:'👥', title:'الموظفون',     desc:'أضف موظفين يصرفون برمز PIN فقط — بدون وصول لبياناتك',          color:'#d97706', page:'/staff-management' },
  { icon:'📲', title:'تنبيهات واتساب', desc:'يصلك إشعار فوري على واتساب عند نقص أي صنف',                  color:'#25d366', page:'/settings' },
]

interface Announcement {
  id:string; version:string; title:string; description:string
  type:'modal'|'banner'; page:string|null; icon:string; color:string
  target_orgs?: string[]|null
}

export default function FeatureAnnouncement() {
  const [show, setShow]                   = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentBanner, setCurrentBanner] = useState<Announcement|null>(null)
  const [orgName, setOrgName]             = useState('')
  const [profileId, setProfileId]         = useState('')
  const router   = useRouter()
  const pathname = usePathname()
  const sb = createClient()

  useEffect(()=>{ init() },[])

  useEffect(()=>{
    if(announcements.length>0 && profileId) {
      const banners=announcements.filter(a=>a.type==='banner')
      if(banners.length>0) setCurrentBanner(banners[0])
    }
  },[announcements,profileId])

  // auto-dismiss بعد 7 ثواني
  useEffect(()=>{
    if(!currentBanner) return
    const t = setTimeout(()=>markSeen(currentBanner.version), 7000)
    return ()=>clearTimeout(t)
  },[currentBanner])

  async function init() {
    const{data:{user}}=await sb.auth.getUser(); if(!user) return
    setProfileId(user.id)
    const{data:profile}=await (sb as any).from('profiles').select('seen_welcome,org_id').eq('id',user.id).single()
    if(!profile) return
    if(profile.org_id){
      const{data:org}=await sb.from('organizations').select('name').eq('id',profile.org_id).single()
      if(org?.name) setOrgName(org.name)
    }
    if(profile.seen_welcome===false && pathname==='/dashboard'){
      setShow(true); return
    }
    const{data:allAnn}=await (sb as any).from('feature_announcements').select('*').order('created_at')
    const{data:seenAnn}=await (sb as any).from('user_seen_features').select('feature_version').eq('profile_id',user.id)
    const seen=new Set((seenAnn||[]).map((s:any)=>s.feature_version))
    // نطبّق التحديد المستهدف: لو target_orgs فاضية أو null، الإشعار للكل. غير كذا، بس للمؤسسات المحددة
    const unseen=(allAnn||[]).filter((a:any)=>
      !seen.has(a.version) && a.version!=='1.0.0' &&
      (!a.target_orgs || a.target_orgs.length===0 || (profile.org_id && a.target_orgs.includes(profile.org_id)))
    )
    setAnnouncements(unseen)
  }

  function dismiss() {
    setShow(false)
    if(!profileId) return
    ;(sb as any).from('profiles').update({seen_welcome:true}).eq('id',profileId).then(()=>{})
    ;(sb as any).from('user_seen_features').insert({profile_id:profileId,feature_version:'1.0.0'}).catch(()=>{})
  }

  function markSeen(version:string) {
    // نخفي البانر فوراً بدون أي انتظار — الحفظ بقاعدة البيانات يصير بالخلفية
    setCurrentBanner(null)
    setAnnouncements(prev=>prev.filter(a=>a.version!==version))
    if(!profileId) return
    ;(sb as any).from('user_seen_features').insert({profile_id:profileId,feature_version:version}).catch(()=>{})
  }

  return (
    <>
      <style>{`
        @keyframes tourIn{from{opacity:0;transform:scale(.94) translateY(16px)}to{opacity:1;transform:none}}
        @keyframes bannerIn{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:none}}
        .tour-feat:hover{transform:translateY(-3px)!important;box-shadow:0 8px 24px rgba(0,0,0,.08)!important}
      `}</style>

      {/* ===== WELCOME TOUR ===== */}
      {show && (
        <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(12px)'}}/>
          <div style={{
            background:'white',borderRadius:28,width:'100%',maxWidth:560,
            position:'relative',boxShadow:'0 32px 80px rgba(0,0,0,.25)',
            fontFamily:font.family,direction:'rtl',overflow:'hidden',
            animation:'tourIn .4s cubic-bezier(.4,0,.2,1)',
          }}>
            {/* Green top bar */}
            <div style={{height:5,background:`linear-gradient(90deg,#16a34a,#4ade80,#16a34a)`}}/>

            <div style={{padding:'28px 28px 24px'}}>
              {/* Header */}
              <div style={{textAlign:'center',marginBottom:28}}>
                <div style={{fontSize:52,marginBottom:12}}>👋</div>
                <h2 style={{fontSize:22,fontWeight:900,color:'#0f172a',marginBottom:8}}>
                  أهلاً{orgName?` بـ ${orgName}`:''}!
                </h2>
                <p style={{fontSize:14,color:'#64748b',lineHeight:1.8,maxWidth:400,margin:'0 auto'}}>
                  إليك نظرة سريعة على أهم ما يقدمه Storely — كل شي تحتاجه لإدارة مخزونك باحترافية
                </p>
              </div>

              {/* Features grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24}}>
                {FEATURES.map((f,i)=>(
                  <button key={i} className="tour-feat" onClick={()=>{ dismiss(); router.push(f.page) }}
                    style={{
                      background:'white',border:`1.5px solid ${f.color}22`,borderRadius:16,
                      padding:'16px 12px',cursor:'pointer',fontFamily:font.family,
                      textAlign:'center',transition:'all .25s',
                      boxShadow:'0 2px 8px rgba(0,0,0,.04)',
                    }}>
                    <div style={{width:44,height:44,borderRadius:12,background:f.color+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,margin:'0 auto 10px',border:`1px solid ${f.color}22`}}>
                      {f.icon}
                    </div>
                    <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:4}}>{f.title}</div>
                    <div style={{fontSize:11,color:'#94a3b8',lineHeight:1.5}}>{f.desc}</div>
                  </button>
                ))}
              </div>

              {/* Actions */}
              <button onClick={()=>{ dismiss(); router.push('/dashboard') }}
                style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:font.family,boxShadow:'0 6px 20px rgba(22,163,74,.3)',marginBottom:10}}>
                ابدأ الاستخدام ←
              </button>
              <button onClick={dismiss}
                style={{width:'100%',padding:'10px',background:'none',color:'#94a3b8',border:'none',fontSize:13,cursor:'pointer',fontFamily:font.family}}>
                تخطي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== FEATURE BANNER ===== */}
      {currentBanner && (
        <div style={{
          position:'fixed',top:0,right:0,left:0,zIndex:8000,
          background:currentBanner.color,color:'white',
          padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',
          fontFamily:font.family,direction:'rtl',animation:'bannerIn .3s ease',
          boxShadow:'0 4px 20px rgba(0,0,0,.2)',
        }}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
              {currentBanner.icon}
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:800}}>✨ {currentBanner.title}</div>
              <div style={{fontSize:12,opacity:.85,marginTop:2}}>{currentBanner.description}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0,marginRight:16}}>
            {currentBanner.page&&(
              <button onClick={()=>{ markSeen(currentBanner.version); router.push(currentBanner.page!) }}
                style={{padding:'8px 16px',background:'rgba(255,255,255,.2)',color:'white',border:'1px solid rgba(255,255,255,.3)',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                جربها
              </button>
            )}
            <button onClick={()=>markSeen(currentBanner.version)}
              style={{width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,.15)',color:'white',border:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:font.family}}>
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}
