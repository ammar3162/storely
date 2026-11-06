'use client'
import NumberInput from '@/components/NumberInput'
import { ct } from './strings'
import { fmt } from './inputs'
import type { CashierClosing } from './useCashierClosing'

export default function StepExpenses({ m }: { m: CashierClosing }) {
  const { lang, step, hasPurchases, setHasPurchases, purchases, curr, totalPurchasesNow, addPurchaseRow, removePurchaseRow, updatePurchase } = m
  return (
    <>
            {/* خطوة 2: المصاريف */}
            {step===2 && (
              <div className="fu" style={{background:'white',borderRadius:18,padding:22,marginBottom:16,boxShadow:'0 2px 16px rgba(0,0,0,.05)',border:'1px solid #eeeeeb'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:24,height:24,borderRadius:7,background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🧾</span>
                  {ct('step2Title',lang)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:hasPurchases==='yes'?16:0}}>
                  <button onClick={()=>setHasPurchases('no')} style={{padding:'11px',borderRadius:10,border:`1.5px solid ${hasPurchases==='no'?'#029FA2':'#e5e5e2'}`,background:hasPurchases==='no'?'#f0fdfa':'white',color:hasPurchases==='no'?'#029FA2':'#5f5e5a',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    {ct('no',lang)}
                  </button>
                  <button onClick={()=>setHasPurchases('yes')} style={{padding:'11px',borderRadius:10,border:`1.5px solid ${hasPurchases==='yes'?'#029FA2':'#e5e5e2'}`,background:hasPurchases==='yes'?'#f0fdfa':'white',color:hasPurchases==='yes'?'#029FA2':'#5f5e5a',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    {ct('yes',lang)}
                  </button>
                </div>

                {hasPurchases==='yes' && (
                  <div>
                    {purchases.map((p,idx)=>(
                      <div key={idx} style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',background:'#faf9f7',padding:10,borderRadius:12,border:'1px solid #f0efec'}}>
                        <div style={{flex:1}}>
                          <NumberInput value={p.amount} onChange={e=>updatePurchase(idx,'amount',e.target.value)} placeholder={ct('amountPh',lang)}
                            style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e5e2',borderRadius:9,fontSize:16,fontWeight:700,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'right'}}/>
                        </div>
                        <div style={{flex:1.4}}>
                          <input type="text" value={p.reason} onChange={e=>updatePurchase(idx,'reason',e.target.value)} placeholder={ct('reasonPh',lang)}
                            style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e5e2',borderRadius:9,fontSize:16,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                        </div>
                        {purchases.length>1 && (
                          <button onClick={()=>removePurchaseRow(idx)} style={{width:34,height:34,flexShrink:0,borderRadius:9,border:'none',background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:16,fontWeight:700}}>×</button>
                        )}
                      </div>
                    ))}
                    <button onClick={addPurchaseRow} style={{width:'100%',padding:'11px',borderRadius:10,border:'1.5px dashed #d4d3ce',background:'transparent',color:'#5f5e5a',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:2}}>
                      {ct('addExpenseRow',lang)}
                    </button>
                    {totalPurchasesNow>0 && (
                      <div style={{display:'flex',justifyContent:'space-between',marginTop:12,padding:'10px 12px',background:'#fef2f2',borderRadius:9,fontSize:12,fontWeight:700}}>
                        <span style={{color:'#dc2626'}}>{ct('totalWithdrawals',lang)}</span>
                        <span style={{color:'#dc2626',direction:'ltr' as const}}>{fmt(totalPurchasesNow)} {curr}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
    </>
  )
}
