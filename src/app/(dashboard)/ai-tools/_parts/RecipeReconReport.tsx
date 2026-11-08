'use client'
import { formatQty } from '@/lib/recipeUnits'
import { AlertTriangle, Wallet, Info } from 'lucide-react'
import { C } from './config'
import type { AiToolsPage } from './useAiTools'

export default function RecipeReconReport({ m }: { m: AiToolsPage }) {
  const { recipeReconReport, reconFrom, reconTo } = m
  return (
    <>
      {recipeReconReport && (
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:'1.5px solid #ddd6fe'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#5b21b6',marginBottom:4}}>تقدير الإنتاج ({reconFrom||reconTo ? `${reconFrom||'البداية'} إلى ${reconTo||'اليوم'}` : 'آخر 30 يوم'})</div>
          <div style={{fontSize:11,color:'#7c3aed',marginBottom:16}}>{recipeReconReport.method==='count'?'محسوب من الفرق بين الجرد الفعلي أول وآخر الفترة':'محسوب من الصرف المسجّل للمواد الخام'} ÷ كمية كل مكوّن بالوصفة. الرقم تقديري ومقرّب للأقل</div>

          {!recipeReconReport.hasData ? (
            <div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:13}}>
              لا توجد أي وصفة معرّفة بعد<br/>
              <span style={{fontSize:11}}>اضغط "+ وصفة جديدة" وأضف اسمها ومكوناتها أولاً</span>
            </div>
          ) : (
            <>
              {(()=>{
                const grandTotal = recipeReconReport.recipes.reduce((s:number,r:any)=>s+(r.totalCost||0),0)
                return grandTotal>0 && (
                  <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:10,padding:'12px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#115e59',display:'flex',alignItems:'center',gap:6}}><Wallet size={14}/>إجمالي تكلفة الإنتاج التقديرية</span>
                    <span style={{fontSize:18,fontWeight:900,color:'#029FA2'}}>{grandTotal.toFixed(2)} ⃁</span>
                  </div>
                )
              })()}
            <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
              {recipeReconReport.recipes.map((r:any)=>(
                <div key={r.id} style={{background:C.bg,border:`1px solid ${C.border2}`,borderRadius:10,padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.text}}>{r.name}</span>
                    <span style={{fontSize:16,fontWeight:900,color:'#7c3aed'}}>{r.basis==='shared'?'حتى ':''}{r.estimatedProduced} وحدة</span>
                  </div>
                  {r.totalCost!==null && r.totalCost!==undefined && (
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,background:'#f0fdfa',borderRadius:7,padding:'6px 10px'}}>
                      <span style={{fontSize:10,color:'#115e59'}}>تكلفة الوحدة: {Number(r.costPerUnit).toFixed(2)} ⃁</span>
                      <span style={{fontSize:12,fontWeight:800,color:'#029FA2'}}>الإجمالي: {Number(r.totalCost).toFixed(2)} ⃁</span>
                    </div>
                  )}
                  {r.basis==='shared' && (
                    <div style={{fontSize:10,color:'#475569',background:'#f1f5f9',borderRadius:7,padding:'6px 10px',marginBottom:8,display:'flex',gap:6,alignItems:'flex-start'}}><Info size={12} style={{flexShrink:0,marginTop:2}}/>جميع مكوّنات هذه الوصفة مستخدمة في وصفات أخرى، لذا يمثّل الرقم حداً أعلى. أضف مكوّناً خاصاً بها (مثل الكوب أو العلبة) ليكون التقدير أدق</div>
                  )}
                  {r.basis==='none' && (
                    <div style={{fontSize:10,color:'#475569',marginBottom:8}}>{recipeReconReport.method==='count'?'لا يوجد جردان لمكوّنات هذه الوصفة خلال الفترة — أجرِ جرداً من صفحة المخزون في بداية الفترة ونهايتها':'لا يوجد صرف مسجّل لمكوّنات هذه الوصفة خلال الفترة'}</div>
                  )}
                  {r.bottleneckName && r.basis!=='none' && (
                    <div style={{fontSize:10,color:'#b45309',marginBottom:8,display:'flex',gap:5,alignItems:'center'}}><AlertTriangle size={12}/>التقدير مبني على: {r.bottleneckName} (أقل مكوّن صرفاً نسبةً لكميته بالوصفة)</div>
                  )}
                  {r.components.length>0 ? (
                    <div style={{display:'flex',flexDirection:'column' as const,gap:4}}>
                      {r.components.map((c:any,i:number)=>{
                        const isBottleneck = c.name===r.bottleneckName
                        return (
                          <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:10,color:isBottleneck?'#b45309':c.untracked?'#94a3b8':C.text4,fontWeight:isBottleneck?700:400}}>
                            <span>{c.name}{c.shared?' (مشترك)':''}: {recipeReconReport.method==='count'?'استُهلك':'صُرف'} {formatQty(c.consumed,c)} · بالوصفة {formatQty(c.qtyPerUnit,c)}</span>
                            <span>{c.untracked ? (recipeReconReport.method==='count'?'ليس له جردان — مستثنى':'لا يُصرف عبر النظام — مستثنى') : `يكفي لـ ${c.impliedCount} وحدة`}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{fontSize:10,color:C.text4}}>هذه الوصفة بدون مكوّنات بعد</div>
                  )}
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
