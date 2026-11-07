'use client'
import StaffHeader from '@/components/StaffHeader'
import { staffHeaderBtn } from '@/components/StaffHeader'
import StaffLangButton from '@/components/StaffLangButton'
import { ct } from './_parts/strings'
import { ProgressBar } from './_parts/inputs'
import { useCashierClosing, type PageVals } from './_parts/useCashierClosing'
import SavedScreen from './_parts/SavedScreen'
import StepData from './_parts/StepData'
import StepExpenses from './_parts/StepExpenses'
import StepPhotos from './_parts/StepPhotos'
import StepReview from './_parts/StepReview'
import StepNav from './_parts/StepNav'
import { Lock, LogOut } from 'lucide-react'

export default function CashierClosingPage() {
  const m = useCashierClosing()
  const { lang, session, step, saved, locked, toast, rtl, router, businessDateLabel, logout } = m

  if(!session) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f4f5f6',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
      <div style={{width:32,height:32,border:'3px solid #e5e7eb',borderTopColor:'#0f766e',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if(locked) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f4f5f6',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:rtl?'rtl':'ltr',padding:20,textAlign:'center' as const}}>
      <div>
        <div style={{display:'flex',justifyContent:'center',marginBottom:12,color:'#4b5565'}}><Lock size={40}/></div>
        <div style={{fontSize:16,fontWeight:600,color:'#111827',marginBottom:8}}>{ct('lockedTitle',lang)}</div>
        <div style={{fontSize:14,color:'#4b5565'}}>{ct('lockedSub',lang)}</div>
        <button onClick={()=>router.push('/staff/choose')} style={{marginTop:20,height:44,padding:'0 22px',background:'#0f766e',color:'white',border:'none',borderRadius:10,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{ct('backHome',lang)}</button>
      </div>
    </div>
  )

  const v: PageVals = { session }
  return (
    <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column' as const,background:'#f4f5f6',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:rtl?'rtl':'ltr'}}>
      <style>{`.amt-tile:focus-within{border-color:#0f766e!important;background:white!important;box-shadow:0 0 0 3px rgba(15,118,110,.12)} .dl-row:focus-within .dl-field{border-color:#0f766e!important;background:white!important;box-shadow:0 0 0 3px rgba(15,118,110,.12)} @keyframes spin{to{transform:rotate(360deg)}} @keyframes stepIn{from{opacity:0;transform:translateX(var(--dx,0))}to{opacity:1;transform:none}} .fu{animation:stepIn .34s cubic-bezier(.22,1,.36,1) both} @media (prefers-reduced-motion:reduce){.fu{animation:none}}`}</style>

      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='success'?'#111827':'#dc2626',color:'white',padding:'12px 20px',borderRadius:10,fontSize:14,fontWeight:500,boxShadow:'0 8px 24px rgba(0,0,0,.12)',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      <StaffHeader title={ct('pageTitle',lang)} subtitle={`${session.branch_name || session.org_name}  ${businessDateLabel}`} rtl={rtl}
        end={<div style={{display:'flex',gap:8}}><StaffLangButton/><button onClick={logout} aria-label={ct('logout',lang)} style={{...staffHeaderBtn,padding:0}}><LogOut size={16} strokeWidth={1.75}/></button></div>} />

      {!saved && <ProgressBar step={step} lang={lang}/>}
      <div style={{flex:1,width:'100%',maxWidth:520,margin:'0 auto',padding:'20px 16px',['--dx' as any]:`${(m.stepDir==='fwd')===rtl?-28:28}px`}}>

        {saved ? (
          <SavedScreen m={m}/>
        ) : (
          <>
            <StepData m={m}/>

            <StepExpenses m={m}/>

            <StepPhotos m={m}/>

            <StepReview m={m}/>
          </>
        )}
      </div>
      {/* أزرار التنقل مثبتة أسفل الشاشة — ما يبقى فراغ تحت الخطوة القصيرة */}
      {!saved && <StepNav m={m}/>}
    </div>
  )
}
