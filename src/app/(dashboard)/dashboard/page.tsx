'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Component } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { colors, radius, shadow, font, card, btnSecondary, tag, pageTitle } from '@/lib/ds'

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

function BarChart({ data, color }: { data:{label:string;value:number}[]; color:string }) {
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:5,height:72}}>
      {data.map((d,i) => {
        const pct = (d.value/max)*100
        return (
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{fontSize:9,color:colors.text4,fontWeight:600,minHeight:12}}>{d.value>0?d.value:''}</div>
            <div style={{width:'100%',background:colors.border,borderRadius:'3px 3px 0 0',height:48,display:'flex',alignItems:'flex-end'}}>
              <div style={{width:'100%',borderRadius:'3px 3px 0 0',height:`${Math.max(pct,4)}%`,background:color,transition:'height .6s cubic-bezier(.4,0,.2,1)'}}/>
            </div>
            <div style={{fontSize:9,color:colors.text4}}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ value, total, color }: { value:number; total:number; color:string }) {
  const pct = total>0?value/total:0
  const r=28,cx=36,cy=36,circ=2*Math.PI*r
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.border2} strokeWidth={7}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${pct*circ} ${circ}`} strokeDashoffset={circ*0.25}
        strokeLinecap="round" style={{transition:'stroke-dasharray .8s cubic-bezier(.4,0,.2,1)'}}/>
      <text x={cx} y={cy+5} textAnchor="middle" fontSize={12} fontWeight={700} fill={colors.text}>{Math.round(pct*100)}%</text>
    </svg>
  )
}

function StatCard({ label, value, sub, icon, color, bg, onClick }: any) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{...card,padding:'18px 16px',cursor:'pointer',textAlign:'right',border:'none',fontFamily:font.family,transform:hov?'translateY(-3px)':'none',boxShadow:hov?shadow.md:shadow.sm,background:hov?bg:colors.surface,transition:'all .2s cubic-bezier(.4,0,.2,1)'}}>
      <div style={{width:40,height:40,background:bg,borderRadius:radius.md,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
        <svg width={19} height={19} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          {icon.split(' M').map((d:string,j:number)=><path key={j} d={(j===0?'':' M')+d}/>)}
        </svg>
      </div>
      <div style={{fontSize:font.xs,fontWeight:700,color:colors.text4,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>{label}</div>
      <div style={{fontSize:font.xl,fontWeight:900,color:colors.text,letterSpacing:'-0.5px',marginBottom:3}}>{value}</div>
      <div style={{fontSize:font.xs,color:colors.text4}}>{sub}</div>
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
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => { load() }, [])

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
        if (days<=0) setSubAlert('expired')
        else if (days<=7) setSubAlert(`ينتهي اشتراكك بعد ${days} أيام — يرجى التجديد`)
      }
    }
    const orgId = profile?.org_id
    if (!orgId) return
    sessionStorage.setItem("s_org_id", orgId); sessionStorage.setItem("s_profile_id", user.id)

    const [{ data:products },{ data:purchases },{ data:movements }] = await Promise.all([
      (()=>{ let q=supabase.from('products').select('id,name,qty,reorder_point,unit').eq('org_id',orgId).eq('is_active',true); const bid=sessionStorage.getItem('s_branch_id'); if(bid) q=(q as any).eq('branch_id',bid); return q })(),
      (()=>{ let q=supabase.from('purchases').select('amount,created_at').eq('org_id',orgId); const bid=sessionStorage.getItem('s_branch_id'); if(bid) q=(q as any).eq('branch_id',bid); return q })(),
      supabase.from('stock_movements').select('qty_change,type,created_at,products!inner(name,unit,org_id)').eq('products.org_id',orgId).order('created_at',{ascending:false}).limit(20),
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
  }

  const hour=new Date().getHours()
  const greeting=hour<12?'صباح الخير':hour<17?'مساء الخير':'مساء النور'

  if (loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1200,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.4}}.sk{animation:sk 1.4s infinite}`}</style>
      <div className="sk" style={{height:24,width:200,background:colors.border2,borderRadius:6,marginBottom:8}}/>
      <div className="sk" style={{height:12,width:260,background:colors.border,borderRadius:6,marginBottom:24}}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>{[1,2,3,4].map(i=>(<div key={i} className="sk" style={{height:110,borderRadius:radius.lg,background:colors.border}}/>))}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>{[1,2,3].map(i=>(<div key={i} className="sk" style={{height:130,borderRadius:radius.lg,background:colors.border}}/>))}</div>
    </div>
  )

  return (
    <ErrorBoundary>
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1200,margin:'0 auto'}}>
      <style>{`
        .dc4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
        .dc3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px}
        .dc2{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;margin-bottom:20px}
        .dc4q{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        @media(max-width:1100px){.dc3{grid-template-columns:1fr 1fr}}
        @media(max-width:900px){.dc4{grid-template-columns:repeat(2,1fr)}.dc4q{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:768px){.dc2{grid-template-columns:1fr}}
        @media(max-width:480px){.dc3{grid-template-columns:1fr}}
        .qc:hover{transform:translateY(-2px);box-shadow:${shadow.md}!important}
        .hrow:hover{background:${colors.bg}}
      `}</style>

      <div style={{marginBottom:22}}>
        <div style={{fontSize:font.xl,fontWeight:800,color:colors.text,letterSpacing:'-0.5px'}}>{greeting}، {userName||'مرحباً'} 👋</div>
        <div style={{fontSize:font.sm,color:colors.text4,marginTop:3}}>{orgName} — {new Date().toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>

      {subAlert&&showAlert&&subAlert!=='expired'&&(
        <div style={{background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <span style={{fontSize:18}}>⏰</span>
          <div style={{flex:1,fontSize:font.sm,fontWeight:600,color:'#92400e'}}>{subAlert}</div>
          <button onClick={()=>setShowAlert(false)} style={{background:'none',border:'none',cursor:'pointer',color:colors.warning,fontSize:16,padding:'0 4px'}}>✕</button>
        </div>
      )}

      {stats.lowStock>0&&(
        <button onClick={()=>router.push('/inventory')} style={{width:'100%',background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',marginBottom:20,textAlign:'right' as const,fontFamily:font.family}}>
          <div style={{width:36,height:36,background:'#fef3c7',borderRadius:radius.sm,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width={18} height={18} fill="none" stroke={colors.warning} strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:font.sm,fontWeight:700,color:'#92400e'}}>{stats.lowStock} أصناف وصلت للحد الأدنى</div>
            <div style={{fontSize:11,color:'#b45309',marginTop:1}}>اضغط لعرض التفاصيل وإرسال تنبيه واتساب</div>
          </div>
          <svg width={16} height={16} fill="none" stroke={colors.warning} strokeWidth={2} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
      )}

      <div className="dc4">
        <StatCard label="إجمالي الأصناف" value={stats.products} sub="صنف في المخزون" color={colors.primary} bg={colors.primaryLight} icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" onClick={()=>router.push('/inventory')}/>
        <StatCard label="مخزون ناقص" value={stats.lowStock} sub="يحتاج إعادة طلب" color={colors.danger} bg={colors.dangerLight} icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" onClick={()=>router.push('/inventory')}/>
        <StatCard label="مشتريات اليوم" value={stats.todayPurchases} sub="فاتورة اليوم" color={colors.info} bg={colors.infoLight} icon="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" onClick={()=>router.push('/purchases')}/>
        <StatCard label="إجمالي المشتريات" value={stats.totalAmount.toLocaleString('en-GB',{maximumFractionDigits:0})+' ر.س'} sub="كل الوقت" color={colors.warning} bg={colors.warningLight} icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" onClick={()=>router.push('/purchase-report')}/>
      </div>

      <div className="dc3">
        <div style={{...card,padding:'16px 18px'}}>
          <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,marginBottom:3}}>مشتريات الأسبوع</div>
          <div style={{fontSize:font.xs,color:colors.text4,marginBottom:14}}>عدد الفواتير آخر 7 أيام</div>
          <BarChart data={weeklyP} color={colors.info}/>
        </div>
        <div style={{...card,padding:'16px 18px'}}>
          <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,marginBottom:3}}>صرف الأسبوع</div>
          <div style={{fontSize:font.xs,color:colors.text4,marginBottom:14}}>عمليات الصرف آخر 7 أيام</div>
          <BarChart data={weeklyD} color={colors.danger}/>
        </div>
        <div style={{...card,padding:'16px 18px',display:'flex',flexDirection:'column' as const}}>
          <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,marginBottom:3}}>صحة المخزون</div>
          <div style={{fontSize:font.xs,color:colors.text4,marginBottom:14}}>نسبة الأصناف بمستوى جيد</div>
          <div style={{display:'flex',alignItems:'center',gap:16,flex:1}}>
            <DonutChart value={stats.products-stats.lowStock} total={stats.products} color={colors.primary}/>
            <div style={{display:'flex',flexDirection:'column' as const,gap:8,flex:1}}>
              {[
                {lbl:'جيد',  v:stats.products-stats.lowStock,    c:colors.primary, bg:colors.primaryLight, br:colors.primaryBorder},
                {lbl:'ناقص', v:stats.lowStock-stats.outOfStock,  c:colors.warning, bg:colors.warningLight, br:colors.warningBorder},
                {lbl:'نفد',  v:stats.outOfStock,                 c:colors.danger,  bg:colors.dangerLight,  br:colors.dangerBorder},
              ].map(x=>(<div key={x.lbl} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{...tag(x.c,x.bg,x.br)}}>{x.lbl}</span><span style={{fontSize:font.sm,fontWeight:800,color:colors.text}}>{x.v}</span></div>))}
            </div>
          </div>
        </div>
      </div>

      <div className="dc2">
        <div style={{...card}}>
          <div style={{padding:'14px 18px',borderBottom:`1px solid ${colors.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:font.base,fontWeight:700,color:colors.text}}>أصناف تحتاج إعادة طلب</div>
            {lowItems.length>0&&<span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder)}}>{lowItems.length} أصناف</span>}
          </div>
          <div style={{padding:'0 18px'}}>
            {lowItems.length===0 ? (
              <div style={{padding:'32px 0',textAlign:'center'}}><div style={{fontSize:28,marginBottom:8}}>✅</div><div style={{fontSize:font.sm,fontWeight:600,color:colors.text2}}>كل المخزون بحالة جيدة</div></div>
            ) : lowItems.map((p,i)=>{
              const pct=Math.min(Math.round((p.qty/Math.max(p.reorder_point,1))*100),100), isRed=pct<50
              return (
                <div key={i} className="hrow" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',transition:'background .15s',borderBottom:i<lowItems.length-1?`1px solid ${colors.border}`:'none'}}>
                  <div style={{flex:1,minWidth:0,paddingLeft:12}}>
                    <div style={{fontSize:font.sm,fontWeight:600,color:colors.text,marginBottom:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.name}</div>
                    <div style={{height:4,background:colors.border,borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:pct+'%',background:isRed?colors.danger:colors.warning,borderRadius:99,transition:'width .4s'}}/></div>
                  </div>
                  <div style={{textAlign:'left' as const,flexShrink:0}}>
                    <div style={{fontSize:font.sm,fontWeight:800,color:isRed?colors.danger:colors.warning}}>{p.qty} {p.unit}</div>
                    <div style={{fontSize:10,color:colors.text4}}>الحد: {p.reorder_point}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{...card}}>
          <div style={{padding:'14px 18px',borderBottom:`1px solid ${colors.border}`}}>
            <div style={{fontSize:font.base,fontWeight:700,color:colors.text}}>آخر الحركات</div>
          </div>
          <div style={{padding:'0 18px'}}>
            {recentActivity.length===0 ? (
              <div style={{padding:'32px 0',textAlign:'center',color:colors.text4,fontSize:font.sm}}>لا توجد حركات بعد</div>
            ) : recentActivity.map((m,i)=>(
              <div key={i} className="hrow" style={{display:'flex',alignItems:'center',gap:10,padding:'11px 0',transition:'background .15s',borderBottom:i<recentActivity.length-1?`1px solid ${colors.border}`:'none'}}>
                <div style={{width:32,height:32,flexShrink:0,borderRadius:radius.sm,background:m.type==='out'?colors.dangerLight:colors.primaryLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width={13} height={13} fill="none" stroke={m.type==='out'?colors.danger:colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    {m.type==='out'?<path d="M17 8l4 4m0 0l-4 4m4-4H3"/>:<path d="M7 16l-4-4m0 0l4-4m-4 4h18"/>}
                  </svg>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:font.xs,fontWeight:600,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{(m.products as any)?.name||'—'}</div>
                  <div style={{fontSize:10,color:colors.text4}}>{new Date(m.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <span style={{...tag(m.type==='out'?colors.danger:colors.primary,m.type==='out'?colors.dangerLight:colors.primaryLight,m.type==='out'?colors.dangerBorder:colors.primaryBorder),fontSize:font.xs}}>
                  {m.qty_change>0?'+':''}{m.qty_change} {(m.products as any)?.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dc4q">
        {[
          {title:'إضافة منتج',  desc:'أضف صنفاً جديداً',      href:'/inventory', color:colors.primary, bg:colors.primaryLight, icon:'M12 4v16m8-8H4'},
          {title:'تسجيل شراء',  desc:'سجل فاتورة مشتريات',    href:'/purchases', color:colors.info,    bg:colors.infoLight,    icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'},
          {title:'تسجيل صرف',   desc:'خصم كمية من المخزون',   href:'/dispense',  color:colors.danger,  bg:colors.dangerLight,  icon:'M17 8l4 4m0 0l-4 4m4-4H3'},
          {title:'الإعدادات',   desc:'تنبيهات واتساب',        href:'/settings',  color:colors.warning, bg:colors.warningLight, icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'},
        ].map((b,i)=>(
          <button key={i} className="qc" onClick={()=>router.push(b.href)} style={{...card,padding:'16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'all .2s',textAlign:'right' as const,border:'none',fontFamily:font.family}}>
            <div style={{width:38,height:38,background:b.bg,borderRadius:radius.md,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width={17} height={17} fill="none" stroke={b.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {b.icon.split(' M').map((d,j)=><path key={j} d={(j===0?'':' M')+d}/>)}
              </svg>
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{b.title}</div>
              <div style={{fontSize:11,color:colors.text4,marginTop:1}}>{b.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
    </ErrorBoundary>
  )
}
