'use client'
import { COUNTRY_CODES, PHONE_RULES, GoogleIcon, BUSINESS_TYPES } from './constants'
import type { LoginState } from './useLogin'

export default function RegisterStep1({ m }: { m: LoginState }) {
  const { t, oauth, mode, setMode, step, setOtpSent, setOtp, setOtpVerified, email, setEmail, password, setPassword, orgName, setOrgName, phone, setPhone, countryCode, setCountryCode, businessType, setBusinessType, loading, error, setError, showPassword, setShowPassword, phonePlaceholder, handleGoogle, leaveOauth, nextStep } = m
  return (
    <>
            {/* Register Step 1 */}
            {mode==='register' && step===1 && (
              <>
                <div style={{marginBottom:28}}>
                  <div style={{display:'flex',gap:4,marginBottom:20}}>
                    {[1,2].map(s=>(
                      <div key={s} style={{flex:1,height:3,borderRadius:99,background:step>=s?'#029FA2':'#e5e7eb',transition:'background .3s'}}/>
                    ))}
                  </div>
                  <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:6,letterSpacing:'-0.5px'}}>{oauth ? t('login.completeTitle') : t('login.createAccountFree')}</h1>
                  <p style={{fontSize:14,color:'#6b7280'}}>{oauth ? <>{t('login.completeSub')} <b style={{color:'#111827'}} dir="ltr">{email}</b></> : t('login.freeTrialNoCard')}</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                {!oauth && <>
                  <button type="button" onClick={handleGoogle} disabled={loading}
                  style={{width:'100%',padding:'13px',background:'white',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:15,fontWeight:700,color:'#111827',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <GoogleIcon/> {t('login.continueWithGoogle')}
                </button>
                <div style={{display:'flex',alignItems:'center',gap:12,margin:'18px 0',color:'#9ca3af',fontSize:12}}>
                  <div style={{flex:1,height:1,background:'#e5e7eb'}}/>{t('login.orWithEmail')}<div style={{flex:1,height:1,background:'#e5e7eb'}}/>
                </div>
                </>}
                <form onSubmit={nextStep} style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.orgNameLabel')}</label>
                    <input className="inp" type="text" required value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder={t('login.orgNamePlaceholder')}/>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:8}}>{t('login.businessTypeLabel')}</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                      {BUSINESS_TYPES.map(b=>(
                        <button key={b.v} type="button" onClick={()=>setBusinessType(b.v)} className={`biz${businessType===b.v?' on':''}`}>
                          <span style={{fontSize:20}}>{b.icon}</span>
                          <span style={{fontSize:11}}>{b.v}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {!oauth && <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.email')} *</label>
                    <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                  </div>}
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.whatsappLabel')}</label>
                    <div style={{display:'flex',border:'1.5px solid #e5e7eb',borderRadius:10,overflow:'hidden',background:'white',transition:'border-color .2s'}}
                      onFocusCapture={e=>(e.currentTarget as HTMLElement).style.borderColor='#029FA2'}
                      onBlurCapture={e=>(e.currentTarget as HTMLElement).style.borderColor='#e5e7eb'}>
                      <select value={countryCode} onChange={e=>setCountryCode(e.target.value)}
                        style={{background:'transparent',border:'none',borderLeft:'1.5px solid #e5e7eb',padding:'12px 8px',fontSize:13,fontFamily:'inherit',outline:'none',cursor:'pointer',direction:'ltr',color:'#111827',minWidth:100}}>
                        {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                      </select>
                      <input type="tel" required value={phone} onChange={e=>{setPhone(e.target.value);setOtpSent(false);setOtpVerified(false);setOtp('')}}
                        placeholder={phonePlaceholder} dir="ltr"
                        style={{background:'transparent',border:'none',padding:'12px 14px',fontSize:14,color:'#111827',flex:1,outline:'none',fontFamily:'inherit'}}/>
                    </div>
                    <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>
                      {PHONE_RULES[countryCode] ? `${PHONE_RULES[countryCode].length} أرقام${PHONE_RULES[countryCode].prefix ? ` · يبدأ بـ ${PHONE_RULES[countryCode].prefix}` : ''}` : ''}
                    </div>
                    {/* واجهة تحقق OTP معطّلة مؤقتاً (2026-07-24) لحين حل مشكلة توصيل واتساب — راجع notification_logs */}
                  </div>
                  {!oauth && <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.passwordHintLabel')}</label>
                    <div style={{position:'relative'}}>
                      <input className="inp" type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={t('login.passwordPlaceholder')} style={{paddingLeft:44}}/>
                      <button type="button" onClick={()=>setShowPassword(s=>!s)}
                        style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#9ca3af',padding:4}}
                        aria-label={showPassword?t('login.hidePassword'):t('login.showPassword')}>
                        {showPassword?'🙈':'👁️'}
                      </button>
                    </div>
                    {password.length>0 && (
                      <div style={{marginTop:6,display:'flex',alignItems:'center',gap:6}}>
                        {[1,2,3,4].map(l=>{
                          const checks = [/[A-Z]/.test(password),/[a-z]/.test(password),/[0-9]/.test(password),/[@#$!%^&*]/.test(password)]
                          const score = checks.filter(Boolean).length
                          const colors = ['#ef4444','#f59e0b','#3b82f6','#029FA2']
                          return <div key={l} style={{flex:1,height:3,borderRadius:99,background:score>=l?colors[score-1]:'#e5e7eb',transition:'background .3s'}}/>
                        })}
                        <span style={{fontSize:11,color:'#9ca3af',flexShrink:0}}>
                          {(()=>{const c=[/[A-Z]/.test(password),/[a-z]/.test(password),/[0-9]/.test(password),/[@#$!%^&*]/.test(password)];const s=c.filter(Boolean).length;return s===0?'':s===1?t('login.pwVeryWeak'):s===2?t('login.pwWeak'):s===3?t('login.pwMedium'):t('login.pwStrong')})()}
                        </span>
                      </div>
                    )}
                  </div>}
                  <button type="submit" className="btn-main" style={{marginTop:4}}>{t('login.nextChoosePlan')}</button>
                </form>
                {oauth ? (
                  <div style={{textAlign:'center',marginTop:20,fontSize:13,color:'#6b7280'}}>
                    <button onClick={leaveOauth} style={{background:'none',border:'none',color:'#029FA2',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
                      {t('login.useAnotherAccount')}
                    </button>
                  </div>
                ) : (
                  <div style={{textAlign:'center',marginTop:20,fontSize:13,color:'#6b7280'}}>
                    {t('login.alreadyHaveAccount')}{' '}
                    <button onClick={()=>{setMode('login');setError('')}} style={{background:'none',border:'none',color:'#029FA2',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
                      {t('login.loginNow')}
                    </button>
                  </div>
                )}
              </>
            )}
    </>
  )
}
