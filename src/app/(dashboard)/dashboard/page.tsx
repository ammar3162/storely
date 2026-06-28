'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Component } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const C = {
  primary: '#16a34a', primaryD: '#15803d', primaryL: '#f0fdf4', primaryB: '#bbf7d0',
  danger:  '#ef4444', dangerL:  '#fef2f2', dangerB:  '#fecaca',
  warning: '#f59e0b', warningL: '#fffbeb', warningB: '#fde68a',
  info:    '#3b82f6', infoL:    '#eff6ff', infoB:    '#bfdbfe',
  text:    '#111827', text2: '#374151', text3: '#6b7280', text4: '#9ca3af',
  bg:      '#f9fafb', surface: '#ffffff', border: '#f3f4f6', border2: '#e5e7eb',
}

class ErrorBoundary extends Component<{children:React.ReactNode},{error:Error|null}> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) return <div style={{padding:24,textAlign:'center',color:C.danger}}>حدث خطأ — حاول مرة أخرى</div>
    return this.props.children
  }
}

function AnimatedNumber({ value }: { value:number }) {
  const [d, setD] = useState(0)
  useEffect(() => {
    let s = 0; const step = value / 40
    const t = setInterval(() => { s+=step; if(s>=value){setD(value);clearInterval(t)}else setD(Math.floor(s)) }, 16)
    return () => clearInterval(t)
  }, [value])
  return <>{d.toLocaleString()}</>
}

