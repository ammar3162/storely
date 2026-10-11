'use client'
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, prefer-const, react/no-unescaped-entities */
import PageIcon from '@/components/PageIcon'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { currencySymbol } from '@/lib/currencySymbol'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { colors as dsColors } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'

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
    color:'#A3917F',
    bg:'#F8EEDF',
    border:'#D9CDBE',
    features:['استخراج تلقائي للبيانات','دعم فواتير متعددة الأصناف','تحديث المخزون فوراً'],
    minPlan:'basic',
  },
  {
    href:'/purchase-suggestion',
    icon:'🛒',
    title:'اقتراح الشراء الذكي',
    desc:'يحسب الكمية المثلى لكل صنف بناءً على معدل الصرف الفعلي ويرسلها للمورد عبر واتساب',
    color:'#203640',
    bg:'#F8EEDF',
    border:'#D9CDBE',
    features:['حساب الكمية المثلى','إرسال للمورد واتساب','بناءً على 90 يوم صرف'],
    minPlan:'pro',
  },
  {
    href:'/branch-compare',
    icon:'📊',
    title:'مقارنة الفروع',
    desc:'قارن أداء كل فرع من حيث الصرف والمشتريات والأصناف الناقصة',
    color:'#4F6678',
    bg:'#F3F5F6',
    border:'#CBD4DC',
    features:['مقارنة الصرف','أفضل الأصناف لكل فرع','تحليل أسبوعي وشهري'],
    minPlan:'pro',
  },
]

function planAllows(userPlan:string, minPlan:string, hasAiAddon:boolean){
  if (userPlan === 'basic' && hasAiAddon) return true // عميل الأساسية اللي اشترى إضافة الذكاء الاصطناعي
  const order = ['basic','pro','advanced']
  return order.indexOf(userPlan) >= order.indexOf(minPlan)
}

