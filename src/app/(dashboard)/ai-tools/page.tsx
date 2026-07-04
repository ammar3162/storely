'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  text:'#111827', text2:'#374151', text3:'#6b7280', text4:'#9ca3af',
  bg:'#f9fafb', surface:'#ffffff', border:'#f3f4f6', border2:'#e5e7eb',
}

const TOOLS = [
  {
    href:'/purchase-suggestion',
    icon:'🛒',
    title:'اقتراح الشراء الذكي',
    desc:'يحسب الكمية المثلى لكل صنف بناءً على معدل الصرف الفعلي ويرسلها للمورد عبر واتساب',
    color:'#16a34a',
    bg:'#f0fdf4',
    border:'#bbf7d0',
    features:['حساب الكمية المثلى','إرسال للمورد واتساب','بناءً على 90 يوم صرف'],
  },
  {
    href:'/branch-compare',
    icon:'📊',
    title:'مقارنة الفروع',
    desc:'قارن أداء كل فرع من حيث الصرف والمشتريات والأصناف الناقصة',
    color:'#3b82f6',
    bg:'#eff6ff',
    border:'#bfdbfe',
    features:['مقارنة الصرف','أفضل الأصناف لكل فرع','تحليل أسبوعي وشهري'],
  },
]

export default function AIToolsPage() {
  const [weeklyReport, setWeeklyReport] = useState<any>(null)
  const [wasteReport, setWasteReport] = useState<any[]>([])
  const [wasteLoading, setWasteLoading] = useState(false)
  const [forecast, setForecast] = useState<any[]>([])
  const [forecastLoading, setForecastLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [seasonality, setSeasonality] = useState<any>(null)
  const [seasonLoading, setSeasonLoading] = useState(false)
  const [branchComp, setBranchComp] = useState<any[]>([])
  const [branchLoading, setBranchLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const router = useRouter()
  const [visible] = useState(true)

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:700,margin:'0 auto',opacity:visible?1:0,transition:'opacity .3s'}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.fu{animation:fadeUp .35s ease both}`}</style>

      {/* Header */}
      <div className="fu" style={{marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
          <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.primaryD})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
            ✨
          </div>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>أدوات الذكاء</h1>
            <p style={{fontSize:11,color:C.text3,margin:'3px 0 0'}}>أدوات تحليل ذكية مبنية على بيانات مخزونك الحقيقية</p>
          </div>
        </div>
      </div>

      {/* Tools */}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {TOOLS.map((tool,i)=>(
          <div key={i} className="fu" style={{animationDelay:`${i*.08}s`}}>
            <button onClick={()=>router.push(tool.href)}
              style={{width:'100%',background:'white',border:`1.5px solid ${tool.border}`,borderRadius:16,padding:'20px',cursor:'pointer',fontFamily:'inherit',textAlign:'right',transition:'all .2s',boxShadow:`0 2px 8px ${tool.color}10`}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow=`0 8px 24px ${tool.color}20`}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.boxShadow=`0 2px 8px ${tool.color}10`}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                <div style={{width:52,height:52,borderRadius:14,background:tool.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0,border:`1px solid ${tool.border}`}}>
                  {tool.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:6}}>{tool.title}</div>
                  <div style={{fontSize:13,color:C.text3,lineHeight:1.6,marginBottom:12}}>{tool.desc}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {tool.features.map((f,j)=>(
                      <span key={j} style={{background:tool.bg,color:tool.color,fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:99,border:`1px solid ${tool.border}`}}>
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>
                <svg width="16" height="16" fill="none" stroke={tool.color} strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:4}}>
                  <path d="M15 19l-7-7 7-7"/>
                </svg>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* توقع نفاد المخزون */}
      <div className="fu" style={{marginTop:16,background:C.surface,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>🔮 توقع نفاد المخزون</div>
            <div style={{fontSize:11,color:C.text3,marginTop:2}}>يحسب متى سينفد كل منتج بناءً على معدل الصرف</div>
          </div>
          <button onClick={async()=>{
            const orgId=sessionStorage.getItem('s_org_id')
            if(!orgId) return
            setForecastLoading(true)
            const res=await fetch('/api/stock-forecast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
            const data=await res.json()
            setForecast(data.forecast||[])
            setForecastLoading(false)
          }} style={{padding:'8px 16px',background:C.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            {forecastLoading?'⏳ جاري...':'تحليل المخزون'}
          </button>
        </div>

        {forecast.length>0 && (
          <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
            {forecast.map((p:any,i:number)=>(
              <div key={i} style={{padding:'12px 14px',borderRadius:10,background:
                p.status==='critical'?'#fef2f2':
                p.status==='warning'?'#fffbeb':
                p.status==='watch'?'#eff6ff':'#f0fdf4',
                border:`1px solid ${
                  p.status==='critical'?'#fecaca':
                  p.status==='warning'?'#fde68a':
                  p.status==='watch'?'#bfdbfe':'#bbf7d0'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.text}}>{p.name}</div>
                  <span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:99,background:
                    p.status==='critical'?'#fee2e2':
                    p.status==='warning'?'#fde68a':
                    p.status==='watch'?'#bfdbfe':'#bbf7d0',
                    color:
                    p.status==='critical'?'#dc2626':
                    p.status==='warning'?'#d97706':
                    p.status==='watch'?'#2563eb':'#16a34a'}}>
                    {p.status==='critical'?'🔴 حرج':p.status==='warning'?'🟡 تحذير':p.status==='watch'?'🔵 مراقبة':'🟢 آمن'}
                  </span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,textAlign:'center'}}>
                  <div style={{background:'white',borderRadius:6,padding:'6px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:C.text}}>{p.currentQty} {p.unit}</div>
                    <div style={{fontSize:9,color:C.text4}}>المخزون</div>
                  </div>
                  <div style={{background:'white',borderRadius:6,padding:'6px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#7c3aed'}}>{p.avgQtyPerDispense} {p.unit}</div>
                    <div style={{fontSize:9,color:C.text4}}>كمية الصرفة</div>
                  </div>
                  <div style={{background:'white',borderRadius:6,padding:'6px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#2563eb'}}>كل {p.avgDaysBetween} يوم</div>
                    <div style={{fontSize:9,color:C.text4}}>تكرار الصرف</div>
                  </div>
                  <div style={{background:p.status==='critical'?'#fee2e2':p.status==='warning'?'#fef3c7':'#f0fdf4',borderRadius:6,padding:'6px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:p.status==='critical'?'#dc2626':p.status==='warning'?'#d97706':'#16a34a'}}>
                      {p.daysLeft===null?'∞':p.daysLeft+' يوم'}
                    </div>
                    <div style={{fontSize:9,color:C.text4}}>وقت النفاد</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* اقتراح كميات الشراء */}
      <div className="fu" style={{marginTop:16,background:C.surface,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>🛒 اقتراح كميات الشراء</div>
            <div style={{fontSize:11,color:C.text3,marginTop:2}}>بناءً على معدل الاستهلاك يقترح كم تشتري</div>
          </div>
          <button onClick={async()=>{
            const orgId=sessionStorage.getItem('s_org_id')
            if(!orgId) return
            setSuggestLoading(true)
            const res=await fetch('/api/purchase-suggestion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
            const data=await res.json()
            setSuggestions(data.suggestions||[])
            setSuggestLoading(false)
          }} style={{padding:'8px 16px',background:'#2563eb',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            {suggestLoading?'⏳ جاري...':'احسب الاحتياج'}
          </button>
        </div>

        {suggestions.length>0 && (
          <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:8,padding:'6px 12px'}}>
              {['المنتج','المخزون','يومي','أسبوعي','اشترِ الآن'].map((h,i)=>(
                <div key={i} style={{fontSize:10,fontWeight:700,color:C.text4,textAlign:i>0?'center':'right'}}>{h}</div>
              ))}
            </div>
            {suggestions.map((p:any,i:number)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:8,padding:'10px 12px',borderRadius:10,background:
                p.urgency==='urgent'?'#fef2f2':p.urgency==='soon'?'#fffbeb':'#f8fafc',
                border:`1px solid ${p.urgency==='urgent'?'#fecaca':p.urgency==='soon'?'#fde68a':'#e2e8f0'}`}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.text}}>{p.name}</div>
                  <div style={{fontSize:10,color:C.text4}}>نقطة الطلب: {p.reorderPoint} {p.unit}</div>
                </div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:C.text}}>{p.currentQty} {p.unit}</div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#7c3aed'}}>{p.dailyRate}</div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#2563eb'}}>{p.weeklyNeed}</div>
                <div style={{textAlign:'center',fontSize:14,fontWeight:900,color:
                  p.urgency==='urgent'?'#dc2626':p.urgency==='soon'?'#d97706':'#16a34a'}}>
                  {p.suggestedQty} {p.unit}
                </div>
              </div>
            ))}
            <div style={{fontSize:11,color:C.text4,textAlign:'center',marginTop:4}}>
              * المقترح يكفي أسبوعين بناءً على معدل صرفك الشهري
            </div>
          </div>
        )}
      </div>

      {/* تحليل الموسمية */}
      <div className="fu" style={{marginTop:16,background:C.surface,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>📈 تحليل الموسمية</div>
            <div style={{fontSize:11,color:C.text3,marginTop:2}}>يكتشف أيام وأوقات الذروة خلال آخر 90 يوم</div>
          </div>
          <button onClick={async()=>{
            const orgId=sessionStorage.getItem('s_org_id')
            if(!orgId) return
            setSeasonLoading(true)
            const res=await fetch('/api/seasonality',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
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
              <div style={{fontSize:12,fontWeight:700,color:C.text3,marginBottom:10}}>📅 الصرف حسب اليوم</div>
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
                <div style={{fontSize:12,fontWeight:700,color:'#7c3aed',marginBottom:4}}>💡 توصية</div>
                <div style={{fontSize:12,color:'#4c1d95',lineHeight:1.6}}>
                  يوم <b>{seasonality.peakDay.day}</b> هو أكثر أيامك صرفاً — تأكد من توفر مخزون كافٍ قبله
                  {seasonality.peakHour && <span> · وأكثر الأوقات نشاطاً هي <b>{seasonality.peakHour.label}</b></span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* مقارنة الفروع */}
      <div className="fu" style={{marginTop:16,background:C.surface,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>🏪 مقارنة الفروع</div>
            <div style={{fontSize:11,color:C.text3,marginTop:2}}>أي فرع يصرف أكثر وأيهم أكثر كفاءة</div>
          </div>
          <button onClick={async()=>{
            const orgId=sessionStorage.getItem('s_org_id')
            if(!orgId) return
            setBranchLoading(true)
            const res=await fetch('/api/branch-comparison',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
            const data=await res.json()
            setBranchComp(data.comparison||[])
            setBranchLoading(false)
          }} style={{padding:'8px 16px',background:'#0891b2',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            {branchLoading?'⏳ جاري...':'قارن الفروع'}
          </button>
        </div>

        {branchComp.length>0 && (
          <div style={{marginTop:12}}>
            {branchComp.length===1 ? (
              <div style={{textAlign:'center',padding:'20px',color:C.text4,fontSize:13}}>عندك فرع واحد فقط — أضف فروع لتفعيل المقارنة</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {branchComp.map((b:any,i:number)=>(
                  <div key={b.id} style={{padding:'14px',borderRadius:12,background:i===0?'#ecfdf5':'#f8fafc',border:`1.5px solid ${i===0?'#16a34a':'#e2e8f0'}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        {i===0&&<span style={{fontSize:16}}>🥇</span>}
                        {i===1&&<span style={{fontSize:16}}>🥈</span>}
                        {i===2&&<span style={{fontSize:16}}>🥉</span>}
                        <span style={{fontSize:14,fontWeight:800,color:C.text}}>{b.name}</span>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,background:i===0?'#16a34a':'#e2e8f0',color:i===0?'white':C.text3}}>
                        كفاءة {b.efficiency}%
                      </span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,textAlign:'center'}}>
                      <div style={{background:'white',borderRadius:8,padding:'8px'}}>
                        <div style={{fontSize:16,fontWeight:900,color:'#2563eb'}}>{b.dispensed}</div>
                        <div style={{fontSize:9,color:C.text4}}>وحدات صُرفت</div>
                      </div>
                      <div style={{background:'white',borderRadius:8,padding:'8px'}}>
                        <div style={{fontSize:16,fontWeight:900,color:'#16a34a'}}>{b.added}</div>
                        <div style={{fontSize:9,color:C.text4}}>وحدات أُضيفت</div>
                      </div>
                      <div style={{background:'white',borderRadius:8,padding:'8px'}}>
                        <div style={{fontSize:16,fontWeight:900,color:'#7c3aed'}}>{b.ops}</div>
                        <div style={{fontSize:9,color:C.text4}}>عمليات صرف</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coming soon */}
      <div className="fu" style={{marginTop:16,background:C.bg,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`,animationDelay:'.2s'}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text3,marginBottom:10}}>🔜 قريباً</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>♻️</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>كشف الهدر</div>
              <div style={{fontSize:11,color:C.text3}}>يكتشف ما تشتريه ولا تصرفه</div>
            </div>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setWasteLoading(true)
              const res=await fetch('/api/waste-detection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
              const data=await res.json()
              setWasteReport(data.waste||[])
              setWasteLoading(false)
            }} style={{padding:'6px 14px',background:'#f59e0b',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {wasteLoading?'⏳ جاري...':'كشف الهدر'}
            </button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>📅</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>التقرير الأسبوعي</div>
              <div style={{fontSize:11,color:C.text3}}>يُرسل كل أحد على واتساب تلقائياً</div>
            </div>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setReportLoading(true)
              const res=await fetch('/api/weekly-report-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
              const data=await res.json()
              setWeeklyReport(data)
              setReportLoading(false)
            }}
              style={{padding:'6px 14px',background:C.primary,color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {reportLoading?'⏳ جاري التحميل...':'عرض التقرير'}
            </button>
          </div>
        </div>
      </div>

      {/* كشف الهدر */}
      {wasteReport.length>0 && (
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:`1.5px solid #fde68a`}}>
          <div style={{fontSize:14,fontWeight:800,color:'#92400e',marginBottom:4}}>♻️ منتجات قد تكون هدراً</div>
          <div style={{fontSize:11,color:'#b45309',marginBottom:16}}>هذه المنتجات تم شراؤها لكن صرفها قليل جداً خلال آخر 30 يوم</div>
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
                    <div style={{fontSize:13,fontWeight:900,color:'#16a34a'}}>+{p.added}</div>
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
                  <span>المتوقع: {p.expectedEnd} {p.unit}</span>
                  <span>الفعلي: {p.endStock} {p.unit}</span>
                  <span style={{fontWeight:700,color:p.risk==='high'?'#dc2626':'#d97706'}}>نسبة الاستخدام: {p.usageRatio}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* التقرير الأسبوعي */}
      {weeklyReport && (
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:`1px solid ${C.border2}`}}>
          <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:16}}>📅 التقرير الأسبوعي</div>
          
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
              <div style={{fontSize:12,fontWeight:700,color:C.text3,marginBottom:10}}>🔥 أكثر المنتجات صرفاً هذا الأسبوع</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {weeklyReport.topProducts.slice(0,5).map((p:any,i:number)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:C.bg,borderRadius:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:11,fontWeight:800,color:i<3?C.primary:C.text4,width:16}}>{i+1}</span>
                      <span style={{fontSize:12,fontWeight:700,color:C.text}}>{p.name}</span>
                    </div>
                    <span style={{fontSize:12,fontWeight:800,color:C.primary}}>{p.qty} {p.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* منتجات ناقصة */}
          {weeklyReport.lowStockItems?.length>0 && (
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text3,marginBottom:10}}>⚠️ منتجات تحتاج إعادة طلب</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {weeklyReport.lowStockItems.slice(0,5).map((p:any,i:number)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#fef3c7',borderRadius:8,border:'1px solid #fde68a'}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#92400e'}}>{p.name}</span>
                    <span style={{fontSize:12,fontWeight:800,color:'#d97706'}}>{p.qty} {p.unit} متبقي</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
