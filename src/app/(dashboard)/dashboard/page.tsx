'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Component } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cache } from '@/lib/cache'
import { useRouter } from 'next/navigation'

class ErrorBoundary extends Component<{children:React.ReactNode},{error:Error|null}> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) return <div className="p-6 text-center text-red-500 text-sm">حدث خطأ — حاول مرة أخرى</div>
    return this.props.children
  }
}

function Num({ value }: { value:number }) {
  const [d, setD] = useState(0)
  useEffect(() => {
    let s = 0; const step = value / 40
    const t = setInterval(() => { s+=step; if(s>=value){setD(value);clearInterval(t)}else setD(Math.floor(s)) }, 16)
    return () => clearInterval(t)
  }, [value])
  return <>{d.toLocaleString()}</>
}

function Bar({ data, color }: { data:{label:string;value:number}[]; color:string }) {
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <div className="flex items-end gap-1 h-11">
      {data.map((d,i)=>{
        const last = i===data.length-1
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full h-8 flex items-end overflow-hidden rounded-sm">
              <div 
                className={`w-full rounded-sm transition-all duration-500 ease-out ${last ? color : 'bg-slate-100'}`}
                style={{ height: `${Math.max((d.value/max)*100,5)}%`, transitionDelay: `${i*40}ms` }}
              />
            </div>
            <div className={`text-[9px] font-medium ${last ? 'text-slate-700' : 'text-slate-400'}`}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats]       = useState({products:0,lowStock:0,outOfStock:0,todayPurchases:0,todayDispenses:0})
  const [lowItems, setLowItems] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [orgName, setOrgName]   = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading]   = useState(true)
  const [subAlert, setSubAlert] = useState<string|null>(null)
  const [weeklyP, setWeeklyP]   = useState<{label:string;value:number}[]>([])
  const [weeklyD, setWeeklyD]   = useState<{label:string;value:number}[]>([])
  const [visible, setVisible]   = useState(false)
  const [notifs, setNotifs]     = useState<any[]>([])
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
    const{data:{user}}=await sb.auth.getUser(); if(!user)return
    const{data:profile}=await sb.from('profiles').select('full_name,org_id,subscription_ends_at,organizations(name)').eq('id',user.id).single()
    if(profile){
      setUserName(profile.full_name||'')
      setOrgName((profile.organizations as any)?.name||'')
      const endsAt=(profile as any).subscription_ends_at
      if(endsAt){
        const days=Math.ceil((new Date(endsAt).getTime()-Date.now())/(1000*60*60*24))
        if(days<=7&&days>0) setSubAlert(`ينتهي اشتراكك بعد ${days} أيام`)
      }
    }
    const orgId=profile?.org_id; if(!orgId)return
    sessionStorage.setItem('s_org_id',orgId)
    sessionStorage.setItem('s_profile_id',user.id)
    const bid=sessionStorage.getItem('s_branch_id')
    const ab=(q:any)=>bid?q.eq('branch_id',bid):q
    const[{data:products},{data:purchases},{data:movements}]=await Promise.all([
      ab(sb.from('products').select('id,name,qty,reorder_point,unit').eq('org_id',orgId).eq('is_active',true)),
      ab(sb.from('purchases').select('amount,created_at').eq('org_id',orgId)),
      sb.from('stock_movements').select('qty_change,type,created_at,products!inner(name,unit,org_id,branch_id)').eq('products.org_id',orgId).order('created_at',{ascending:false}).limit(50),
    ])
    const today=new Date().toDateString()
    const low=(products||[]).filter((p:any)=>p.qty<=p.reorder_point)
    setStats({
      products:(products||[]).length,
      lowStock:low.length,
      outOfStock:(products||[]).filter((p:any)=>p.qty===0).length,
      todayPurchases:(purchases||[]).filter((p:any)=>new Date(p.created_at).toDateString()===today).length,
      todayDispenses:(movements||[]).filter((m:any)=>m.type==='out'&&new Date(m.created_at).toDateString()===today).length,
    })
    setLowItems(low.slice(0,5))
    setActivity((movements||[]).slice(0,5))
    const dnames=['أحد','إثن','ثلث','أرب','خمس','جمع','سبت']
    const wp:any[]=[],wd:any[]=[]
    for(let i=6;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i)
      const ds=d.toDateString(),lbl=dnames[d.getDay()]
      wp.push({label:lbl,value:(purchases||[]).filter((p:any)=>new Date(p.created_at).toDateString()===ds).length})
      wd.push({label:lbl,value:(movements||[]).filter((m:any)=>m.type==='out'&&new Date(m.created_at).toDateString()===ds).length})
    }
    setWeeklyP(wp);setWeeklyD(wd)
    // جلب الإشعارات غير المقروءة
    const{data:nData}=await (sb as any).from('notifications').select('*').eq('org_id',orgId).eq('read',false).order('created_at',{ascending:false}).limit(5)
    setNotifs(nData||[])
    // خزّن في الكاش
    if(orgId_cached){
      cache.set('dashboard:'+orgId_cached, {
        stats:{products:(products||[]).length,lowStock:low.length,outOfStock:(products||[]).filter((p:any)=>p.qty===0).length,todayPurchases:(purchases||[]).filter((p:any)=>new Date(p.created_at).toDateString()===today).length,todayDispenses:(movements||[]).filter((m:any)=>m.type==='out'&&new Date(m.created_at).toDateString()===today).length},
        lowItems:low.slice(0,5), activity:(movements||[]).slice(0,5),
        weeklyP:wp, weeklyD:wd, notifs:nData||[]
      })
    }
    setLoading(false);setTimeout(()=>setVisible(true),50)
  }

  const hour=new Date().getHours()
  const greeting=hour<12?'صباح الخير':hour<17?'مساء الخير':'مساء النور'

  if(loading) return (
    <div className="p-4 space-y-4 max-w-none w-full">
      <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i=><div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  )

  return (
    <ErrorBoundary>
    <div className={`p-4 md:p-6 max-w-5xl mx-auto transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* ── Header ── */}
      <div className="mb-6 animate-[fadeUp_0.4s_ease_both]">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {greeting}، <span className="text-green-600">{userName||'مرحباً'}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {orgName} · {new Date().toLocaleDateString('ar-SA',{weekday:'long',month:'long',day:'numeric'})}
        </p>
      </div>

      {/* ── Notifications ── */}
      <div className="space-y-2 mb-4">
        {notifs.map((n:any,i:number)=>{
          const styles:{[k:string]:string} = {
            info: 'bg-blue-50 border-blue-100 text-blue-700',
            warning: 'bg-amber-50 border-amber-100 text-amber-700',
            success: 'bg-green-50 border-green-100 text-green-700',
            danger: 'bg-red-50 border-red-100 text-red-700',
          }
          const cls = styles[n.type] || styles.info
          return(
            <div key={n.id} className={`flex items-start gap-3 p-3.5 rounded-xl border animate-[fadeUp_0.4s_ease_both] ${cls}`} style={{animationDelay: `${i*50}ms`}}>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">{n.title}</div>
                <div className="text-[11px] mt-0.5 opacity-80 leading-relaxed">{n.message}</div>
              </div>
              <button onClick={async()=>{
                await (sb as any).from('notifications').update({read:true}).eq('id',n.id)
                setNotifs(prev=>prev.filter(x=>x.id!==n.id))
              }} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-transparent border-none cursor-pointer text-base flex-shrink-0">✕</button>
            </div>
          )
        })}
      </div>

      {/* ── Sub alert ── */}
      {subAlert&&(
        <div className="flex items-center gap-3 p-3.5 mb-4 bg-amber-50 border border-amber-200 rounded-xl animate-[fadeUp_0.4s_ease_both]">
          <svg width={16} height={16} fill="none" stroke="#92400e" strokeWidth={2.5} viewBox="0 0 24 24" className="flex-shrink-0"><path strokeLinecap="round" d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          <span className="text-xs font-semibold text-amber-800">{subAlert}</span>
        </div>
      )}

      {/* ── Low stock banner ── */}
      {stats.lowStock>0&&(
        <button onClick={()=>router.push('/inventory')} 
          className="w-full flex items-center justify-between p-4 mb-6 bg-gradient-to-l from-amber-50 to-white border border-amber-200 rounded-2xl text-right font-[inherit] cursor-pointer transition-all duration-200 hover:shadow-md hover:border-amber-300 active:scale-[0.98] animate-[fadeUp_0.4s_ease_both]">
          <div>
            <div className="text-sm font-bold text-amber-900">{stats.lowStock} صنف وصل للحد الأدنى</div>
            <div className="text-xs text-amber-600 mt-0.5">اضغط لعرض التفاصيل وإعادة الطلب</div>
          </div>
          <svg width={16} height={16} fill="none" stroke="#92400e" strokeWidth={2.5} viewBox="0 0 24 24" className="rotate-180"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
      )}

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          {label:'الأصناف',    val:stats.products,       note:'في المخزون',   href:'/inventory', icon: '📦', accent:'text-green-600', bg: 'bg-green-50', border: 'border-green-100'},
          {label:'ناقص',      val:stats.lowStock,        note:`${stats.outOfStock} نفدت`,href:'/inventory',icon: '⚠️', accent:'text-red-500', bg: 'bg-red-50', border: 'border-red-100'},
          {label:'شراء اليوم',val:stats.todayPurchases,  note:'فاتورة',       href:'/purchases', icon: '🛒', accent:'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100'},
          {label:'صرف اليوم', val:stats.todayDispenses,  note:'عملية',        href:'/dispense',  icon: '📤', accent:'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100'},
        ].map((s,i)=>(
          <button key={i} onClick={()=>router.push(s.href)} 
            className={`${s.bg} ${s.border} border rounded-2xl p-5 text-right font-[inherit] cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] animate-[fadeUp_0.4s_ease_both]`}
            style={{animationDelay: `${100 + i*50}ms`}}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
            </div>
            <div className={`text-3xl font-extrabold ${s.accent} tracking-tight font-mono`}>
              <Num value={s.val}/>
            </div>
            <div className="text-sm font-semibold text-slate-800 mt-1">{s.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.note}</div>
          </button>
        ))}
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 animate-[fadeUp_0.4s_ease_both]" style={{animationDelay: '250ms'}}>
        {[
          {title:'مشتريات الأسبوع',data:weeklyP,color:'bg-blue-500',total:weeklyP.reduce((s,d)=>s+d.value,0),unit:'فاتورة'},
          {title:'صرف الأسبوع',   data:weeklyD,color:'bg-red-500',total:weeklyD.reduce((s,d)=>s+d.value,0),unit:'عملية'},
        ].map((c,i)=>(
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-slate-800">{c.title}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${i === 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                {c.total} {c.unit}
              </span>
            </div>
            <Bar data={c.data} color={c.color} />
          </div>
        ))}
      </div>

      {/* ── Lists Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 mb-6 animate-[fadeUp_0.4s_ease_both]" style={{animationDelay: '300ms'}}>
        
        {/* Low Stock List (Takes 3 cols) */}
        <div className="md:col-span-3 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-slate-50">
            <span className="text-sm font-bold text-slate-800">تحتاج إعادة طلب</span>
            {lowItems.length>0&&<span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">{lowItems.length}</span>}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {lowItems.length===0?(
              <div className="p-8 text-center text-sm text-slate-400">كل المخزون بحالة جيدة ✨</div>
            ):lowItems.map((p,i)=>{
              const pct=Math.min(Math.round((p.qty/Math.max(p.reorder_point,1))*100),100)
              const col=pct<30?'bg-red-500':pct<70?'bg-amber-500':'bg-green-500'
              return(
                <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={()=>router.push('/inventory')}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{p.name}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${col} rounded-full transition-all duration-500`} style={{width: `${pct}%`}} />
                      </div>
                      <span className="text-xs font-bold text-slate-500 tabular-nums flex-shrink-0">{p.qty}/{p.reorder_point} {p.unit}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity List (Takes 2 cols) */}
        <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50">
            <span className="text-sm font-bold text-slate-800">آخر الحركات</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {activity.length===0?(
              <div className="p-8 text-center text-sm text-slate-400">لا توجد حركات بعد</div>
            ):activity.map((m,i)=>(
              <div key={i} className="flex items-center gap-3 p-3.5 border-b border-slate-50 last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.type==='out' ? 'bg-red-50' : 'bg-green-50'}`}>
                  <span className="text-xs">{m.type==='out' ? '↓' : '↑'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">{(m.products as any)?.name||'—'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{new Date(m.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</div>
                </div>
                <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${m.type==='out' ? 'text-red-500' : 'text-green-600'}`}>
                  {m.qty_change>0?'+':''}{m.qty_change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-[fadeUp_0.4s_ease_both]" style={{animationDelay: '350ms'}}>
        {[
          {label:'إضافة منتج',  href:'/inventory', icon:'M12 4v16m8-8H4',            color:'#16a34a'},
          {label:'تسجيل شراء', href:'/purchases', icon:'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', color:'#3b82f6'},
          {label:'تسجيل صرف',  href:'/dispense',  icon:'M17 8l4 4m0 0l-4 4m4-4H3',  color:'#ef4444'},
          {label:'التقارير',   href:'/reports',   icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',color:'#f59e0b'},
        ].map((b,i)=>(
          <button key={i} onClick={()=>router.push(b.href)} 
            className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl text-right font-[inherit] cursor-pointer transition-all duration-200 hover:shadow-md hover:border-slate-200 active:scale-[0.97]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor: `${b.color}15`}}>
              <svg width={18} height={18} fill="none" stroke={b.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {b.icon.split(' M').map((d,j)=><path key={j} d={(j===0?'':' M')+d}/>)}
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-800">{b.label}</span>
          </button>
        ))}
      </div>

    </div>
    <style jsx>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
    </ErrorBoundary>
  )
}
