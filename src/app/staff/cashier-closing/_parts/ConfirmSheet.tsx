'use client'
import { CASHIER_EXTRA } from '@/lib/staffI18n/cashier'
import { ct, DEFICIT_REASONS } from './strings'
import { fmt } from './inputs'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { C, card, paper, receiptEdge, receiptNum, cutLine } from '../../_ui/theme'
import type { CashierClosing } from './useCashierClosing'

const line: React.CSSProperties = { display:'flex', justifyContent:'space-between', alignItems:'baseline', fontSize:14, lineHeight:'28px' }

// نافذة من تحت: الإيصال للتأكيد — الحفظ ما يصير إلا بزر «إقفال الدرج»
export default function ConfirmSheet({ m }: { m: CashierClosing }) {
  const { lang, session, reviewOpen, setReviewOpen, submitting, saveClosing, deficitChoice, setDeficitChoice, deficitNote, setDeficitNote, curr, sales, mada, visa, mastercard, cash, deliveryList, totalPurchasesNow, expectedCash, difference, status, deficitReasonOk, businessDateLabel, isAfterMidnightCarry } = m
  if(!reviewOpen) return null
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',flexDirection:'column' as const,justifyContent:'flex-end'}}>
      <div onClick={()=>!submitting&&setReviewOpen(false)} style={{position:'absolute',inset:0,background:'rgba(17,24,39,.45)',animation:'fadeIn .2s ease both'}}/>
      <div className="sheet" style={{position:'relative',background:'#f4f5f6',borderRadius:'20px 20px 0 0',maxHeight:'92dvh',overflowY:'auto' as const,padding:'8px 16px calc(20px + env(safe-area-inset-bottom))',width:'100%',maxWidth:560,margin:'0 auto'}}>
        <div style={{width:40,height:4,borderRadius:2,background:'#d1d5db',margin:'4px auto 12px'}}/>
        <div style={{fontSize:18,fontWeight:600,color:C.t1,marginBottom:12}}>{ct('confirmTitle',lang)}</div>
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

                <div style={{...card,padding:'12px 14px',marginTop:12,textAlign:'start' as const}}>
                  <div style={{fontSize:13,color:C.t1,fontWeight:500}}>{ct('recordedOn',lang)} {businessDateLabel}</div>
                  {isAfterMidnightCarry && <div style={{fontSize:12,color:C.t2,marginTop:4,lineHeight:1.5}}>{ct('afterMidnight',lang)}</div>}
                  {totalPurchasesNow>0 && <div style={{fontSize:12,color:C.t2,marginTop:4}}>{ct('recordedWithdrawals',lang)}: {fmt(totalPurchasesNow)} {curr}</div>}
                </div>

                <div style={{marginTop:16}}>
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
                </div>

        <div style={{display:'grid',gap:8,marginTop:8}}>
          <button type="button" onClick={saveClosing} disabled={submitting||!deficitReasonOk}
            style={{height:52,background:deficitReasonOk?'#0f766e':'#eceef1',color:deficitReasonOk?'white':'#6b7487',border:'none',borderRadius:10,fontSize:16,fontWeight:600,cursor:deficitReasonOk?'pointer':'not-allowed',fontFamily:'inherit',opacity:submitting?.7:1}}>
            {submitting ? ct('saving',lang) : ct('closeDrawer',lang)}
          </button>
          <button type="button" onClick={()=>setReviewOpen(false)} disabled={submitting}
            style={{height:48,background:'white',color:C.t1,border:'1px solid #e5e7eb',borderRadius:10,fontSize:16,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
            {ct('backToEdit',lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
