'use client'
import { riyal } from '@/lib/aiPhrases'
import { C } from './config'
import type { AiToolsPage } from './useAiTools'

export default function WasteReport({ m }: { m: AiToolsPage }) {
  const { wasteReport, curr } = m
  return (
    <>
      {/* كشف الهدر */}
      {wasteReport.length>0 && (
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:`1.5px solid #fde68a`}}>
          <div style={{fontSize:14,fontWeight:800,color:'#92400e',marginBottom:4}}>🐌 مخزون راكد بطيء الحركة</div>
          <div style={{fontSize:11,color:'#b45309',marginBottom:16}}>هذه المنتجات تم شراؤها لكن صرفها قليل جداً خلال آخر 30 يوم — قد تكون هدراً أو مجرد صنف موسمي</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {wasteReport.map((p:any,i:number)=>(
              <div key={i} style={{padding:'12px 14px',background:p.risk==='high'?'#fef2f2':'#fffbeb',borderRadius:10,border:`1px solid ${p.risk==='high'?'#fecaca':'#fde68a'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:800,color:p.risk==='high'?'#991b1b':'#92400e'}}>{p.name}</div>
                  <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99,background:p.risk==='high'?'#fee2e2':'#fde68a',color:p.risk==='high'?'#dc2626':'#d97706'}}>
                    {p.risk==='high'?'خطر عالي':'خطر متوسط'}
                  </span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,textAlign:'center'}}>
                  <div style={{background:'white',borderRadius:6,padding:'6px 4px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#374151'}}>{p.startStock}</div>
                    <div style={{fontSize:9,color:'#9ca3af'}}>أول المدة</div>
                  </div>
                  <div style={{background:'white',borderRadius:6,padding:'6px 4px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#029FA2'}}>+{p.added}</div>
                    <div style={{fontSize:9,color:'#9ca3af'}}>أُضيف</div>
                  </div>
                  <div style={{background:'white',borderRadius:6,padding:'6px 4px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#2563eb'}}>-{p.dispensed}</div>
                    <div style={{fontSize:9,color:'#9ca3af'}}>صُرف</div>
                  </div>
                  <div style={{background:p.risk==='high'?'#fee2e2':'#fef3c7',borderRadius:6,padding:'6px 4px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:p.risk==='high'?'#dc2626':'#d97706'}}>{p.wasteQty} {p.unit}</div>
                    <div style={{fontSize:9,color:'#9ca3af'}}>هدر محتمل</div>
                  </div>
                </div>
                <div style={{marginTop:8,display:'flex',justifyContent:'space-between',fontSize:11,color:'#9ca3af'}}>
                  <span>الهدر: {p.wasteQty} {p.unit}{riyal(p.estimatedValue,curr)?` · قيمته ${riyal(p.estimatedValue,curr)}`:''}</span>
                  <span>الفعلي: {p.endStock} {p.unit}</span>
                  <span style={{fontWeight:700,color:p.risk==='high'?'#dc2626':'#d97706'}}>نسبة الاستخدام: {p.usageRatio}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
