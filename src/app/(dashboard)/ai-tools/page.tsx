'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { currencySymbol } from '@/lib/currencySymbol'
import { createClient } from '@/lib/supabase/client'
import { colors as dsColors } from '@/lib/ds'
import { toast } from '@/components/toast'

// موحّد مع نظام التصميم المشترك (@/lib/ds)
const C = {
  primary:dsColors.primary, primaryD:dsColors.primaryDark, primaryL:dsColors.primaryLight, primaryB:dsColors.primaryBorder,
  text:dsColors.text, text2:dsColors.text2, text3:dsColors.text3, text4:dsColors.text4,
  bg:dsColors.bg, surface:dsColors.surface, border:dsColors.border, border2:dsColors.border2,
}

const TOOLS = [
  {
    href:'/purchases',
    icon:'📸',
    title:'مسح الفواتير بالذكاء الاصطناعي',
    desc:'صوّر فاتورة الشراء، ودع الذكاء الاصطناعي يستخرج المورد والأصناف والمبلغ تلقائياً',
    color:'#f97316',
    bg:'#fff7ed',
    border:'#fed7aa',
    features:['استخراج تلقائي للبيانات','دعم فواتير متعددة الأصناف','تحديث المخزون فوراً'],
    minPlan:'basic',
  },
  {
    href:'/purchase-suggestion',
    icon:'🛒',
    title:'اقتراح الشراء الذكي',
    desc:'يحسب الكمية المثلى لكل صنف بناءً على معدل الصرف الفعلي ويرسلها للمورد عبر واتساب',
    color:'#16a34a',
    bg:'#f0fdf4',
    border:'#bbf7d0',
    features:['حساب الكمية المثلى','إرسال للمورد واتساب','بناءً على 90 يوم صرف'],
    minPlan:'pro',
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
    minPlan:'pro',
  },
]

function planAllows(userPlan:string, minPlan:string){
  const order = ['basic','pro','advanced']
  return order.indexOf(userPlan) >= order.indexOf(minPlan)
}

