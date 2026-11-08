'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { C } from './config'
import type { AiToolsPage } from './useAiTools'

export default function Seasonality({ m }: { m: AiToolsPage }) {
  const { seasonality, setSeasonality, seasonLoading, setSeasonLoading } = m
  return (
    <>
      {/* تحليل الموسمية */}
      <div className="fu" style={{marginTop:16,background:C.surface,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>متى زحمتك؟</div>
            <div style={{fontSize:11,color:C.text3,marginTop:2}}>أكثر الأيام والأوقات صرفاً خلال آخر 90 يوماً — لتجهيز مخزونك وموظفيك مسبقاً</div>
          </div>
          <button onClick={async()=>{
            const orgId=sessionStorage.getItem('s_org_id')
            if(!orgId) return
            setSeasonLoading(true)
            const res=await fetch('/api/seasonality',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
            const data=await res.json()
            setSeasonality(data)
            setSeasonLoading(false)
          }} style={{padding:'8px 16px',background:'#7c3aed',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            {seasonLoading?'⏳ جاري...':'تحليل الموسمية'}
          </button>
        </div>

        {seasonality && (
          <div style={{marginTop:12}}>
            {/* أيام الذروة */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text3,marginBottom:10}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><FeatureIcon name="📅" size={15} /></span> الصرف حسب اليوم</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {(seasonality.byDay||[]).map((d:any,i:number)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:60,fontSize:12,fontWeight:700,color:i===0?'#7c3aed':C.text,flexShrink:0}}>{d.day}</div>
                    <div style={{flex:1,height:24,background:C.border,borderRadius:6,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${d.percent}%`,background:i===0?'#7c3aed':i<3?'#a78bfa':'#ddd6fe',borderRadius:6,display:'flex',alignItems:'center',paddingRight:8,transition:'width .6s'}}>
                        {d.percent>20&&<span style={{fontSize:10,fontWeight:700,color:'white'}}>{d.total}</span>}
                      </div>
                    </div>
                    <div style={{width:40,fontSize:11,fontWeight:700,color:C.text3,textAlign:'center'}}>{d.total}</div>
                    {i===0&&<span style={{fontSize:10,background:'#7c3aed',color:'white',padding:'1px 6px',borderRadius:99,whiteSpace:'nowrap'}}>ذروة</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* ساعات الذروة */}
            {(seasonality.byHour||[]).length>0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:C.text3,marginBottom:10}}>⏰ أوقات الذروة</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {(seasonality.byHour||[]).slice(0,5).map((h:any,i:number)=>(
                    <div key={i} style={{padding:'8px 14px',background:i===0?'#7c3aed':C.bg,borderRadius:10,textAlign:'center',border:`1px solid ${i===0?'#7c3aed':C.border2}`}}>
                      <div style={{fontSize:14,fontWeight:900,color:i===0?'white':C.text}}>{h.label}</div>
                      <div style={{fontSize:9,color:i===0?'rgba(255,255,255,.7)':C.text4}}>{h.total} وحدة</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* توصية */}
            {seasonality.peakDay && (
              <div style={{background:'#f5f3ff',borderRadius:10,padding:'12px 14px',border:'1px solid #ddd6fe'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#7c3aed',marginBottom:4}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><FeatureIcon name="💡" size={15} /></span> توصية</div>
                <div style={{fontSize:12,color:'#4c1d95',lineHeight:1.6}}>
                  يوم <b>{seasonality.peakDay.day}</b> هو أكثر أيامك صرفاً — تأكد من توفر مخزون كافٍ قبله
                  {seasonality.peakHour && <span> · وأكثر الأوقات نشاطاً هي <b>{seasonality.peakHour.label}</b></span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