function MiniBar({ data, color }: { data:{label:string;value:number}[]; color:string }) {
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height:40}}>
      {data.map((d,i) => (
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:2}}>
          <div style={{width:'100%',background:C.border,borderRadius:'3px 3px 0 0',height:32,display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
            <div style={{width:'100%',borderRadius:'3px 3px 0 0',height:`${Math.max((d.value/max)*100,4)}%`,background:i===data.length-1?color:color+'44',transition:`height .6s ease ${i*.04}s`}}/>
          </div>
          <div style={{fontSize:8,color:i===data.length-1?C.text:C.text4,fontWeight:i===data.length-1?700:400}}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState({products:0,lowStock:0,outOfStock:0,todayPurchases:0,todayDispenses:0,totalAmount:0})
  const [lowItems, setLowItems]   = useState<any[]>([])
  const [activity, setActivity]   = useState<any[]>([])
  const [orgName, setOrgName]     = useState('')
  const [userName, setUserName]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [subAlert, setSubAlert]   = useState<string|null>(null)
  const [weeklyP, setWeeklyP]     = useState<{label:string;value:number}[]>([])
  const [weeklyD, setWeeklyD]     = useState<{label:string;value:number}[]>([])
  const [visible, setVisible]     = useState(false)
  const sb = createClient()
  const router = useRouter()

  useEffect(() => {
    let attempts = 0
    const check = setInterval(() => {
      attempts++
      if (sessionStorage.getItem('s_branch_id') || sessionStorage.getItem('s_org_id') || attempts > 20) {
        clearInterval(check); load()
      }
    }, 100)
    return () => clearInterval(check)
  }, [])

  async function load() {
    const {data:{user}} = await sb.auth.getUser()
    if (!user) return
    const {data:profile} = await sb.from('profiles').select('full_name,org_id,subscription_ends_at,organizations(name)').eq('id',user.id).single()
    if (profile) {
      setUserName(profile.full_name||'')
      setOrgName((profile.organizations as any)?.name||'')
      const endsAt = (profile as any).subscription_ends_at
      if (endsAt) {
        const days = Math.ceil((new Date(endsAt).getTime()-Date.now())/(1000*60*60*24))
        if (days<=7&&days>0) setSubAlert(`ينتهي اشتراكك بعد ${days} أيام`)
      }
    }
    const orgId = profile?.org_id
    if (!orgId) return
    sessionStorage.setItem('s_org_id', orgId)
    sessionStorage.setItem('s_profile_id', user.id)

    const bid = sessionStorage.getItem('s_branch_id')
    const addBranch = (q:any) => bid ? q.eq('branch_id',bid) : q

    const [{data:products},{data:purchases},{data:movements}] = await Promise.all([
      addBranch(sb.from('products').select('id,name,qty,reorder_point,unit').eq('org_id',orgId).eq('is_active',true)),
      addBranch(sb.from('purchases').select('amount,created_at').eq('org_id',orgId)),
      sb.from('stock_movements').select('qty_change,type,created_at,products!inner(name,unit,org_id,branch_id)').eq('products.org_id',orgId).order('created_at',{ascending:false}).limit(50),
    ])

    const today = new Date().toDateString()
    const low = (products||[]).filter((p:any)=>p.qty<=p.reorder_point)
    setStats({
      products:(products||[]).length,
      lowStock:low.length,
      outOfStock:(products||[]).filter((p:any)=>p.qty===0).length,
      todayPurchases:(purchases||[]).filter((p:any)=>new Date(p.created_at).toDateString()===today).length,
      todayDispenses:(movements||[]).filter((m:any)=>m.type==='out'&&new Date(m.created_at).toDateString()===today).length,
      totalAmount:(purchases||[]).reduce((s:number,p:any)=>s+Number(p.amount||0),0),
    })
    setLowItems(low.slice(0,5))
    setActivity((movements||[]).slice(0,5))

    const days=['أحد','إثن','ثلث','أرب','خمس','جمع','سبت']
    const wp:any[]=[],wd:any[]=[]
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i)
      const ds=d.toDateString(), lbl=days[d.getDay()]
      wp.push({label:lbl,value:(purchases||[]).filter((p:any)=>new Date(p.created_at).toDateString()===ds).length})
      wd.push({label:lbl,value:(movements||[]).filter((m:any)=>m.type==='out'&&new Date(m.created_at).toDateString()===ds).length})
    }
    setWeeklyP(wp); setWeeklyD(wd)
    setLoading(false)
    setTimeout(()=>setVisible(true),50)
  }

  const hour = new Date().getHours()
  const greeting = hour<12?'صباح الخير':hour<17?'مساء الخير':'مساء النور'

  if (loading) return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',maxWidth:900,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.4s ease infinite}`}</style>
      <div style={{height:60,background:C.border,borderRadius:14,marginBottom:16}} className="sk"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:16}}>
        {[1,2,3,4].map(i=><div key={i} className="sk" style={{height:90,borderRadius:14,background:C.border}}/>)}
      </div>
      <div style={{height:120,background:C.border,borderRadius:14}} className="sk"/>
    </div>
  )

  return (
    <ErrorBoundary>
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',maxWidth:900,margin:'0 auto',opacity:visible?1:0,transition:'opacity .3s ease'}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .fu{animation:fadeUp .4s ease both}
        .card{background:white;border-radius:14px;border:1px solid ${C.border};overflow:hidden}
        .tap{transition:all .15s;cursor:pointer}
        .tap:active{transform:scale(.97)!important;opacity:.9}
        .row-hover{transition:background .1s}
        .row-hover:hover{background:${C.bg}}

        /* Mobile First */
        .grid-4{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
        .grid-2{display:grid;grid-template-columns:1fr;gap:12px}
        .quick-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}

        /* Desktop */
        @media(min-width:640px){
          .grid-4{grid-template-columns:repeat(4,1fr);gap:14px}
          .grid-2{grid-template-columns:1.5fr 1fr;gap:16px}
          .quick-grid{grid-template-columns:repeat(4,1fr);gap:12px}
        }
      `}</style>

      {/* Header */}
      <div className="fu" style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,animationDelay:'.05s'}}>
        <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.primaryD})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>👋</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:16,fontWeight:800,color:C.text,letterSpacing:'-0.3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{greeting}، {userName||'مرحباً'}</div>
          <div style={{fontSize:11,color:C.text3,marginTop:1}}>{orgName} · {new Date().toLocaleDateString('ar-SA',{weekday:'long',month:'long',day:'numeric'})}</div>
        </div>
      </div>

      {/* Sub Alert */}
      {subAlert && (
        <div className="fu card" style={{padding:'11px 14px',marginBottom:12,background:'#fffbeb',borderColor:C.warningB,display:'flex',alignItems:'center',gap:10,animationDelay:'.08s'}}>
          <span style={{fontSize:16}}>⏰</span>
          <span style={{fontSize:13,fontWeight:600,color:'#92400e',flex:1}}>{subAlert}</span>
        </div>
      )}

      {/* Low Stock Alert */}
      {stats.lowStock>0 && (
        <button onClick={()=>router.push('/inventory')} className="fu card tap"
          style={{width:'100%',padding:'12px 16px',marginBottom:14,background:'#fffbeb',borderColor:C.warningB,display:'flex',alignItems:'center',gap:12,textAlign:'right',fontFamily:'inherit',animationDelay:'.1s'}}>
          <div style={{width:36,height:36,borderRadius:10,background:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${C.warningB}`}}>
            <svg width={16} height={16} fill="none" stroke={C.warning} strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:'#92400e'}}>{stats.lowStock} أصناف وصلت للحد الأدنى</div>
            <div style={{fontSize:11,color:'#b45309',marginTop:1}}>اضغط لعرض التفاصيل</div>
          </div>
          <svg width={14} height={14} fill="none" stroke={C.warning} strokeWidth={2.5} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
      )}

      {/* Stats Grid — 2 cols mobile, 4 cols desktop */}
      <div className="grid-4 fu" style={{marginBottom:14,animationDelay:'.12s'}}>
        {[
          {label:'الأصناف',       value:stats.products,       sub:'في المخزون',    color:C.primary, bg:C.primaryL, href:'/inventory',
           icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'},
          {label:'مخزون ناقص',    value:stats.lowStock,       sub:`${stats.outOfStock} نفدت`, color:C.danger, bg:C.dangerL, href:'/inventory',
           icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'},
          {label:'مشتريات اليوم', value:stats.todayPurchases, sub:'فاتورة',         color:C.info,    bg:C.infoL,    href:'/purchases',
           icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'},
          {label:'صرف اليوم',     value:stats.todayDispenses, sub:'عملية',          color:C.warning, bg:C.warningL, href:'/dispense',
           icon:'M17 8l4 4m0 0l-4 4m4-4H3'},
        ].map((s,i)=>(
          <button key={i} onClick={()=>router.push(s.href)} className="card tap"
            style={{padding:'14px',textAlign:'right',fontFamily:'inherit',border:`1px solid ${C.border}`,cursor:'pointer',background:'white',animationDelay:`${.14+i*.04}s`}}>
            <div style={{width:36,height:36,borderRadius:10,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10,border:`1px solid ${s.color}20`}}>
              <svg width={16} height={16} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {s.icon.split(' M').map((d,j)=><path key={j} d={(j===0?'':' M')+d}/>)}
              </svg>
            </div>
            <div style={{fontSize:24,fontWeight:900,color:s.color,letterSpacing:'-0.5px',lineHeight:1,marginBottom:4}}>
              <AnimatedNumber value={s.value}/>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:2}}>{s.label}</div>
            <div style={{fontSize:10,color:C.text3}}>{s.sub}</div>
          </button>
        ))}
      </div>

      {/* Charts — mini on mobile */}
      <div className="fu" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14,animationDelay:'.24s'}}>
        {[
          {title:'مشتريات الأسبوع',data:weeklyP,color:C.info,   total:weeklyP.reduce((s,d)=>s+d.value,0),unit:'فاتورة'},
          {title:'صرف الأسبوع',   data:weeklyD,color:C.danger, total:weeklyD.reduce((s,d)=>s+d.value,0),unit:'عملية'},
        ].map((c,i)=>(
          <div key={i} className="card" style={{padding:'12px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text}}>{c.title}</div>
              <div style={{fontSize:10,fontWeight:700,color:c.color,background:c.color+'15',padding:'2px 8px',borderRadius:99}}>{c.total} {c.unit}</div>
            </div>
            <MiniBar data={c.data} color={c.color}/>
          </div>
        ))}
      </div>

      {/* Main — Low stock + Activity */}
      <div className="grid-2 fu" style={{marginBottom:14,animationDelay:'.28s'}}>
        {/* Low stock */}
        <div className="card">
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>تحتاج إعادة طلب</div>
            {lowItems.length>0&&<span style={{background:C.dangerL,color:C.danger,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,border:`1px solid ${C.dangerB}`}}>{lowItems.length}</span>}
          </div>
          {lowItems.length===0 ? (
            <div style={{padding:'28px 16px',textAlign:'center',color:C.text3,fontSize:13}}>✅ كل المخزون بحالة ممتازة</div>
          ) : lowItems.map((p,i)=>{
            const pct=Math.min(Math.round((p.qty/Math.max(p.reorder_point,1))*100),100)
            const col=pct<30?C.danger:pct<60?C.warning:C.primary
            return (
              <div key={i} className="row-hover" style={{padding:'10px 16px',borderBottom:i<lowItems.length-1?`1px solid ${C.border}`:'none',cursor:'pointer'}} onClick={()=>router.push('/inventory')}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160}}>{p.name}</div>
                  <div style={{fontSize:11,fontWeight:800,color:col,flexShrink:0}}>{p.qty} / {p.reorder_point} {p.unit}</div>
                </div>
                <div style={{height:4,background:C.border,borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:pct+'%',background:col,borderRadius:99,transition:'width .5s ease'}}/>
                </div>
              </div>
            )
          })}
        </div>

        {/* Activity */}
        <div className="card">
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>آخر الحركات</div>
          </div>
          {activity.length===0 ? (
            <div style={{padding:'28px 16px',textAlign:'center',color:C.text3,fontSize:13}}>لا توجد حركات بعد</div>
          ) : activity.map((m,i)=>(
            <div key={i} className="row-hover" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:i<activity.length-1?`1px solid ${C.border}`:'none'}}>
              <div style={{width:32,height:32,borderRadius:9,background:m.type==='out'?C.dangerL:C.primaryL,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${m.type==='out'?C.dangerB:C.primaryB}`,flexShrink:0}}>
                <svg width={13} height={13} fill="none" stroke={m.type==='out'?C.danger:C.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  {m.type==='out'?<path d="M17 8l4 4m0 0l-4 4m4-4H3"/>:<path d="M7 16l-4-4m0 0l4-4m-4 4h18"/>}
                </svg>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(m.products as any)?.name||'—'}</div>
                <div style={{fontSize:10,color:C.text3,marginTop:1}}>{new Date(m.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</div>
              </div>
              <div style={{fontSize:12,fontWeight:800,color:m.type==='out'?C.danger:C.primary,flexShrink:0}}>
                {m.qty_change>0?'+':''}{m.qty_change} <span style={{fontSize:10,fontWeight:400,color:C.text4}}>{(m.products as any)?.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-grid fu" style={{animationDelay:'.32s'}}>
        {[
          {title:'إضافة منتج',  href:'/inventory', color:C.primary, bg:C.primaryL, icon:'M12 4v16m8-8H4'},
          {title:'تسجيل شراء', href:'/purchases', color:C.info,    bg:C.infoL,    icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'},
          {title:'تسجيل صرف',  href:'/dispense',  color:C.danger,  bg:C.dangerL,  icon:'M17 8l4 4m0 0l-4 4m4-4H3'},
          {title:'التقارير',   href:'/reports',   color:C.warning, bg:C.warningL, icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'},
        ].map((b,i)=>(
          <button key={i} onClick={()=>router.push(b.href)} className="card tap"
            style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12,textAlign:'right',fontFamily:'inherit',cursor:'pointer',background:'white',border:`1px solid ${C.border}`}}>
            <div style={{width:36,height:36,borderRadius:10,background:b.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width={16} height={16} fill="none" stroke={b.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {b.icon.split(' M').map((d,j)=><path key={j} d={(j===0?'':' M')+d}/>)}
              </svg>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>{b.title}</div>
          </button>
        ))}
      </div>
    </div>
    </ErrorBoundary>
  )
}
