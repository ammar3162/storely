'use client'
import { CASHIER_EXTRA } from '@/lib/staffI18n/cashier'
import { ct, DEFICIT_REASONS } from './strings'
import { fmt } from './inputs'
import type { CashierClosing } from './useCashierClosing'

export default function StepReview({ m }: { m: CashierClosing }) {
  const { lang, step, deficitChoice, setDeficitChoice, deficitNote, setDeficitNote, networkImage, salesImage, networkPreview, salesPreview, curr, sales, mada, visa, mastercard, cash, deliveryList, totalPurchasesNow, expectedCash, difference, status, deficitReasonOk, businessDateLabel, isAfterMidnightCarry } = m
  return (
    <>
            {/* خطوة 4: المراجعة */}
            {step===4 && (
              <div className="fu" style={{background:'white',borderRadius:18,padding:22,marginBottom:16,boxShadow:'0 2px 16px rgba(0,0,0,.05)',border:'1px solid #eeeeeb'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a',marginBottom:14}}>{ct('summaryTitle',lang)}</div>
                {[
                  {label:ct('totalSalesRow',lang),value:sales,sign:''},
                  ...(mada>0?[{label:`— ${ct('mada',lang)}`,value:mada,sign:'−'}]:[]),
                  ...(visa>0?[{label:`— ${ct('visa',lang)}`,value:visa,sign:'−'}]:[]),
                  ...(mastercard>0?[{label:`— ${ct('mastercard',lang)}`,value:mastercard,sign:'−'}]:[]),
                  ...deliveryList.map(d=>({label:`— ${d.name}`,value:d.amount,sign:'−'})),
                ].map((r,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:13,borderBottom:'1px dashed #eeeeeb'}}>
                    <span style={{color:'#8b8a84',fontWeight:600}}>{r.label}</span>
                    <span style={{color:'#1c1c1a',fontWeight:700,direction:'ltr' as const}}>{r.sign}{fmt(r.value)} {curr}</span>
                  </div>
                ))}
                <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 16px',fontSize:14}}>
                  <span style={{color:'#1c1c1a',fontWeight:800}}>{ct('expectedCashEq',lang)}</span>
                  <span style={{color:'#1c1c1a',fontWeight:900,direction:'ltr' as const}}>{fmt(expectedCash)} {curr}</span>
                </div>
                <div style={{height:1,background:'#eeeeeb',margin:'4px 0 12px'}}/>
                <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 16px',fontSize:14}}>
                  <span style={{color:'#1c1c1a',fontWeight:800}}>{ct('actualCashRow',lang)}</span>
                  <span style={{color:'#1c1c1a',fontWeight:900,direction:'ltr' as const}}>{fmt(cash)} {curr}</span>
                </div>
                {totalPurchasesNow>0 && (
                  <div style={{background:'#faf9f7',borderRadius:10,padding:'10px 12px',marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                      <span style={{color:'#8b8a84',fontWeight:600}}>{ct('recordedWithdrawals',lang)}</span>
                      <span style={{color:'#8b8a84',fontWeight:700,direction:'ltr' as const}}>{fmt(totalPurchasesNow)} {curr}</span>
                    </div>
                    <div style={{fontSize:10,color:'#a8a7a1',marginTop:4}}>{ct('withdrawalsNote',lang)}</div>
                  </div>
                )}
                <div style={{display:'flex',alignItems:'flex-start',gap:10,background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:12,padding:'11px 13px',marginBottom:12,textAlign:'start' as const}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:'#075985'}}>{ct('recordedOn',lang)} {businessDateLabel}</div>
                    {isAfterMidnightCarry && <div style={{fontSize:11.5,color:'#0369a1',marginTop:3,lineHeight:1.5}}>{ct('afterMidnight',lang)}</div>}
                  </div>
                </div>
                <div style={{
                  padding:'18px',borderRadius:14,textAlign:'center',marginBottom:16,
                  background: status==='balanced' ? '#f0fdfa' : status==='deficit' ? '#fef2f2' : '#eff6ff',
                  border: `1.5px solid ${status==='balanced' ? '#99f6e4' : status==='deficit' ? '#fecaca' : '#bfdbfe'}`
                }}>
                  <div style={{fontSize:13,fontWeight:800,color: status==='balanced' ? '#029FA2' : status==='deficit' ? '#dc2626' : '#2563eb',marginBottom:status!=='balanced'?6:0}}>
                    {status==='balanced' ? ct('balanced',lang) : status==='deficit' ? ct('deficit',lang) : ct('surplus',lang)}
                  </div>
                  {status!=='balanced' && (
                    <div style={{fontSize:28,fontWeight:900,color: status==='deficit' ? '#dc2626' : '#2563eb'}}>
                      {fmt(Math.abs(difference))} {curr}
                    </div>
                  )}
                </div>
                {status==='deficit' && (
                  <div style={{marginBottom:16,textAlign:'start' as const}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#b42318',marginBottom:8}}>{ct('deficitReasonLbl',lang)}</div>
                    <div style={{display:'flex',flexDirection:'column' as const,gap:6,marginBottom:10}}>
                      {DEFICIT_REASONS.map(r=>{
                        const on = deficitChoice===r.key
                        return (
                          <button key={r.key} type="button" onClick={()=>setDeficitChoice(r.key)}
                            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 12px',borderRadius:12,border:`1.5px solid ${on?'#dc2626':'#e5e5e2'}`,background:on?'#fef2f2':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'start' as const}}>
                            <span style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${on?'#dc2626':'#d4d4d0'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              {on && <span style={{width:8,height:8,borderRadius:'50%',background:'#dc2626'}}/>}
                            </span>
                            <span style={{fontSize:13.5,fontWeight:on?800:600,color:on?'#991b1b':'#1c1c1a'}}>{lang==='en'?r.en:lang==='ar'?r.ar:((CASHIER_EXTRA['r_'+r.key] as any)?.[lang]||r.en)}</span>
                          </button>
                        )
                      })}
                    </div>
                    {deficitChoice && (
                      <>
                        <label style={{display:'block',fontSize:12,fontWeight:700,color:'#5f5e5a',marginBottom:6}}>{ct(deficitChoice==='other'?'deficitOtherLbl':'deficitNoteLbl',lang)}</label>
                        <textarea value={deficitNote} onChange={e=>setDeficitNote(e.target.value.slice(0,400))} rows={2}
                          placeholder={ct('deficitReasonPh',lang)}
                          style={{width:'100%',padding:'11px 12px',border:`1.5px solid ${deficitChoice==='other'&&!deficitReasonOk?'#fca5a5':'#e5e5e2'}`,borderRadius:12,fontSize:16,fontFamily:'inherit',boxSizing:'border-box' as const,resize:'vertical' as const,background:'white',outline:'none'}}/>
                      </>
                    )}
                    {!deficitReasonOk && <div style={{fontSize:11.5,color:'#b42318',marginTop:5,fontWeight:600}}>{ct(deficitChoice==='other'?'deficitOtherReq':'deficitReasonReq',lang)}</div>}
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{padding:8,borderRadius:9,background:'#f7f7f5',textAlign:'center' as const}}>
                    <img src={salesPreview || salesImage} alt="" style={{width:'100%',height:60,borderRadius:6,objectFit:'cover',marginBottom:4}}/>
                    <span style={{fontSize:10,color:'#8b8a84',fontWeight:700}}>{ct('salesReportCheck',lang)}</span>
                  </div>
                  <div style={{padding:8,borderRadius:9,background:'#f7f7f5',textAlign:'center' as const}}>
                    <img src={networkPreview || networkImage} alt="" style={{width:'100%',height:60,borderRadius:6,objectFit:'cover',marginBottom:4}}/>
                    <span style={{fontSize:10,color:'#8b8a84',fontWeight:700}}>{ct('networkBalanceCheck',lang)}</span>
                  </div>
                </div>
              </div>
            )}
    </>
  )
}
