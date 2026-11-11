'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { C } from './config'
import type { AiToolsPage } from './useAiTools'
import { unitFor } from '@/lib/arabicCount'

export default function RealWasteReport({ m }: { m: AiToolsPage }) {
  const { realWasteReport, curr } = m
  return (
    <>
      {/* كشف الهدر الحقيقي */}
      {realWasteReport && (
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:'1.5px solid #fecaca'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#991b1b',marginBottom:4}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><FeatureIcon name="🗑️" size={15} /></span> تقرير الهدر الحقيقي (آخر 30 يوم)</div>
          <div style={{fontSize:11,color:'#dc2626',marginBottom:16}}>من عمليات الهدر المسجّلة فعلياً من الموظفين (تالف، منتهي الصلاحية، كسر...)</div>

          {!realWasteReport.hasData ? (
            <div style={{textAlign:'center',padding:'24px',color:'var(--storely-subtle)',fontSize:13}}>
              لا يوجد أي هدر مسجّل خلال آخر 30 يوماً<br/>
              <span style={{fontSize:11}}>يمكن للموظفين تسجيل الهدر من صفحة "الصرف" → وضع "تسجيل هدر"</span>
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
                    <div style={{fontSize:11,color:'var(--storely-subtle)',marginTop:4}}>
                      الكمية: <b style={{color:'var(--storely-text)'}}>{r.totalQty} {unitFor(r.totalQty, r.unit)}</b>
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
