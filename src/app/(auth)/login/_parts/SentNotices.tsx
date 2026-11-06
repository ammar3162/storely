'use client'
import type { LoginState } from './useLogin'

export default function SentNotices({ m }: { m: LoginState }) {
  const { t, mode, setMode, email, setError } = m
  return (
    <>
            {mode==='forgot-sent-wa' && (
              <div style={{textAlign:'center',padding:'40px 0'}}>
                <div style={{width:64,height:64,borderRadius:16,background:'#f0fdfa',border:'1px solid #99f6e4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 20px'}}>📲</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>{t('login.checkWhatsapp')}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:8}}>{t('login.ifRegisteredMsg')}</p>
                <p style={{fontSize:12,color:'#9ca3af',marginBottom:28}}>{t('login.linkValidHour')}</p>
                <button onClick={()=>{setMode('login');setError('')}} className="btn-main">{t('login.backToLogin')}</button>
              </div>
            )}

            {/* Forgot Sent */}
            {(mode as any)==='registered' && (
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:56,marginBottom:16}}>📬</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>{t('login.checkYourEmail')}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.8,marginBottom:8}}>
                  {t('login.activationLinkSent')}<br/>
                  <b style={{color:'#111827'}}>{email}</b>
                </p>
                <p style={{fontSize:13,color:'#9ca3af',marginBottom:28,lineHeight:1.7}}>
                  {t('login.clickLinkToActivate')}<br/>
                  {t('login.checkSpam')}
                </p>
                <button onClick={()=>setMode('login')} style={{background:'#029FA2',color:'white',border:'none',borderRadius:12,padding:'13px 32px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {t('login.backToLogin')}
                </button>
              </div>
            )}
            {mode==='forgot-sent' && (
              <div style={{textAlign:'center',padding:'40px 0'}}>
                <div style={{width:64,height:64,borderRadius:16,background:'#f0fdfa',border:'1px solid #99f6e4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 20px'}}>📧</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>{t('login.sentTitle')}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:28}}>{t('login.checkEmailMsg')} <b style={{color:'#111827'}}>{email}</b><br/>{t('login.clickToReset')}</p>
                <button onClick={()=>{setMode('login');setError('')}} className="btn-main">{t('login.backToLogin')}</button>
              </div>
            )}
    </>
  )
}
