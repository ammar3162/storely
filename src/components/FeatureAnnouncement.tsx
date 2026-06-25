'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font } from '@/lib/ds'

const TOUR_STEPS = [
  { icon:'📦', title:'المخزون',     desc:'أضف منتجاتك وتابع الكميات لحظة بلحظة مع تنبيهات فورية عند النقص.',          page:'/inventory',       color:'#16a34a' },
  { icon:'📤', title:'الصرف',       desc:'اختر المنتج واضغط لتسجيل الصرف. بطاقات مرتبة بالفئات لسرعة أكبر.',          page:'/dispense',        color:'#dc2626' },
  { icon:'🛒', title:'المشتريات',   desc:'سجّل فواتير الشراء مع احتساب الضريبة 15% تلقائياً.',                          page:'/purchases',       color:'#2563eb' },
  { icon:'📊', title:'التقارير',    desc:'تقارير الصرف والمشتريات والجرد اليومي مع تصدير CSV.',                         page:'/reports',         color:'#7c3aed' },
  { icon:'👥', title:'الموظفون',    desc:'أضف موظفين بصلاحيات صرف فقط عبر رمز PIN بدون كلمة مرور.',                   page:'/staff-management',color:'#d97706' },
  { icon:'⚙️', title:'الإعدادات',  desc:'فعّل تنبيهات الواتساب وأضف فروع وغيّر بيانات منشأتك.',                      page:'/settings',        color:'#0891b2' },
]

interface Announcement {
  id: string
  version: string
  title: string
  description: string
  type: 'modal' | 'banner'
  page: string | null
  icon: string
  color: string
}

