'use client'
import { SIGNUP_SOURCES } from '@/lib/signupSource'
import { Minus, Plus } from 'lucide-react'
import { PLAN_PRICING, planPriceFor } from '@/lib/planPricing'
import { PLANS, PLAN_EN } from './constants'
import type { LoginState } from './useLogin'

export default function RegisterStep2({ m }: { m: LoginState }) {
  const { t, lang, mode, step, setStep, planChoice, setPlanChoice, branchCount, setBranchCount, billing, setBilling, loading, error, setError, agreedTerms, setAgreedTerms, signupSource, setSignupSource, signupSourceDetail, setSignupSourceDetail, handleRegister } = m
  return (
    <>
            {/* Register Step 2 */}
            {mode==='register' && step===2 && (
              <>
                <div style={{marginBottom:28}}>
                  <div style={{display:'flex',gap:4,marginBottom:20}}>
                    {[1,2].map(s=>(
                      <div key={s} style={{flex:1,height:3,borderRadius:99,background:step>=s?'#029FA2':'#e5e7eb',transition:'background .3s'}}/>
                    ))}
                  </div>
                  <button type="button" onClick={()=>{setStep(1);setError('')}}
                    style={{background:'none',border:'none',color:'#6b7280',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:0,marginBottom:12,display:'flex',alignItems:'center',gap:4}}>
                    {t('login.back')}
                  </button>
                  <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:6,letterSpacing:'-0.5px'}}>{t('login.choosePlanTitle')}</h1>
                  <p style={{fontSize:14,color:'#6b7280'}}>{t('login.changePlanLater')}</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={handleRegister} style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div className="hide-in-app" style={{display:'flex',justifyContent:'center',marginBottom:6}}>
                    <div style={{display:'inline-flex',gap:4,background:'#f3f4f6',padding:4,borderRadius:12}}>
                      <button type="button" onClick={()=>setBilling('monthly')} style={{padding:'8px 18px',borderRadius:9,border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',background:billing==='monthly'?'white':'transparent',color:billing==='monthly'?'#111827':'#6b7280',boxShadow:billing==='monthly'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>{t('login.planMonthly')}</button>
                      <button type="button" onClick={()=>setBilling('yearly')} style={{padding:'8px 18px',borderRadius:9,border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,background:billing==='yearly'?'white':'transparent',color:billing==='yearly'?'#111827':'#6b7280',boxShadow:billing==='yearly'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
                        {t('login.planYearly')} <span style={{background:'#f0fdfa',color:'#0f766e',fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:99}}>{t('login.planSave')}</span>
                      </button>
                    </div>
                  </div>
                  {/* عدد الفروع — السعر لكل باقة يتحدّث حسبه */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',border:'1.5px solid #e5e7eb',borderRadius:12,padding:'10px 14px'}}>
                    <span style={{fontSize:15,fontWeight:700,color:'#111827'}}>{lang==='ar'?'عدد الفروع':'Branches'}</span>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <button type="button" aria-label={lang==='ar'?'نقص':'Less'} disabled={branchCount<=1} onClick={()=>setBranchCount(b=>Math.max(1,b-1))}
                        style={{width:36,height:36,borderRadius:99,border:'none',background:'#f3f4f6',cursor:branchCount<=1?'default':'pointer',opacity:branchCount<=1?.4:1,display:'grid',placeItems:'center',color:'#111827'}}><Minus size={16}/></button>
                      <b style={{minWidth:22,textAlign:'center',fontSize:17,color:'#111827'}}>{branchCount}</b>
                      <button type="button" aria-label={lang==='ar'?'زيادة':'More'} disabled={branchCount>=10} onClick={()=>setBranchCount(b=>Math.min(10,b+1))}
                        style={{width:36,height:36,borderRadius:99,border:'none',background:'#f3f4f6',cursor:branchCount>=10?'default':'pointer',opacity:branchCount>=10?.4:1,display:'grid',placeItems:'center',color:'#111827'}}><Plus size={16}/></button>
                    </div>
                  </div>
                  {PLANS.map(p=>{
                    const price = planPriceFor(p.v, null, branchCount)
                    const on = planChoice===p.v
                    return (
                    <button key={p.v} type="button" onClick={()=>setPlanChoice(p.v)}
                      style={{padding:'16px 18px',borderRadius:12,border:`1.5px solid ${on?p.color:'#e5e7eb'}`,background:on?p.color+'08':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'right',transition:'all .2s',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700,color:on?p.color:'#111827',marginBottom:3}}>{lang==='ar'?PLAN_PRICING[p.v].label:PLAN_EN[p.v]}</div>
                        <div style={{fontSize:12,color:'#374151'}}>{lang==='ar'?p.desc:p.descEn}</div>
                      </div>
                      <div className="hide-in-app" style={{flexShrink:0,marginRight:12,textAlign:'left'}}>
                        <span style={{fontSize:20,fontWeight:800,color:on?p.color:'#111827'}}>{billing==='yearly'?price.yearly:price.monthly}</span>
                        <span style={{fontSize:12,color:'#4b5563'}}> {lang==='ar'?'⃁':'SAR'}/{billing==='yearly'?(lang==='ar'?'سنة':'yr'):(lang==='ar'?'شهر':'mo')}</span>
                      </div>
                    </button>
                  )})}

                  {planChoice && (
                    <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:8,padding:'11px 14px',fontSize:13,color:'#029FA2',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                      ✓ {t('login.freeTrialConfirm')}
                    </div>
                  )}

                  <div style={{marginTop:6}}>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:8}}>{t('login.sourceLabel')}</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {SIGNUP_SOURCES.map(src=>(
                        <button key={src.v} type="button" onClick={()=>setSignupSource(signupSource===src.v?'':src.v)}
                          style={{padding:'7px 12px',borderRadius:99,border:`1.5px solid ${signupSource===src.v?'#029FA2':'#e5e7eb'}`,background:signupSource===src.v?'#f0fdfa':'white',color:signupSource===src.v?'#029FA2':'#4b5563',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          {lang==='ar'?src.ar:src.en}
                        </button>
                      ))}
                    </div>
                    {signupSource==='other' && (
                      <input className="inp" type="text" maxLength={100} value={signupSourceDetail} onChange={e=>setSignupSourceDetail(e.target.value)}
                        placeholder={t('login.sourceOtherPlaceholder')} style={{marginTop:8}}/>
                    )}
                  </div>

                  <label style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:12,color:'#4b5563',cursor:'pointer',marginTop:4}}>
                    <input type="checkbox" checked={agreedTerms} onChange={e=>setAgreedTerms(e.target.checked)}
                      style={{marginTop:2,flexShrink:0,cursor:'pointer'}}/>
                    <span>
                      {t('login.agreeTo')}{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" style={{color:'#029FA2',fontWeight:700,textDecoration:'underline'}}>{t('login.termsAndConditions')}</a>
                      {' '}{t('login.andWord')}{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{color:'#029FA2',fontWeight:700,textDecoration:'underline'}}>{t('login.privacyPolicy')}</a>
                    </span>
                  </label>

                  <button type="submit" disabled={loading||!planChoice||!agreedTerms} className="btn-main" style={{marginTop:8,opacity:(!planChoice||!agreedTerms)?.6:1}}>
                    {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>{t('login.creatingAccount')}</span>:t('login.createAccountBtn')}
                  </button>
                </form>
              </>
            )}
    </>
  )
}
