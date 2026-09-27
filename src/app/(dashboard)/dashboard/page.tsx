'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Component } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { cache } from '@/lib/cache'
import { useRouter } from 'next/navigation'
import { currencySymbol } from '@/lib/currencySymbol'
import { ShoppingCart, Plus, ArrowUpRight, X, Package, AlertTriangle, Receipt, Send, Sun, Sunset, Moon, Bell, CalendarDays, RotateCcw, Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { colors as dsColors } from '@/lib/ds'
import { useTranslation } from '@/lib/i18n/LanguageContext'

// ألوان مميزة لكل نوع رقم — درجات هادئة، مو ألوان صارخة
const TONES = {
  teal:   { fg:'#0f766e', bg:'#ecfdf8', soft:'#99e0d6' },
  rose:   { fg:'#e11d48', bg:'#fff1f3', soft:'#fecdd6' },
  indigo: { fg:'#4f46e5', bg:'#eef2ff', soft:'#c7d2fe' },
  amber:  { fg:'#c2410c', bg:'#fff7ed', soft:'#fed7aa' },
}

class ErrorBoundary extends Component<{children:React.ReactNode},{error:Error|null}> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) return <div style={{padding:24,textAlign:'center',color:'#ef4444',fontSize:13}}>حدث خطأ — حاول مرة أخرى</div>
    return this.props.children
  }
}

