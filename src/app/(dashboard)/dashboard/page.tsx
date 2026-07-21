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
    if (this.state.error) return <div style={{padding:24,textAlign:'center',color:'#ef4444',fontSize:13}}>حدث خطأ — حاول مرة أخرى</div>
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
    <div style={{display:'flex',alignItems:'flex-end',gap:4,height:44}}>
      {data.map((d,i)=>{
        const last = i===data.length-1
        return (
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{width:'100%',height:34,display:'flex',alignItems:'flex-end',overflow:'hidden',borderRadius:'3px 3px 0 0'}}>
              <div style={{width:'100%',borderRadius:'3px 3px 0 0',height:`${Math.max((d.value/max)*100,5)}%`,background:last?color:'#e5e7eb',transition:`height .5s ease ${i*.04}s`}}/>
            </div>
            <div style={{fontSize:9,color:last?'#374151':'#9ca3af',fontWeight:last?600:400,letterSpacing:'.02em'}}>{d.label}</div>
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
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([])
  const [monthComp, setMonthComp] = useState<any>(null)
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
    let movementsQuery = sb.from('stock_movements').select('qty_change,type,created_at,products!inner(name,unit,org_id,branch_id)').eq('products.org_id',orgId).order('created_at',{ascending:false}).limit(50)
    if (bid) movementsQuery = movementsQuery.eq('products.branch_id', bid)
    const[{data:products},{data:purchases},{data:movements}]=await Promise.all([
      ab(sb.from('products').select('id,name,qty,reorder_point,unit').eq('org_id',orgId).eq('is_active',true)),
      ab(sb.from('purchases').select('amount,created_at').eq('org_id',orgId)),
      movementsQuery,
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
    const{data:nData}=await (sb as any).from('notifications').select('id,title,message,type').eq('org_id',orgId).eq('read',false).or(bid?`branch_id.is.null,branch_id.eq.${bid}`:'branch_id.is.null,branch_id.not.is.null').order('created_at',{ascending:false}).limit(5)
    setNotifs(nData||[])
    // توقيت الطلب الذكي
    fetch('/api/smart-reorder-timing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:bid})}).then(r=>r.json()).then(d=>{ if(d.success) setSmartSuggestions(d.suggestions||[]) }).catch(()=>{})
    // مقارنة الأداء الشهري
    fetch('/api/month-comparison?org_id='+orgId+'&branch_id='+(sessionStorage.getItem('s_branch_id')||'')).then(r=>r.json()).then(d=>{ if(d.success) setMonthComp(d) }).catch(()=>{})
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
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:'100%'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.35}}.sk{animation:sk 1.4s ease infinite}`}</style>
      <div className="sk" style={{height:52,borderRadius:12,background:'#f0f0ee',marginBottom:20}}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:16}}>
        {[1,2,3,4].map(i=><div key={i} className="sk" style={{height:96,borderRadius:12,background:'#f0f0ee'}}/>)}
      </div>
      <div className="sk" style={{height:100,borderRadius:12,background:'#f0f0ee'}}/>
    </div>
  )

  return (
    <ErrorBoundary>
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:'100%',opacity:visible?1:0,transition:'opacity .3s'}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .u{animation:up .35s ease both}
        .r{border-radius:12px}
        .s{background:#fff;border:1px solid #ebebea}
        .tap{transition:transform .12s,opacity .12s;cursor:pointer}
        .tap:active{transform:scale(.97);opacity:.85}
        .rh:hover{background:#f9f9f8}
        /* grid */
        .g4{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
        .g2{display:grid;grid-template-columns:1fr;gap:10px}
        .gq{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
        @media(min-width:600px){
          .g4{grid-template-columns:repeat(4,1fr);gap:12px}
          .g2{grid-template-columns:1.6fr 1fr;gap:12px}
          .gq{grid-template-columns:repeat(4,1fr);gap:10px}
        }
      `}</style>

      {/* ── Header ── */}
      <div className="u" style={{marginBottom:20,animationDelay:'.04s'}}>
        <div style={{fontSize:22,fontWeight:700,color:'#1c1c1a',letterSpacing:'-0.4px',marginBottom:3}}>
          {greeting}، {userName||'مرحباً'}
        </div>
        <div style={{fontSize:12,color:'#888780'}}>
          {orgName} · {new Date().toLocaleDateString('ar-SA',{weekday:'long',month:'long',day:'numeric'})}
        </div>
      </div>

      {/* ── Notifications ── */}
      {notifs.map((n:any,i:number)=>{
        const tc:{[k:string]:{bg:string,border:string,color:string}} = {
          info:    {bg:'#eff6ff',border:'#bfdbfe',color:'#378add'},
          warning: {bg:'#fffbeb',border:'#fde68a',color:'#ba7517'},
          success: {bg:'#f0fdf4',border:'#bbf7d0',color:'#16a34a'},
          danger:  {bg:'#fef2f2',border:'#fecaca',color:'#e24b4a'},
        }
        const t=tc[n.type]||tc.info
        return(
          <div key={n.id} className="u" style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:'11px 14px',display:'flex',alignItems:'flex-start',gap:10,animationDelay:`${i*.05}s`}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:t.color,marginBottom:2}}>{n.title}</div>
              <div style={{fontSize:11,color:'#5f5e5a',lineHeight:1.5}}>{n.message}</div>
            </div>
            <button onClick={async()=>{
              await (sb as any).from('notifications').update({read:true}).eq('id',n.id)
              setNotifs(prev=>prev.filter(x=>x.id!==n.id))
            }} style={{background:'none',border:'none',cursor:'pointer',color:'#888780',fontSize:16,padding:2,flexShrink:0}}>✕</button>
          </div>
        )
      })}

      {/* ── Sub alert ── */}
      {subAlert&&(
        <div className="u r" style={{padding:'10px 14px',marginBottom:14,background:'#fffbeb',border:'1px solid #fac775',display:'flex',alignItems:'center',gap:10,animationDelay:'.06s'}}>
          <svg width={14} height={14} fill="none" stroke="#854f0b" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          <span style={{fontSize:12,fontWeight:500,color:'#633806'}}>{subAlert}</span>
        </div>
      )}

      {/* ── Low stock banner ── */}
      {stats.lowStock>0&&(
        <button onClick={()=>router.push('/inventory')} className="u r tap"
          style={{width:'100%',padding:'12px 16px',marginBottom:16,background:'#fffbeb',border:'1px solid #fac775',display:'flex',alignItems:'center',gap:12,textAlign:'right',fontFamily:'inherit',animationDelay:'.08s'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:'#633806'}}>{stats.lowStock} صنف وصل للحد الأدنى</div>
            <div style={{fontSize:11,color:'#854f0b',marginTop:2}}>اضغط للتفاصيل</div>
          </div>
          <svg width={13} height={13} fill="none" stroke="#854f0b" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
      )}

      {/* ── Smart Reorder Timing ── */}
      {smartSuggestions.length>0&&(
        <div className="s r u" style={{padding:'16px',marginBottom:16,animationDelay:'.09s',border:'1px solid #bfdbfe',background:'#eff6ff'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <span style={{fontSize:16}}>🔔</span>
            <span style={{fontSize:13,fontWeight:800,color:'#1c1c1a'}}>توقيت الطلب الذكي</span>
          </div>
          <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
            {smartSuggestions.slice(0,4).map((s,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'white',borderRadius:9,border:`1px solid ${s.urgency==='now'?'#fecaca':'#e5e7eb'}`}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#1c1c1a'}}>{s.name}</div>
                  <div style={{fontSize:10,color:'#6b7280',marginTop:2}}>
                    استهلاك {s.dailyRate} {s.unit}/يوم · توريد يستغرق {s.avgLeadTimeDays} يوم عادة
                  </div>
                </div>
                <span style={{fontSize:10,fontWeight:800,padding:'4px 9px',borderRadius:99,background:s.urgency==='now'?'#fef2f2':'#fffbeb',color:s.urgency==='now'?'#dc2626':'#b45309',whiteSpace:'nowrap' as const}}>
                  {s.urgency==='now'?'⚠️ اطلب الآن':`اطلب خلال ${Math.max(s.suggestedOrderInDays,0)} يوم`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="g4 u" style={{marginBottom:14,animationDelay:'.1s'}}>
        {[
          {label:'الأصناف',    val:stats.products,       note:'في المخزون',   href:'/inventory', accent:'#16a34a'},
          {label:'ناقص',      val:stats.lowStock,        note:`${stats.outOfStock} نفدت`,href:'/inventory',accent:'#e24b4a'},
          {label:'شراء اليوم',val:stats.todayPurchases,  note:'فاتورة',       href:'/purchases', accent:'#378add'},
          {label:'صرف اليوم', val:stats.todayDispenses,  note:'عملية',        href:'/dispense',  accent:'#ba7517'},
        ].map((s,i)=>(
          <button key={i} onClick={()=>router.push(s.href)} className="s r tap"
            style={{padding:'16px',textAlign:'right',fontFamily:'inherit',cursor:'pointer',animationDelay:`${.12+i*.04}s`}}>
            <div style={{fontSize:28,fontWeight:700,color:s.accent,letterSpacing:'-1px',lineHeight:1,marginBottom:6,fontVariantNumeric:'tabular-nums'}}>
              <Num value={s.val}/>
            </div>
            <div style={{fontSize:12,fontWeight:500,color:'#1c1c1a',marginBottom:2}}>{s.label}</div>
            <div style={{fontSize:10,color:'#888780'}}>{s.note}</div>
          </button>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="u" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14,animationDelay:'.2s'}}>
        {[
          {title:'مشتريات الأسبوع',data:weeklyP,color:'#378add',total:weeklyP.reduce((s,d)=>s+d.value,0),unit:'فاتورة'},
          {title:'صرف الأسبوع',   data:weeklyD,color:'#e24b4a',total:weeklyD.reduce((s,d)=>s+d.value,0),unit:'عملية'},
        ].map((c,i)=>(
          <div key={i} className="s r" style={{padding:'14px 16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:12,fontWeight:500,color:'#1c1c1a'}}>{c.title}</span>
              <span style={{fontSize:11,fontWeight:600,color:c.color}}>{c.total} {c.unit}</span>
            </div>
            <Bar data={c.data} color={c.color}/>
          </div>
        ))}
      </div>

      {/* ── Low stock + Activity ── */}
      <div className="g2 u" style={{marginBottom:14,animationDelay:'.24s'}}>

        {/* Low stock */}
        <div className="s r" style={{overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #ebebea',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:13,fontWeight:500,color:'#1c1c1a'}}>تحتاج إعادة طلب</span>
            {lowItems.length>0&&<span style={{fontSize:10,fontWeight:600,color:'#a32d2d',background:'#fcebeb',padding:'2px 8px',borderRadius:99,border:'1px solid #f7c1c1'}}>{lowItems.length}</span>}
          </div>
          {lowItems.length===0?(
            <div style={{padding:'28px 16px',textAlign:'center',fontSize:12,color:'#888780'}}>كل المخزون بحالة جيدة</div>
          ):lowItems.map((p,i)=>{
            const pct=Math.min(Math.round((p.qty/Math.max(p.reorder_point,1))*100),100)
            const col=pct<30?'#e24b4a':pct<70?'#ba7517':'#16a34a'
            return(
              <div key={i} className="rh" style={{padding:'11px 16px',borderBottom:i<lowItems.length-1?'1px solid #f5f5f4':'none',cursor:'pointer'}} onClick={()=>router.push('/inventory')}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:500,color:'#1c1c1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160}}>{p.name}</span>
                  <span style={{fontSize:11,fontWeight:600,color:col,flexShrink:0,fontVariantNumeric:'tabular-nums'}}>{p.qty}/{p.reorder_point} {p.unit}</span>
                </div>
                <div style={{height:3,background:'#f0f0ee',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:pct+'%',background:col,borderRadius:99,transition:'width .5s'}}/>
                </div>
              </div>
            )
          })}
        </div>

        {/* Activity */}
        <div className="s r" style={{overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #ebebea'}}>
            <span style={{fontSize:13,fontWeight:500,color:'#1c1c1a'}}>آخر الحركات</span>
          </div>
          {activity.length===0?(
            <div style={{padding:'28px 16px',textAlign:'center',fontSize:12,color:'#888780'}}>لا توجد حركات بعد</div>
          ):activity.map((m,i)=>(
            <div key={i} className="rh" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:i<activity.length-1?'1px solid #f5f5f4':'none'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:m.type==='out'?'#e24b4a':'#16a34a',flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:'#1c1c1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(m.products as any)?.name||'—'}</div>
                <div style={{fontSize:10,color:'#888780',marginTop:1}}>{new Date(m.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</div>
              </div>
              <span style={{fontSize:12,fontWeight:600,color:m.type==='out'?'#e24b4a':'#16a34a',flexShrink:0,fontVariantNumeric:'tabular-nums'}}>
                {m.qty_change>0?'+':''}{m.qty_change} <span style={{fontSize:10,fontWeight:400,color:'#888780'}}>{(m.products as any)?.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="gq u" style={{animationDelay:'.28s'}}>
        {[
          {label:'إضافة منتج',  href:'/inventory', icon:'M12 4v16m8-8H4',            color:'#16a34a'},
          {label:'تسجيل شراء', href:'/purchases', icon:'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', color:'#378add'},
          {label:'تسجيل صرف',  href:'/dispense',  icon:'M17 8l4 4m0 0l-4 4m4-4H3',  color:'#e24b4a'},
          {label:'التقارير',   href:'/reports',   icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',color:'#ba7517'},
        ].map((b,i)=>(
          <button key={i} onClick={()=>router.push(b.href)} className="s r tap"
            style={{padding:'13px 16px',display:'flex',alignItems:'center',gap:12,textAlign:'right',fontFamily:'inherit',cursor:'pointer'}}>
            <div style={{width:32,height:32,borderRadius:8,background:b.color+'12',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width={15} height={15} fill="none" stroke={b.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {b.icon.split(' M').map((d,j)=><path key={j} d={(j===0?'':' M')+d}/>)}
              </svg>
            </div>
            <span style={{fontSize:12,fontWeight:500,color:'#1c1c1a'}}>{b.label}</span>
          </button>
        ))}
      </div>
    </div>
    </ErrorBoundary>
  )
}
