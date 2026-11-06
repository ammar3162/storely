'use client'
import { C } from './constants'
import type { PurchasesState } from './usePurchases'

export default function PurchaseStats({ m }: { m: PurchasesState }) {
  const { curr, filteredHistory, totalSpent, totalVat, totalNet } = m
  return (
    <>
      {/* Stats */}
      <div className="u" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8,marginBottom:16,animationDelay:'.04s'}}>
        {[
          {label:'الفواتير',   value:filteredHistory.length,       color:C.info},
          {label:'بدون ضريبة',value:totalNet.toFixed(0)+' '+curr,   color:C.text},
          {label:'ضريبة 15%', value:totalVat.toFixed(0)+' '+curr,   color:C.warning},
          {label:'الإجمالي',  value:totalSpent.toFixed(0)+' '+curr, color:C.primary},
        ].map((s,i)=>(
          <div key={i} style={{background:'white',borderRadius:12,padding:'12px 14px',border:`1px solid ${C.border}`,boxShadow:'0 1px 3px rgba(15,23,42,.04),0 1px 2px rgba(15,23,42,.03)'}}>
            <div style={{fontSize:11,color:C.text4,fontWeight:600,marginBottom:5}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
          </div>
        ))}
      </div>
    </>
  )
}
