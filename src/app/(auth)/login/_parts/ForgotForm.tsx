'use client'
import type { LoginState } from './useLogin'

export default function ForgotForm({ m }: { m: LoginState }) {
  const { t, forgotMethod, setForgotMethod, forgotPhone, setForgotPhone, mode, setMode, email, setEmail, loading, error, setError, handleForgot, handleForgotWhatsapp } = m
  return (
    <>
            {/* Forgot */}
            {mode==='forgot' && (
              <>
                <button onClick={()=>{setMode('login');setError('')}}
                  style={{background:'none',border:'none',color:'#6b7280',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:0,marginBottom:24,display:'flex',alignItems:'center',gap:4}}>
                  {t('login.back')}
                </button>
                <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:8,letterSpacing:'-0.5px'}}>{t('login.restorePassword')}</h1>
                <p style={{fontSize:14,color:'#6b7280',marginBottom:20}}>{t('login.chooseRecoveryMethod')}</p>

                <div style={{display:'flex',gap:8,marginBottom:22,background:'#f3f4f6',borderRadius:10,padding:4}}>
                  <button type="button" onClick={()=>{setForgotMethod('email');setError('')}}
                    style={{flex:1,padding:'8px',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:forgotMethod==='email'?'white':'transparent',color:forgotMethod==='email'?'#111827':'#6b7280',boxShadow:forgotMethod==='email'?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                    📧 {t('login.viaEmail')}
                  </button>
                  <button type="button" onClick={()=>{setForgotMethod('whatsapp');setError('')}}
                    style={{flex:1,padding:'8px',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:forgotMethod==='whatsapp'?'white':'transparent',color:forgotMethod==='whatsapp'?'#111827':'#6b7280',boxShadow:forgotMethod==='whatsapp'?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                    📲 {t('login.viaWhatsapp')}
                  </button>
                </div>

                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}

                {forgotMethod==='email' ? (
                  <form onSubmit={handleForgot} style={{display:'flex',flexDirection:'column',gap:14}}>
                    <div>
                      <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.email')}</label>
                      <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                    </div>
                    <button type="submit" disabled={loading} className="btn-main">
                      {loading?t('login.sending'):t('login.sendRecoveryLink')}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleForgotWhatsapp} style={{display:'flex',flexDirection:'column',gap:14}}>
                    <div>
                      <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.registeredPhone')}</label>
                      <input className="inp" type="tel" required dir="ltr" value={forgotPhone} onChange={e=>setForgotPhone(e.target.value)} placeholder="05xxxxxxxx"/>
                    </div>
                    <button type="submit" disabled={loading} className="btn-main">
                      {loading?t('login.sending'):t('login.sendViaWhatsapp')}
                    </button>
                  </form>
                )}
              </>
            )}
    </>
  )
}
