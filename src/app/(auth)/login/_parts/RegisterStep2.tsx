'use client'
import { SIGNUP_SOURCES } from '@/lib/signupSource'
import { Check, Minus, Plus } from 'lucide-react'
import { CUSTOM_MODULES, CUSTOM_MODULE_ORDER, PLAN_CAPS, customModuleAmount, customMonthly, yearlyOf } from '@/lib/planPricing'
import { FEATURE_NAMES as FEAT, FEATURE_PRESETS } from '@/lib/featurePresets'
import type { LoginState } from './useLogin'

export default function RegisterStep2({ m }: { m: LoginState }) {
  const { planFromLink, editPlan, setEditPlan, t, lang, mode, step, setStep, planChoice, signupAddons, setSignupAddons, branchCount, setBranchCount, billing, setBilling, loading, error, setError, agreedTerms, setAgreedTerms, signupSource, setSignupSource, signupSourceDetail, setSignupSourceDetail, handleRegister } = m
  // جا من صفحة الأسعار ومعه باقة؟ ملخص بدل الاختيار من جديد (إلا لو ضغط «تغيير الباقة»)
  const showSummary = planFromLink && !editPlan && signupAddons.length > 0
  // 2026-11-08: التسجيل دايم «اختيار المزايا» — السعر مجموع المزايا المختارة
  const staff = PLAN_CAPS.custom.staff * branchCount
  const picked: string[] = CUSTOM_MODULE_ORDER.filter(s => signupAddons.includes(s))
  const total = (list: string[]) => customMonthly(Object.fromEntries(list.map(s => [s, CUSTOM_MODULES[s].perBranch ? branchCount : 1])), branchCount, staff)
  const monthly = picked.length ? total(picked) : 0
  const cur = (v: number) => billing==='yearly' ? yearlyOf(v) : v
  const per = billing==='yearly' ? (lang==='ar'?'سنة':'yr') : (lang==='ar'?'شهر':'mo')
  const sar = lang==='ar'?'⃁':'SAR'
  const same = (a: string[]) => a.length === picked.length && a.every(x => picked.includes(x))
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
                  <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:6,letterSpacing:'-0.5px'}}>{showSummary ? (lang==='ar'?'خطوة أخيرة':'Last step') : t('login.choosePlanTitle')}</h1>
                  <p style={{fontSize:14,color:'#6b7280'}}>{showSummary ? (lang==='ar'?'راجع اختيارك وأنشئ حسابك':'Review your selection and create your account') : t('login.changePlanLater')}</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={handleRegister} style={{display:'flex',flexDirection:'column',gap:10}}>
                  {showSummary ? (
                      <div style={{border:'1.5px solid #e5e7eb',borderRadius:14,padding:'16px 18px',display:'flex',flexDirection:'column',gap:10}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                          <div>
                            <div style={{fontSize:13,color:'#4b5563'}}>{lang==='ar'?'اختيارك':'Your selection'}</div>
                            <div style={{fontSize:18,fontWeight:800,color:'#111827'}}>{lang==='ar'?`${picked.length} ${picked.length===1?'ميزة':picked.length===2?'ميزتين':'مزايا'}`:`${picked.length} feature${picked.length>1?'s':''}`}</div>
                            <div style={{fontSize:13,color:'#374151',marginTop:2}}>
                              {lang==='ar' ? (branchCount===1?'فرع واحد':branchCount===2?'فرعين':`${branchCount} فروع`) : `${branchCount} branch${branchCount>1?'es':''}`}
                              {` · ${billing==='yearly'?(lang==='ar'?'سنوي':'yearly'):(lang==='ar'?'شهري':'monthly')}`}
                            </div>
                          </div>
                          <div className="hide-in-app" style={{textAlign:'left',flexShrink:0}}>
                            <span style={{fontSize:22,fontWeight:800,color:'#111827'}}>{cur(monthly)}</span> <span style={{fontSize:12,color:'#4b5563'}}>{sar}/{per}</span>
                          </div>
                        </div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                          {picked.map(f => <span key={f} style={{fontSize:12,fontWeight:600,color:'#111827',background:'#f3f4f6',borderRadius:6,padding:'4px 8px',display:'inline-flex',alignItems:'center',gap:4}}><Check size={12}/>{lang==='ar'?FEAT[f].ar:FEAT[f].en}</span>)}
                        </div>
                        <button type="button" onClick={()=>setEditPlan(true)}
                          style={{alignSelf:'flex-start',background:'none',border:'none',padding:0,color:'#0f766e',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline',textUnderlineOffset:3}}>
                          {lang==='ar'?'تغيير المزايا':'Change features'}
                        </button>
                      </div>
                  ) : (<>
                  <div className="hide-in-app" style={{display:'flex',justifyContent:'center',marginBottom:6}}>
                    <div style={{display:'inline-flex',gap:4,background:'#f3f4f6',padding:4,borderRadius:12}}>
                      <button type="button" onClick={()=>setBilling('monthly')} style={{padding:'8px 18px',borderRadius:9,border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',background:billing==='monthly'?'white':'transparent',color:billing==='monthly'?'#111827':'#6b7280',boxShadow:billing==='monthly'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>{t('login.planMonthly')}</button>
                      <button type="button" onClick={()=>setBilling('yearly')} style={{padding:'8px 18px',borderRadius:9,border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,background:billing==='yearly'?'white':'transparent',color:billing==='yearly'?'#111827':'#6b7280',boxShadow:billing==='yearly'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
                        {t('login.planYearly')} <span style={{background:'#f0fdfa',color:'#0f766e',fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:99}}>{t('login.planSave')}</span>
                      </button>
                    </div>
                  </div>
                  {/* عدد الفروع — سعر كل ميزة يتحدّث حسبه */}
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
                  {/* اختيارات جاهزة — تعلّم المزايا عنه بضغطة */}
                  <div style={{fontSize:13,fontWeight:700,color:'#374151',marginTop:4}}>{lang==='ar'?'ابدأ من اختيار جاهز':'Start from a preset'}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:6}}>
                    {FEATURE_PRESETS.map(p => { const on = same(p.mods); return (
                      <button key={p.key} type="button" onClick={()=>setSignupAddons([...p.mods])} aria-pressed={on}
                        style={{padding:'10px 8px',borderRadius:10,border:`1.5px solid ${on?'#029FA2':'#e5e7eb'}`,background:on?'#f0fdfa':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'center',display:'flex',flexDirection:'column',gap:2}}>
                        <span style={{fontSize:13,fontWeight:700,color:'#111827',lineHeight:1.4}}>{lang==='ar'?p.ar:p.en}</span>
                        <span className="hide-in-app" style={{fontSize:12,color:'#4b5563'}}>{cur(total(p.mods))} {sar}</span>
                      </button>
                    )})}
                  </div>
                  <div style={{border:'1.5px solid #e5e7eb',borderRadius:12,padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{fontSize:14,fontWeight:800,color:'#111827'}}>{lang==='ar'?'أو اختر المزايا بنفسك':'Or pick features yourself'}</div>
                    {CUSTOM_MODULE_ORDER.map(slug => {
                      const on = signupAddons.includes(slug), m = CUSTOM_MODULES[slug]
                      const amount = customModuleAmount(slug, m.perBranch ? branchCount : 1)
                      return (
                        <button key={slug} type="button" onClick={()=>setSignupAddons(prev => on ? prev.filter(x=>x!==slug) : [...prev, slug])}
                          style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${on?'#029FA2':'#e5e7eb'}`,background:on?'#f0fdfa':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                          <span style={{width:20,height:20,borderRadius:6,border:`1.5px solid ${on?'#029FA2':'#9ca3af'}`,background:on?'#029FA2':'white',display:'grid',placeItems:'center',color:'white',flexShrink:0}}>{on && <Check size={14} strokeWidth={3}/>}</span>
                          <span style={{flex:1,fontSize:14,fontWeight:700,color:'#111827'}}>{lang==='ar'?FEAT[slug].ar:FEAT[slug].en}</span>
                          <span className="hide-in-app" style={{fontSize:13,fontWeight:800,color:'#111827',whiteSpace:'nowrap'}}>{cur(amount)} {sar}{m.perBranch && branchCount>1 ? (lang==='ar'?` (${branchCount} فروع)`:` (${branchCount} br.)`) : ''}</span>
                        </button>
                      )
                    })}
                    <div style={{fontSize:13,color:'#374151',padding:'2px'}}>{lang==='ar'?`يشمل ${staff} موظفين (${PLAN_CAPS.custom.staff} لكل فرع)، وتقدر تضيف أو تشيل أي ميزة من داخل النظام بأي وقت`:`Includes ${staff} staff (${PLAN_CAPS.custom.staff} per branch); add or remove features anytime inside the app`}</div>
                    <div className="hide-in-app" style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #e5e7eb',paddingTop:8,fontSize:14,fontWeight:800,color:'#111827'}}>
                      <span>{lang==='ar'?'المجموع':'Total'}</span>
                      <span>{picked.length ? `${cur(monthly)} ${sar}/${per}` : (lang==='ar'?'اختر ميزة':'Pick a feature')}</span>
                    </div>
                  </div>

                  </>)}
                  {picked.length > 0 && (
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

                  <button type="submit" disabled={loading||!planChoice||!picked.length||!agreedTerms} className="btn-main" style={{marginTop:8,opacity:(!picked.length||!agreedTerms)?.6:1}}>
                    {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>{t('login.creatingAccount')}</span>:t('login.createAccountBtn')}
                  </button>
                </form>
              </>
            )}
    </>
  )
}
