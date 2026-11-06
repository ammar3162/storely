'use client'
import type { AiToolsPage } from './useAiTools'

export default function SmartInsights({ m }: { m: AiToolsPage }) {
  const { insights, insightsLoading, insightsError, runSmartInsights } = m
  return (
    <>
      {/* التحليل الذكي الشامل */}
      <div className="fu" style={{marginBottom:20,background:'linear-gradient(135deg,#042f2e,#0C213B)',borderRadius:18,padding:22}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:insights||insightsError?16:0,flexWrap:'wrap' as const,gap:10}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'white',marginBottom:4}}>🧠 التحليل الذكي الشامل</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.65)'}}>تقرير تنفيذي كامل يحلل كل بياناتك بضغطة وحدة</div>
          </div>
          <button onClick={runSmartInsights} disabled={insightsLoading}
            style={{padding:'11px 22px',background:'white',color:'#042f2e',border:'none',borderRadius:11,fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
            {insightsLoading?'⏳ جاري التحليل...':insights?'🔄 تحليل جديد':'✨ حلّل بياناتي الآن'}
          </button>
        </div>

        {insightsError && (
          <div style={{background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#fca5a5'}}>
            ⚠️ {insightsError}
          </div>
        )}

        {insights && (
          <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
            <div style={{background:'rgba(255,255,255,.08)',borderRadius:12,padding:16}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:800,padding:'3px 10px',borderRadius:99,background:insights.status==='صحي'?'#029FA2':insights.status==='خطر'?'#dc2626':'#f59e0b',color:'white'}}>{insights.status}</span>
                <span style={{fontSize:12,fontWeight:800,color:'white'}}>الملخص التنفيذي</span>
              </div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.85)',lineHeight:1.9}}>{insights.summary}</div>
            </div>

            {insights.risks?.length>0 && (
              <div style={{background:'rgba(255,255,255,.06)',borderRadius:12,padding:16}}>
                <div style={{fontSize:12,fontWeight:800,color:'#fca5a5',marginBottom:10}}>🚨 أهم المخاطر الآنية</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                  {insights.risks.map((r:any,i:number)=>(
                    <div key={i} style={{fontSize:11,color:'rgba(255,255,255,.85)',lineHeight:1.7}}>
                      <span style={{fontWeight:700}}>• {r.title}</span>{r.severity && <span style={{fontSize:9,marginRight:6,padding:'1px 7px',borderRadius:99,background:r.severity==='عالية'?'rgba(220,38,38,.3)':'rgba(245,158,11,.3)',color:r.severity==='عالية'?'#fca5a5':'#fcd34d'}}>{r.severity}</span>}
                      <div style={{color:'rgba(255,255,255,.6)',marginRight:10}}>{r.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.savings?.length>0 && (
              <div style={{background:'rgba(255,255,255,.06)',borderRadius:12,padding:16}}>
                <div style={{fontSize:12,fontWeight:800,color:'#5eead4',marginBottom:10}}>💰 فرص توفير التكلفة</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                  {insights.savings.map((s:any,i:number)=>(
                    <div key={i} style={{fontSize:11,color:'rgba(255,255,255,.85)',lineHeight:1.7}}>
                      <span style={{fontWeight:700}}>• {s.title}</span>
                      <div style={{color:'rgba(255,255,255,.6)',marginRight:10}}>{s.detail}{s.estimatedImpact?` — ${s.estimatedImpact}`:''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.trends?.length>0 && (
              <div style={{background:'rgba(255,255,255,.06)',borderRadius:12,padding:16}}>
                <div style={{fontSize:12,fontWeight:800,color:'#93c5fd',marginBottom:10}}>📈 اتجاهات الأداء</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                  {insights.trends.map((t:any,i:number)=>(
                    <div key={i} style={{fontSize:11,color:'rgba(255,255,255,.85)',lineHeight:1.7}}>
                      <span style={{fontWeight:700}}>• {t.title}</span>
                      <div style={{color:'rgba(255,255,255,.6)',marginRight:10}}>{t.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.recommendations?.length>0 && (
              <div style={{background:'rgba(255,255,255,.08)',borderRadius:12,padding:16}}>
                <div style={{fontSize:12,fontWeight:800,color:'#fde68a',marginBottom:10}}>✅ توصيات عملية</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                  {insights.recommendations.map((r:any,i:number)=>(
                    <div key={i} style={{fontSize:11,color:'rgba(255,255,255,.85)',lineHeight:1.7}}>
                      <span style={{fontWeight:700}}>{i+1}. {r.title}</span>
                      <div style={{color:'rgba(255,255,255,.6)',marginRight:14}}>{r.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