export default function AIToolsPage() {
  const [insights, setInsights] = useState<any>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState('')

  async function runSmartInsights() {
    setInsightsLoading(true); setInsightsError(''); setInsights(null)
    try {
      const orgId = sessionStorage.getItem('s_org_id')
      const branchId = sessionStorage.getItem('s_branch_id')
      const res = await fetch('/api/smart-insights', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ org_id: orgId, branch_id: branchId }) })
      const data = await res.json()
      if (data.success) setInsights(data.insights)
      else setInsightsError(data.error || 'حدث خطأ غير متوقع')
    } catch (e) {
      setInsightsError('تعذّر الاتصال بالخادم')
    }
    setInsightsLoading(false)
  }

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
  const [reconFrom, setReconFrom] = useState('')
  const [reconTo, setReconTo] = useState('')

  async function loadRecipesList() {
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId) return
    const j=await api.get('/api/recipes',{org_id:orgId})
    setRecipesList(j.recipes||[])
  }

  async function deleteRecipe(id:string) {
    if(!(await confirmDialog({ title: 'حذف الوصفة', message: 'حذف هذي الوصفة؟ هذا الإجراء لا يمكن التراجع عنه.' }))) return
    setDeletingRecipeId(id)
    const r=await api.del('/api/recipes',{org_id:sessionStorage.getItem('s_org_id'),id})
    setDeletingRecipeId(null)
    if(!r.success){toast('فشل حذف الوصفة — حاول مرة أخرى','error');return}
    toast('✅ تم حذف الوصفة')
    setRecipesList(prev=>prev.filter(r=>r.id!==id))
  }

  async function openEditRecipe(id:string) {
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId) return
    const bid=sessionStorage.getItem('s_branch_id')
    const j=await api.get('/api/products',{org_id:orgId,branch_id:bid,full:1})
    setRawMaterials(j.products||[])
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
  const [curr, setCurr] = useState('ر.س')
  useEffect(()=>{
    getMe().then(me=>{ if(me?.org?.currency) setCurr(currencySymbol(me.org.currency)) })
  },[])

  async function applyReorderSuggestion(productId: string, newReorderPoint: number) {
    setApplyingId(productId)
    await api.patch('/api/products', { org_id: sessionStorage.getItem('s_org_id'), id: productId, reorder_point: newReorderPoint })
    setReorderSuggestions((prev: any) => ({
      ...prev,
      suggestions: prev.suggestions.filter((s: any) => s.id !== productId),
    }))
    setApplyingId(null)
  }
  const [visible] = useState(true)
  const plan = typeof window!=='undefined' ? (sessionStorage.getItem('s_plan')||'basic') : 'basic'
  const [hasAiAddon, setHasAiAddon] = useState(false)
  useEffect(() => {
    const orgId = typeof window!=='undefined' ? sessionStorage.getItem('s_org_id') : null
    if (!orgId) return
    fetch(`/api/addons-market?org_id=${orgId}`).then(r=>r.json()).then(j=>{
      if (j.success) {
        const addon = (j.addons||[]).find((a:any)=>a.slug==='ai_tools')
        setHasAiAddon(!!addon?.subscription?.isValid)
      }
    }).catch(()=>{})
  }, [])

  return (
    <div className="ai-tools-page" style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:1180,margin:'0 auto',opacity:visible?1:0,transition:'opacity .3s'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .fu{animation:fadeUp .35s ease both}
        .ai-tools-page{padding:0 2px 36px;color:#203640}
        .ai-tools-page *{box-sizing:border-box}
        .ai-page-intro{margin-bottom:28px!important}
        .ai-tools-page > .fu:first-of-type{margin-bottom:28px!important}
        .ai-tools-page > .fu:first-of-type > div{align-items:center!important}
        .ai-tools-page > .fu:first-of-type h1{font-size:26px!important;line-height:1.35!important;font-weight:700!important;color:#203640!important}
        .ai-tools-page > .fu:first-of-type p{font-size:14px!important;line-height:1.8!important;color:#66737C!important}
        .ai-tools-page > .fu:not(:first-of-type):not(.ai-primary-workspace),
        .ai-tools-page > div.fu:not(:first-of-type):not(.ai-primary-workspace){background:#fff!important;border:1px solid #DDE6EA!important;border-radius:10px!important;padding:20px!important;box-shadow:0 1px 2px rgba(32,54,64,.035)!important}
        .ai-tools-page > .fu:not(:first-of-type):not(.ai-primary-workspace){margin-top:16px!important}
        .ai-primary-workspace{background:#fff!important;border:1px solid #DDE6EA!important;border-top:3px solid #203640!important;border-radius:10px!important;padding:24px!important;margin-bottom:24px!important;box-shadow:0 1px 2px rgba(32,54,64,.035)!important}
        .ai-primary-workspace > div:first-child{align-items:flex-start!important;margin-bottom:20px!important}
        .ai-primary-workspace > div:first-child > div:first-child > div:first-child{color:#203640!important;font-size:18px!important;line-height:1.65!important}
        .ai-primary-workspace > div:first-child > div:first-child > div:nth-child(2){color:#66737C!important;font-size:13px!important;line-height:1.8!important}
        .ai-tools-page button{border-radius:7px!important;font-family:inherit!important;box-shadow:none!important;transition:background .15s,border-color .15s,color .15s,opacity .15s!important}
        .ai-primary-workspace > div:first-child > button,
        .ai-tools-page button[style*="background:#203640"],
        .ai-tools-page button[style*="background: #203640"]{background:#203640!important;border:1px solid #203640!important;color:#fff!important;min-height:38px!important;padding:8px 16px!important;font-size:13px!important;font-weight:700!important}
        .ai-primary-workspace > div:first-child > button{background:#203640!important;color:#fff!important}
        .ai-results-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
        .ai-primary-workspace .ai-results-grid > div{background:#F8FAFB!important;border:1px solid #E4EBEF!important;border-radius:8px!important;padding:16px!important;color:#203640!important}
        .ai-primary-workspace .ai-results-grid div,
        .ai-primary-workspace .ai-results-grid span{color:#203640!important}
        .ai-primary-workspace .ai-results-grid div[style*="fca5a5"],
        .ai-primary-workspace .ai-results-grid div[style*="dc2626"]{color:#B91C1C!important}
        .ai-primary-workspace .ai-results-grid div[style*="5eead4"]{color:#047857!important}
        .ai-primary-workspace .ai-results-grid div[style*="93c5fd"]{color:#4F6678!important}
        .ai-tool-nav{display:grid!important;grid-template-columns:1.15fr .92fr .92fr!important;gap:14px!important;margin-bottom:28px!important}
        .ai-tool-card button{min-height:100%!important;background:#fff!important;border:1px solid #DDE6EA!important;border-radius:10px!important;padding:22px!important;opacity:1;box-shadow:0 1px 2px rgba(32,54,64,.035)!important}
        .ai-tool-card:first-child button{border-color:#B9C8CF!important;background:#FBFCFC!important}
        .ai-tool-card button:hover{border-color:#203640!important;background:#F8FAFB!important}
        .ai-tool-card button > div{gap:14px!important}
        .ai-tool-card button > div > div:first-child{width:38px!important;height:38px!important;background:#F5F8F9!important;border:1px solid #DDE6EA!important;color:#203640!important;font-size:16px!important;border-radius:8px!important}
        .ai-tool-card span{border-radius:6px!important;background:#F6F8F9!important;border-color:#DDE6EA!important;color:#4B5D66!important;font-size:11px!important;font-weight:600!important}
        .ai-tool-card svg{stroke:#203640!important}
        .ai-ops-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important;align-items:start!important}
        .ai-ops-grid > .fu,
        .ai-results-section,
        .ai-locked-panel{margin-top:0!important;background:#fff!important;border:1px solid #DDE6EA!important;border-radius:10px!important;padding:20px!important;box-shadow:0 1px 2px rgba(32,54,64,.035)!important}
        .ai-ops-grid > .fu > div:first-child{gap:12px!important;align-items:flex-start!important;flex-wrap:wrap!important}
        .ai-action-group{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important;margin-top:16px!important}
        .ai-action-panel{background:#fff!important;border:1px solid #DDE6EA!important;border-radius:10px!important;padding:18px!important;box-shadow:0 1px 2px rgba(32,54,64,.035)!important}
        .ai-results-stack{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important;margin-top:16px!important}
        .ai-results-stack > div{margin-top:0!important;background:#fff!important;border:1px solid #DDE6EA!important;border-radius:10px!important;padding:20px!important}
        .ai-tools-page input,
        .ai-tools-page select{min-height:36px!important;border:1px solid #CBD5DB!important;border-radius:7px!important;background:#fff!important;color:#203640!important;font-family:inherit!important}
        .ai-tools-page a.hide-in-app{background:#fff!important;color:#203640!important;border:1px solid #DDE6EA!important;border-radius:7px!important}
        .ai-tools-page [style*="gridTemplateColumns:'repeat(4,1fr)'"],
        .ai-tools-page [style*="gridTemplateColumns:'repeat(3,1fr)'"],
        .ai-tools-page [style*="gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr'"]{overflow-x:auto!important}
        .ai-modal-backdrop{backdrop-filter:none!important;background:rgba(16,30,36,.42)!important}
        .ai-recipe-modal{border:1px solid #DDE6EA!important;border-radius:12px!important;box-shadow:0 22px 60px rgba(16,30,36,.18)!important;max-width:520px!important;padding:24px!important}
        @media (max-width: 980px){
          .ai-tools-page{max-width:100%!important}
          .ai-tool-nav,.ai-ops-grid,.ai-action-group,.ai-results-stack{grid-template-columns:1fr!important}
        }
        @media (max-width: 640px){
          .ai-primary-workspace,.ai-ops-grid > .fu,.ai-action-panel,.ai-results-section,.ai-locked-panel{padding:16px!important;border-radius:8px!important}
          .ai-primary-workspace > div:first-child,.ai-ops-grid > .fu > div:first-child{flex-direction:column!important;align-items:stretch!important}
          .ai-tools-page button{width:100%;justify-content:center}
          .ai-results-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* Header */}
      <div className="fu" style={{marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
          <PageIcon size={44}/>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>أدوات الذكاء</h1>
            <p style={{fontSize:11,color:C.text3,margin:'3px 0 0'}}>أدوات تحليل ذكية مبنية على بيانات مخزونك الحقيقية</p>
          </div>
        </div>
      </div>

      {/* التحليل الذكي الشامل */}
      <div className="fu ai-primary-workspace" style={{marginBottom:20,background:'#203640',borderRadius:6,padding:22}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:insights||insightsError?16:0,flexWrap:'wrap' as const,gap:10}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'white',marginBottom:4}}>🧠 التحليل الذكي الشامل</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.65)'}}>تقرير تنفيذي كامل يحلل كل بياناتك بضغطة وحدة</div>
          </div>
          <button onClick={runSmartInsights} disabled={insightsLoading}
            style={{padding:'11px 22px',background:'white',color:'#203640',border:'none',borderRadius:6,fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
            {insightsLoading?'⏳ جاري التحليل...':insights?'🔄 تحليل جديد':'✨ حلّل بياناتي الآن'}
          </button>
        </div>

        {insightsError && (
          <div style={{background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#fca5a5'}}>
            ⚠️ {insightsError}
          </div>
        )}

        {insights && (
          <div className="ai-results-grid" style={{display:'flex',flexDirection:'column' as const,gap:14}}>
            <div style={{background:'rgba(255,255,255,.08)',borderRadius:12,padding:16}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:800,padding:'3px 10px',borderRadius:99,background:insights.status==='صحي'?'#203640':insights.status==='خطر'?'#dc2626':'#f59e0b',color:'white'}}>{insights.status}</span>
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

      {/* Tools */}
      <div className="ai-tool-nav" style={{display:'flex',flexDirection:'column',gap:12}}>
        {TOOLS.map((tool,i)=>(
          <div key={i} className="fu ai-tool-card" style={{animationDelay:`${i*.08}s`}}>
            <button onClick={()=>planAllows(plan,tool.minPlan,hasAiAddon)?router.push(tool.href):router.push('/settings')}
              style={{width:'100%',background:'white',border:`1.5px solid ${tool.border}`,borderRadius:6,padding:'20px',cursor:'pointer',fontFamily:'inherit',textAlign:'right',transition:'border-color .15s',boxShadow:'none',opacity:planAllows(plan,tool.minPlan,hasAiAddon)?1:.6,position:'relative'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=tool.color}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=tool.border}}>
              {!planAllows(plan,tool.minPlan,hasAiAddon) && (
                <div style={{position:'absolute',top:12,left:12,background:'#1c1c1a',color:'white',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:99,display:'flex',alignItems:'center',gap:4,zIndex:1}}>
                  🔒 {tool.minPlan==='advanced'?'المتقدمة':'المتوسطة'}
                </div>
              )}
              <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                <div style={{width:44,height:44,borderRadius:6,background:'#F8EEDF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0,border:'1px solid #D9CDBE'}}>
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

      {(plan!=='basic'||hasAiAddon) && (
        <>
      <div className="ai-ops-grid">
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
                p.status==='watch'?'#F3F5F6':'#F8EEDF',
                border:`1px solid ${
                  p.status==='critical'?'#fecaca':
                  p.status==='warning'?'#fde68a':
                  p.status==='watch'?'#CBD4DC':'#D9CDBE'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.text}}>{p.name}</div>
                  <span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:99,background:
                    p.status==='critical'?'#fee2e2':
                    p.status==='warning'?'#fde68a':
                    p.status==='watch'?'#CBD4DC':'#D9CDBE',
                    color:
                    p.status==='critical'?'#dc2626':
                    p.status==='warning'?'#d97706':
                    p.status==='watch'?'#4F6678':'#203640'}}>
                    {p.status==='critical'?'🔴 حرج':p.status==='warning'?'🟡 تحذير':p.status==='watch'?'🔵 مراقبة':'🟢 آمن'}
                  </span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,textAlign:'center'}}>
                  <div style={{background:'white',borderRadius:6,padding:'6px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:C.text}}>{p.currentQty} {p.unit}</div>
                    <div style={{fontSize:9,color:C.text4}}>المخزون</div>
                  </div>
                  <div style={{background:'white',borderRadius:6,padding:'6px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#717553'}}>{p.avgQtyPerDispense} {p.unit}</div>
                    <div style={{fontSize:9,color:C.text4}}>كمية الصرفة</div>
                  </div>
                  <div style={{background:'white',borderRadius:6,padding:'6px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#4F6678'}}>كل {p.avgDaysBetween} يوم</div>
                    <div style={{fontSize:9,color:C.text4}}>تكرار الصرف</div>
                  </div>
                  <div style={{background:p.status==='critical'?'#fee2e2':p.status==='warning'?'#fef3c7':'#F8EEDF',borderRadius:6,padding:'6px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:p.status==='critical'?'#dc2626':p.status==='warning'?'#d97706':'#203640'}}>
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
          }} style={{padding:'8px 16px',background:'#4F6678',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
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
                      <div style={{fontSize:13,fontWeight:900,color:'#4F6678'}}>{s.dailyRate}/يوم</div>
                      <div style={{fontSize:9,color:C.text4}}>معدل الاستهلاك</div>
                    </div>
                    <div style={{background:'white',borderRadius:6,padding:'6px'}}>
                      <div style={{fontSize:13,fontWeight:900,color:'#717553'}}>{s.avgLeadTimeDays} يوم</div>
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
          }} style={{padding:'8px 16px',background:'#4F6678',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
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
                p.urgency==='urgent'?'#fef2f2':p.urgency==='soon'?'#fffbeb':'#F7F3ED',
                border:`1px solid ${p.urgency==='urgent'?'#fecaca':p.urgency==='soon'?'#fde68a':'#E7E1D8'}`}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                    {p.name}
                    {p.noHistory && <span style={{fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:99,background:'#fee2e2',color:'#dc2626'}}>نافد بدون تاريخ صرف</span>}
                    {p.method==='trend' && p.growthPct!==null && (
                      <span style={{fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:99,background:p.growthPct>=0?'#F8EEDF':'#fee2e2',color:p.growthPct>=0?'#203640':'#dc2626'}}>
                        {p.growthPct>=0?'↑':'↓'} اتجاه شهري {p.growthPct>=0?'+':''}{p.growthPct}%
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:10,color:C.text4}}>نقطة الطلب: {p.reorderPoint} {p.unit}</div>
                </div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:C.text}}>{p.currentQty} {p.unit}</div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#717553'}}>{p.dailyRate}</div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#4F6678'}}>{p.weeklyNeed}</div>
                <div style={{textAlign:'center',fontSize:14,fontWeight:900,color:
                  p.urgency==='urgent'?'#dc2626':p.urgency==='soon'?'#d97706':'#203640'}}>
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
          }} style={{padding:'8px 16px',background:'#717553',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
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
                    <div style={{width:60,fontSize:12,fontWeight:700,color:i===0?'#717553':C.text,flexShrink:0}}>{d.day}</div>
                    <div style={{flex:1,height:24,background:C.border,borderRadius:6,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${d.percent}%`,background:i===0?'#717553':i<3?'#a78bfa':'#D9CDBE',borderRadius:6,display:'flex',alignItems:'center',paddingRight:8,transition:'width .6s'}}>
                        {d.percent>20&&<span style={{fontSize:10,fontWeight:700,color:'white'}}>{d.total}</span>}
                      </div>
                    </div>
                    <div style={{width:40,fontSize:11,fontWeight:700,color:C.text3,textAlign:'center'}}>{d.total}</div>
                    {i===0&&<span style={{fontSize:10,background:'#717553',color:'white',padding:'1px 6px',borderRadius:99,whiteSpace:'nowrap'}}>ذروة</span>}
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
                    <div key={i} style={{padding:'8px 14px',background:i===0?'#717553':C.bg,borderRadius:10,textAlign:'center',border:`1px solid ${i===0?'#717553':C.border2}`}}>
                      <div style={{fontSize:14,fontWeight:900,color:i===0?'white':C.text}}>{h.label}</div>
                      <div style={{fontSize:9,color:i===0?'rgba(255,255,255,.7)':C.text4}}>{h.total} وحدة</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* توصية */}
            {seasonality.peakDay && (
              <div style={{background:'#F8EEDF',borderRadius:10,padding:'12px 14px',border:'1px solid #D9CDBE'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#717553',marginBottom:4}}>💡 توصية</div>
                <div style={{fontSize:12,color:'#43525B',lineHeight:1.6}}>
                  يوم <b>{seasonality.peakDay.day}</b> هو أكثر أيامك صرفاً — تأكد من توفر مخزون كافٍ قبله
                  {seasonality.peakHour && <span> · وأكثر الأوقات نشاطاً هي <b>{seasonality.peakHour.label}</b></span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* مقارنة الفروع — الباقة المتوسطة أو المتقدمة */}
      {(plan!=='basic'||hasAiAddon) && (
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
                  <div key={b.id} style={{padding:'14px',borderRadius:12,background:i===0?'#F8EEDF':'#F7F3ED',border:`1.5px solid ${i===0?'#203640':'#E7E1D8'}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        {i===0&&<span style={{fontSize:16}}>🥇</span>}
                        {i===1&&<span style={{fontSize:16}}>🥈</span>}
                        {i===2&&<span style={{fontSize:16}}>🥉</span>}
                        <span style={{fontSize:14,fontWeight:800,color:C.text}}>{b.name}</span>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,background:i===0?'#203640':'#E7E1D8',color:i===0?'white':C.text3}}>
                        كفاءة {b.efficiency}%
                      </span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,textAlign:'center'}}>
                      <div style={{background:'white',borderRadius:8,padding:'8px'}}>
                        <div style={{fontSize:16,fontWeight:900,color:'#4F6678'}}>{b.dispensed}</div>
                        <div style={{fontSize:9,color:C.text4}}>وحدات صُرفت</div>
                      </div>
                      <div style={{background:'white',borderRadius:8,padding:'8px'}}>
                        <div style={{fontSize:16,fontWeight:900,color:'#203640'}}>{b.added}</div>
                        <div style={{fontSize:9,color:C.text4}}>وحدات أُضيفت</div>
                      </div>
                      <div style={{background:'white',borderRadius:8,padding:'8px'}}>
                        <div style={{fontSize:16,fontWeight:900,color:'#717553'}}>{b.ops}</div>
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

      {/* أدوات الهدر — الباقة المتوسطة أو المتقدمة */}
      {(plan!=='basic'||hasAiAddon) && (
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
            <span style={{fontSize:18}}>📋</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>الوصفات وتقدير الإنتاج</div>
              <div style={{fontSize:11,color:C.text3}}>عرّف وصفة (اسم + مكوناتها)، والنظام يقدّر كم وحدة تم تحضيرها بناءً على استهلاك موظفيك الفعلي للمواد الخام</div>
            </div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <span style={{fontSize:10,color:C.text4,whiteSpace:'nowrap' as const}}>من</span>
            <input type="date" value={reconFrom} onChange={e=>setReconFrom(e.target.value)} style={{flex:1,padding:'6px 8px',border:`1px solid ${C.border2}`,borderRadius:7,fontSize:10,fontFamily:'inherit'}}/>
            <span style={{fontSize:10,color:C.text4,whiteSpace:'nowrap' as const}}>إلى</span>
            <input type="date" value={reconTo} onChange={e=>setReconTo(e.target.value)} style={{flex:1,padding:'6px 8px',border:`1px solid ${C.border2}`,borderRadius:7,fontSize:10,fontFamily:'inherit'}}/>
            {(reconFrom||reconTo) && (
              <button onClick={()=>{setReconFrom('');setReconTo('')}} style={{padding:'4px 8px',background:'none',border:'none',color:'#717553',fontSize:10,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline',whiteSpace:'nowrap' as const}}>تصفير</button>
            )}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              const bid2=sessionStorage.getItem('s_branch_id')
              const j=await api.get('/api/products',{org_id:orgId,branch_id:bid2,full:1})
              setRawMaterials(j.products||[])
              setShowRecipeModal(true)
            }} style={{flex:1,padding:'8px 14px',background:'white',color:'#717553',border:'1.5px solid #D9CDBE',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              + وصفة جديدة
            </button>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setReconLoading(true)
              const res=await fetch('/api/recipe-reconciliation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id'),from:reconFrom||undefined,to:reconTo||undefined})})
              const data=await res.json()
              setRecipeReconReport(data)
              setReconLoading(false)
            }} style={{flex:1,padding:'8px 14px',background:'#717553',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {reconLoading?'⏳ جاري...':'تقدير الإنتاج'}
            </button>
          </div>
          <button onClick={async()=>{ if(!showRecipesList) await loadRecipesList(); setShowRecipesList(v=>!v) }}
            style={{padding:'6px 0',background:'none',border:'none',color:'#717553',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>
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
                    <button onClick={()=>openEditRecipe(r.id)} style={{padding:'4px 10px',background:'#F3F5F6',color:'#4F6678',border:'1px solid #CBD4DC',borderRadius:7,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✏️ تعديل</button>
                    <button onClick={()=>deleteRecipe(r.id)} disabled={deletingRecipeId===r.id} style={{padding:'4px 10px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:7,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:deletingRecipeId===r.id?.6:1}}>{deletingRecipeId===r.id?'...':'🗑️ حذف'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {recipeReconReport && (
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:'1.5px solid #D9CDBE'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#717553',marginBottom:4}}>📋 تقدير الإنتاج ({reconFrom||reconTo ? `${reconFrom||'البداية'} إلى ${reconTo||'اليوم'}` : 'آخر 30 يوم'})</div>
          <div style={{fontSize:11,color:'#717553',marginBottom:16}}>محسوب من استهلاك المواد الخام الفعلي ÷ مكونات كل وصفة</div>

          {!recipeReconReport.hasData ? (
            <div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:13}}>
              ما فيه أي وصفة معرّفة بعد<br/>
              <span style={{fontSize:11}}>اضغط "+ وصفة جديدة" وأضف اسمها ومكوناتها أولاً</span>
            </div>
          ) : (
            <>
              {(()=>{
                const grandTotal = recipeReconReport.recipes.reduce((s:number,r:any)=>s+(r.totalCost||0),0)
                return grandTotal>0 && (
                  <div style={{background:'#F8EEDF',border:'1px solid #D9CDBE',borderRadius:10,padding:'12px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#16262D'}}>💰 إجمالي تكلفة الإنتاج التقديرية</span>
                    <span style={{fontSize:18,fontWeight:900,color:'#203640'}}>{grandTotal.toFixed(2)} ر.س</span>
                  </div>
                )
              })()}
            <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
              {recipeReconReport.recipes.map((r:any)=>(
                <div key={r.id} style={{background:C.bg,border:`1px solid ${C.border2}`,borderRadius:10,padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.text}}>{r.name}</span>
                    <span style={{fontSize:16,fontWeight:900,color:'#717553'}}>{r.estimatedProduced} وحدة</span>
                  </div>
                  {r.totalCost!==null && r.totalCost!==undefined && (
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,background:'#F8EEDF',borderRadius:7,padding:'6px 10px'}}>
                      <span style={{fontSize:10,color:'#16262D'}}>تكلفة الوحدة: {r.costPerUnit} ر.س</span>
                      <span style={{fontSize:12,fontWeight:800,color:'#203640'}}>الإجمالي: {r.totalCost} ر.س</span>
                    </div>
                  )}
                  {r.bottleneckName && (
                    <div style={{fontSize:9,color:'#b45309',marginBottom:8}}>⚠️ محدَّد بواسطة: {r.bottleneckName} (المكوّن الأقل توفراً)</div>
                  )}
                  {r.components.length>0 ? (
                    <div style={{display:'flex',flexDirection:'column' as const,gap:4}}>
                      {r.components.map((c:any,i:number)=>{
                        const isBottleneck = c.name===r.bottleneckName
                        return (
                          <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:10,color:isBottleneck?'#b45309':c.untracked?'#8EA0B1':C.text4,fontWeight:isBottleneck?700:400}}>
                            <span>{isBottleneck?'🔻 ':''}{c.name}: استهلاك {c.consumed} {c.unit}</span>
                            <span>{c.untracked ? 'غير متابَع بالصرف — تم استثناؤه' : `يكفي لـ ${c.impliedCount} وحدة`}</span>
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
            </>
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
            }} style={{padding:'6px 14px',background:'#717553',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
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
                    <div style={{fontSize:13,fontWeight:900,color:'#203640'}}>+{p.added}</div>
                    <div style={{fontSize:9,color:'#9ca3af'}}>أُضيف</div>
                  </div>
                  <div style={{background:'white',borderRadius:6,padding:'6px 4px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#4F6678'}}>-{p.dispensed}</div>
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
        <div style={{marginTop:16,background:C.surface,borderRadius:14,padding:'20px',border:'1.5px solid #D9CDBE'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#717553',marginBottom:4}}>🎯 تحسين نقطة إعادة الطلب</div>
          <div style={{fontSize:11,color:'#717553',marginBottom:16}}>مقارنة الحد الحالي بالحد المقترح بناءً على معدل الصرف ومدة توريد المورد</div>

          {reorderSuggestions.suggestions?.length===0 ? (
            <div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:13}}>
              ✅ كل حدود إعادة الطلب مضبوطة بشكل جيد ({reorderSuggestions.totalChecked} منتج تم فحصه)
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
              {(reorderSuggestions.suggestions||[]).map((s:any)=>(
                <div key={s.id} style={{padding:'12px 14px',background:'#F8EEDF',borderRadius:10,border:'1px solid #D9CDBE'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#43525B'}}>{s.name}</div>
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
                      <div style={{fontSize:16,fontWeight:900,color:'#717553'}}>{s.suggestedReorderPoint} {s.unit}</div>
                    </div>
                    <div style={{flex:1,textAlign:'left' as const,fontSize:10,color:'#9ca3af'}}>
                      معدل الصرف: {s.dailyRate}/يوم · مدة التوريد: {s.leadTimeDays} يوم
                    </div>
                  </div>
                  <button onClick={()=>applyReorderSuggestion(s.id, s.suggestedReorderPoint)} disabled={applyingId===s.id}
                    style={{width:'100%',padding:'8px',background:'#717553',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:applyingId===s.id?.6:1}}>
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
              <div style={{fontSize:22,fontWeight:900,color:'#4F6678'}}>{weeklyReport.totalProducts||0}</div>
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
        </>
      )}

      {plan==='basic' && !hasAiAddon && (
        <div className="fu ai-locked-panel" style={{marginTop:16,background:'#203640',borderRadius:6,padding:'28px 24px',textAlign:'center' as const}}>
          <div style={{fontSize:36,marginBottom:10}}>🔒✨</div>
          <div style={{fontSize:16,fontWeight:800,color:'white',marginBottom:6}}>أدوات ذكاء اصطناعي بانتظارك</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.65)',marginBottom:18,lineHeight:1.7,maxWidth:420,marginLeft:'auto',marginRight:'auto'}}>
            توقع نفاد المخزون، اقتراح كميات الشراء، تحليل الموسمية، تحسين نقطة إعادة الطلب، والتقرير الأسبوعي التلقائي — مع الباقة المتوسطة أو المتقدمة.
          </div>
          <a className="hide-in-app" href="/settings" style={{display:'inline-block',padding:'12px 28px',background:'#203640',color:'white',borderRadius:10,fontSize:13,fontWeight:800,textDecoration:'none'}}>ترقية الباقة</a>
        </div>
      )}

      {showRecipeModal && (
        <div className="ai-modal-backdrop" style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)'}} onClick={()=>{setShowRecipeModal(false);setEditingRecipeId(null)}}>
          <RecipeCreateModal
            onClose={()=>{setShowRecipeModal(false);setEditingRecipeId(null)}}
            onSaved={()=>{setShowRecipeModal(false);setEditingRecipeId(null);if(showRecipesList)loadRecipesList()}}
            rawMaterials={rawMaterials}
            orgId={typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null}
            branchId={typeof window!=='undefined'?sessionStorage.getItem('s_branch_id'):null}
            editingRecipeId={editingRecipeId}
          />
        </div>
      )}
    </div>
  )
}

function RecipeCreateModal({onClose,onSaved,rawMaterials,orgId,branchId,editingRecipeId}:{onClose:()=>void,onSaved:()=>void,rawMaterials:any[],orgId:string|null,branchId:string|null,editingRecipeId?:string|null}) {
  const [name,setName]=useState('')
  const [components,setComponents]=useState<{component_product_id:string,qty:string}[]>([])
  const [newCompId,setNewCompId]=useState('')
  const [newCompQty,setNewCompQty]=useState('')
  const [newCompSubUnit,setNewCompSubUnit]=useState(1)
  const [customSubLabel,setCustomSubLabel]=useState('')
  const [customSubCount,setCustomSubCount]=useState('')
  const [saving,setSaving]=useState(false)
  const [loadingEdit,setLoadingEdit]=useState(!!editingRecipeId)
  const [priceMap,setPriceMap]=useState<Record<string,number>>({})
  const [sellPrice,setSellPrice]=useState('')

  useEffect(()=>{
    if(!editingRecipeId) return
    ;(async()=>{
      const j=await api.get('/api/recipes',{org_id:sessionStorage.getItem('s_org_id'),id:editingRecipeId})
      const recipe=j.recipe, items=j.items
      if(recipe){ setName(recipe.name); if(recipe.sell_price) setSellPrice(String(recipe.sell_price)) }
      setComponents((items||[]).map((it:any)=>({component_product_id:it.component_product_id,qty:String(it.qty)})))
      setLoadingEdit(false)
    })()
  },[editingRecipeId])

  // متوسط سعر الشراء لكل مادة خام (نفس منهج تقرير الهدر) — يُستخدم لتقدير تكلفة الوصفة
  useEffect(()=>{
    if(!orgId) return
    ;(async()=>{
      const j=await api.get('/api/recipes',{org_id:orgId,branch_id:branchId,view:'prices'})
      setPriceMap(j.price_map||{})
    })()
  },[orgId])

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
      await api.patch('/api/products',{org_id:orgId,id:newCompId,recipe_unit:customSubLabel.trim(),recipe_unit_factor:customFactor})
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
        await api.patch('/api/products',{org_id:orgId,id:newCompId,recipe_unit:customSubLabel.trim(),recipe_unit_factor:customFactor})
      }
    }

    // الوصفات مشتركة على مستوى الشركة كاملة (مو حصرية بفرع واحد) — تُعرَّف مرة وتشتغل بكل الفروع تلقائياً
    const sellPriceVal = sellPrice ? Number(sellPrice) : null
    const r = await api.post('/api/recipes', { org_id: orgId, id: editingRecipeId || undefined, name: name.trim(), sell_price: sellPriceVal,
      items: finalComponents.map(c=>({component_product_id:c.component_product_id,qty:Number(c.qty)})) })
    if(!r.success){toast(r.error || (editingRecipeId?'فشل تحديث الوصفة — حاول مرة أخرى':'فشل حفظ الوصفة — حاول مرة أخرى'),'error');setSaving(false);return}
    if(finalComponents.length===0) {
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
    <div className="ai-recipe-modal" onClick={(e:any)=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:400,maxHeight:'85vh',overflowY:'auto',padding:20,fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl' as const}}>
      <div style={{fontSize:15,fontWeight:800,marginBottom:14}}>📋 {editingRecipeId?'تعديل الوصفة':'وصفة جديدة'}</div>
      <label style={{fontSize:11,fontWeight:700,color:'#6b7280',display:'block',marginBottom:5}}>اسم الوصفة *</label>
      <input value={name} onChange={(e:any)=>setName(e.target.value)} placeholder="مثال: اسم المنتج النهائي" style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e7eb',borderRadius:9,fontSize:13,marginBottom:14,fontFamily:'inherit'}}/>

      <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>مكوّنات الوصفة</div>
      {components.length>0 && (
        <div style={{display:'flex',flexDirection:'column' as const,gap:6,marginBottom:8}}>
          {components.map(c=>{
            const comp=rawMaterials.find(r=>r.id===c.component_product_id)
            const unitPrice = comp ? (priceMap[comp.name]||0) : 0
            const compCost = unitPrice * Number(c.qty)
            return (
              <div key={c.component_product_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'6px 10px'}}>
                <span style={{fontSize:11}}>{comp?.name||'—'} — {c.qty} {comp?.unit}</span>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {unitPrice>0 && <span style={{fontSize:10,color:'#203640',fontWeight:700}}>{compCost.toFixed(2)} ر.س</span>}
                  <button onClick={()=>setComponents(prev=>prev.filter(x=>x.component_product_id!==c.component_product_id))} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:14}}>×</button>
                </div>
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
        <button onClick={addComp} style={{padding:'0 12px',background:'#203640',color:'white',border:'none',borderRadius:8,fontSize:16,fontWeight:700,cursor:'pointer'}}>+</button>
      </div>

      {(()=>{
        const totalCost = components.reduce((s,c)=>{
          const comp=rawMaterials.find(r=>r.id===c.component_product_id)
          const unitPrice = comp ? (priceMap[comp.name]||0) : 0
          return s + unitPrice*Number(c.qty)
        },0)
        const hasCostData = totalCost>0
        const foodCostPct = hasCostData && sellPrice && Number(sellPrice)>0 ? (totalCost/Number(sellPrice))*100 : null
        return (
          <div style={{background:'#F8EEDF',border:'1px solid #D9CDBE',borderRadius:10,padding:12,marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:hasCostData?10:0}}>
              <span style={{fontSize:11,fontWeight:700,color:'#16262D'}}>💰 التكلفة التقديرية</span>
              <span style={{fontSize:15,fontWeight:900,color:'#203640'}}>{hasCostData ? totalCost.toFixed(2)+' ر.س' : 'لا توجد بيانات أسعار'}</span>
            </div>
            {hasCostData && (
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:10,color:'#16262D',display:'block',marginBottom:4}}>سعر البيع (اختياري)</label>
                  <input type="number" min="0" step="0.01" value={sellPrice} onChange={(e:any)=>setSellPrice(e.target.value)} placeholder="مثال: 25" style={{width:'100%',padding:'7px 10px',border:'1px solid #D9CDBE',borderRadius:7,fontSize:12}}/>
                </div>
                {foodCostPct!==null && (
                  <div style={{textAlign:'center' as const,padding:'4px 12px'}}>
                    <div style={{fontSize:16,fontWeight:900,color:foodCostPct<=30?'#203640':foodCostPct<=35?'#d97706':'#dc2626'}}>{foodCostPct.toFixed(0)}%</div>
                    <div style={{fontSize:9,color:'#6b7280'}}>Food Cost</div>
                  </div>
                )}
              </div>
            )}
            {!hasCostData && <div style={{fontSize:10,color:'#6b7280'}}>سجّل مشتريات لهذي المكوّنات عشان تظهر التكلفة تلقائياً</div>}
          </div>
        )
      })()}

      <div style={{display:'flex',gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:'11px',background:'#f9fafb',color:'#374151',border:'1px solid #e5e7eb',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
        <button onClick={save} disabled={saving||!name.trim()} style={{flex:2,padding:'11px',background:'#717553',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:saving||!name.trim()?.6:1}}>
          {saving?'جاري الحفظ...':(editingRecipeId?'حفظ التعديلات':'حفظ الوصفة')}
        </button>
      </div>
    </div>
  )
}
