'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { C } from './config'
import type { AiToolsPage } from './useAiTools'
import { unitFor } from '@/lib/arabicCount'

export default function WeeklyReport({ m }: { m: AiToolsPage }) {
  const { weeklyReport } = m
  return (
    <>
      {/* التقرير الأسبوعي */}
      {weeklyReport && (
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:`1px solid ${C.border2}`}}>
          <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:16}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><FeatureIcon name="📅" size={15} /></span> التقرير الأسبوعي</div>
          
          {/* إحصائيات سريعة */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
            <div style={{background:C.bg,borderRadius:10,padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:900,color:C.primary}}>{weeklyReport.totalDispensed||0}</div>
              <div style={{fontSize:10,color:C.text3,marginTop:2}}>إجمالي الصرف</div>
            </div>
            <div style={{background:C.bg,borderRadius:10,padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:900,color:'#f59e0b'}}>{weeklyReport.lowStock||0}</div>
              <div style={{fontSize:10,color:C.text3,marginTop:2}}>منتجات ناقصة</div>
            </div>
            <div style={{background:C.bg,borderRadius:10,padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:900,color:'#2563eb'}}>{weeklyReport.totalProducts||0}</div>
              <div style={{fontSize:10,color:C.text3,marginTop:2}}>إجمالي الأصناف</div>
            </div>
          </div>

          {/* أكثر المنتجات صرفاً */}
          {weeklyReport.topProducts?.length>0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text3,marginBottom:10}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><FeatureIcon name="🔥" size={15} /></span> أكثر المنتجات صرفاً هذا الأسبوع</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {weeklyReport.topProducts.slice(0,5).map((p:any,i:number)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:C.bg,borderRadius:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:11,fontWeight:800,color:i<3?C.primary:C.text4,width:16}}>{i+1}</span>
                      <span style={{fontSize:12,fontWeight:700,color:C.text}}>{p.name}</span>
                    </div>
                    <span style={{fontSize:12,fontWeight:800,color:C.primary}}>{p.qty} {unitFor(p.qty, p.unit)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* منتجات ناقصة */}
          {weeklyReport.lowStockItems?.length>0 && (
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text3,marginBottom:10}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><FeatureIcon name="⚠️" size={15} /></span> منتجات تحتاج إعادة طلب</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {weeklyReport.lowStockItems.slice(0,5).map((p:any,i:number)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#fef3c7',borderRadius:8,border:'1px solid #fde68a'}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#92400e'}}>{p.name}</span>
                    <span style={{fontSize:12,fontWeight:800,color:'#d97706'}}>{p.qty} {unitFor(p.qty, p.unit)} متبقي</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