export default function AIToolsPage() {
  const [weeklyReport, setWeeklyReport] = useState<any>(null)
  const [wasteReport, setWasteReport] = useState<any[]>([])
  const [wasteLoading, setWasteLoading] = useState(false)
  const [realWasteReport, setRealWasteReport] = useState<any>(null)
  const [recipeReconReport, setRecipeReconReport] = useState<any>(null)
  const [reconLoading, setReconLoading] = useState(false)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [recipesList, setRecipesList] = useState<any[]>([])
  const [showRecipesList, setShowRecipesList] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string|null>(null)
  const [deletingRecipeId, setDeletingRecipeId] = useState<string|null>(null)

  async function loadRecipesList() {
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId) return
    const{data}=await (sb.from('recipes' as any) as any).select('id,name').eq('org_id',orgId).order('created_at',{ascending:false})
    setRecipesList(data||[])
  }

  async function deleteRecipe(id:string) {
    if(!confirm('حذف هذي الوصفة؟ هذا الإجراء لا يمكن التراجع عنه.')) return
    setDeletingRecipeId(id)
    const{error}=await (sb.from('recipes' as any) as any).delete().eq('id',id)
    setDeletingRecipeId(null)
    if(error){toast('فشل حذف الوصفة — حاول مرة أخرى','error');return}
    toast('✅ تم حذف الوصفة')
    setRecipesList(prev=>prev.filter(r=>r.id!==id))
  }

  async function openEditRecipe(id:string) {
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId) return
    const{data}=await sb.from('products').select('id,name,unit,recipe_unit,recipe_unit_factor').eq('org_id',orgId).eq('is_active',true)
    setRawMaterials(data||[])
    setEditingRecipeId(id)
    setShowRecipeModal(true)
  }
  const [realWasteLoading, setRealWasteLoading] = useState(false)
  const [reorderSuggestions, setReorderSuggestions] = useState<any>(null)
  const [reorderLoading, setReorderLoading] = useState(false)
  const [applyingId, setApplyingId] = useState<string|null>(null)
  const [forecast, setForecast] = useState<any[]>([])
  const [forecastLoading, setForecastLoading] = useState(false)
  const [smartTiming, setSmartTiming] = useState<any[]>([])
  const [smartTimingLoading, setSmartTimingLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [seasonality, setSeasonality] = useState<any>(null)
  const [seasonLoading, setSeasonLoading] = useState(false)
  const [branchComp, setBranchComp] = useState<any[]>([])
  const [branchLoading, setBranchLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const router = useRouter()
  const sb = createClient()
  const [curr, setCurr] = useState('ر.س')
  useEffect(()=>{
    const oid = sessionStorage.getItem('s_org_id')
    if(!oid) return
    sb.from('organizations' as any).select('currency').eq('id',oid).single()
      .then(({data}:any)=>{ if(data?.currency) setCurr(currencySymbol(data.currency)) })
  },[])

  async function applyReorderSuggestion(productId: string, newReorderPoint: number) {
    setApplyingId(productId)
    await (sb as any).from('products').update({ reorder_point: newReorderPoint }).eq('id', productId)
    setReorderSuggestions((prev: any) => ({
      ...prev,
      suggestions: prev.suggestions.filter((s: any) => s.id !== productId),
    }))
    setApplyingId(null)
  }
  const [visible] = useState(true)
  const plan = typeof window!=='undefined' ? (sessionStorage.getItem('s_plan')||'basic') : 'basic'

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
            <button onClick={()=>planAllows(plan,tool.minPlan)?router.push(tool.href):router.push('/settings')}
              style={{width:'100%',background:'white',border:`1.5px solid ${tool.border}`,borderRadius:16,padding:'20px',cursor:'pointer',fontFamily:'inherit',textAlign:'right',transition:'all .2s',boxShadow:`0 2px 8px ${tool.color}10`,opacity:planAllows(plan,tool.minPlan)?1:.6,position:'relative'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow=`0 8px 24px ${tool.color}20`}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.boxShadow=`0 2px 8px ${tool.color}10`}}>
              {!planAllows(plan,tool.minPlan) && (
                <div style={{position:'absolute',top:12,left:12,background:'#1c1c1a',color:'white',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:99,display:'flex',alignItems:'center',gap:4,zIndex:1}}>
                  🔒 {tool.minPlan==='advanced'?'المتقدمة':'المتوسطة'}
                </div>
              )}
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

      {(plan==='advanced'||plan==='pro') && (
        <>
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
            const res=await fetch('/api/stock-forecast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
            const data=await res.json()
            setForecast(data.forecast||[])
            setForecastLoading(false)
          }} style={{padding:'8px 16px',background:C.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            {forecastLoading?'⏳ جاري...':'تحليل المخزون'}
          </button>
        </div>

        {forecast.length>0 && (
          <>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
              <button onClick={()=>setForecast([])}
                style={{background:'none',border:'1px solid #e5e7eb',color:'#6b7280',borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
                ✕ إغلاق النتائج
              </button>
            </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
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
          </>
        )}
      </div>

      {/* توقيت الطلب الذكي */}
      <div className="fu" style={{marginTop:16,background:C.surface,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>🔔 توقيت الطلب الذكي</div>
            <div style={{fontSize:11,color:C.text3,marginTop:2}}>يتعلم مدة التوريد الفعلية من تاريخك ويقترح متى بالضبط تطلب</div>
          </div>
          <button onClick={async()=>{
            const orgId=sessionStorage.getItem('s_org_id')
            if(!orgId) return
            setSmartTimingLoading(true)
            const res=await fetch('/api/smart-reorder-timing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
            const data=await res.json()
            setSmartTiming(data.suggestions||[])
            setSmartTimingLoading(false)
          }} style={{padding:'8px 16px',background:'#2563eb',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            {smartTimingLoading?'⏳ جاري...':'تحليل التوقيت'}
          </button>
        </div>

        {smartTiming.length>0 && (
          <>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
              <button onClick={()=>setSmartTiming([])}
                style={{background:'none',border:'1px solid #e5e7eb',color:'#6b7280',borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
                ✕ إغلاق النتائج
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:8,marginTop:8}}>
              {smartTiming.map((s:any,i:number)=>(
                <div key={i} style={{padding:'12px 14px',borderRadius:10,background:s.urgency==='now'?'#fef2f2':'#fffbeb',border:`1px solid ${s.urgency==='now'?'#fecaca':'#fde68a'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:800,color:C.text}}>{s.name}</div>
                    <span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:99,background:s.urgency==='now'?'#fee2e2':'#fde68a',color:s.urgency==='now'?'#dc2626':'#b45309'}}>
                      {s.urgency==='now'?'⚠️ اطلب الآن':`اطلب خلال ${Math.max(s.suggestedOrderInDays,0)} يوم`}
                    </span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,textAlign:'center' as const}}>
                    <div style={{background:'white',borderRadius:6,padding:'6px'}}>
                      <div style={{fontSize:13,fontWeight:900,color:C.text}}>{s.currentQty} {s.unit}</div>
                      <div style={{fontSize:9,color:C.text4}}>المخزون الحالي</div>
                    </div>
                    <div style={{background:'white',borderRadius:6,padding:'6px'}}>
                      <div style={{fontSize:13,fontWeight:900,color:'#2563eb'}}>{s.dailyRate}/يوم</div>
                      <div style={{fontSize:9,color:C.text4}}>معدل الاستهلاك</div>
                    </div>
                    <div style={{background:'white',borderRadius:6,padding:'6px'}}>
                      <div style={{fontSize:13,fontWeight:900,color:'#7c3aed'}}>{s.avgLeadTimeDays} يوم</div>
                      <div style={{fontSize:9,color:C.text4}}>مدة التوريد المعتادة</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
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
            const res=await fetch('/api/purchase-suggestion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
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
                  <div style={{fontSize:12,fontWeight:700,color:C.text,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                    {p.name}
                    {p.noHistory && <span style={{fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:99,background:'#fee2e2',color:'#dc2626'}}>نافد بدون تاريخ صرف</span>}
                    {p.method==='trend' && p.growthPct!==null && (
                      <span style={{fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:99,background:p.growthPct>=0?'#dcfce7':'#fee2e2',color:p.growthPct>=0?'#16a34a':'#dc2626'}}>
                        {p.growthPct>=0?'↑':'↓'} اتجاه شهري {p.growthPct>=0?'+':''}{p.growthPct}%
                      </span>
                    )}
                  </div>
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
              * المقترح يكفي أسبوعين + هامش أمان 25%. يعتمد على اتجاه استهلاكك الشهري الفعلي (بعد توفر شهرين بيانات فأكثر)، وإلا يعتمد على آخر أسبوع
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

      {/* مقارنة الفروع — حصري للباقة المتقدمة */}
      {plan==='advanced' && (
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
      )}

      {/* أدوات الهدر — حصرية للباقة المتقدمة */}
      {plan==='advanced' && (
      <div className="fu" style={{marginTop:16,background:C.bg,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>🐌</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>المخزون الراكد</div>
              <div style={{fontSize:11,color:C.text3}}>يكتشف ما تشتريه ولا تصرفه (بطيء الحركة)</div>
            </div>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setWasteLoading(true)
              const res=await fetch('/api/waste-detection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
              const data=await res.json()
              setWasteReport(data.waste||[])
              setWasteLoading(false)
            }} style={{padding:'6px 14px',background:'#f59e0b',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {wasteLoading?'⏳ جاري...':'فحص الراكد'}
            </button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>🗑️</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>كشف الهدر الحقيقي</div>
              <div style={{fontSize:11,color:C.text3}}>من عمليات الهدر المسجّلة فعلياً (تالف، منتهي، كسر...)</div>
            </div>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setRealWasteLoading(true)
              const res=await fetch('/api/waste-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
              const data=await res.json()
              setRealWasteReport(data)
              setRealWasteLoading(false)
            }} style={{padding:'6px 14px',background:'#dc2626',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {realWasteLoading?'⏳ جاري...':'كشف الهدر'}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* إدارة الوصفات وتقدير الإنتاج */}
      <div className="fu" style={{marginTop:16,background:C.bg,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>🍔</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>الوصفات وتقدير الإنتاج</div>
              <div style={{fontSize:11,color:C.text3}}>عرّف وصفة (اسم + مكوناتها)، والنظام يقدّر كم وحدة تم تحضيرها بناءً على استهلاك موظفيك الفعلي للمواد الخام</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              const{data}=await sb.from('products').select('id,name,unit,recipe_unit,recipe_unit_factor').eq('org_id',orgId).eq('is_active',true)
              setRawMaterials(data||[])
              setShowRecipeModal(true)
            }} style={{flex:1,padding:'8px 14px',background:'white',color:'#7c3aed',border:'1.5px solid #ddd6fe',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              + وصفة جديدة
            </button>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setReconLoading(true)
              const res=await fetch('/api/recipe-reconciliation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
              const data=await res.json()
              setRecipeReconReport(data)
              setReconLoading(false)
            }} style={{flex:1,padding:'8px 14px',background:'#7c3aed',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {reconLoading?'⏳ جاري...':'تقدير الإنتاج'}
            </button>
          </div>
          <button onClick={async()=>{ if(!showRecipesList) await loadRecipesList(); setShowRecipesList(v=>!v) }}
            style={{padding:'6px 0',background:'none',border:'none',color:'#7c3aed',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>
            {showRecipesList?'إخفاء الوصفات المسجّلة':'إدارة الوصفات (تعديل/حذف)'}
          </button>
          {showRecipesList && (
            <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
              {recipesList.length===0 ? (
                <div style={{fontSize:11,color:C.text4,textAlign:'center' as const,padding:8}}>ما فيه وصفات مسجّلة بعد</div>
              ) : recipesList.map((r:any)=>(
                <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'white',border:`1px solid ${C.border2}`,borderRadius:8,padding:'8px 12px'}}>
                  <span style={{fontSize:12,fontWeight:600,color:C.text}}>{r.name}</span>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>openEditRecipe(r.id)} style={{padding:'4px 10px',background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',borderRadius:7,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✏️ تعديل</button>
                    <button onClick={()=>deleteRecipe(r.id)} disabled={deletingRecipeId===r.id} style={{padding:'4px 10px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:7,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:deletingRecipeId===r.id?.6:1}}>{deletingRecipeId===r.id?'...':'🗑️ حذف'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {recipeReconReport && (
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:'1.5px solid #ddd6fe'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#5b21b6',marginBottom:4}}>🍔 تقدير الإنتاج (آخر 30 يوم)</div>
          <div style={{fontSize:11,color:'#7c3aed',marginBottom:16}}>محسوب من استهلاك المواد الخام الفعلي ÷ مكونات كل وصفة</div>

          {!recipeReconReport.hasData ? (
            <div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:13}}>
              ما فيه أي وصفة معرّفة بعد<br/>
              <span style={{fontSize:11}}>اضغط "+ وصفة جديدة" وأضف اسمها ومكوناتها أولاً</span>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
              {recipeReconReport.recipes.map((r:any)=>(
                <div key={r.id} style={{background:C.bg,border:`1px solid ${C.border2}`,borderRadius:10,padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.text}}>{r.name}</span>
                    <span style={{fontSize:16,fontWeight:900,color:'#7c3aed'}}>{r.estimatedProduced} وحدة</span>
                  </div>
                  {r.bottleneckName && (
                    <div style={{fontSize:9,color:'#b45309',marginBottom:8}}>⚠️ محدَّد بواسطة: {r.bottleneckName} (المكوّن الأقل توفراً)</div>
                  )}
                  {r.components.length>0 ? (
                    <div style={{display:'flex',flexDirection:'column' as const,gap:4}}>
                      {r.components.map((c:any,i:number)=>{
                        const isBottleneck = c.name===r.bottleneckName
                        return (
                          <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:10,color:isBottleneck?'#b45309':C.text4,fontWeight:isBottleneck?700:400}}>
                            <span>{isBottleneck?'🔻 ':''}{c.name}: استهلاك {c.consumed} {c.unit}</span>
                            <span>يكفي لـ {c.impliedCount} وحدة</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{fontSize:10,color:C.text4}}>هذي الوصفة بدون مكوّنات بعد</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coming soon — أدوات متاحة للمتوسطة والمتقدمة */}
      <div className="fu" style={{marginTop:16,background:C.bg,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`,animationDelay:'.2s'}}>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>🎯</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>تحسين نقطة إعادة الطلب</div>
              <div style={{fontSize:11,color:C.text3}}>يقترح حد إعادة طلب أدق بناءً على معدل الصرف ومدة التوريد</div>
            </div>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setReorderLoading(true)
              const res=await fetch('/api/reorder-optimizer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
              const data=await res.json()
              setReorderSuggestions(data)
              setReorderLoading(false)
            }} style={{padding:'6px 14px',background:'#7c3aed',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {reorderLoading?'⏳ جاري...':'فحص الحدود'}
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
              const res=await fetch('/api/weekly-report-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
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
                  <span>الهدر: {p.wasteQty} {p.unit}</span>
                  <span>الفعلي: {p.endStock} {p.unit}</span>
                  <span style={{fontWeight:700,color:p.risk==='high'?'#dc2626':'#d97706'}}>نسبة الاستخدام: {p.usageRatio}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* تحسين نقطة إعادة الطلب */}
      {reorderSuggestions && (
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:'1.5px solid #ddd6fe'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#5b21b6',marginBottom:4}}>🎯 تحسين نقطة إعادة الطلب</div>
          <div style={{fontSize:11,color:'#7c3aed',marginBottom:16}}>مقارنة الحد الحالي بالحد المقترح بناءً على معدل الصرف ومدة توريد المورد</div>

          {reorderSuggestions.suggestions?.length===0 ? (
            <div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:13}}>
              ✅ كل حدود إعادة الطلب مضبوطة بشكل جيد ({reorderSuggestions.totalChecked} منتج تم فحصه)
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
              {(reorderSuggestions.suggestions||[]).map((s:any)=>(
                <div key={s.id} style={{padding:'12px 14px',background:'#f5f3ff',borderRadius:10,border:'1px solid #ddd6fe'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#4c1d95'}}>{s.name}</div>
                    <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99,background:s.status==='low'?'#fee2e2':'#fef3c7',color:s.status==='low'?'#dc2626':'#d97706'}}>
                      {s.status==='low'?'⚠️ منخفض جداً':'📦 مرتفع زيادة'}
                    </span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:8}}>
                    <div>
                      <div style={{fontSize:10,color:'#9ca3af'}}>الحالي</div>
                      <div style={{fontSize:16,fontWeight:900,color:'#6b7280'}}>{s.currentReorderPoint} {s.unit}</div>
                    </div>
                    <span style={{fontSize:14,color:'#9ca3af'}}>←</span>
                    <div>
                      <div style={{fontSize:10,color:'#9ca3af'}}>المقترح</div>
                      <div style={{fontSize:16,fontWeight:900,color:'#7c3aed'}}>{s.suggestedReorderPoint} {s.unit}</div>
                    </div>
                    <div style={{flex:1,textAlign:'left' as const,fontSize:10,color:'#9ca3af'}}>
                      معدل الصرف: {s.dailyRate}/يوم · مدة التوريد: {s.leadTimeDays} يوم
                    </div>
                  </div>
                  <button onClick={()=>applyReorderSuggestion(s.id, s.suggestedReorderPoint)} disabled={applyingId===s.id}
                    style={{width:'100%',padding:'8px',background:'#7c3aed',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:applyingId===s.id?.6:1}}>
                    {applyingId===s.id?'⏳ جاري التطبيق...':'✓ تطبيق الاقتراح'}
                  </button>
                </div>
              ))}
            </div>
          )}
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
        </>
      )}

      {plan==='basic' && (
        <div className="fu" style={{marginTop:16,background:'linear-gradient(135deg,#0d2818,#1a4731)',borderRadius:16,padding:'28px 24px',textAlign:'center' as const}}>
          <div style={{fontSize:36,marginBottom:10}}>🔒✨</div>
          <div style={{fontSize:16,fontWeight:800,color:'white',marginBottom:6}}>أدوات ذكاء اصطناعي بانتظارك</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.65)',marginBottom:18,lineHeight:1.7,maxWidth:420,marginLeft:'auto',marginRight:'auto'}}>
            توقع نفاد المخزون، اقتراح كميات الشراء، تحليل الموسمية، تحسين نقطة إعادة الطلب، والتقرير الأسبوعي التلقائي — مع الباقة المتوسطة أو المتقدمة.
          </div>
          <a href="/settings" style={{display:'inline-block',padding:'12px 28px',background:'#16a34a',color:'white',borderRadius:10,fontSize:13,fontWeight:800,textDecoration:'none'}}>ترقية الباقة</a>
        </div>
      )}

      {plan==='pro' && (
        <div className="fu" style={{marginTop:16,background:'linear-gradient(135deg,#0d2818,#1a4731)',borderRadius:16,padding:'28px 24px',textAlign:'center' as const}}>
          <div style={{fontSize:36,marginBottom:10}}>🔒✨</div>
          <div style={{fontSize:16,fontWeight:800,color:'white',marginBottom:6}}>أدوات متقدمة بانتظارك</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.65)',marginBottom:18,lineHeight:1.7,maxWidth:420,marginLeft:'auto',marginRight:'auto'}}>
            مقارنة الفروع، المخزون الراكد، وكشف الهدر الحقيقي — حصرية للباقة المتقدمة.
          </div>
          <a href="/settings" style={{display:'inline-block',padding:'12px 28px',background:'#16a34a',color:'white',borderRadius:10,fontSize:13,fontWeight:800,textDecoration:'none'}}>ترقية للباقة المتقدمة</a>
        </div>
      )}

      {showRecipeModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)'}} onClick={()=>{setShowRecipeModal(false);setEditingRecipeId(null)}}>
          <RecipeCreateModal
            onClose={()=>{setShowRecipeModal(false);setEditingRecipeId(null)}}
            onSaved={()=>{setShowRecipeModal(false);setEditingRecipeId(null);if(showRecipesList)loadRecipesList()}}
            rawMaterials={rawMaterials}
            sb={sb}
            orgId={typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null}
            branchId={typeof window!=='undefined'?sessionStorage.getItem('s_branch_id'):null}
            editingRecipeId={editingRecipeId}
          />
        </div>
      )}
    </div>
  )
}

function RecipeCreateModal({onClose,onSaved,rawMaterials,sb,orgId,branchId,editingRecipeId}:{onClose:()=>void,onSaved:()=>void,rawMaterials:any[],sb:any,orgId:string|null,branchId:string|null,editingRecipeId?:string|null}) {
  const [name,setName]=useState('')
  const [components,setComponents]=useState<{component_product_id:string,qty:string}[]>([])
  const [newCompId,setNewCompId]=useState('')
  const [newCompQty,setNewCompQty]=useState('')
  const [newCompSubUnit,setNewCompSubUnit]=useState(1)
  const [customSubLabel,setCustomSubLabel]=useState('')
  const [customSubCount,setCustomSubCount]=useState('')
  const [saving,setSaving]=useState(false)
  const [loadingEdit,setLoadingEdit]=useState(!!editingRecipeId)

  useEffect(()=>{
    if(!editingRecipeId) return
    ;(async()=>{
      const{data:recipe}=await (sb.from('recipes' as any) as any).select('name').eq('id',editingRecipeId).single()
      if(recipe) setName(recipe.name)
      const{data:items}=await sb.from('recipe_items').select('component_product_id,qty').eq('recipe_id',editingRecipeId)
      setComponents((items||[]).map((it:any)=>({component_product_id:it.component_product_id,qty:String(it.qty)})))
      setLoadingEdit(false)
    })()
  },[editingRecipeId])

  function subUnitOptions(component:any) {
    const u=(component?.unit||'').trim()
    if(['كيلو','كجم','كيلوجرام','كيلو جرام'].includes(u)) return [{label:'جرام',factor:1000},{label:'كيلو',factor:1}]
    if(['لتر','ليتر'].includes(u)) return [{label:'مل',factor:1000},{label:'لتر',factor:1}]
    if(component?.recipe_unit_factor) return [{label:component.recipe_unit||'وحدة',factor:component.recipe_unit_factor},{label:u||'وحدة',factor:1}]
    return [{label:u||'وحدة',factor:1}]
  }
  function hasKnownConversion(component:any) {
    const u=(component?.unit||'').trim()
    return ['كيلو','كجم','كيلوجرام','كيلو جرام','لتر','ليتر'].includes(u) || !!component?.recipe_unit_factor
  }

  async function addComp() {
    if(!newCompId||!newCompQty||Number(newCompQty)<=0) return
    if(components.some(c=>c.component_product_id===newCompId)) return
    const comp = rawMaterials.find((r:any)=>r.id===newCompId)
    const customFactor=Number(customSubCount)
    if(!hasKnownConversion(comp) && !(customFactor>0)){
      toast(`لازم تحدد "كم قطعة/وحدة بكل ${comp?.unit||'وحدة'} واحد؟" بالمربع الأصفر قبل الإضافة — وإلا الحساب بيكون غلط`,'error')
      return
    }
    const factor = customFactor>0 ? customFactor : newCompSubUnit
    const baseQty=Number(newCompQty)/factor
    setComponents(prev=>[...prev,{component_product_id:newCompId,qty:String(baseQty)}])
    if(customFactor>0 && customSubLabel.trim()){
      // نحفظ التحويل بالمنتج نفسه عشان ما نسأل عنه مرة ثانية بأي وصفة جاية
      await sb.from('products').update({recipe_unit:customSubLabel.trim(),recipe_unit_factor:customFactor}).eq('id',newCompId)
    }
    setNewCompId('');setNewCompQty('');setNewCompSubUnit(1);setCustomSubLabel('');setCustomSubCount('')
  }

  async function save() {
    if(!name.trim()||!orgId) return
    setSaving(true)

    // حماية: لو المستخدم كتب مكوّن بالحقول لكن نسي يضغط "+"، نضيفه تلقائياً هنا قبل الحفظ
    let finalComponents = [...components]
    if(newCompId && newCompQty && Number(newCompQty)>0 && !components.some(c=>c.component_product_id===newCompId)){
      const pendingComp = rawMaterials.find((r:any)=>r.id===newCompId)
      const customFactor=Number(customSubCount)
      if(!hasKnownConversion(pendingComp) && !(customFactor>0)){
        toast(`تعذّر الحفظ — حدد "كم قطعة/وحدة بكل ${pendingComp?.unit||'وحدة'} واحد؟" للمكوّن ${pendingComp?.name||''} أولاً`,'error')
        setSaving(false)
        return
      }
      const factor = customFactor>0 ? customFactor : newCompSubUnit
      const baseQty=Number(newCompQty)/factor
      finalComponents.push({component_product_id:newCompId,qty:String(baseQty)})
      if(customFactor>0 && customSubLabel.trim()){
        await sb.from('products').update({recipe_unit:customSubLabel.trim(),recipe_unit_factor:customFactor}).eq('id',newCompId)
      }
    }

    let recipeId = editingRecipeId
    if(editingRecipeId){
      const{error:updErr}=await (sb.from('recipes' as any) as any).update({name:name.trim()}).eq('id',editingRecipeId)
      if(updErr){toast('فشل تحديث الوصفة — حاول مرة أخرى','error');setSaving(false);return}
      await sb.from('recipe_items').delete().eq('recipe_id',editingRecipeId)
    } else {
      const{data:nr,error}=await (sb.from('recipes' as any) as any).insert({org_id:orgId,branch_id:branchId||null,name:name.trim()}).select().single()
      if(error||!nr){toast('فشل حفظ الوصفة — حاول مرة أخرى','error');setSaving(false);return}
      recipeId = nr.id
    }
    if(finalComponents.length>0 && recipeId){
      const rows=finalComponents.map(c=>({recipe_id:recipeId,component_product_id:c.component_product_id,qty:Number(c.qty)}))
      const{error:itemsErr}=await sb.from('recipe_items').insert(rows)
      if(itemsErr){toast('تم حفظ اسم الوصفة لكن فشل حفظ المكوّنات: '+itemsErr.message,'error');setSaving(false);return}
    } else if(finalComponents.length===0) {
      toast('⚠️ تنبيه: الوصفة اتحفظت بدون أي مكوّنات — أضف مكوّناتها لاحقاً من "تعديل"','warning')
    }
    setSaving(false)
    if(finalComponents.length>0) toast(editingRecipeId?'✅ تم تحديث الوصفة':'✅ تم حفظ الوصفة بمكوناتها')
    onSaved()
  }

  if(loadingEdit) return (
    <div onClick={(e:any)=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:400,padding:40,textAlign:'center' as const,fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
      <div style={{fontSize:13,color:'#6b7280'}}>⏳ جاري تحميل بيانات الوصفة...</div>
    </div>
  )

  return (
    <div onClick={(e:any)=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:400,maxHeight:'85vh',overflowY:'auto',padding:20,fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl' as const}}>
      <div style={{fontSize:15,fontWeight:800,marginBottom:14}}>🍔 {editingRecipeId?'تعديل الوصفة':'وصفة جديدة'}</div>
      <label style={{fontSize:11,fontWeight:700,color:'#6b7280',display:'block',marginBottom:5}}>اسم الوصفة *</label>
      <input value={name} onChange={(e:any)=>setName(e.target.value)} placeholder="مثال: برجر بالجبن" style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e7eb',borderRadius:9,fontSize:13,marginBottom:14,fontFamily:'inherit'}}/>

      <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>مكوّنات الوصفة</div>
      {components.length>0 && (
        <div style={{display:'flex',flexDirection:'column' as const,gap:6,marginBottom:8}}>
          {components.map(c=>{
            const comp=rawMaterials.find(r=>r.id===c.component_product_id)
            return (
              <div key={c.component_product_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'6px 10px'}}>
                <span style={{fontSize:11}}>{comp?.name||'—'} — {c.qty} {comp?.unit}</span>
                <button onClick={()=>setComponents(prev=>prev.filter(x=>x.component_product_id!==c.component_product_id))} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:14}}>×</button>
              </div>
            )
          })}
        </div>
      )}
      <div style={{display:'flex',gap:6,marginBottom:6}}>
        <select value={newCompId} onChange={(e:any)=>{const id=e.target.value;setNewCompId(id);const r=rawMaterials.find(x=>x.id===id);const opts=subUnitOptions(r);setNewCompSubUnit(opts[0].factor)}} style={{flex:1,padding:'8px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:11}}>
          <option value="">اختر مكوّن...</option>
          {rawMaterials.filter(r=>!components.some(c=>c.component_product_id===r.id)).map(r=>(
            <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>
          ))}
        </select>
      </div>
      {newCompId && !hasKnownConversion(rawMaterials.find(x=>x.id===newCompId)) && (
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:8,marginBottom:8}}>
          <div style={{fontSize:10,color:'#92400e',marginBottom:6}}>كم قطعة/وحدة بكل {rawMaterials.find(x=>x.id===newCompId)?.unit} واحد؟ (اختياري)</div>
          <div style={{display:'flex',gap:6}}>
            <input value={customSubLabel} onChange={(e:any)=>setCustomSubLabel(e.target.value)} placeholder="اسم الوحدة (مثال: رغيف)" style={{flex:2,padding:'7px',border:'1.5px solid #fde68a',borderRadius:7,fontSize:10}}/>
            <input type="number" min="1" value={customSubCount} onChange={(e:any)=>setCustomSubCount(e.target.value)} placeholder="العدد" style={{flex:1,padding:'7px',border:'1.5px solid #fde68a',borderRadius:7,fontSize:10}}/>
          </div>
        </div>
      )}
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        <input type="number" step="0.01" min="0" value={newCompQty} onChange={(e:any)=>setNewCompQty(e.target.value)} placeholder={customSubCount?`الكمية بـ${customSubLabel||'وحدة'}`:'الكمية'} style={{flex:1,padding:'8px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:11}}/>
        {newCompId && (()=>{const r=rawMaterials.find(x=>x.id===newCompId);const opts=subUnitOptions(r);return opts.length>1 ? (
          <select value={newCompSubUnit} onChange={(e:any)=>setNewCompSubUnit(Number(e.target.value))} style={{flex:1,padding:'8px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:11}}>
            {opts.map(o=>(<option key={o.label} value={o.factor}>{o.label}</option>))}
          </select>
        ) : (
          <div style={{flex:1,padding:'8px',fontSize:11,color:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>{customSubLabel||opts[0].label}</div>
        )})()}
        <button onClick={addComp} style={{padding:'0 12px',background:'#16a34a',color:'white',border:'none',borderRadius:8,fontSize:16,fontWeight:700,cursor:'pointer'}}>+</button>
      </div>

      <div style={{display:'flex',gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:'11px',background:'#f9fafb',color:'#374151',border:'1px solid #e5e7eb',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
        <button onClick={save} disabled={saving||!name.trim()} style={{flex:2,padding:'11px',background:'#7c3aed',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:saving||!name.trim()?.6:1}}>
          {saving?'جاري الحفظ...':(editingRecipeId?'حفظ التعديلات':'حفظ الوصفة')}
        </button>
      </div>
    </div>
  )
}
