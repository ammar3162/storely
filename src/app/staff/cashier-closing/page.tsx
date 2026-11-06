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

export default function CashierClosingPage() {
  const m = useCashierClosing()
  const { lang, session, step, saved, locked, toast, rtl, router, businessDateLabel, logout } = m

  if(!session) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
      <div style={{width:32,height:32,border:'3px solid #e5e5e2',borderTopColor:'#029FA2',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if(locked) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f7f7f5',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:rtl?'rtl':'ltr',padding:20,textAlign:'center' as const}}>
      <div>
        <div style={{fontSize:44,marginBottom:12}}>🔒</div>
        <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:8}}>{ct('lockedTitle',lang)}</div>
        <div style={{fontSize:13,color:'#78716c'}}>{ct('lockedSub',lang)}</div>
        <button onClick={()=>router.push('/staff/choose')} style={{marginTop:20,height:44,padding:'0 22px',background:'#0f766e',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{ct('backHome',lang)}</button>
      </div>
    </div>
  )

  const v: PageVals = { session }
  return (
    <div style={{minHeight:'100vh',background:'#f7f7f5',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:rtl?'rtl':'ltr',paddingBottom:50}}>
      <style>{`.amt-tile:focus-within{border-color:#029FA2!important;background:white!important;box-shadow:0 0 0 3px rgba(2,159,162,.12)} .dl-row:focus-within .dl-field{border-color:#029FA2!important;background:white!important;box-shadow:0 0 0 3px rgba(2,159,162,.12)} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} .fu{animation:fadeUp .3s ease both}`}</style>

      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='success'?'#029FA2':'#dc2626',color:'white',padding:'12px 24px',borderRadius:40,fontSize:14,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.25)',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      <StaffHeader title={session.name} subtitle={`${session.org_name}${session.branch_name?` · ${session.branch_name}`:''} · ${ct('cashierBadge',lang)}`} rtl={rtl}
        end={<div style={{display:'flex',gap:8}}><StaffLangButton/><button onClick={logout} style={staffHeaderBtn}>{ct('logout',lang)}</button></div>} />

      <div style={{maxWidth:520,margin:'0 auto',padding:'28px 16px'}}>
        {!saved && (
          <div className="fu" style={{marginBottom:6}}>
            <div style={{fontSize:22,fontWeight:800,color:'#1c1c1a',marginBottom:4}}>{ct('pageTitle',lang)}</div>
            <div style={{fontSize:13,color:'#8b8a84',fontWeight:600,marginBottom:22}}>{businessDateLabel}</div>
            <ProgressBar step={step} lang={lang}/>
          </div>
        )}

        {saved ? (
          <SavedScreen m={m}/>
        ) : (
          <>
            <StepData m={m}/>

            <StepExpenses m={m}/>

            <StepPhotos m={m}/>

            <StepReview m={m}/>

            <StepNav m={m}/>
          </>
        )}
      </div>
    </div>
  )
}
