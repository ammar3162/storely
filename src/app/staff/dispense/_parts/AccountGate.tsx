'use client'
import { Lock } from 'lucide-react'
import { T } from './strings'
import type { StaffDispense, PageVals } from './useStaffDispense'

export default function AccountGate({ m, v }: { m: StaffDispense; v: PageVals }) {
  const { lang, needsReauth, subscriptionExpired, reauthPin, setReauthPin, reauthError, setReauthError, reauthLoading, logout, submitReauth } = m
  const { session } = v
  return (
    <>
      {subscriptionExpired && (
        <div style={{position:'fixed',inset:0,zIndex:6000,background:'#0C213B',display:'flex',alignItems:'center',justifyContent:'center',padding:24,textAlign:'center' as const}}>
          <div>
            <div style={{fontSize:56,marginBottom:16}}>⏰</div>
            <div style={{fontSize:18,fontWeight:600,color:'white',marginBottom:8}}>{T('subExpired',lang)}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,.7)',lineHeight:1.8,maxWidth:320,marginLeft:'auto',marginRight:'auto',marginBottom:24}}>
              {T('subExpiredSub',lang)}
            </div>
            <button onClick={logout} style={{padding:'12px 28px',background:'#203640',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              {T('signOut',lang)}
            </button>
          </div>
        </div>
      )}

      {needsReauth && (
        <div style={{position:'fixed',inset:0,zIndex:5000,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn .2s ease'}}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:340,padding:28,textAlign:'center' as const,animation:'slideUp .3s ease'}}>
            <div style={{display:'flex',justifyContent:'center',marginBottom:10,color:'#4b5565'}}><Lock size={38} strokeWidth={1.5}/></div>
            <div style={{fontSize:15,fontWeight:600,color:'var(--storely-text)',marginBottom:4}}>{T('sessionEnded',lang)}</div>
            <div style={{fontSize:12,color:'#4b5565',marginBottom:18}}>{T('enterPin',lang,{name:session?.name||''})}</div>
            <input
              type="password" inputMode="numeric" maxLength={6} autoFocus
              value={reauthPin}
              onChange={e=>{setReauthPin(e.target.value.replace(/\D/g,'')); setReauthError('')}}
              onKeyDown={e=>{if(e.key==='Enter') submitReauth()}}
              style={{width:'100%',padding:'14px',fontSize:22,fontWeight:600,textAlign:'center' as const,letterSpacing:8,border:`1.5px solid ${reauthError?'#dc2626':'var(--storely-border)'}`,borderRadius:12,marginBottom:10,fontFamily:'inherit',boxSizing:'border-box' as const}}
              placeholder="••••"
            />
            {reauthError && <div style={{fontSize:12,color:'#dc2626',fontWeight:600,marginBottom:10}}>{reauthError}</div>}
            <button onClick={submitReauth} disabled={!reauthPin||reauthLoading}
              style={{width:'100%',padding:13,background:!reauthPin||reauthLoading?'#d1d5db':'#203640',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:!reauthPin||reauthLoading?'not-allowed':'pointer',fontFamily:'inherit',marginBottom:10}}>
              {reauthLoading?T('verifying',lang):T('login',lang)}
            </button>
            <button onClick={logout} style={{width:'100%',padding:10,background:'none',border:'none',fontSize:12,color:'#4b5565',cursor:'pointer',fontFamily:'inherit'}}>
              {T('fullSignOut',lang)}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
