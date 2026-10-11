'use client'
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, react-hooks/immutability */
export const dynamic = 'force-dynamic'
import { useState, useEffect, Component } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { cache } from '@/lib/cache'
import { useRouter } from 'next/navigation'
import { currencySymbol } from '@/lib/currencySymbol'
import { AlertTriangle, ArrowUpRight, Bell, Package, Plus, Send, ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyDataTable, StorelyEmptyState, StorelyMetricStrip, StorelyPageHeader, StorelyStatusBadge, StorelyTableAction, StorelyTableActionGroup, type StorelyDataTableColumn, type StorelyMetric } from '@/components/ui'
import { useTranslation } from '@/lib/i18n/LanguageContext'

class ErrorBoundary extends Component<{children:React.ReactNode},{error:Error|null}> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) return <div style={{padding:24,textAlign:'center',color:'#ef4444',fontSize:13}}>حدث خطأ — حاول مرة أخرى</div>
    return this.props.children
  }
}

function WeeklyBars({ data }: { data:{label:string;value:number}[] }) {
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <div className="flex h-36 items-end gap-4 px-6 py-6">
      {data.map((d,i)=>{
        const last = i===data.length-1
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
            <div className="flex h-24 w-full items-end overflow-hidden rounded-b-[3px] rounded-t-[7px] bg-[#F4F7F8]">
              <div
                title={String(d.value)}
                className={last ? 'w-full rounded-b-[3px] rounded-t-[7px] bg-[#203640]' : 'w-full rounded-b-[3px] rounded-t-[7px] bg-[#9AA9B1]/60'}
                style={{height:`${Math.max((d.value/max)*100,4)}%`}}
              />
            </div>
            <div className={last ? 'text-[13px] font-semibold leading-6 text-[#203640]' : 'text-[13px] font-medium leading-6 text-[#66737C]'}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

const surfaceClass = 'border-[#DEE6EA] shadow-[0_1px_2px_rgba(32,54,64,0.035)]'
const cardClass = `${surfaceClass} [&>div:first-child]:border-[#E6ECEF] [&>div:first-child]:px-6 [&>div:first-child]:py-5 [&_h2]:text-[18px] [&_h2]:leading-7 [&_p]:text-[13px] [&_p]:leading-6`
const compactCardClass = `${surfaceClass} [&>div:first-child]:border-[#E6ECEF] [&>div:first-child]:px-6 [&>div:first-child]:py-4 [&_h2]:text-[17px] [&_h2]:leading-7 [&_p]:text-[13px] [&_p]:leading-6`
const tableClass = 'border-0 rounded-none [&_table]:text-[15px] [&_thead]:bg-[#F7F9FA] [&_th]:h-12 [&_th]:border-[#E6ECEF] [&_th]:px-6 [&_th]:py-3 [&_th]:text-[13px] [&_th]:font-semibold [&_th]:text-[#5F6F78] [&_td]:h-14 [&_td]:px-6 [&_td]:py-4 [&_tr]:border-[#E6ECEF] [&_tbody_tr:hover]:bg-[#F7F9FA]'
const secondaryButtonClass = 'border-[#CED8DD] hover:border-[#B9C8CF] hover:bg-[#F6F9FA]'

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
  const attention = notifs.length>0 || smartSuggestions.length>0 || !!subAlert
  const branchName = typeof window !== 'undefined' ? sessionStorage.getItem('s_branch_name') || '' : ''

  const metrics: StorelyMetric[] = [
    {
      label: t('dashboard.statItems'),
      value: stats.products.toLocaleString('en-US'),
      helper: t('dashboard.inStock'),
      tone: 'neutral',
    },
    {
      label: t('dashboard.statTodayDispense'),
      value: stats.todayDispenses.toLocaleString('en-US'),
      helper: t('dashboard.operation'),
      tone: stats.todayDispenses > 0 ? 'success' : 'neutral',
    },
    {
      label: t('dashboard.statTodayPurchase'),
      value: stats.todayPurchases.toLocaleString('en-US'),
      helper: t('dashboard.invoice'),
      tone: 'info',
    },
    {
      label: 'تحت الحد الأدنى',
      value: stats.lowStock.toLocaleString('en-US'),
      helper: stats.outOfStock>0 ? 'منها ' + stats.outOfStock + ' نفدت' : 'لا يوجد صنف نافد',
      tone: stats.lowStock > 0 ? 'danger' : 'success',
    },
    {
      label: 'أداء الفرع',
      value: monthComp?.success ? fmtMoney(monthComp.current.net) : stats.products.toLocaleString('en-US'),
      helper: monthComp?.success ? 'الصافي' : t('dashboard.inStock'),
      tone: monthComp?.success && Number(monthComp.current.net) < 0 ? 'warning' : 'neutral',
    },
    {
      label: 'إجراءات مطلوبة',
      value: (notifs.length + smartSuggestions.length + (subAlert ? 1 : 0)).toLocaleString('en-US'),
      helper: attention ? 'تحتاج مراجعة' : 'لا توجد إجراءات معلقة',
      tone: attention ? 'warning' : 'success',
    },
  ]

  const lowStockColumns: StorelyDataTableColumn<any>[] = [
    { key: 'name', header: 'الصنف', sortable: true, sortValue: (p:any) => p.name || '', cell: (p:any) => <span className="font-semibold leading-7 text-[#203640]">{p.name}</span> },
    { key: 'qty', header: 'المتاح', sortable: true, sortValue: (p:any) => Number(p.qty || 0), cell: (p:any) => <span className="tabular-nums">{p.qty} {p.unit}</span> },
    { key: 'reorder', header: 'حد إعادة الطلب', sortable: true, sortValue: (p:any) => Number(p.reorder_point || 0), cell: (p:any) => <span className="tabular-nums text-[#66737C]">{p.reorder_point} {p.unit}</span> },
    { key: 'status', header: 'الحالة', cell: (p:any) => Number(p.qty) <= 0 ? <StorelyStatusBadge status="danger">نافد</StorelyStatusBadge> : <StorelyStatusBadge status="warning">منخفض</StorelyStatusBadge> },
    { key: 'action', header: '', className: 'w-12 text-left', cell: () => <StorelyTableActionGroup className="justify-end"><StorelyTableAction action="view" className="hover:bg-[#EEF3F5]" onClick={(event)=>{event.stopPropagation(); router.push('/inventory')}} /></StorelyTableActionGroup> },
  ]

  const activityColumns: StorelyDataTableColumn<any>[] = [
    { key: 'product', header: 'الصنف', sortable: true, sortValue: (m:any) => (m.products as any)?.name || '', cell: (m:any) => <span className="font-semibold leading-7 text-[#203640]">{(m.products as any)?.name || '—'}</span> },
    { key: 'type', header: 'النوع', cell: (m:any) => { const label = m.type==='out' ? 'صرف' : m.type==='in' ? 'إضافة' : m.type==='waste' ? 'هدر' : 'حركة'; const status = m.type==='out' ? 'info' : m.type==='in' ? 'success' : m.type==='waste' ? 'danger' : 'warning'; return <StorelyStatusBadge status={status}>{label}</StorelyStatusBadge> } },
    { key: 'qty', header: 'الكمية', sortable: true, sortValue: (m:any) => Number(m.qty_change || 0), cell: (m:any) => <span className={m.qty_change < 0 ? 'font-semibold tabular-nums text-[#B91C1C]' : 'font-semibold tabular-nums text-[#047857]'}>{m.qty_change>0?'+':''}{m.qty_change} {(m.products as any)?.unit}</span> },
    { key: 'date', header: 'الوقت', sortable: true, sortValue: (m:any) => m.created_at || '', cell: (m:any) => <span className="whitespace-nowrap text-[#66737C]">{new Date(m.created_at).toLocaleString('ar-SA',{numberingSystem:'latn',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span> },
  ]

  const performanceRows = monthComp?.success ? [
    { metric:'المبيعات', current:fmtMoney(monthComp.current.sales), change:monthComp.changes.sales, inverse:false },
    { metric:'المشتريات', current:fmtMoney(monthComp.current.purchasesTotal), change:monthComp.changes.purchases, inverse:true },
    { metric:'الصافي', current:fmtMoney(monthComp.current.net), change:monthComp.changes.net, inverse:false },
    { metric:'عمليات الصرف', current:Number(monthComp.current.dispenseCount).toLocaleString('en-US'), change:monthComp.changes.dispenseCount, inverse:false },
  ] : []

  const performanceColumns: StorelyDataTableColumn<any>[] = [
    { key:'metric', header:'المؤشر', accessor:'metric', sortable:true },
    { key:'current', header:'هذا الشهر', accessor:'current', className:'font-semibold tabular-nums' },
    { key:'change', header:'التغير', cell:(row:any) => row.change===null || row.change===undefined ? <span className="text-[#8EA0B1]">-</span> : <StorelyStatusBadge status={(row.change>=0)!==!!row.inverse ? 'success' : 'warning'}>{row.change>=0?'+':'-'}{Math.abs(row.change)}%</StorelyStatusBadge> },
  ]

  if(loading) return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <div className="h-28 animate-pulse rounded-[8px] border border-[#DEE6EA] bg-white" />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-36 animate-pulse rounded-[8px] border border-[#DEE6EA] bg-white" />
        <div className="h-36 animate-pulse rounded-[8px] border border-[#DEE6EA] bg-white" />
      </div>
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
        <div className="h-80 animate-pulse rounded-[8px] border border-[#DEE6EA] bg-white" />
        <div className="h-80 animate-pulse rounded-[8px] border border-[#DEE6EA] bg-white" />
      </div>
    </div>
  )

  return (
    <ErrorBoundary>
      <div className="min-h-full bg-white text-[#203640] [&_button]:rounded-[6px] [&_button]:font-semibold" dir={dir}>
        <div className="mx-auto max-w-[1500px] space-y-8 px-1 pb-8">
        <div className="rounded-[8px] border border-[#DEE6EA] bg-white px-5 py-6 shadow-[0_1px_2px_rgba(32,54,64,0.035)] md:px-8 md:py-7">
        <StorelyPageHeader
          className="mb-0 gap-6 [&_h1]:text-[28px] [&_h1]:font-semibold [&_h1]:leading-10 [&_p]:mt-2 [&_p]:text-[15px] [&_p]:leading-7 [&_div:first-child>div:first-child]:text-[#66737C]"
          eyebrow={orgName || undefined}
          title={greeting + '، ' + (userName || t('dashboard.defaultGreeting'))}
          description={branchName ? branchName + ' - ' + new Date().toLocaleDateString(lang==='ar'?'ar-SA':'en-US',{numberingSystem:'latn',weekday:'long',month:'long',day:'numeric'}) : new Date().toLocaleDateString(lang==='ar'?'ar-SA':'en-US',{numberingSystem:'latn',weekday:'long',month:'long',day:'numeric'})}
          actions={<div className="flex flex-wrap items-center gap-3"><StorelyButton variant="secondary" size="lg" className={secondaryButtonClass} icon={<ShoppingCart size={15}/>} onClick={()=>router.push('/purchases')}>تسجيل شراء</StorelyButton><StorelyButton variant="secondary" size="lg" className={secondaryButtonClass} icon={<Plus size={15}/>} onClick={()=>router.push('/inventory')}>إضافة منتج</StorelyButton><StorelyButton variant="primary" size="lg" icon={<ArrowUpRight size={15}/>} onClick={()=>router.push('/dispense')}>تسجيل صرف</StorelyButton></div>}
        />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <StorelyMetricStrip metrics={metrics.slice(0,3)} className={`${surfaceClass} [&>div]:divide-[#E6ECEF] [&>div>div]:px-6 [&>div>div]:py-5 md:[&>div>div]:px-7 [&_div[class*='text-xl']]:text-[28px] [&_div[class*='text-xl']]:leading-9 [&_div[class*='text-xs']]:text-[13px] [&_div[class*='text-xs']]:leading-5`} />
          <StorelyMetricStrip metrics={metrics.slice(3)} className={`${surfaceClass} [&>div]:divide-[#E6ECEF] [&>div>div]:px-6 [&>div>div]:py-5 md:[&>div>div]:px-7 [&_div[class*='text-xl']]:text-[28px] [&_div[class*='text-xl']]:leading-9 [&_div[class*='text-xs']]:text-[13px] [&_div[class*='text-xs']]:leading-5`} />
        </div>

        {monthComp?.success ? (
          <StorelyCard title="هذا الشهر" description="مقارنة بالشهر الماضي" className={cardClass}>
            <div className="grid divide-y divide-[#E6ECEF] sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:divide-x-reverse xl:grid-cols-4">
              {performanceRows.map((m,i)=>(
                <div key={i} className="min-w-0 px-6 py-6 md:px-7">
                  <div className="text-[13px] font-semibold leading-5 text-[#66737C]">{m.metric}</div>
                  <div className="mt-2 truncate text-[27px] font-semibold leading-9 tabular-nums text-[#203640]">{m.current}</div>
                  {m.change!==null && m.change!==undefined ? (
                    <div className={((m.change>=0)!==!!m.inverse ? 'text-[#047857]' : 'text-[#B45309]') + ' mt-2 inline-flex items-center gap-1 text-[13px] font-semibold'} dir="ltr">
                      {(m.change>=0)!==!!m.inverse ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                      {m.change>=0?'+':'-'}{Math.abs(m.change)}%
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </StorelyCard>
        ) : null}

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
          <div className="space-y-6">
            {attention ? (
              <StorelyCard title="تحتاج انتباهك" className={`${cardClass} border-[#D7E3E8]`} actions={<StorelyStatusBadge status="warning" className="h-7 px-2.5 text-[13px]">{notifs.length + smartSuggestions.length + (subAlert ? 1 : 0)}</StorelyStatusBadge>}>
                <div className="divide-y divide-[#E6ECEF]">
                  {subAlert ? <div className="flex flex-col gap-4 px-6 py-6 text-[15px] sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 font-semibold leading-7 text-[#203640]">{subAlert}</div><StorelyButton size="md" variant="secondary" className={`${secondaryButtonClass} hide-in-app`} onClick={()=>router.push('/settings')}>التفاصيل</StorelyButton></div> : null}
                  {smartSuggestions.slice(0,4).map((s:any,i:number)=>(
                    <div key={'s'+i} className="flex flex-col gap-4 px-6 py-6 text-[15px] sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 font-semibold leading-7 text-[#203640]"><StorelyStatusBadge status={s.urgency==='now'?'danger':'warning'}>{s.urgency==='now'?'اطلب الآن':'خلال ' + Math.max(s.suggestedOrderInDays,0) + ' ' + t('dashboard.days')}</StorelyStatusBadge><span>{s.name}</span></div><div className="mt-1 text-[13px] leading-6 text-[#66737C]">استهلاك {s.dailyRate} {s.unit} يومياً · التوريد يأخذ {s.avgLeadTimeDays} {t('dashboard.days')} عادة</div></div>
                      <StorelyButton size="md" variant="secondary" className={secondaryButtonClass} onClick={()=>router.push('/suppliers')}>الموردين</StorelyButton>
                    </div>
                  ))}
                  {notifs.map((n:any)=>(
                    <div key={n.id} className="flex items-start justify-between gap-5 px-6 py-6 text-[15px]"><div className="min-w-0"><div className="font-semibold leading-7 text-[#203640]">{n.title}</div><div className="mt-1.5 text-[13px] leading-6 text-[#66737C]">{n.message}</div></div><StorelyTableActionGroup><StorelyTableAction action="delete" onClick={()=>dismiss(n.id)} aria-label="إخفاء" /></StorelyTableActionGroup></div>
                  ))}
                </div>
              </StorelyCard>
            ) : null}

            <StorelyCard title="تحتاج إعادة طلب" className={compactCardClass} actions={lowItems.length>0 ? <StorelyButton size="md" variant="secondary" className={secondaryButtonClass} onClick={()=>router.push('/inventory')}>عرض المخزون</StorelyButton> : undefined}>
              <StorelyDataTable columns={lowStockColumns} data={lowItems} rowKey={(row:any,index:number)=>row.id || row.name || String(index)} searchable={false} pageSize={8} dense={false} className={tableClass} onRowClick={()=>router.push('/inventory')} emptyState={<StorelyEmptyState icon={<Package size={16}/>} title="كل الأصناف فوق الحد الأدنى" />} />
            </StorelyCard>

            <StorelyCard title="آخر الحركات" className={compactCardClass} actions={activity.length>0 ? <StorelyButton size="md" variant="secondary" className={secondaryButtonClass} onClick={()=>router.push('/reports')}>التقارير</StorelyButton> : undefined}>
              <StorelyDataTable columns={activityColumns} data={activity} rowKey={(row:any,index:number)=>row.id || row.created_at || String(index)} searchable={false} pageSize={8} dense={false} className={tableClass} emptyState={<StorelyEmptyState icon={<Send size={16}/>} title="ما فيه حركات بعد" />} />
            </StorelyCard>

            <div className="grid gap-6 lg:grid-cols-2">
              {[
                {title:'المشتريات آخر 7 أيام', data:weeklyP, unit:'فاتورة'},
                {title:'الصرف آخر 7 أيام', data:weeklyD, unit:'عملية'},
              ].map((c,i)=>(
                <StorelyCard
                  key={i}
                  title={c.title}
                  className={compactCardClass}
                  actions={<StorelyStatusBadge status="info">{c.data.reduce((s,d)=>s+d.value,0)} {c.unit}</StorelyStatusBadge>}
                >
                  <WeeklyBars data={c.data} />
                </StorelyCard>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <StorelyCard title="أداء الفرع" description="ملخص تشغيلي مختصر مقارنة بالشهر السابق." className={compactCardClass}>
              {performanceRows.length>0 ? <StorelyDataTable columns={performanceColumns} data={performanceRows} rowKey="metric" searchable={false} pageSize={8} dense={false} className={tableClass} /> : <StorelyEmptyState icon={<AlertTriangle size={16}/>} title="لا توجد مقارنة بعد" description="تظهر المقارنة عند توفر بيانات شهرية كافية." />}
            </StorelyCard>

            <StorelyCard title="آخر الإشعارات" description="آخر إشعارات وصلت للمنشأة." className={compactCardClass}>
              {notifs.length>0 ? <div className="divide-y divide-[#E6ECEF]">{notifs.slice(0,5).map((n:any)=><div key={n.id} className="flex items-start gap-3 px-6 py-5 text-[15px]"><span className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-[#F4F7F8] text-[#66737C]"><Bell size={15} /></span><div className="min-w-0 flex-1"><div className="truncate font-semibold leading-7 text-[#203640]">{n.title}</div><div className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-[#66737C]">{n.message}</div></div></div>)}</div> : <StorelyEmptyState icon={<Bell size={16}/>} title="لا توجد إشعارات" description="ستظهر الإشعارات التشغيلية هنا عند توفرها." />}
            </StorelyCard>
          </div>
        </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
