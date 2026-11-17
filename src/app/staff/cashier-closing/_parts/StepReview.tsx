'use client'
import { CASHIER_EXTRA } from '@/lib/staffI18n/cashier'
import { ct, DEFICIT_REASONS } from './strings'
import { fmt } from './inputs'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { localeOf } from '@/lib/staffLang'
import { C, card, paper, receiptEdge, receiptNum, cutLine } from '../../_ui/theme'

const line: React.CSSProperties = { display:'flex', justifyContent:'space-between', alignItems:'baseline', fontSize:17, lineHeight:'28px' }
import type { CashierClosing } from './useCashierClosing'

export default function StepReview({ m }: { m: CashierClosing }) {
  const { lang, session, step, deficitChoice, setDeficitChoice, deficitNote, setDeficitNote, networkImage, salesImage, networkPreview, salesPreview, curr, sales, mada, visa, mastercard, cash, deliveryList, totalPurchasesNow, expectedCash, difference, status, deficitReasonOk, businessDateLabel, isAfterMidnightCarry, hasReturns, returnsList, returnsPrev } = m
  const dayLabel = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString(localeOf(lang), { numberingSystem: 'latn', day: 'numeric', month: 'long', calendar: 'gregory', timeZone: 'UTC' })
  const prevDups = returnsList.filter(r => returnsPrev[r.no])
  return (
    <>
            {/* خطوة 4: المراجعة */}
            {step===4 && (
              <div className="fu" style={{marginBottom:16}}>
                {/* الإيصال: نفس أرقام الحساب، بشكل إيصال كاشير مطبوع */}
                <div style={{...paper,margin:'0 4px'}}>
                  <div style={{textAlign:'center' as const,marginBottom:14}}>
                    <div style={{fontSize:17,fontWeight:600,color:C.t1}}>{session?.org_name || ct('summaryTitle',lang)}</div>
                    {session?.branch_name && <div style={{fontSize:13,color:C.t3,lineHeight:'18px'}}>{session.branch_name}</div>}
                    <div style={{fontSize:13,color:C.t3,lineHeight:'18px'}}>{businessDateLabel}</div>
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
                  <div style={{...line,lineHeight:'32px'}}><span style={{color:C.t1,fontWeight:600,fontSize:17}}>{ct('actualCashRow',lang)}</span><span style={{...receiptNum,color:C.t1,fontSize:20,fontWeight:500}}>{fmt(cash)}</span></div>
                  <div style={cutLine}/>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,paddingTop:4,fontSize:17,fontWeight:600,color:status==='balanced'?C.pos:status==='deficit'?C.neg:C.t1}}>
                    {status==='balanced' ? <CheckCircle2 size={16} strokeWidth={1.75}/> : <AlertTriangle size={16} strokeWidth={1.75}/>}
                    {status==='balanced' ? ct('balanced',lang) : status==='deficit' ? ct('deficit',lang) : ct('surplus',lang)}
                    {status!=='balanced' && <span style={{...receiptNum,fontWeight:500}}>{fmt(Math.abs(difference))} {curr}</span>}
                  </div>
                </div>
                <div style={{...receiptEdge,margin:'0 4px'}}/>

                <div style={{marginTop:16,display:'grid',gap:8}}>
                  {totalPurchasesNow>0 && (
                    <div style={{...card,padding:'12px 14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:15}}>
                        <span style={{color:C.t2}}>{ct('recordedWithdrawals',lang)}</span>
                        <span style={{...receiptNum,color:C.t1}}>{fmt(totalPurchasesNow)}</span>
                      </div>
                      <div style={{fontSize:13,color:C.t3,marginTop:4}}>{ct('withdrawalsNote',lang)}</div>
                    </div>
                  )}
                  {/* الفواتير المرتجعة: العدد والأرقام والصور، وتنبيه لو فيه فاتورة انسجلت مرتجع قبل */}
                  {hasReturns && (
                    <div style={{...card,padding:'12px 14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:15}}>
                        <span style={{color:C.t2}}>{ct('returnsReviewTitle',lang)}</span>
                        <span style={{...receiptNum,color:C.t1}}>{returnsList.length || ct('returnsNone',lang)}</span>
                      </div>
                      {returnsList.length>0 && (
                        <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,marginTop:10}}>
                          {returnsList.map(r=>(
                            <div key={r.no} style={{display:'flex',alignItems:'center',gap:8,padding:4,paddingInlineEnd:12,borderRadius:12,background:'var(--storely-fill)'}}>
                              <img src={r.preview || r.photo} alt="" style={{width:30,height:40,borderRadius:8,objectFit:'cover',display:'block'}}/>
                              <span dir="ltr" style={{fontSize:15,color:C.t1,fontVariantNumeric:'tabular-nums'}}>{r.no}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {prevDups.map(r=>(
                        <div key={r.no} style={{display:'flex',gap:6,alignItems:'flex-start',marginTop:10,color:'#b54708',fontSize:13,lineHeight:1.5,textAlign:'start' as const}}>
                          <AlertTriangle size={14} strokeWidth={1.75} style={{flexShrink:0,marginTop:3}}/>
                          <span><b dir="ltr">{r.no}</b> {ct('returnPrevWarn',lang).replace('{date}',dayLabel(returnsPrev[r.no]))} {ct('returnPrevNote',lang)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{...card,padding:'12px 14px',textAlign:'start' as const}}>
                    <div style={{fontSize:15,color:C.t1,fontWeight:500}}>{ct('recordedOn',lang)} {businessDateLabel}</div>
                    {isAfterMidnightCarry && <div style={{fontSize:13,color:C.t2,marginTop:4,lineHeight:1.5}}>{ct('afterMidnight',lang)}</div>}
                  </div>
                </div>
              </div>
            )}
            {step===4 && (
              <div className="fu" style={{...card,padding:16,marginBottom:16}}>
                {status==='deficit' && (
                  <div style={{marginBottom:16,textAlign:'start' as const}}>
                    <div style={{fontSize:17,fontWeight:600,color:'var(--storely-text)',marginBottom:8}}>{ct('deficitReasonLbl',lang)}</div>
                    <div style={{display:'flex',flexDirection:'column' as const,gap:6,marginBottom:10}}>
                      {DEFICIT_REASONS.map(r=>{
                        const on = deficitChoice===r.key
                        return (
                          <button key={r.key} type="button" onClick={()=>setDeficitChoice(r.key)}
                            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 12px',borderRadius:12,border:`1px solid ${on?'#dc2626':'var(--storely-border)'}`,background:on?'#fef2f2':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'start' as const}}>
                            <span style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${on?'#dc2626':'#d4d4d0'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              {on && <span style={{width:8,height:8,borderRadius:'50%',background:'#dc2626'}}/>}
                            </span>
                            <span style={{fontSize:17,fontWeight:on?600:400,color:on?'#991b1b':'var(--storely-text)'}}>{lang==='en'?r.en:lang==='ar'?r.ar:((CASHIER_EXTRA['r_'+r.key] as any)?.[lang]||r.en)}</span>
                          </button>
                        )
                      })}
                    </div>
                    {deficitChoice && (
                      <>
                        <label style={{display:'block',fontSize:13,fontWeight:600,color:'var(--storely-text)',marginBottom:6}}>{ct(deficitChoice==='other'?'deficitOtherLbl':'deficitNoteLbl',lang)}</label>
                        <textarea value={deficitNote} onChange={e=>setDeficitNote(e.target.value.slice(0,400))} rows={2}
                          placeholder={ct('deficitReasonPh',lang)}
                          style={{width:'100%',padding:'11px 12px',border:`1px solid ${deficitChoice==='other'&&!deficitReasonOk?'#fca5a5':'var(--storely-border)'}`,borderRadius:20,fontSize:17,fontFamily:'inherit',boxSizing:'border-box' as const,resize:'vertical' as const,background:'white',outline:'none'}}/>
                      </>
                    )}
                    {!deficitReasonOk && <div style={{fontSize:13,color:'#b42318',marginTop:5,fontWeight:600}}>{ct(deficitChoice==='other'?'deficitOtherReq':'deficitReasonReq',lang)}</div>}
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{padding:8,borderRadius:12,background:'var(--storely-fill)',textAlign:'center' as const}}>
                    <img src={salesPreview || salesImage} alt="" style={{width:'100%',height:60,borderRadius:12,objectFit:'cover',marginBottom:4}}/>
                    <span style={{fontSize:13,color:'var(--storely-muted)'}}>{ct('salesReportCheck',lang)}</span>
                  </div>
                  <div style={{padding:8,borderRadius:12,background:'var(--storely-fill)',textAlign:'center' as const}}>
                    <img src={networkPreview || networkImage} alt="" style={{width:'100%',height:60,borderRadius:12,objectFit:'cover',marginBottom:4}}/>
                    <span style={{fontSize:13,color:'var(--storely-muted)'}}>{ct('networkBalanceCheck',lang)}</span>
                  </div>
                </div>
              </div>
            )}
    </>
  )
}
