'use client'
import { setStaffDevice } from '@/lib/inApp'
import { GoogleIcon } from './constants'
import type { LoginState } from './useLogin'

export default function LoginForm({ m }: { m: LoginState }) {
  const { t, mode, setMode, setStep, email, setEmail, password, setPassword, loading, error, setError, accountStatus, handleGoogle, handleLogin } = m
  return (
    <>
            {/* Login */}
            {!accountStatus && mode==='login' && (
              <>
                <div style={{marginBottom:24,textAlign:'center' as const}}>
                  <h1 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8,letterSpacing:'-0.5px'}}>{t('login.welcomeBack')}</h1>
                  <p style={{fontSize:15,color:'#6b7280'}}>{t('login.welcomeSub')}</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <button type="button" onClick={handleGoogle} disabled={loading}
                  style={{width:'100%',padding:'13px',background:'white',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:15,fontWeight:700,color:'#111827',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <GoogleIcon/> {t('login.continueWithGoogle')}
                </button>
                <div style={{display:'flex',alignItems:'center',gap:12,margin:'18px 0',color:'#9ca3af',fontSize:12}}>
                  <div style={{flex:1,height:1,background:'#e5e7eb'}}/>{t('login.orWithEmail')}<div style={{flex:1,height:1,background:'#e5e7eb'}}/>
                </div>
                <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.email')}</label>
                    <input className="inp" type="email" required value={email}
                      onChange={e=>setEmail(e.target.value)}
                      placeholder="example@email.com"/>
                  </div>
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <label style={{fontSize:13,fontWeight:600,color:'#374151'}}>{t('login.password')}</label>
                      <button type="button" onClick={()=>{setMode('forgot');setError('')}}
                        style={{background:'none',border:'none',fontSize:13,color:'#029FA2',cursor:'pointer',fontFamily:'inherit',fontWeight:600,padding:0}}>
                        {t('login.forgotPassword')}
                      </button>
                    </div>
                    <input className="inp" type="password" required value={password} onChange={e=>setPassword(e.target.value)}
                      placeholder="••••••••"/>
                  </div>
                  <button type="submit" disabled={loading} className="btn-main" style={{marginTop:8}}>
                    {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>{t('login.loggingIn')}</span>:t('login.loginBtn')}
                  </button>
                </form>
                <div style={{textAlign:'center',marginTop:24,fontSize:13,color:'#6b7280'}}>
                  {t('login.noAccount')}{' '}
                  <button onClick={()=>{setMode('register');setError('');setStep(1)}} style={{background:'none',border:'none',color:'#029FA2',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
                    {t('login.signupNow')}
                  </button>
                </div>
                <button type="button" className="show-in-app" onClick={()=>{setStaffDevice(true);window.location.href='/staff'}}
                  style={{width:'100%',marginTop:14,padding:'12px',background:'white',border:'1.5px solid #e5e7eb',borderRadius:12,fontSize:14,fontWeight:700,color:'#0f766e',cursor:'pointer',fontFamily:'inherit'}}>
                  أنا موظف — دخول برقم الجوال و PIN
                </button>
              </>
            )}
    </>
  )
}