export default function FeatureAnnouncement() {
  const [welcomeModal, setWelcomeModal] = useState(false)
  const [tourStep, setTourStep]         = useState(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentBanner, setCurrentBanner] = useState<Announcement|null>(null)
  const [currentModal, setCurrentModal]   = useState<Announcement|null>(null)
  const [orgName, setOrgName]           = useState('')
  const [profileId, setProfileId]       = useState('')
  const [visible, setVisible]           = useState(false)
  const router   = useRouter()
  const pathname = usePathname()
  const sb = createClient()

  useEffect(()=>{ init() },[])

  useEffect(()=>{
    if(announcements.length>0 && profileId) showAnnouncements()
  },[announcements, pathname, profileId])

  async function init() {
    const{data:{user}}=await sb.auth.getUser(); if(!user) return
    setProfileId(user.id)

    const{data:profile}=await (sb as any).from('profiles').select('seen_welcome,org_id').eq('id',user.id).single()
    if(!profile) return

    if(profile.org_id){
      const{data:org}=await sb.from('organizations').select('name').eq('id',profile.org_id).single()
      if(org?.name) setOrgName(org.name)
    }

    // check welcome
    if(profile.seen_welcome === false && pathname==='/dashboard'){
      setWelcomeModal(true)
      return
    }

    // load unseen announcements
    const{data:allAnn}=await (sb as any).from('feature_announcements').select('*').order('created_at')
    const{data:seenAnn}=await (sb as any).from('user_seen_features').select('feature_version').eq('profile_id',user.id)
    const seenVersions=new Set((seenAnn||[]).map((s:any)=>s.feature_version))
    const unseen=(allAnn||[]).filter((a:any)=>!seenVersions.has(a.version)&&a.version!=='1.0.0')
    setAnnouncements(unseen)
    setTimeout(()=>setVisible(true),300)
  }

  function showAnnouncements() {
    const banners = announcements.filter(a=>a.type==='banner')
    const modals  = announcements.filter(a=>a.type==='modal')
    if(banners.length>0) setCurrentBanner(banners[0])
    if(modals.length>0)  setCurrentModal(modals[0])
  }

  async function markSeen(version: string) {
    if(!profileId) return
    await (sb as any).from('user_seen_features').insert({profile_id:profileId,feature_version:version}).catch(()=>{})
    setAnnouncements(prev=>prev.filter(a=>a.version!==version))
  }

  async function dismissWelcome() {
    if(!profileId) return
    await (sb as any).from('profiles').update({seen_welcome:true}).eq('id',profileId)
    await (sb as any).from('user_seen_features').insert({profile_id:profileId,feature_version:'1.0.0'}).catch(()=>{})
    setWelcomeModal(false)
  }

  async function goToPage(page:string) {
    router.push(page)
  }

  const isLastTour = tourStep === TOUR_STEPS.length - 1
  const currentTour = TOUR_STEPS[tourStep]

  return (
    <>
      <style>{`
        @keyframes welcomeIn{from{opacity:0;transform:scale(.92) translateY(20px)}to{opacity:1;transform:none}}
        @keyframes bannerIn{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:none}}
        @keyframes bannerOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-100%)}}
      `}</style>

      {/* ===== WELCOME MODAL ===== */}
      {welcomeModal && (
        <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(10px)'}}/>
          <div style={{
            background:colors.surface,borderRadius:24,width:'100%',maxWidth:540,
            position:'relative',boxShadow:shadow.lg,overflow:'hidden',
            fontFamily:font.family,direction:'rtl',
            animation:'welcomeIn .35s cubic-bezier(.4,0,.2,1)',
          }}>
            {/* Color bar */}
            <div style={{height:4,background:`linear-gradient(90deg,${currentTour.color},${currentTour.color}66,#4ade80)`}}/>

            {/* Progress dots */}
            <div style={{display:'flex',gap:5,justifyContent:'center',paddingTop:16}}>
              {[0,...TOUR_STEPS.map((_,i)=>i+1)].map(i=>(
                <div key={i} style={{
                  width:i===tourStep?24:6,height:6,borderRadius:99,
                  background:i===tourStep?currentTour.color:i<tourStep?currentTour.color+'66':colors.border,
                  transition:'all .3s',cursor:'pointer',
                }} onClick={()=>i>0&&setTourStep(i-1)}/>
              ))}
            </div>

            <div style={{padding:'24px 32px 28px'}}>
              {tourStep===0 ? (
                // Welcome screen
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:60,marginBottom:14}}>🎉</div>
                  <h2 style={{fontSize:22,fontWeight:900,color:colors.text,marginBottom:8}}>
                    أهلاً بك في Storely{orgName?` — ${orgName}`:''}!
                  </h2>
                  <p style={{fontSize:14,color:colors.text3,lineHeight:1.8,marginBottom:24}}>
                    دعنا نريك أهم الميزات في جولة سريعة — فقط دقيقة واحدة وستكون جاهزاً تماماً
                  </p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:24}}>
                    {TOUR_STEPS.map((s,i)=>(
                      <div key={i} onClick={()=>setTourStep(i+1)} style={{background:s.color+'11',border:`1px solid ${s.color}33`,borderRadius:12,padding:'12px 8px',textAlign:'center',cursor:'pointer',transition:'all .2s'}}
                        onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-2px)')}
                        onMouseLeave={e=>(e.currentTarget.style.transform='none')}>
                        <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
                        <div style={{fontSize:11,fontWeight:700,color:s.color}}>{s.title}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>setTourStep(1)}
                    style={{width:'100%',padding:'14px',background:`linear-gradient(135deg,${colors.primary},#15803d)`,color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:font.family,boxShadow:`0 6px 20px ${colors.primary}33`,marginBottom:10}}>
                    ابدأ الجولة التفاعلية ←
                  </button>
                  <button onClick={async()=>{ await dismissWelcome(); router.push('/dashboard') }}
                    style={{width:'100%',padding:'10px',background:'none',color:colors.text4,border:'none',fontSize:13,cursor:'pointer',fontFamily:font.family,fontWeight:600}}>
                    تخطي — سأستكشف بنفسي
                  </button>
                </div>
              ) : (
                // Tour step
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18}}>
                    <div style={{width:58,height:58,borderRadius:16,background:currentTour.color+'15',border:`2px solid ${currentTour.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>
                      {currentTour.icon}
                    </div>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:currentTour.color,textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:3}}>
                        الخطوة {tourStep} من {TOUR_STEPS.length}
                      </div>
                      <h3 style={{fontSize:20,fontWeight:900,color:colors.text}}>{currentTour.title}</h3>
                    </div>
                  </div>
                  <div style={{background:colors.bg,border:`1px solid ${colors.border}`,borderRadius:12,padding:'14px 16px',marginBottom:22,fontSize:14,color:colors.text2,lineHeight:1.8}}>
                    {currentTour.desc}
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>setTourStep(s=>Math.max(0,s-1))}
                      style={{flex:1,padding:'12px',background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border}`,borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                      ← السابق
                    </button>
                    {isLastTour ? (
                      <button onClick={()=>{ dismissWelcome(); setWelcomeModal(false); router.push('/dashboard') }}
                        style={{flex:2,padding:'12px',background:`linear-gradient(135deg,${colors.primary},#15803d)`,color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:font.family,boxShadow:`0 4px 14px ${colors.primary}33`}}>
                        ابدأ الاستخدام 🚀
                      </button>
                    ) : (
                      <div style={{flex:2,display:'flex',gap:8}}>
                        <button onClick={()=>goToPage(currentTour.page)}
                          style={{flex:1,padding:'12px',background:currentTour.color+'15',color:currentTour.color,border:`1.5px solid ${currentTour.color}33`,borderRadius:12,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                          افتح الصفحة
                        </button>
                        <button onClick={()=>setTourStep(s=>s+1)}
                          style={{flex:1,padding:'12px',background:currentTour.color,color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:font.family,boxShadow:`0 4px 12px ${currentTour.color}44`}}>
                          التالي →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== FEATURE BANNER ===== */}
      {currentBanner && visible && (
        <div style={{
          position:'fixed',top:0,right:0,left:0,zIndex:8000,
          background:`linear-gradient(135deg,${currentBanner.color},${currentBanner.color}dd)`,
          color:'white',padding:'12px 20px',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          fontFamily:font.family,direction:'rtl',
          animation:'bannerIn .3s ease',
          boxShadow:'0 4px 20px rgba(0,0,0,.15)',
        }}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
              {currentBanner.icon}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:800}}>{currentBanner.title} ✨</div>
              <div style={{fontSize:12,opacity:.85,marginTop:1}}>{currentBanner.description}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
            {currentBanner.page&&(
              <button onClick={()=>{ markSeen(currentBanner.version); router.push(currentBanner.page!) }}
                style={{padding:'7px 14px',background:'rgba(255,255,255,.2)',color:'white',border:'1px solid rgba(255,255,255,.3)',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:font.family,backdropFilter:'blur(4px)'}}>
                جربها الآن
              </button>
            )}
            <button onClick={()=>markSeen(currentBanner.version)}
              style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,.15)',color:'white',border:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* ===== FEATURE MODAL (for big updates) ===== */}
      {currentModal && visible && (
        <div style={{position:'fixed',inset:0,zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(6px)'}} onClick={()=>markSeen(currentModal.version)}/>
          <div style={{
            background:colors.surface,borderRadius:20,width:'100%',maxWidth:440,
            position:'relative',boxShadow:shadow.lg,overflow:'hidden',
            fontFamily:font.family,direction:'rtl',
            animation:'welcomeIn .3s ease',
          }}>
            <div style={{height:4,background:`linear-gradient(90deg,${currentModal.color},${currentModal.color}88)`}}/>
            <div style={{padding:'28px 28px 24px',textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:14}}>{currentModal.icon}</div>
              <div style={{display:'inline-block',background:currentModal.color+'15',color:currentModal.color,padding:'4px 14px',borderRadius:20,fontSize:11,fontWeight:700,marginBottom:12,border:`1px solid ${currentModal.color}33`}}>
                ✨ ميزة جديدة
              </div>
              <h3 style={{fontSize:20,fontWeight:900,color:colors.text,marginBottom:10}}>{currentModal.title}</h3>
              <p style={{fontSize:14,color:colors.text2,lineHeight:1.8,marginBottom:24}}>{currentModal.description}</p>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>markSeen(currentModal.version)}
                  style={{flex:1,padding:'12px',background:colors.bg,color:colors.text3,border:`1.5px solid ${colors.border}`,borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                  لاحقاً
                </button>
                {currentModal.page&&(
                  <button onClick={()=>{ markSeen(currentModal.version); router.push(currentModal.page!) }}
                    style={{flex:2,padding:'12px',background:currentModal.color,color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:font.family,boxShadow:`0 4px 14px ${currentModal.color}44`}}>
                    جربها الآن ←
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
