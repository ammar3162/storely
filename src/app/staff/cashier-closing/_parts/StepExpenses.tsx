'use client'
import NumberInput from '@/components/NumberInput'
import { ct } from './strings'
import { fmt } from './inputs'
import type { CashierClosing } from './useCashierClosing'
import { Receipt } from 'lucide-react'

export default function StepExpenses({ m }: { m: CashierClosing }) {
  const { lang, step, hasPurchases, setHasPurchases, purchases, curr, totalPurchasesNow, addPurchaseRow, removePurchaseRow, updatePurchase, autoAdvanceFrom } = m
  return (
    <>
            {/* خطوة 2: المصاريف */}
            {step===2 && (
              <div className="fu" style={{background:'white',borderRadius:14,padding:16,marginBottom:16,border:'1px solid #e5e7eb'}}>
                <div style={{fontSize:15,fontWeight:600,color:'#111827',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:28,height:28,borderRadius:8,background:'#eceef1',display:'flex',alignItems:'center',justifyContent:'center',color:'#4b5565'}}><Receipt size={16} strokeWidth={1.75}/></span>
                  {ct('step2Title',lang)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:hasPurchases==='yes'?16:0}}>
                  <button onClick={()=>{ setHasPurchases('no'); autoAdvanceFrom(2) }} style={{padding:'11px',borderRadius:10,border:`1px solid ${hasPurchases==='no'?'#0f766e':'#e5e7eb'}`,background:hasPurchases==='no'?'#e7f3f1':'white',color:hasPurchases==='no'?'#0f766e':'#4b5565',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    {ct('no',lang)}
                  </button>
                  <button onClick={()=>setHasPurchases('yes')} style={{padding:'11px',borderRadius:10,border:`1px solid ${hasPurchases==='yes'?'#0f766e':'#e5e7eb'}`,background:hasPurchases==='yes'?'#e7f3f1':'white',color:hasPurchases==='yes'?'#0f766e':'#4b5565',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    {ct('yes',lang)}
                  </button>
                </div>

                {hasPurchases==='yes' && (
                  <div>
                    {purchases.map((p,idx)=>(
                      <div key={idx} style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',background:'#f4f5f6',padding:10,borderRadius:12,border:'1px solid #e5e7eb'}}>
                        <div style={{flex:1}}>
                          <NumberInput value={p.amount} onChange={e=>updatePurchase(idx,'amount',e.target.value)} placeholder={ct('amountPh',lang)}
                            style={{width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:9,fontSize:16,fontWeight:600,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'right'}}/>
                        </div>
                        <div style={{flex:1.4}}>
                          <input type="text" value={p.reason} onChange={e=>updatePurchase(idx,'reason',e.target.value)} placeholder={ct('reasonPh',lang)}
                            style={{width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:9,fontSize:16,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                        </div>
                        {purchases.length>1 && (
                          <button onClick={()=>removePurchaseRow(idx)} style={{width:34,height:34,flexShrink:0,borderRadius:9,border:'none',background:'transparent',color:'#6b7487',cursor:'pointer',fontSize:16,fontWeight:600}}>×</button>
                        )}
                      </div>
                    ))}
                    <button onClick={addPurchaseRow} style={{width:'100%',padding:'11px',borderRadius:10,border:'1px dashed #d1d5db',background:'transparent',color:'#1f2937',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:2}}>
                      {ct('addExpenseRow',lang)}
                    </button>
                    {totalPurchasesNow>0 && (
                      <div style={{display:'flex',justifyContent:'space-between',marginTop:12,padding:'10px 12px',background:'#f4f5f6',borderRadius:8,fontSize:14}}>
                        <span style={{color:'#4b5565'}}>{ct('totalWithdrawals',lang)}</span>
                        <span style={{color:'#111827',fontVariantNumeric:'tabular-nums',direction:'ltr' as const}}>{fmt(totalPurchasesNow)} {curr}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
    </>
  )
}
