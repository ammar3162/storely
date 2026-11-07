'use client'
import StaffHeader from '@/components/StaffHeader'
import { staffHeaderBtn } from '@/components/StaffHeader'
import StaffLangButton from '@/components/StaffLangButton'
import { ct } from './_parts/strings'
import CloseForm from './_parts/CloseForm'
import ConfirmSheet from './_parts/ConfirmSheet'
import { useCashierClosing, type PageVals } from './_parts/useCashierClosing'
import SavedScreen from './_parts/SavedScreen'
import { Lock, LogOut } from 'lucide-react'

export default function CashierClosingPage() {
  const m = useCashierClosing()
  const { lang, session, saved, locked, toast, rtl, router, businessDateLabel, logout } = m

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
      <style>{`.big-money input,.big-money input:focus,.dl-field input,.dl-field input:focus{border:none!important;box-shadow:none!important;outline:none!important} .big-money:focus-within{box-shadow:0 0 0 3px rgba(15,118,110,.14)} .amt-tile:focus-within{border-color:#0f766e!important;background:white!important;box-shadow:0 0 0 3px rgba(15,118,110,.12)} .dl-row:focus-within .dl-field{border-color:#0f766e!important;background:white!important;box-shadow:0 0 0 3px rgba(15,118,110,.12)} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}} .fu{animation:fadeUp .3s cubic-bezier(.22,1,.36,1) both} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes sheetUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}} .sheet{animation:sheetUp .28s cubic-bezier(.22,1,.36,1) both} .mf:focus-within{background:white!important;border-color:#0f766e!important;box-shadow:0 0 0 3px rgba(15,118,110,.12)} .mf input,.mf input:focus{border:none!important;box-shadow:none!important;outline:none!important} @media (prefers-reduced-motion:reduce){.sheet{animation:none}} @media (prefers-reduced-motion:reduce){.fu{animation:none}}`}</style>

      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='success'?'#111827':'#dc2626',color:'white',padding:'12px 20px',borderRadius:10,fontSize:14,fontWeight:500,boxShadow:'0 8px 24px rgba(0,0,0,.12)',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      <StaffHeader title={ct('pageTitle',lang)} subtitle={`${session.branch_name || session.org_name}  ${businessDateLabel}`} rtl={rtl}
        end={<div style={{display:'flex',gap:8}}><StaffLangButton/><button onClick={logout} aria-label={ct('logout',lang)} style={{...staffHeaderBtn,padding:0}}><LogOut size={16} strokeWidth={1.75}/></button></div>} />

      <div style={{flex:1,width:'100%',maxWidth:520,margin:'0 auto',padding:'4px 16px 40px'}}>

        {saved ? (
          <SavedScreen m={m}/>
        ) : (
          <>
            <CloseForm m={m}/>
          </>
        )}
      </div>
      <ConfirmSheet m={m}/>
    </div>
  )
}