function Bar({ data, color, soft }: { data:{label:string;value:number}[]; color:string; soft:string }) {
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:6,height:88}}>
      {data.map((d,i)=>{
        const last = i===data.length-1
        return (
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{width:'100%',height:66,display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
              <div title={String(d.value)} className="dh-col" style={{width:'100%',borderRadius:'6px 6px 2px 2px',height:`${Math.max((d.value/max)*100,4)}%`,background:last?`linear-gradient(180deg,${color},${color}cc)`:soft}}/>
            </div>
            <div style={{fontSize:11,color:last?'#344054':'#98a2b3',fontWeight:last?600:400}}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { t, lang, dir } = useTranslation()
  const [stats, setStats]       = useState({products:0,lowStock:0,outOfStock:0,todayPurchases:0,todayDispenses:0})
  const [lowItems, setLowItems] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [orgName, setOrgName]   = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading]   = useState(true)
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([])
  const [monthComp, setMonthComp] = useState<any>(null)
  const [subAlert, setSubAlert] = useState<string|null>(null)
  const [weeklyP, setWeeklyP]   = useState<{label:string;value:number}[]>([])
  const [weeklyD, setWeeklyD]   = useState<{label:string;value:number}[]>([])
  const [visible, setVisible]   = useState(false)
  const [notifs, setNotifs]     = useState<any[]>([])
  const [curr, setCurr]         = useState('ر.س')
  const [subExpired, setSubExpired] = useState(false)
  const sb = createClient()
  const router = useRouter()

  useEffect(()=>{
    const oid = sessionStorage.getItem('s_org_id')
    if(oid){ load(); return }
    let a=0
    const c=setInterval(()=>{
      a++
      if(sessionStorage.getItem('s_branch_id')||sessionStorage.getItem('s_org_id')||a>15){clearInterval(c);load()}
    },50)
    return()=>clearInterval(c)
  },[])

  // تحديث تلقائي صامت للوحة الأداء كل 20 ثانية
  useEffect(() => {
    const interval = setInterval(() => load(), 20000)
    return () => clearInterval(interval)
  }, [])

  // اشتراك لحظي (Realtime) — إشعار جديد يضاف فوراً بدون انتظار دورة التحديث كل 20 ثانية
  useEffect(() => {
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) return
    let channel: any = null
    try {
      channel = sb.channel(`dashboard-notifs-${orgId}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `org_id=eq.${orgId}` }, (payload:any) => {
          setNotifs(prev => [payload.new, ...prev].slice(0, 5))
        })
        .subscribe()
    } catch {
      // فشل الاشتراك اللحظي بالإشعارات ما لازم يكسر الصفحة كاملة -- الإشعارات تفضل تتحدث عادي كل 20 ثانية عبر load()
    }
    return () => { if (channel) sb.removeChannel(channel) }
  }, [])

  async function load() {
    // عرض الكاش فوراً إذا متوفر
    const orgId_cached = sessionStorage.getItem('s_org_id')
    if(orgId_cached){
      const cached = cache.get('dashboard:'+orgId_cached)
      if(cached){
        setStats(cached.stats); setLowItems(cached.lowItems)
        setActivity(cached.activity); setWeeklyP(cached.weeklyP)
        setWeeklyD(cached.weeklyD); setNotifs(cached.notifs)
        setLoading(false); setVisible(true)
      }
    }
    const me=await getMe(); if(!me)return
    {
      setUserName(me.full_name||'')
      setOrgName(me.org?.name||'')
      const endsAt=me.subscription_ends_at
      if(endsAt){
        const days=Math.ceil((new Date(endsAt).getTime()-Date.now())/(1000*60*60*24))
        if(days<=0){ setSubExpired(true); setSubAlert(lang==='ar'?'انتهى اشتراكك — يرجى التجديد لمتابعة استخدام النظام':'Your subscription has expired — please renew to continue using the system') }
        else if(days<=7) setSubAlert(lang==='ar'?`ينتهي اشتراكك بعد ${days} أيام`:`Your subscription ends in ${days} days`)
      }
    }
    const orgId=me.org_id
    sessionStorage.setItem('s_profile_id',me.user_id)
    if(me.org?.currency) setCurr(currencySymbol(me.org.currency))
    const bid=sessionStorage.getItem('s_branch_id')
    const sum=await api.get('/api/dashboard-summary',{org_id:orgId,branch_id:bid})
    if(!sum.success)return
    const purchases:{created_at:string}[]=(sum.purchase_dates||[]).map((created_at:string)=>({created_at}))
    const movements:any[]=sum.movements||[]
    const nData=sum.notifications||[]
    const today=new Date().toDateString()
    setStats({
      products:sum.products_count,
      lowStock:sum.low_count,
      outOfStock:sum.out_count,
      todayPurchases:purchases.filter((p:any)=>new Date(p.created_at).toDateString()===today).length,
      todayDispenses:movements.filter((m:any)=>m.type==='out'&&new Date(m.created_at).toDateString()===today).length,
    })
    setLowItems(sum.low_items||[])
    setActivity((movements||[]).slice(0,5))
    const dnames=lang==='ar'?['أحد','إثن','ثلث','أرب','خمس','جمع','سبت']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const wp:any[]=[],wd:any[]=[]
    for(let i=6;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i)
      const ds=d.toDateString(),lbl=dnames[d.getDay()]
      wp.push({label:lbl,value:(purchases||[]).filter((p:any)=>new Date(p.created_at).toDateString()===ds).length})
      wd.push({label:lbl,value:(movements||[]).filter((m:any)=>m.type==='out'&&new Date(m.created_at).toDateString()===ds).length})
    }
    setWeeklyP(wp);setWeeklyD(wd)
    setNotifs(nData||[])
    // توقيت الطلب الذكي
    fetch('/api/smart-reorder-timing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:bid})}).then(r=>r.json()).then(d=>{ if(d.success) setSmartSuggestions(d.suggestions||[]) }).catch(()=>{})
    // مقارنة الأداء الشهري
    fetch('/api/month-comparison?org_id='+orgId+'&branch_id='+(sessionStorage.getItem('s_branch_id')||'')).then(r=>r.json()).then(d=>{ if(d.success) setMonthComp(d) }).catch(()=>{})
    // خزّن في الكاش
    if(orgId_cached){
      cache.set('dashboard:'+orgId_cached, {
        stats:{products:sum.products_count,lowStock:sum.low_count,outOfStock:sum.out_count,todayPurchases:purchases.filter((p:any)=>new Date(p.created_at).toDateString()===today).length,todayDispenses:movements.filter((m:any)=>m.type==='out'&&new Date(m.created_at).toDateString()===today).length},
        lowItems:sum.low_items||[], activity:movements.slice(0,5),
        weeklyP:wp, weeklyD:wd, notifs:nData||[]
      })
    }
    setLoading(false);setTimeout(()=>setVisible(true),50)
  }

  const hour=new Date().getHours()
  const greeting=hour<12?t('dashboard.goodMorning'):hour<17?t('dashboard.goodAfternoon'):t('dashboard.goodEvening')

  const fmtMoney=(v:number)=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:0})+' '+curr
  const dismiss=async(id:string)=>{
    const oid=sessionStorage.getItem('s_org_id')
    if(oid) await api.patch('/api/notifications',{org_id:oid,id})
    setNotifs(prev=>prev.filter(x=>x.id!==id))
  }
  const toneColor:Record<string,string>={danger:dsColors.danger,warning:dsColors.warning,success:dsColors.primary,info:dsColors.info}
  const attention = notifs.length>0 || smartSuggestions.length>0 || !!subAlert

  if(loading) return (
    <div className="dh">
      <style>{DASH_CSS}</style>
      <div className="dh-sk" style={{height:44,width:260,marginBottom:20}}/>
      <div className="dh-kpis">{[1,2,3,4].map(i=><div key={i} className="dh-sk" style={{height:92}}/>)}</div>
      <div className="dh-sk" style={{height:220,marginTop:16}}/>
    </div>
  )

  return (
    <ErrorBoundary>
    <div className="dh" dir={dir}>
      <style>{DASH_CSS}</style>

      {/* العنوان + إجراءات سريعة */}
      <div className="dh-head">
        <div className="dh-hello">
          <span className="dh-hello-icon">{hour<12?<Sun size={22}/>:hour<17?<Sunset size={22}/>:<Moon size={22}/>}</span>
          <div>
            <h1 className="dh-title">{greeting}، {userName||t('dashboard.defaultGreeting')}</h1>
            <div className="dh-sub">
              <span className="dh-org">{orgName}</span>
              <span className="dh-date"><CalendarDays size={13}/>{new Date().toLocaleDateString(lang==='ar'?'ar-SA':'en-US',{numberingSystem:'latn',weekday:'long',month:'long',day:'numeric'})}</span>
            </div>
          </div>
        </div>
        <div className="dh-actions">
          <button className="sh-btn" onClick={()=>router.push('/purchases')}><ShoppingCart size={16}/> تسجيل شراء</button>
          <button className="sh-btn" onClick={()=>router.push('/inventory')}><Plus size={16}/> إضافة منتج</button>
          <button className="sh-btn sh-btn-primary" onClick={()=>router.push('/dispense')}><ArrowUpRight size={16}/> تسجيل صرف</button>
        </div>
      </div>

      {/* الأرقام */}
      <div className="dh-kpis">
        {[
          {label:t('dashboard.statItems'), val:stats.products, note:t('dashboard.inStock'), href:'/inventory', tone:TONES.teal, Icon:Package},
          {label:'تحت الحد الأدنى', val:stats.lowStock, note:stats.outOfStock>0?`منها ${stats.outOfStock} نفدت`:'لا يوجد صنف نافد', href:'/inventory', tone:TONES.rose, Icon:AlertTriangle, alert:stats.lowStock>0},
          {label:t('dashboard.statTodayPurchase'), val:stats.todayPurchases, note:t('dashboard.invoice'), href:'/purchases', tone:TONES.indigo, Icon:Receipt},
          {label:t('dashboard.statTodayDispense'), val:stats.todayDispenses, note:t('dashboard.operation'), href:'/dispense', tone:TONES.amber, Icon:Send},
        ].map((k,i)=>(
          <button key={i} className="dh-kpi" onClick={()=>router.push(k.href)}
            style={{'--tone':k.tone.fg,'--tone-bg':k.tone.bg,'--tone-soft':k.tone.soft,animationDelay:`${i*60}ms`} as React.CSSProperties}>
            <div className="dh-kpi-top">
              <div className="dh-kpi-label">{k.label}</div>
              <span className="dh-kpi-icon"><k.Icon size={17} strokeWidth={2}/></span>
            </div>
            <div className="dh-kpi-val" style={k.alert?{color:k.tone.fg}:undefined}>{k.val.toLocaleString('en-US')}</div>
            <div className="dh-kpi-note">{k.note}</div>
          </button>
        ))}
      </div>

      <div className="dh-grid">
        {/* تحتاج انتباهك */}
        {attention && (
          <section className="dh-card dh-span">
            <div className="dh-card-head"><span className="dh-card-title"><span className="dh-card-icon" style={{color:TONES.rose.fg,background:TONES.rose.bg}}><Bell size={15}/></span>تحتاج انتباهك</span></div>
            {subAlert && (
              <div className="dh-row">
                <span className="dh-dot" style={{background:subExpired?dsColors.danger:dsColors.warning}}/>
                <div className="dh-row-main"><div className="dh-row-title">{subAlert}</div></div>
                <button className="sh-btn sh-btn-sm hide-in-app" onClick={()=>router.push('/settings')}>التفاصيل</button>
              </div>
            )}
            {smartSuggestions.slice(0,4).map((s:any,i:number)=>(
              <div key={'s'+i} className="dh-row">
                <span className="dh-dot" style={{background:s.urgency==='now'?dsColors.danger:dsColors.warning}}/>
                <div className="dh-row-main">
                  <div className="dh-row-title">
                    <span className={'dh-pill '+(s.urgency==='now'?'dh-pill-rose':'dh-pill-amber')}>{s.urgency==='now'?'اطلب الآن':`خلال ${Math.max(s.suggestedOrderInDays,0)} ${t('dashboard.days')}`}</span>
                    {s.name}
                  </div>
                  <div className="dh-row-sub">استهلاك {s.dailyRate} {s.unit} يومياً · التوريد يأخذ {s.avgLeadTimeDays} {t('dashboard.days')} عادة</div>
                </div>
                <button className="sh-btn sh-btn-sm" onClick={()=>router.push('/suppliers')}>الموردين</button>
              </div>
            ))}
            {notifs.map((n:any)=>(
              <div key={n.id} className="dh-row">
                <span className="dh-dot" style={{background:toneColor[n.type]||dsColors.info}}/>
                <div className="dh-row-main">
                  <div className="dh-row-title">{n.title}</div>
                  <div className="dh-row-sub">{n.message}</div>
                </div>
                <button className="sh-icon-btn sh-icon-sm" aria-label="إخفاء" onClick={()=>dismiss(n.id)}><X size={16}/></button>
              </div>
            ))}
          </section>
        )}

        {/* هذا الشهر */}
        {monthComp?.success && (
          <section className="dh-card dh-span">
            <div className="dh-card-head"><span className="dh-card-title"><span className="dh-card-icon" style={{color:TONES.teal.fg,background:TONES.teal.bg}}><TrendingUp size={15}/></span>هذا الشهر</span><span className="dh-muted">مقارنة بالشهر الماضي</span></div>
            <div className="dh-month">
              {[
                {label:'المبيعات', value:fmtMoney(monthComp.current.sales), change:monthComp.changes.sales},
                {label:'المشتريات', value:fmtMoney(monthComp.current.purchasesTotal), change:monthComp.changes.purchases, inverse:true},
                {label:'الصافي', value:fmtMoney(monthComp.current.net), change:monthComp.changes.net},
                {label:'عمليات الصرف', value:Number(monthComp.current.dispenseCount).toLocaleString('en-US'), change:monthComp.changes.dispenseCount},
              ].map((m,i)=>(
                <div key={i} className="dh-month-cell">
                  <div className="dh-kpi-label">{m.label}</div>
                  <div className="dh-month-val">{m.value}</div>
                  {m.change!==null && m.change!==undefined && (
                    <div className={'dh-change '+((m.change>=0)!==!!m.inverse?'dh-change-up':'dh-change-down')} dir="ltr">
                      {m.change>=0?<TrendingUp size={13}/>:<TrendingDown size={13}/>}
                      {m.change>=0?'+':'−'}{Math.abs(m.change)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* تحتاج إعادة طلب */}
        <section className="dh-card">
          <div className="dh-card-head">
            <span className="dh-card-title"><span className="dh-card-icon" style={{color:TONES.amber.fg,background:TONES.amber.bg}}><RotateCcw size={15}/></span>تحتاج إعادة طلب</span>
            {lowItems.length>0 && <button className="dh-link" onClick={()=>router.push('/inventory')}>عرض المخزون</button>}
          </div>
          {lowItems.length===0 ? <div className="dh-empty">كل الأصناف فوق الحد الأدنى</div> : lowItems.map((p:any,i:number)=>{
            const pct=Math.min(Math.round((p.qty/Math.max(p.reorder_point,1))*100),100)
            const out=Number(p.qty)<=0
            return (
              <button key={i} className="dh-row dh-row-btn" onClick={()=>router.push('/inventory')}>
                <div className="dh-row-main">
                  <div className="dh-row-title">{p.name}</div>
                  <div className="dh-bar"><div style={{width:Math.max(pct,3)+'%',background:out||pct<30?'linear-gradient(90deg,#fb7185,#e11d48)':'linear-gradient(90deg,#fdba74,#ea580c)'}}/></div>
                </div>
                <div className="dh-qty" style={{color:out?dsColors.danger:dsColors.text}}>{p.qty} <span className="dh-muted">/ {p.reorder_point} {p.unit}</span></div>
              </button>
            )
          })}
        </section>

        {/* آخر الحركات */}
        <section className="dh-card">
          <div className="dh-card-head">
            <span className="dh-card-title"><span className="dh-card-icon" style={{color:TONES.indigo.fg,background:TONES.indigo.bg}}><Activity size={15}/></span>آخر الحركات</span>
            {activity.length>0 && <button className="dh-link" onClick={()=>router.push('/reports')}>التقارير</button>}
          </div>
          {activity.length===0 ? <div className="dh-empty">ما فيه حركات بعد</div> : activity.map((m:any,i:number)=>(
            <div key={i} className="dh-row">
              <div className="dh-row-main">
                <div className="dh-row-title">{(m.products as any)?.name||'—'}</div>
                <div className="dh-row-sub">{m.type==='out'?'صرف':m.type==='in'?'إضافة':m.type==='waste'?'هدر':'حركة'} · {new Date(m.created_at).toLocaleString('ar-SA',{numberingSystem:'latn',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</div>
              </div>
              <div className="dh-qty" style={{color:m.qty_change<0?dsColors.danger:dsColors.primary}}>{m.qty_change>0?'+':''}{m.qty_change} <span className="dh-muted">{(m.products as any)?.unit}</span></div>
            </div>
          ))}
        </section>

        {/* الأسبوع */}
        {[
          {title:'المشتريات آخر 7 أيام', data:weeklyP, unit:'فاتورة', tone:TONES.indigo, Icon:ShoppingCart},
          {title:'الصرف آخر 7 أيام', data:weeklyD, unit:'عملية', tone:TONES.amber, Icon:Send},
        ].map((c,i)=>(
          <section key={i} className="dh-card">
            <div className="dh-card-head"><span className="dh-card-title"><span className="dh-card-icon" style={{color:c.tone.fg,background:c.tone.bg}}><c.Icon size={15}/></span>{c.title}</span><span className="dh-total" style={{color:c.tone.fg,background:c.tone.bg}}>{c.data.reduce((s,d)=>s+d.value,0)} {c.unit}</span></div>
            <div style={{padding:'16px 18px 16px'}}><Bar data={c.data} color={c.tone.fg} soft={c.tone.soft}/></div>
          </section>
        ))}
      </div>
    </div>
    </ErrorBoundary>
  )
}

const DASH_CSS = `
  .dh{font-family:'IBM Plex Sans Arabic',system-ui,sans-serif}
  .dh *{box-sizing:border-box}
  .dh-head{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px;padding:20px 22px;border-radius:16px;border:1px solid #d7efe9;
    background:radial-gradient(circle at 8% 120%,rgba(251,191,36,.16),transparent 38%),radial-gradient(circle at 95% -30%,rgba(15,118,110,.14),transparent 45%),linear-gradient(120deg,#f3fbf8 0%,#fbfcfa 55%,#fffaf2 100%)}
  .dh-hello{display:flex;align-items:center;gap:14px;min-width:0}
  .dh-hello-icon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;flex-shrink:0;color:#b45309;background:#fff;box-shadow:0 1px 2px rgba(16,24,40,.06),inset 0 0 0 1px #fde9c8}
  .dh-title{font-size:21px;font-weight:700;color:${dsColors.text};margin:0;letter-spacing:-.2px}
  .dh-sub{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;color:${dsColors.text3};margin-top:5px}
  .dh-org{font-weight:600;color:#0f766e}
  .dh-date{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:99px;background:rgba(255,255,255,.75);border:1px solid ${dsColors.border}}
  .dh-actions{display:flex;gap:8px;flex-wrap:wrap}
  @media(max-width:640px){.dh-actions{display:none}}
  .dh-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:16px}
  @media(min-width:900px){.dh-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}}
  .dh-kpi{position:relative;overflow:hidden;background:${dsColors.surface};border:1px solid ${dsColors.border};border-radius:14px;padding:16px 16px 15px;text-align:right;font-family:inherit;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s;animation:dhIn .4s ease both}
  .dh-kpi::before{content:'';position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,var(--tone-soft),var(--tone))}
  .dh-kpi::after{content:'';position:absolute;width:120px;height:120px;border-radius:50%;left:-40px;bottom:-60px;background:var(--tone-bg);opacity:.9;pointer-events:none}
  .dh-kpi>*{position:relative;z-index:1}
  .dh-kpi:hover{transform:translateY(-2px);border-color:var(--tone-soft);box-shadow:0 10px 22px -12px rgba(16,24,40,.22)}
  .dh-kpi-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .dh-kpi-icon{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;color:var(--tone);background:var(--tone-bg)}
  .dh-kpi-label{font-size:13px;color:${dsColors.text3};font-weight:500}
  .dh-kpi-val{font-size:28px;font-weight:700;color:${dsColors.text};margin-top:6px;line-height:1.2;font-variant-numeric:tabular-nums}
  .dh-kpi-note{font-size:12px;color:${dsColors.text4};margin-top:4px}
  .dh-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
  @media(min-width:900px){.dh-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dh-span{grid-column:1/-1}}
  .dh-card{background:${dsColors.surface};border:1px solid ${dsColors.border};border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(16,24,40,.04);animation:dhIn .45s ease both}
  .dh-card-title{display:inline-flex;align-items:center;gap:9px}
  .dh-card-icon{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
  .dh-total{font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px}
  .dh-pill{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:8px;vertical-align:1px}
  .dh-pill-rose{color:#be123c;background:#fff1f3}
  .dh-pill-amber{color:#c2410c;background:#fff7ed}
  .dh-col{transition:filter .15s}
  .dh-col:hover{filter:brightness(.93)}
  .dh-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid ${dsColors.border};font-size:14px;font-weight:600;color:${dsColors.text}}
  .dh-muted{font-size:12px;font-weight:400;color:${dsColors.text4}}
  .dh-link{border:none;background:none;padding:0;color:${dsColors.primary};font-size:13px;font-weight:600;font-family:inherit;cursor:pointer}
  .dh-row{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid ${dsColors.border};width:100%;background:none;border-left:none;border-right:none;border-top:none;font-family:inherit;text-align:right}
  .dh-row:last-child{border-bottom:none}
  .dh-row-btn{cursor:pointer}
  .dh-row-btn:hover{background:#fafbfa}
  .dh-row-main{flex:1;min-width:0}
  .dh-row-title{font-size:13.5px;font-weight:500;color:${dsColors.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dh-row-sub{font-size:12px;color:${dsColors.text3};margin-top:2px}
  .dh-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .dh-qty{font-size:13.5px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
  .dh-bar{height:5px;background:#f2f4f7;border-radius:99px;overflow:hidden;margin-top:7px;max-width:220px}
  .dh-bar>div{height:100%;border-radius:99px}
  .dh-empty{padding:28px 18px;text-align:center;font-size:13px;color:${dsColors.text3}}
  .dh-month{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
  @media(min-width:700px){.dh-month{grid-template-columns:repeat(4,minmax(0,1fr))}}
  .dh-month-cell{padding:16px 18px;border-left:1px solid ${dsColors.border};border-bottom:1px solid ${dsColors.border}}
  .dh-month-val{font-size:18px;font-weight:700;color:${dsColors.text};margin-top:6px;font-variant-numeric:tabular-nums}
  .dh-change{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;margin-top:7px;padding:2px 8px;border-radius:99px}
  .dh-change-up{color:#047857;background:#ecfdf5}
  .dh-change-down{color:#be123c;background:#fff1f3}
  .dh-sk{background:#eceef1;border-radius:12px;animation:dhsk 1.4s ease infinite}
  @keyframes dhsk{0%,100%{opacity:1}50%{opacity:.5}}
  @keyframes dhIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @media(prefers-reduced-motion:reduce){.dh-kpi,.dh-card{animation:none}.dh-kpi:hover{transform:none}}
`

