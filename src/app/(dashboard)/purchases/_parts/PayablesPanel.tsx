'use client'
import { Wallet } from 'lucide-react'
import { C } from './constants'
import type { PurchasesState } from './usePurchases'

export default function PayablesPanel({ m }: { m: PurchasesState }) {
  const { payables, showPayables, setShowPayables, payingId, curr, todayRiyadh, markPaid } = m
  return (
    <>
        {/* Payables — المستحقات للموردين */}
        {payables.length>0 && (() => {
          const todayStr = todayRiyadh()
          const totalOwed = payables.reduce((s:number,p:any)=>s+(p.total_amount||0),0)
          const overdueCount = payables.filter((p:any)=>p.due_date && p.due_date < todayStr).length
          const bySupplier: Record<string, any[]> = {}
          payables.forEach((p:any)=>{ const k=p.supplier||'—'; (bySupplier[k]=bySupplier[k]||[]).push(p) })
          return (
            <div className="u" style={{background:'white',borderRadius:12,border:`1px solid ${overdueCount>0?C.dangerB:C.border}`,overflow:'hidden',marginBottom:14,animationDelay:'.06s'}}>
              <button onClick={()=>setShowPayables(v=>!v)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:overdueCount>0?C.dangerL:C.bg,border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <Wallet size={16} color={C.text3}/>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontWeight:800,color:overdueCount>0?C.danger:C.text}}>{payables.length} فاتورة غير مدفوعة — {totalOwed.toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:0})} {curr}</div>
                    {overdueCount>0 && <div style={{fontSize:11,color:C.danger,fontWeight:700,marginTop:2}}>{overdueCount} متأخرة عن موعد الاستحقاق</div>}
                  </div>
                </div>
                <span style={{fontSize:12,color:C.text3,transform:showPayables?'rotate(180deg)':'none',transition:'transform .2s'}}>▾</span>
              </button>
              {showPayables && (
                <div style={{padding:'10px 14px 14px',display:'flex',flexDirection:'column' as const,gap:10}}>
                  {Object.entries(bySupplier).map(([supplierName, items]) => {
                    const subtotal = items.reduce((s,p)=>s+(p.total_amount||0),0)
                    return (
                      <div key={supplierName} style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
                        <div style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:C.bg,fontSize:12,fontWeight:700,color:C.text}}>
                          <span>{supplierName}</span>
                          <span>{subtotal.toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:0})} {curr}</span>
                        </div>
                        {items.map((p:any)=>{
                          const isOverdue = p.due_date && p.due_date < todayStr
                          const isSoon = p.due_date && !isOverdue && p.due_date <= new Date(Date.now()+3*86400000).toISOString().slice(0,10)
                          return (
                            <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',borderTop:`1px solid ${C.border}`,fontSize:11}}>
                              <div>
                                <div style={{color:C.text2,fontWeight:600}}>{p.name||'—'}</div>
                                {p.due_date && (
                                  <div style={{color:isOverdue?C.danger:isSoon?C.warning:C.text4,fontWeight:isOverdue||isSoon?700:500,marginTop:2}}>
                                    {isOverdue?'متأخرة — ':''}استحقاق: {p.due_date}
                                  </div>
                                )}
                              </div>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <span style={{fontWeight:700,color:C.text}}>{(p.total_amount||0).toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:0})} {curr}</span>
                                <button onClick={()=>markPaid(p.id)} disabled={payingId===p.id}
                                  style={{padding:'4px 10px',borderRadius:7,border:`1px solid ${C.primaryB}`,background:C.primaryL,color:C.primary,fontSize:10,fontWeight:700,cursor:payingId===p.id?'not-allowed':'pointer',fontFamily:'inherit',opacity:payingId===p.id?.6:1}}>
                                  {payingId===p.id?'...':'دُفعت'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}
    </>
  )
}
