'use client'
import NumberInput from '@/components/NumberInput'
import { ct } from './strings'
import { fmt } from './inputs'
import type { CashierClosing } from './useCashierClosing'
import { Receipt } from 'lucide-react'

export default function StepExpenses({ m }: { m: CashierClosing }) {
  const { lang, step, hasPurchases, setHasPurchases, purchases, curr, totalPurchasesNow, addPurchaseRow, removePurchaseRow, updatePurchase } = m
  return (
    <>
            {/* خطوة 2: المصاريف */}
            {step===2 && (
              <div className="fu" style={{background:'white',borderRadius:20,padding:16,marginBottom:16,border:'1px solid var(--storely-border)'}}>
                <div style={{fontSize:17,fontWeight:600,color:'var(--storely-text)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:28,height:28,borderRadius:12,background:'var(--storely-fill)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--storely-muted)'}}><Receipt size={16} strokeWidth={1.75}/></span>
                  {ct('step2Title',lang)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:hasPurchases==='yes'?16:0}}>
                  <button onClick={()=>setHasPurchases('no')} style={{padding:'11px',borderRadius:999,border:`1px solid ${hasPurchases==='no'?'#203640':'var(--storely-border)'}`,background:hasPurchases==='no'?'var(--storely-fill)':'white',color:hasPurchases==='no'?'#203640':'var(--storely-muted)',fontWeight:600,fontSize:15,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    {ct('no',lang)}
                  </button>
                  <button onClick={()=>setHasPurchases('yes')} style={{padding:'11px',borderRadius:999,border:`1px solid ${hasPurchases==='yes'?'#203640':'var(--storely-border)'}`,background:hasPurchases==='yes'?'var(--storely-fill)':'white',color:hasPurchases==='yes'?'#203640':'var(--storely-muted)',fontWeight:600,fontSize:15,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    {ct('yes',lang)}
                  </button>
                </div>

                {hasPurchases==='yes' && (
                  <div>
                    {purchases.map((p,idx)=>(
                      <div key={idx} style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',background:'var(--storely-fill)',padding:10,borderRadius:20,border:'1px solid var(--storely-border)'}}>
                        <div style={{flex:1}}>
                          <NumberInput value={p.amount} onChange={e=>updatePurchase(idx,'amount',e.target.value)} placeholder={ct('amountPh',lang)}
                            style={{width:'100%',padding:'10px 12px',border:'1px solid var(--storely-border)',borderRadius:12,fontSize:17,fontWeight:600,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'right'}}/>
                        </div>
                        <div style={{flex:1.4}}>
                          <input type="text" value={p.reason} onChange={e=>updatePurchase(idx,'reason',e.target.value)} placeholder={ct('reasonPh',lang)}
                            style={{width:'100%',padding:'10px 12px',border:'1px solid var(--storely-border)',borderRadius:12,fontSize:17,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                        </div>
                        {purchases.length>1 && (
                          <button onClick={()=>removePurchaseRow(idx)} style={{width:34,height:34,flexShrink:0,borderRadius:999,border:'none',background:'transparent',color:'var(--storely-muted)',cursor:'pointer',fontSize:17,fontWeight:600}}>×</button>
                        )}
                      </div>
                    ))}
                    <button onClick={addPurchaseRow} style={{width:'100%',padding:'11px',borderRadius:999,border:'1px dashed var(--storely-control-border)',background:'transparent',color:'var(--storely-text)',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:2}}>
                      {ct('addExpenseRow',lang)}
                    </button>
                    {totalPurchasesNow>0 && (
                      <div style={{display:'flex',justifyContent:'space-between',marginTop:12,padding:'10px 12px',background:'var(--storely-fill)',borderRadius:12,fontSize:17}}>
                        <span style={{color:'var(--storely-muted)'}}>{ct('totalWithdrawals',lang)}</span>
                        <span style={{color:'var(--storely-text)',fontVariantNumeric:'tabular-nums',direction:'ltr' as const}}>{fmt(totalPurchasesNow)} {curr}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
    </>
  )
}
