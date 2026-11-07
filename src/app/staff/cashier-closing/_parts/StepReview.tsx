'use client'
import { CASHIER_EXTRA } from '@/lib/staffI18n/cashier'
import { ct, DEFICIT_REASONS } from './strings'
import { fmt } from './inputs'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { C, card, paper, receiptEdge, receiptNum, cutLine } from '../../_ui/theme'

const line: React.CSSProperties = { display:'flex', justifyContent:'space-between', alignItems:'baseline', fontSize:14, lineHeight:'28px' }
import type { CashierClosing } from './useCashierClosing'

export default function StepReview({ m }: { m: CashierClosing }) {
  const { lang, session, step, deficitChoice, setDeficitChoice, deficitNote, setDeficitNote, networkImage, salesImage, networkPreview, salesPreview, curr, sales, mada, visa, mastercard, cash, deliveryList, totalPurchasesNow, expectedCash, difference, status, deficitReasonOk, businessDateLabel, isAfterMidnightCarry } = m
  return (
    <>
            {/* خطوة 4: المراجعة */}
            {step===4 && (
              <div className="fu" style={{marginBottom:16}}>
                {/* الإيصال: نفس أرقام الحساب، بشكل إيصال كاشير مطبوع */}
                <div style={{...paper,margin:'0 4px'}}>
                  <div style={{textAlign:'center' as const,marginBottom:14}}>
                    <div style={{fontSize:15,fontWeight:600,color:C.t1}}>{session?.org_name || ct('summaryTitle',lang)}</div>
                    {session?.branch_name && <div style={{fontSize:12,color:C.t3,lineHeight:'18px'}}>{session.branch_name}</div>}
                    <div style={{fontSize:12,color:C.t3,lineHeight:'18px'}}>{businessDateLabel}</div>
                  </div>
                  <div style={line}><span style={{color:C.t2}}>{ct('totalSalesRow',lang)}</span><span style={{...receiptNum,color:C.t1}}>{fmt(sales)}</span></div>
                  {(mada>0||visa>0||mastercard>0||deliveryList.length>0) && <div style={cutLine}/>}
                  {[
                    ...(mada>0?[{label:ct('mada',lang),value:mada}]:[]),
                    ...(visa>0?[{label:ct('visa',lang),value:visa}]:[]),
                    ...(mastercard>0?[{label:ct('mastercard',lang),value:mastercard}]:[]),
                    ...deliveryList.map(d=>({label:d.name,value:d.amount})),
                  ].map((r,i)=>(
                    <div key={i} style={line}><span style={{color:C.t2}}>{r.label}</span><span style={{...receiptNum,color:C.t1}}>-{fmt(r.value)}</span></div>
                  ))}
                  <div style={cutLine}/>
                  <div style={line}><span style={{color:C.t2}}>{ct('expectedCashEq',lang).replace(/^=\s*/,'')}</span><span style={{...receiptNum,color:C.t1}}>{fmt(expectedCash)}</span></div>
                  <div style={{...line,lineHeight:'32px'}}><span style={{color:C.t1,fontWeight:600,fontSize:15}}>{ct('actualCashRow',lang)}</span><span style={{...receiptNum,color:C.t1,fontSize:20,fontWeight:500}}>{fmt(cash)}</span></div>
                  <div style={cutLine}/>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,paddingTop:4,fontSize:14,fontWeight:600,color:status==='balanced'?C.pos:status==='deficit'?C.neg:C.t1}}>
                    {status==='balanced' ? <CheckCircle2 size={16} strokeWidth={1.75}/> : <AlertTriangle size={16} strokeWidth={1.75}/>}
                    {status==='balanced' ? ct('balanced',lang) : status==='deficit' ? ct('deficit',lang) : ct('surplus',lang)}
                    {status!=='balanced' && <span style={{...receiptNum,fontWeight:500}}>{fmt(Math.abs(difference))} {curr}</span>}
                  </div>
                </div>
                <div style={{...receiptEdge,margin:'0 4px'}}/>

                <div style={{marginTop:16,display:'grid',gap:8}}>
                  {totalPurchasesNow>0 && (
                    <div style={{...card,padding:'12px 14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                        <span style={{color:C.t2}}>{ct('recordedWithdrawals',lang)}</span>
                        <span style={{...receiptNum,color:C.t1}}>{fmt(totalPurchasesNow)}</span>
                      </div>
                      <div style={{fontSize:12,color:C.t3,marginTop:4}}>{ct('withdrawalsNote',lang)}</div>
                    </div>
                  )}
                  <div style={{...card,padding:'12px 14px',textAlign:'start' as const}}>
                    <div style={{fontSize:13,color:C.t1,fontWeight:500}}>{ct('recordedOn',lang)} {businessDateLabel}</div>
                    {isAfterMidnightCarry && <div style={{fontSize:12,color:C.t2,marginTop:4,lineHeight:1.5}}>{ct('afterMidnight',lang)}</div>}
                  </div>
                </div>
              </div>
            )}
            {step===4 && (
              <div className="fu" style={{...card,padding:16,marginBottom:16}}>
                {status==='deficit' && (
                  <div style={{marginBottom:16,textAlign:'start' as const}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#111827',marginBottom:8}}>{ct('deficitReasonLbl',lang)}</div>
                    <div style={{display:'flex',flexDirection:'column' as const,gap:6,marginBottom:10}}>
                      {DEFICIT_REASONS.map(r=>{
                        const on = deficitChoice===r.key
                        return (
                          <button key={r.key} type="button" onClick={()=>setDeficitChoice(r.key)}
                            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 12px',borderRadius:10,border:`1px solid ${on?'#dc2626':'#e5e7eb'}`,background:on?'#fef2f2':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'start' as const}}>
                            <span style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${on?'#dc2626':'#d4d4d0'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              {on && <span style={{width:8,height:8,borderRadius:'50%',background:'#dc2626'}}/>}
                            </span>
                            <span style={{fontSize:14,fontWeight:on?600:400,color:on?'#991b1b':'#111827'}}>{lang==='en'?r.en:lang==='ar'?r.ar:((CASHIER_EXTRA['r_'+r.key] as any)?.[lang]||r.en)}</span>
                          </button>
                        )
                      })}
                    </div>
                    {deficitChoice && (
                      <>
                        <label style={{display:'block',fontSize:12,fontWeight:600,color:'#1f2937',marginBottom:6}}>{ct(deficitChoice==='other'?'deficitOtherLbl':'deficitNoteLbl',lang)}</label>
                        <textarea value={deficitNote} onChange={e=>setDeficitNote(e.target.value.slice(0,400))} rows={2}
                          placeholder={ct('deficitReasonPh',lang)}
                          style={{width:'100%',padding:'11px 12px',border:`1px solid ${deficitChoice==='other'&&!deficitReasonOk?'#fca5a5':'#e5e7eb'}`,borderRadius:12,fontSize:16,fontFamily:'inherit',boxSizing:'border-box' as const,resize:'vertical' as const,background:'white',outline:'none'}}/>
                      </>
                    )}
                    {!deficitReasonOk && <div style={{fontSize:11.5,color:'#b42318',marginTop:5,fontWeight:600}}>{ct(deficitChoice==='other'?'deficitOtherReq':'deficitReasonReq',lang)}</div>}
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{padding:8,borderRadius:10,background:'#f4f5f6',textAlign:'center' as const}}>
                    <img src={salesPreview || salesImage} alt="" style={{width:'100%',height:60,borderRadius:6,objectFit:'cover',marginBottom:4}}/>
                    <span style={{fontSize:12,color:'#4b5565'}}>{ct('salesReportCheck',lang)}</span>
                  </div>
                  <div style={{padding:8,borderRadius:10,background:'#f4f5f6',textAlign:'center' as const}}>
                    <img src={networkPreview || networkImage} alt="" style={{width:'100%',height:60,borderRadius:6,objectFit:'cover',marginBottom:4}}/>
                    <span style={{fontSize:12,color:'#4b5565'}}>{ct('networkBalanceCheck',lang)}</span>
                  </div>
                </div>
              </div>
            )}
    </>
  )
}
