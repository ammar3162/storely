'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Component } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { colors, radius, shadow, font, card, btnSecondary, tag } from '@/lib/ds'

class ErrorBoundary extends Component<{children:React.ReactNode},{error:Error|null}> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{...card,padding:24,textAlign:'center'}}>
        <div style={{fontSize:28,marginBottom:8}}>⚠️</div>
        <div style={{fontSize:font.sm,fontWeight:600,color:colors.danger}}>حدث خطأ في التحميل</div>
        <button onClick={()=>this.setState({error:null})} style={{...btnSecondary,marginTop:12,fontSize:font.xs,padding:'6px 14px'}}>إعادة المحاولة</button>
      </div>
    )
    return this.props.children
  }
}

function AnimatedNumber({ value, duration=800 }: { value:number; duration?:number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0; const step = value / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [value])
  return <>{display.toLocaleString()}</>
}

function BarChart({ data, color, gradient }: { data:{label:string;value:number}[]; color:string; gradient:string[] }) {
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:6,height:80,padding:'0 4px'}}>
      {data.map((d,i) => {
        const pct = (d.value/max)*100
        const isToday = i === data.length - 1
        return (
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            {d.value > 0 && <div style={{fontSize:9,color:isToday?color:colors.text4,fontWeight:700}}>{d.value}</div>}
            <div style={{width:'100%',background:colors.border,borderRadius:'6px 6px 0 0',height:56,display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
              <div style={{
                width:'100%', borderRadius:'6px 6px 0 0',
                height:`${Math.max(pct,5)}%`,
                background: isToday ? `linear-gradient(180deg,${gradient[0]},${gradient[1]})` : color+'44',
                transition:'height .8s cubic-bezier(.4,0,.2,1)',
                transitionDelay: `${i*0.05}s`,
              }}/>
            </div>
            <div style={{fontSize:9,color:isToday?colors.text:colors.text4,fontWeight:isToday?700:400}}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ value, total, color }: { value:number; total:number; color:string }) {
  const pct = total>0?value/total:0
  const r=30,cx=38,cy=38,circ=2*Math.PI*r
  return (
    <svg width={76} height={76} viewBox="0 0 76 76">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.border2} strokeWidth={8}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${pct*circ} ${circ}`} strokeDashoffset={circ*0.25}
        strokeLinecap="round" style={{transition:'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)'}}/>
      <text x={cx} y={cy+5} textAnchor="middle" fontSize={13} fontWeight={800} fill={colors.text}>{Math.round(pct*100)}%</text>
    </svg>
  )
}

function StatCard({ label, value, sub, icon, color, bg, onClick, isAmount=false, animate=false }: any) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: hov ? bg : colors.surface,
        border: `1.5px solid ${hov ? color+'44' : colors.border}`,
        borderRadius: radius.lg, padding: '20px 18px', cursor:'pointer',
        textAlign:'right', fontFamily:font.family, width:'100%',
        transform: hov ? 'translateY(-4px) scale(1.01)' : 'none',
        boxShadow: hov ? `0 12px 32px ${color}22` : shadow.sm,
        transition: 'all .25s cubic-bezier(.4,0,.2,1)',
      }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
        <div style={{width:44,height:44,background:bg,borderRadius:radius.md,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${color}22`}}>
          <svg width={20} height={20} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            {icon.split(' M').map((d:string,j:number)=><path key={j} d={(j===0?'':' M')+d}/>)}
          </svg>
        </div>
        <div style={{width:6,height:6,borderRadius:'50%',background:color,boxShadow:`0 0 6px ${color}`,marginTop:4}}/>
      </div>
      <div style={{fontSize:font.xs,fontWeight:700,color:colors.text4,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{label}</div>
      <div style={{fontSize:28,fontWeight:900,color:colors.text,letterSpacing:'-1px',marginBottom:4}}>
        {isAmount ? value : (animate ? <AnimatedNumber value={Number(value)} /> : value)}
      </div>
      <div style={{fontSize:font.xs,color:colors.text3}}>{sub}</div>
    </button>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ products:0, lowStock:0, outOfStock:0, todayPurchases:0, totalAmount:0, todayDispenses:0 })
  const [lowItems, setLowItems]       = useState<any[]>([])
  const [recentActivity, setActivity] = useState<any[]>([])
  const [orgName, setOrgName]         = useState('')
  const [userName, setUserName]       = useState('')
  const [loading, setLoading]         = useState(true)
  const [subAlert, setSubAlert]       = useState<string|null>(null)
  const [showAlert, setShowAlert]     = useState(true)
  const [weeklyP, setWeeklyP]         = useState<{label:string;value:number}[]>([])
  const [weeklyD, setWeeklyD]         = useState<{label:string;value:number}[]>([])
  const [visible, setVisible]         = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => {
    let attempts = 0
    const check = setInterval(() => {
      attempts++
      const bid = sessionStorage.getItem('s_branch_id')
      const oid = sessionStorage.getItem('s_org_id')
      if (bid && oid) { clearInterval(check); load() }
      else if (attempts > 20) { clearInterval(check); load() }
    }, 100)
    return () => clearInterval(check)
  }, [])

  async function load() {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('full_name,org_id,subscription_ends_at,organizations(name)').eq('id', user.id).single()
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
    sessionStorage.setItem("s_org_id", orgId); sessionStorage.setItem("s_profile_id", user.id)

    const [{ data:products },{ data:purchases },{ data:movements }] = await Promise.all([
      (()=>{ let q=supabase.from('products').select('id,name,qty,reorder_point,unit').eq('org_id',orgId).eq('is_active',true); const bid=sessionStorage.getItem('s_branch_id'); if(bid) q=(q as any).eq('branch_id',bid); return q })(),
      (()=>{ let q=supabase.from('purchases').select('amount,created_at').eq('org_id',orgId); const bid=sessionStorage.getItem('s_branch_id'); if(bid) q=(q as any).eq('branch_id',bid); return q })(),
      (()=>{ let q=supabase.from('stock_movements').select('qty_change,type,created_at,products!inner(name,unit,org_id,branch_id)').eq('products.org_id',orgId).order('created_at',{ascending:false}).limit(50); const bid=sessionStorage.getItem('s_branch_id'); if(bid) q=(q as any).eq('products.branch_id',bid); return q })(),
    ])

    const today = new Date().toDateString()
    const low   = (products||[]).filter(p=>p.qty<=p.reorder_point)
    setStats({ products:(products||[]).length, lowStock:low.length, outOfStock:(products||[]).filter(p=>p.qty===0).length, todayPurchases:(purchases||[]).filter(p=>new Date(p.created_at).toDateString()===today).length, totalAmount:(purchases||[]).reduce((s,p)=>s+Number(p.amount||0),0), todayDispenses:(movements||[]).filter(m=>m.type==='out'&&new Date(m.created_at).toDateString()===today).length })
    setLowItems(low.slice(0,6))
    setActivity((movements||[]).slice(0,6))

    const dayNames=['أحد','إثن','ثلث','أرب','خمس','جمع','سبت']
    const wp: {label:string;value:number}[]=[], wd: {label:string;value:number}[]=[]
    for (let i=6;i>=0;i--) {
      const d=new Date(); d.setDate(d.getDate()-i)
      const ds=d.toDateString(), lbl=dayNames[d.getDay()]
      wp.push({ label:lbl, value:(purchases||[]).filter(p=>new Date(p.created_at).toDateString()===ds).length })
      wd.push({ label:lbl, value:(movements||[]).filter(m=>m.type==='out'&&new Date(m.created_at).toDateString()===ds).length })
    }
    setWeeklyP(wp); setWeeklyD(wd)
    setLoading(false)
    setTimeout(()=>setVisible(true), 50)
  }

  const hour=new Date().getHours()
  const greeting=hour<12?'صباح الخير':hour<17?'مساء الخير':'مساء النور'

  if (loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1200,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}`}</style>
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
        <div className="sk" style={{width:48,height:48,borderRadius:12,background:colors.border2}}/>
        <div><div className="sk" style={{height:20,width:160,background:colors.border2,borderRadius:6,marginBottom:8}}/><div className="sk" style={{height:12,width:220,background:colors.border,borderRadius:6}}/></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>{[1,2,3,4].map(i=>(<div key={i} className="sk" style={{height:120,borderRadius:radius.lg,background:colors.border}}/>))}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>{[1,2,3].map(i=>(<div key={i} className="sk" style={{height:140,borderRadius:radius.lg,background:colors.border}}/>))}</div>
    </div>
  )

  return (
    <ErrorBoundary>
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1200,margin:'0 auto',opacity:visible?1:0,transition:'opacity .4s ease'}}>
      <style>{`
        .dc4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
        .dc3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px}
        .dc2{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;margin-bottom:20px}
        .dc4q{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        @media(max-width:1100px){.dc3{grid-template-columns:1fr 1fr}}
        @media(max-width:900px){.dc4{grid-template-columns:repeat(2,1fr)}.dc4q{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:768px){.dc2{grid-template-columns:1fr}}
        @media(max-width:480px){.dc3{grid-template-columns:1fr}.dc4{grid-template-columns:1fr 1fr}}
        @keyframes slideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .si{animation:slideIn .5s ease both}
        .qc{transition:all .2s cubic-bezier(.4,0,.2,1) !important}
        .qc:hover{transform:translateY(-3px)!important;box-shadow:0 8px 24px rgba(0,0,0,.1)!important}
        .hrow{transition:background .15s}
        .hrow:hover{background:${colors.bg}}
        .act-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}} className="si">
        <div style={{width:50,height:50,borderRadius:14,background:`linear-gradient(135deg,${colors.primary},${colors.primaryDark||'#15803d'})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,boxShadow:`0 4px 14px ${colors.primary}44`,flexShrink:0}}>
          👋
        </div>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:colors.text,letterSpacing:'-0.5px'}}>{greeting}، {userName||'مرحباً'}</div>
          <div style={{fontSize:font.sm,color:colors.text4,marginTop:1}}>{orgName} · {new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        </div>
      </div>

      {/* Sub alert */}
      {subAlert&&showAlert&&(
        <div style={{background:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'1.5px solid #fcd34d',borderRadius:radius.md,padding:'12px 18px',display:'flex',alignItems:'center',gap:12,marginBottom:18}} className="si">
          <span style={{fontSize:20}}>⏰</span>
          <div style={{flex:1,fontSize:font.sm,fontWeight:600,color:'#92400e'}}>{subAlert}</div>
          <button onClick={()=>setShowAlert(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#b45309',fontSize:18,lineHeight:1}}>✕</button>
        </div>
      )}

      {/* Low stock banner */}
      {stats.lowStock>0&&(
        <button onClick={()=>router.push('/inventory')} style={{width:'100%',background:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'1.5px solid #fcd34d',borderRadius:radius.md,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',marginBottom:22,textAlign:'right' as const,fontFamily:font.family,boxShadow:'0 2px 8px rgba(251,191,36,.2)'}} className="si">
          <div style={{width:40,height:40,background:'white',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 6px rgba(0,0,0,.08)'}}>
            <svg width={20} height={20} fill="none" stroke={colors.warning} strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:font.sm,fontWeight:800,color:'#92400e'}}>{stats.lowStock} أصناف وصلت للحد الأدنى</div>
            <div style={{fontSize:11,color:'#b45309',marginTop:2}}>اضغط لعرض التفاصيل</div>
          </div>
          <svg width={16} height={16} fill="none" stroke={colors.warning} strokeWidth={2.5} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
      )}

      {/* Stat cards */}
      <div className="dc4">
        {[
          { label:'إجمالي الأصناف', value:stats.products, sub:'صنف في المخزون', color:colors.primary, bg:colors.primaryLight, icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', href:'/inventory' },
          { label:'مخزون ناقص', value:stats.lowStock, sub:`منها ${stats.outOfStock} نفدت`, color:colors.danger, bg:colors.dangerLight, icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', href:'/inventory' },
          { label:'مشتريات اليوم', value:stats.todayPurchases, sub:'فاتورة اليوم', color:colors.info, bg:colors.infoLight, icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', href:'/purchases' },
          { label:'صرف اليوم', value:stats.todayDispenses, sub:'عملية صرف', color:colors.warning, bg:colors.warningLight, icon:'M17 8l4 4m0 0l-4 4m4-4H3', href:'/dispense' },
        ].map((s,i)=>(
          <div key={i} className="si" style={{animationDelay:`${i*0.07}s`}}>
            <StatCard {...s} onClick={()=>router.push(s.href)} animate/>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="dc3">
        <div style={{...card,padding:'18px 20px',animationDelay:'0.3s'}} className="si">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
            <div>
              <div style={{fontSize:font.base,fontWeight:800,color:colors.text}}>مشتريات الأسبوع</div>
              <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>عدد الفواتير آخر 7 أيام</div>
            </div>
            <div style={{background:colors.infoLight,borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700,color:colors.info}}>{weeklyP.reduce((s,d)=>s+d.value,0)} فاتورة</div>
          </div>
          <div style={{marginTop:16}}>
            <BarChart data={weeklyP} color={colors.info} gradient={['#60a5fa','#1d4ed8']}/>
          </div>
        </div>

        <div style={{...card,padding:'18px 20px',animationDelay:'0.35s'}} className="si">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
            <div>
              <div style={{fontSize:font.base,fontWeight:800,color:colors.text}}>صرف الأسبوع</div>
              <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>عمليات الصرف آخر 7 أيام</div>
            </div>
            <div style={{background:colors.dangerLight,borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700,color:colors.danger}}>{weeklyD.reduce((s,d)=>s+d.value,0)} عملية</div>
          </div>
          <div style={{marginTop:16}}>
            <BarChart data={weeklyD} color={colors.danger} gradient={['#f87171','#b91c1c']}/>
          </div>
        </div>

        <div style={{...card,padding:'18px 20px',display:'flex',flexDirection:'column' as const,animationDelay:'0.4s'}} className="si">
          <div style={{fontSize:font.base,fontWeight:800,color:colors.text,marginBottom:2}}>صحة المخزون</div>
          <div style={{fontSize:font.xs,color:colors.text4,marginBottom:16}}>نسبة الأصناف بمستوى جيد</div>
          <div style={{display:'flex',alignItems:'center',gap:16,flex:1}}>
            <DonutChart value={stats.products-stats.lowStock} total={stats.products} color={colors.primary}/>
            <div style={{display:'flex',flexDirection:'column' as const,gap:10,flex:1}}>
              {[
                {lbl:'✅ جيد',  v:stats.products-stats.lowStock,   c:colors.primary, bg:colors.primaryLight, br:colors.primaryBorder},
                {lbl:'⚠️ ناقص', v:stats.lowStock-stats.outOfStock, c:colors.warning, bg:colors.warningLight, br:colors.warningBorder},
                {lbl:'🔴 نفد',  v:stats.outOfStock,                c:colors.danger,  bg:colors.dangerLight,  br:colors.dangerBorder},
              ].map(x=>(
                <div key={x.lbl} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,fontWeight:700,color:x.c}}>{x.lbl}</span>
                  <span style={{fontSize:font.base,fontWeight:900,color:colors.text}}>{x.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="dc2">
        {/* Low stock list */}
        <div style={{...card,overflow:'hidden',animationDelay:'0.45s'}} className="si">
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${colors.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:font.base,fontWeight:800,color:colors.text}}>أصناف تحتاج إعادة طلب</div>
            {lowItems.length>0 && <span style={{background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>{lowItems.length}</span>}
          </div>
          <div style={{padding:'0 20px'}}>
            {lowItems.length===0 ? (
              <div style={{padding:'36px 0',textAlign:'center'}}>
                <div style={{fontSize:36,marginBottom:10}}>✅</div>
                <div style={{fontSize:font.sm,fontWeight:700,color:colors.text2}}>كل المخزون بحالة ممتازة</div>
                <div style={{fontSize:font.xs,color:colors.text4,marginTop:4}}>لا يوجد أصناف تحتاج إعادة طلب</div>
              </div>
            ) : lowItems.map((p,i)=>{
              const pct=Math.min(Math.round((p.qty/Math.max(p.reorder_point,1))*100),100)
              const isRed=pct<30, isOrange=pct<60
              const barColor=isRed?colors.danger:isOrange?colors.warning:colors.primary
              return (
                <div key={i} className="hrow" style={{padding:'13px 0',borderBottom:i<lowItems.length-1?`1px solid ${colors.border}`:'none',cursor:'pointer'}} onClick={()=>router.push('/inventory')}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,maxWidth:180}}>{p.name}</div>
                    <div style={{textAlign:'left' as const,flexShrink:0}}>
                      <span style={{fontSize:font.sm,fontWeight:900,color:barColor}}>{p.qty}</span>
                      <span style={{fontSize:10,color:colors.text4}}> / {p.reorder_point} {p.unit}</span>
                    </div>
                  </div>
                  <div style={{height:5,background:colors.border,borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:pct+'%',background:barColor,borderRadius:99,transition:'width .6s cubic-bezier(.4,0,.2,1)'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{...card,overflow:'hidden',animationDelay:'0.5s'}} className="si">
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${colors.border}`}}>
            <div style={{fontSize:font.base,fontWeight:800,color:colors.text}}>آخر الحركات</div>
            <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>أحدث عمليات الصرف والإضافة</div>
          </div>
          <div style={{padding:'0 20px'}}>
            {recentActivity.length===0 ? (
              <div style={{padding:'36px 0',textAlign:'center',color:colors.text4,fontSize:font.sm}}>لا توجد حركات بعد</div>
            ) : recentActivity.map((m,i)=>(
              <div key={i} className="hrow" style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:i<recentActivity.length-1?`1px solid ${colors.border}`:'none'}}>
                <div style={{width:36,height:36,flexShrink:0,borderRadius:10,background:m.type==='out'?colors.dangerLight:colors.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${m.type==='out'?colors.dangerBorder:colors.primaryBorder}`}}>
                  <svg width={14} height={14} fill="none" stroke={m.type==='out'?colors.danger:colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    {m.type==='out'?<path d="M17 8l4 4m0 0l-4 4m4-4H3"/>:<path d="M7 16l-4-4m0 0l4-4m-4 4h18"/>}
                  </svg>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{(m.products as any)?.name||'—'}</div>
                  <div style={{fontSize:10,color:colors.text4,marginTop:2}}>{new Date(m.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
                <div style={{textAlign:'left' as const,flexShrink:0}}>
                  <span style={{fontSize:font.sm,fontWeight:800,color:m.type==='out'?colors.danger:colors.primary}}>
                    {m.qty_change>0?'+':''}{m.qty_change}
                  </span>
                  <span style={{fontSize:10,color:colors.text4}}> {(m.products as any)?.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="dc4q si">
        {[
          {title:'إضافة منتج',  desc:'أضف صنفاً جديداً',    href:'/inventory', color:colors.primary, bg:colors.primaryLight, icon:'M12 4v16m8-8H4'},
          {title:'تسجيل شراء', desc:'فاتورة مشتريات',       href:'/purchases', color:colors.info,    bg:colors.infoLight,    icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'},
          {title:'تسجيل صرف',  desc:'خصم من المخزون',       href:'/dispense',  color:colors.danger,  bg:colors.dangerLight,  icon:'M17 8l4 4m0 0l-4 4m4-4H3'},
          {title:'الإعدادات',  desc:'تنبيهات وإعدادات',     href:'/settings',  color:colors.warning, bg:colors.warningLight, icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'},
        ].map((b,i)=>(
          <button key={i} className="qc" onClick={()=>router.push(b.href)} style={{...card,padding:'16px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:14,textAlign:'right' as const,border:'none',fontFamily:font.family,background:colors.surface}}>
            <div style={{width:42,height:42,background:b.bg,borderRadius:radius.md,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${b.color}22`}}>
              <svg width={18} height={18} fill="none" stroke={b.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {b.icon.split(' M').map((d,j)=><path key={j} d={(j===0?'':' M')+d}/>)}
              </svg>
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:font.sm,fontWeight:800,color:colors.text}}>{b.title}</div>
              <div style={{fontSize:11,color:colors.text4,marginTop:2}}>{b.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
    </ErrorBoundary>
  )
}
