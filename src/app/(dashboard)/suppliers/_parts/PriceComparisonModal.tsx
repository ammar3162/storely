'use client'
import { X } from 'lucide-react'
import type { SuppliersPageState } from './useSuppliersPage'

export default function PriceComparisonModal({ m }: { m: SuppliersPageState }) {
  const { curr, priceComparisons, showPriceComparison, setShowPriceComparison } = m
  return (
    <>
      {/* نافذة مقارنة الأسعار */}
      {showPriceComparison && (
        <div style={{position:'fixed',inset:0,zIndex:3000,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={()=>setShowPriceComparison(false)}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:560,maxHeight:'80vh',overflowY:'auto' as const,padding:20}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <div style={{fontSize:15,fontWeight:800,color:'#203640'}}>مقارنة أسعار الموردين</div>
              <button onClick={()=>setShowPriceComparison(false)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#687985'}}><X size={18}/></button>
            </div>
            <div style={{fontSize:11,color:'#66737C',marginBottom:16}}>بناءً على آخر 6 أشهر من سجل مشترياتك</div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
              {priceComparisons.map((c,i)=>(
                <div key={i} style={{border:'1px solid #E2E7EA',borderRadius:12,padding:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#203640'}}>{c.name}</span>
                    {c.savingsPct>0&&(
                      <span style={{fontSize:10,fontWeight:800,color:'#203640',background:'#F7F9FA',padding:'2px 8px',borderRadius:99,border:'1px solid #E2E7EA'}}>
                        وفّر حتى {c.savingsPct}%
                      </span>
                    )}
                  </div>
                  <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                    {c.suppliers.map((s:any,si:number)=>(
                      <div key={si} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',background:si===0?'#F7F9FA':'#F7F9FA',borderRadius:8,border:si===0?'1px solid #E2E7EA':'1px solid #E2E7EA'}}>
                        <span style={{fontSize:12,fontWeight:600,color:'#203640'}}>{s.supplier}{si===0&&<span className="storely-badge" data-status="success" style={{marginInlineStart:6,minHeight:22,padding:'0 6px'}}>الأرخص</span>}</span>
                        <span style={{fontSize:12,fontWeight:800,color:si===0?'#203640':'#66737C'}}>{s.unitPrice} {curr||'⃁'} / {s.unit||'وحدة'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
