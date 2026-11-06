'use client'
import { C } from './config'
import type { AiToolsPage } from './useAiTools'

export default function RealWasteReport({ m }: { m: AiToolsPage }) {
  const { realWasteReport, curr } = m
  return (
    <>
      {/* كشف الهدر الحقيقي */}
      {realWasteReport && (
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:'1.5px solid #fecaca'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#991b1b',marginBottom:4}}>🗑️ تقرير الهدر الحقيقي (آخر 30 يوم)</div>
          <div style={{fontSize:11,color:'#dc2626',marginBottom:16}}>من عمليات الهدر المسجّلة فعلياً من الموظفين (تالف، منتهي الصلاحية، كسر...)</div>

          {!realWasteReport.hasData ? (
            <div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:13}}>
              ما فيه أي هدر مسجّل خلال آخر 30 يوم 🎉<br/>
              <span style={{fontSize:11}}>يقدر الموظفون يسجّلون الهدر من صفحة "الصرف" → وضع "🗑️ تسجيل هدر"</span>
            </div>
          ) : (
            <>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                <div style={{background:'#fef2f2',borderRadius:10,padding:'12px',textAlign:'center' as const,border:'1px solid #fecaca'}}>
                  <div style={{fontSize:20,fontWeight:900,color:'#dc2626'}}>{realWasteReport.totalEstimatedCost?.toLocaleString()||0} {curr}</div>
                  <div style={{fontSize:10,color:'#991b1b',marginTop:2}}>القيمة التقديرية للهدر</div>
                </div>
                <div style={{background:'#fef2f2',borderRadius:10,padding:'12px',textAlign:'center' as const,border:'1px solid #fecaca'}}>
                  <div style={{fontSize:20,fontWeight:900,color:'#dc2626'}}>{realWasteReport.totalWasteEntries}</div>
                  <div style={{fontSize:10,color:'#991b1b',marginTop:2}}>عدد عمليات الهدر</div>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                {(realWasteReport.report||[]).map((r:any,i:number)=>(
                  <div key={i} style={{padding:'12px 14px',background:'#fef2f2',borderRadius:10,border:'1px solid #fecaca'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{fontSize:13,fontWeight:800,color:'#991b1b'}}>{r.name}</div>
                      {r.estimatedCost!==null && <span style={{fontSize:12,fontWeight:800,color:'#dc2626'}}>{r.estimatedCost.toLocaleString()} {curr}</span>}
                    </div>
                    <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>
                      الكمية: <b style={{color:'#374151'}}>{r.totalQty} {r.unit}</b>
                      {r.topReason && <span> · السبب الأكثر: <b style={{color:'#dc2626'}}>{r.topReason}</b></span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
