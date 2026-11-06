'use client'
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
              <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>📊 مقارنة أسعار الموردين</div>
              <button onClick={()=>setShowPriceComparison(false)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'}}>✕</button>
            </div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:16}}>بناءً على آخر 6 أشهر من سجل مشترياتك</div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
              {priceComparisons.map((c,i)=>(
                <div key={i} style={{border:'1px solid #e2e8f0',borderRadius:12,padding:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{c.name}</span>
                    {c.savingsPct>0&&(
                      <span style={{fontSize:10,fontWeight:800,color:'#029FA2',background:'#f0fdfa',padding:'2px 8px',borderRadius:99,border:'1px solid #99f6e4'}}>
                        وفّر حتى {c.savingsPct}%
                      </span>
                    )}
                  </div>
                  <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                    {c.suppliers.map((s:any,si:number)=>(
                      <div key={si} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',background:si===0?'#f0fdfa':'#f8fafc',borderRadius:8,border:si===0?'1px solid #99f6e4':'1px solid #e2e8f0'}}>
                        <span style={{fontSize:12,fontWeight:600,color:'#334155'}}>{si===0&&'🟢 '}{s.supplier}</span>
                        <span style={{fontSize:12,fontWeight:800,color:si===0?'#029FA2':'#64748b'}}>{s.unitPrice} {curr||'⃁'} / {s.unit||'وحدة'}</span>
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
