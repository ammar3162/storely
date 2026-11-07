'use client'
import { SIGNUP_SOURCES } from '@/lib/signupSource'
import { Check, Minus, Plus } from 'lucide-react'
import { CUSTOM_MIN_STAFF_PER_BRANCH, CUSTOM_MODULES, CUSTOM_MODULE_ORDER, CUSTOM_STAFF_STEP, NEW_ADDON_PRICES, NEW_PLANS, PLAN_PRICING, customModuleAmount, customMonthly, higherPlans, planPriceFor, signupAddonsFor, signupAddonsMonthly, yearlyOf, type NewPlanKey } from '@/lib/planPricing'
import { PLANS, PLAN_EN } from './constants'
import type { LoginState } from './useLogin'

export default function RegisterStep2({ m }: { m: LoginState }) {
  const { t, lang, mode, step, setStep, planChoice, setPlanChoice, signupAddons, setSignupAddons, staffCount, setStaffCount, branchCount, setBranchCount, billing, setBilling, loading, error, setError, agreedTerms, setAgreedTerms, signupSource, setSignupSource, signupSourceDetail, setSignupSourceDetail, handleRegister } = m
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

                  {/* «ابنِ باقتك» — يختار المزايا اللي يحتاجها بس */}
                  <button type="button" onClick={()=>setPlanChoice('custom')}
                    style={{padding:'16px 18px',borderRadius:12,border:`1.5px ${planChoice==='custom'?'solid #029FA2':'dashed #9ca3af'}`,background:planChoice==='custom'?'#029FA208':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                    <div style={{fontSize:15,fontWeight:700,color:planChoice==='custom'?'#029FA2':'#111827',marginBottom:3}}>{lang==='ar'?'ابنِ باقتك بنفسك':'Build your own plan'}</div>
                    <div style={{fontSize:12,color:'#374151'}}>{lang==='ar'?'اختر المزايا اللي تحتاجها بس — مثلاً إقفال الكاشير لحاله':'Pick only the features you need — e.g. cashier closing alone'}</div>
                  </button>

                  {planChoice === 'custom' && (() => {
                    const MOD: Record<string, { ar: string; en: string }> = {
                      mod_inventory: { ar: 'المخزون والموردين', en: 'Inventory & suppliers' },
                      mod_purchases: { ar: 'المشتريات والفواتير', en: 'Purchases & invoices' },
                      cashier_closing: { ar: 'إقفال الكاشير', en: 'Cashier closing' },
                      hr_full: { ar: 'الحضور والرواتب', en: 'Attendance & payroll' },
                      ai_tools: { ar: 'أدوات الذكاء الاصطناعي', en: 'AI tools' },
                    }
                    const minStaff = CUSTOM_MIN_STAFF_PER_BRANCH * branchCount
                    const staff = Math.max(minStaff, staffCount ?? 6 * branchCount)
                    const picked = CUSTOM_MODULE_ORDER.filter(s => signupAddons.includes(s))
                    const monthly = customMonthly(Object.fromEntries(picked.map(s => [s, CUSTOM_MODULES[s].perBranch ? branchCount : 1])), branchCount, staff)
                    const cur = (m: number) => billing==='yearly' ? yearlyOf(m) : m
                    // باقة جاهزة تعطيه نفس اختياره بسعر أقل أو مساوي؟
                    const extraStaff = Math.max(0, staff - 6 * branchCount) * CUSTOM_STAFF_STEP
                    const better = picked.length ? NEW_PLANS
                      .map(k => ({ k, total: planPriceFor(k, null, branchCount).monthly + signupAddonsMonthly(k, picked as unknown as string[], branchCount) + extraStaff }))
                      .filter(x => x.total <= monthly).sort((a, b) => a.total - b.total || NEW_PLANS.indexOf(b.k) - NEW_PLANS.indexOf(a.k))[0] : undefined
                    return (
                      <div style={{border:'1.5px solid #e5e7eb',borderRadius:12,padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
                        <div style={{fontSize:14,fontWeight:800,color:'#111827'}}>{lang==='ar'?'اختر المزايا':'Pick your features'}</div>
                        {CUSTOM_MODULE_ORDER.map(slug => {
                          const on = signupAddons.includes(slug), m = CUSTOM_MODULES[slug]
                          const amount = customModuleAmount(slug, m.perBranch ? branchCount : 1)
                          return (
                            <button key={slug} type="button" onClick={()=>setSignupAddons(prev => on ? prev.filter(x=>x!==slug) : [...prev, slug])}
                              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${on?'#029FA2':'#e5e7eb'}`,background:on?'#f0fdfa':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                              <span style={{width:20,height:20,borderRadius:6,border:`1.5px solid ${on?'#029FA2':'#9ca3af'}`,background:on?'#029FA2':'white',display:'grid',placeItems:'center',color:'white',flexShrink:0}}>{on && <Check size={14} strokeWidth={3}/>}</span>
                              <span style={{flex:1,fontSize:14,fontWeight:700,color:'#111827'}}>{lang==='ar'?MOD[slug].ar:MOD[slug].en}</span>
                              <span className="hide-in-app" style={{fontSize:13,fontWeight:800,color:'#111827',whiteSpace:'nowrap'}}>{cur(amount)} {lang==='ar'?'⃁':'SAR'}</span>
                            </button>
                          )
                        })}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 2px'}}>
                          <span style={{fontSize:14,fontWeight:700,color:'#111827'}}>{lang==='ar'?'عدد الموظفين':'Staff'} <span style={{fontSize:12,fontWeight:600,color:'#374151'}}>{lang==='ar'?`(${6*branchCount} مشمولين، كل موظف ±${CUSTOM_STAFF_STEP} ⃁)`:`(${6*branchCount} included, ±${CUSTOM_STAFF_STEP} SAR each)`}</span></span>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <button type="button" aria-label={lang==='ar'?'نقص':'Less'} disabled={staff<=minStaff} onClick={()=>setStaffCount(v => Math.max(minStaff, (v ?? 6*branchCount) - 1))}
                              style={{width:34,height:34,borderRadius:99,border:'none',background:'#f3f4f6',cursor:staff<=minStaff?'default':'pointer',opacity:staff<=minStaff?.4:1,display:'grid',placeItems:'center',color:'#111827'}}><Minus size={15}/></button>
                            <b style={{minWidth:22,textAlign:'center',fontSize:16,color:'#111827'}}>{staff}</b>
                            <button type="button" aria-label={lang==='ar'?'زيادة':'More'} disabled={staff>=200} onClick={()=>setStaffCount(v => Math.min(200, Math.max(minStaff, v ?? 6*branchCount) + 1))}
                              style={{width:34,height:34,borderRadius:99,border:'none',background:'#f3f4f6',cursor:'pointer',display:'grid',placeItems:'center',color:'#111827'}}><Plus size={15}/></button>
                          </div>
                        </div>
                        {better && (
                          <button type="button" onClick={()=>{ setPlanChoice(better.k); setSignupAddons(picked.filter(s => signupAddonsFor(better.k).includes(s as any))) }}
                            style={{padding:'10px 12px',borderRadius:10,border:'1.5px solid #029FA2',background:'#f0fdfa',color:'#0f766e',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',textAlign:'right',lineHeight:1.7}}>
                            {lang==='ar'
                              ? `باقة «${PLAN_PRICING[better.k].label}» تعطيك نفس اختيارك${better.total < monthly ? ` بـ ${cur(better.total)} ⃁ (توفّر ${cur(monthly - better.total)} ⃁)` : ' بنفس السعر وفيها مزايا أكثر'} — اضغط للتحويل`
                              : `The ${better.k} plan covers the same for ${cur(better.total)} SAR — tap to switch`}
                          </button>
                        )}
                        <div style={{fontSize:12,color:'#374151',lineHeight:1.7}}>{lang==='ar'?'تقدر تحدد أي فرع ياخذ كل ميزة، وتضيف وتشيل، من داخل النظام بأي وقت.':'Pick which branch gets each feature, or change them, anytime inside the app.'}</div>
                        <div className="hide-in-app" style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #e5e7eb',paddingTop:8,fontSize:14,fontWeight:800,color:'#111827'}}>
                          <span>{lang==='ar'?'المجموع':'Total'}</span>
                          <span>{picked.length ? `${cur(monthly)} ${lang==='ar'?'⃁':'SAR'}/${billing==='yearly'?(lang==='ar'?'سنة':'yr'):(lang==='ar'?'شهر':'mo')}` : (lang==='ar'?'اختر ميزة':'Pick a feature')}</span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* إضافات مع الباقة — تختارها الحين، وتحدد فروعها من داخل النظام */}
                  {planChoice && planChoice !== 'custom' && signupAddonsFor(planChoice).length > 0 && (() => {
                    const AD: Record<string, { ar: string; en: string }> = {
                      cashier_closing: { ar: 'إقفال الكاشير', en: 'Cashier closing' },
                      hr_full: { ar: 'الحضور والرواتب', en: 'Attendance & payroll' },
                      ai_tools: { ar: 'أدوات الذكاء الاصطناعي', en: 'AI tools' },
                    }
                    const pc = planChoice as NewPlanKey
                    const monthly = planPriceFor(pc, null, branchCount).monthly + signupAddonsMonthly(pc, signupAddons, branchCount)
                    // باقة أعلى تعطيه نفس اختياره بسعر أقل؟ (مثلاً الأساسية + كاشير لفرعين أغلى من التشغيل)
                    const better = (higherPlans(pc) as NewPlanKey[])
                      .map(k => ({ k, total: planPriceFor(k, null, branchCount).monthly + signupAddonsMonthly(k, signupAddons, branchCount) }))
                      .filter(x => x.total <= monthly).sort((a, b) => a.total - b.total)[0]
                    return (
                      <div style={{border:'1.5px solid #e5e7eb',borderRadius:12,padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
                        <div style={{fontSize:14,fontWeight:800,color:'#111827'}}>{lang==='ar'?'تبي تضيف لباقتك؟':'Add to your plan?'}</div>
                        {signupAddonsFor(planChoice).map(slug => {
                          const on = signupAddons.includes(slug), a = NEW_ADDON_PRICES[slug]
                          const amount = a.monthly * (a.perBranch ? branchCount : 1)
                          return (
                            <button key={slug} type="button" onClick={()=>setSignupAddons(prev => on ? prev.filter(x=>x!==slug) : [...prev, slug])}
                              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${on?'#029FA2':'#e5e7eb'}`,background:on?'#f0fdfa':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                              <span style={{width:20,height:20,borderRadius:6,border:`1.5px solid ${on?'#029FA2':'#9ca3af'}`,background:on?'#029FA2':'white',display:'grid',placeItems:'center',color:'white',flexShrink:0}}>{on && <Check size={14} strokeWidth={3}/>}</span>
                              <span style={{flex:1,fontSize:14,fontWeight:700,color:'#111827'}}>{lang==='ar'?AD[slug].ar:AD[slug].en}</span>
                              <span className="hide-in-app" style={{fontSize:13,fontWeight:800,color:'#111827',whiteSpace:'nowrap'}}>+{billing==='yearly'?yearlyOf(amount):amount} {lang==='ar'?'⃁':'SAR'}{a.perBranch && branchCount>1 ? (lang==='ar'?` (${branchCount} فروع)`:` (${branchCount} branches)`) : ''}</span>
                            </button>
                          )
                        })}
                        <div style={{fontSize:12,color:'#374151',lineHeight:1.7}}>{lang==='ar'?'تقدر تحدد أي فرع ياخذ الإضافة، أو تضيف وتشيل، من داخل النظام بأي وقت.':'You can pick which branch gets each add-on, or change them, anytime inside the app.'}</div>
                        {better && (
                          <button type="button" onClick={()=>setPlanChoice(better.k)}
                            style={{padding:'10px 12px',borderRadius:10,border:'1.5px solid #029FA2',background:'#f0fdfa',color:'#0f766e',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',textAlign:'right',lineHeight:1.7}}>
                            {lang==='ar'
                              ? `باقة «${PLAN_PRICING[better.k].label}» تعطيك نفس اختيارك بـ ${billing==='yearly'?yearlyOf(better.total):better.total} ⃁${better.total < monthly ? ` (توفّر ${billing==='yearly'?yearlyOf(monthly-better.total):monthly-better.total} ⃁)` : ''} — اضغط للتحويل`
                              : `The ${better.k === 'ops' ? 'Operations' : 'Complete'} plan gives you the same for ${billing==='yearly'?yearlyOf(better.total):better.total} SAR — tap to switch`}
                          </button>
                        )}
                        {signupAddons.some(s=>signupAddonsFor(planChoice).includes(s as any)) && (
                          <div className="hide-in-app" style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #e5e7eb',paddingTop:8,fontSize:14,fontWeight:800,color:'#111827'}}>
                            <span>{lang==='ar'?'المجموع':'Total'}</span>
                            <span>{billing==='yearly'?yearlyOf(monthly):monthly} {lang==='ar'?'⃁':'SAR'}/{billing==='yearly'?(lang==='ar'?'سنة':'yr'):(lang==='ar'?'شهر':'mo')}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

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
