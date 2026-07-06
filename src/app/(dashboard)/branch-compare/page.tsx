'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  danger:'#ef4444', dangerL:'#fef2f2', dangerB:'#fecaca',
  warning:'#f59e0b', warningL:'#fffbeb', warningB:'#fde68a',
  info:'#3b82f6', infoL:'#eff6ff', infoB:'#bfdbfe',
  text:'#111827', text2:'#374151', text3:'#6b7280', text4:'#9ca3af',
  bg:'#f9fafb', surface:'#ffffff', border:'#f3f4f6', border2:'#e5e7eb',
}

const COLORS = ['#16a34a','#3b82f6','#f59e0b','#ef4444','#7c3aed','#0891b2']

export default function BranchComparePage() {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [period, setPeriod]   = useState<'7'|'30'|'90'>('30')

  const [plan, setPlan] = useState<string|null>(null)
  const [checkingPlan, setCheckingPlan] = useState(true)
  const sb = createClient()

  const allowed = plan==='advanced'

  useEffect(()=>{
    async function resolvePlan() {
      let p = sessionStorage.getItem('s_plan')
      if(!p){
        const{data:{user}}=await sb.auth.getUser()
        if(user){
          const{data:profile}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
          if(profile?.org_id){
            const{data:org}=await (sb as any).from('organizations').select('plan').eq('id',(profile as any).org_id).single()
            p = (org as any)?.plan || 'basic'
            sessionStorage.setItem('s_plan', p!)
          }
        }
      }
      setPlan(p||'basic')
      setCheckingPlan(false)
    }
    resolvePlan()
  },[])

  useEffect(()=>{ if(allowed) load() },[period, allowed])

  async function load() {
    setLoading(true)
    const org_id = sessionStorage.getItem('s_org_id')
    if (!org_id) return
    const res = await fetch('/api/branch-compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id, period: Number(period) })
    })
    const d = await res.json()
    setData(d)
    setLoading(false)
    setTimeout(()=>setVisible(true), 50)
  }

  if (checkingPlan) return (
    <div style={{fontFamily:'inherit',direction:'rtl',display:'flex',justifyContent:'center',padding:'80px 20px'}}>
      <div style={{width:32,height:32,border:'3px solid #f3f4f6',borderTopColor:C.primary,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!allowed) return (
    <div style={{fontFamily:'inherit',direction:'rtl',maxWidth:600,margin:'60px auto',textAlign:'center' as const,padding:20}}>
      <div style={{fontSize:48,marginBottom:16}}>🔒</div>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:8}}>هذه الميزة حصرية للباقة المتقدمة</div>
      <div style={{fontSize:14,color:C.text3,marginBottom:24,lineHeight:1.6}}>مقارنة أداء الفروع متاحة فقط في الباقة المتقدمة. ترقّى الآن لمقارنة الصرف والمشتريات بين كل فروعك من مكان واحد.</div>
      <a href="/settings" style={{display:'inline-block',padding:'12px 28px',background:C.primary,color:'white',borderRadius:10,fontSize:14,fontWeight:700,textDecoration:'none'}}>ترقية الباقة</a>
    </div>
  )

  if (loading) return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:900,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.4s ease infinite}`}</style>
      <div className="sk" style={{height:28,width:200,background:C.border2,borderRadius:8,marginBottom:20}}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
        {[1,2,3,4].map(i=><div key={i} className="sk" style={{height:120,borderRadius:14,background:C.border}}/>)}
      </div>
    </div>
  )

  const branches = data?.branches || []

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:900,margin:'0 auto',opacity:visible?1:0,transition:'opacity .3s ease'}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.fu{animation:fadeUp .35s ease both}`}</style>

      {/* Header */}
      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>مقارنة الفروع</h1>
          <p style={{fontSize:11,color:C.text3,marginTop:3}}>تحليل أداء كل فرع بناءً على بيانات حقيقية</p>
        </div>
        <div style={{display:'flex',gap:4,background:C.bg,borderRadius:10,padding:4,border:`1px solid ${C.border2}`}}>
          {[{v:'7',l:'أسبوع'},{v:'30',l:'شهر'},{v:'90',l:'90 يوم'}].map(p=>(
            <button key={p.v} onClick={()=>setPeriod(p.v as any)}
              style={{padding:'6px 12px',borderRadius:8,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:period===p.v?C.primary:'transparent',color:period===p.v?'white':C.text3,transition:'all .15s'}}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {branches.length===0 ? (
        <div className="fu" style={{background:'white',borderRadius:14,padding:'48px 24px',textAlign:'center',border:`1px solid ${C.border}`}}>
          <div style={{fontSize:40,marginBottom:12}}>🏪</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text2}}>فرع واحد فقط</div>
          <div style={{fontSize:12,color:C.text4,marginTop:6}}>المقارنة تحتاج فرعين أو أكثر</div>
        </div>
      ) : (
        <>
          {/* Branch cards */}
          <div className="fu" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:16,animationDelay:'.06s'}}>
            {branches.map((b:any, i:number)=>(
              <div key={i} style={{background:'white',borderRadius:14,padding:'16px',border:`1.5px solid ${b.rank===1?COLORS[i]:C.border}`,boxShadow:b.rank===1?`0 4px 16px ${COLORS[i]}15`:'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:COLORS[i],flexShrink:0}}/>
                    <div style={{fontSize:13,fontWeight:800,color:C.text}}>{b.name}</div>
                  </div>
                  {b.rank===1&&<span style={{background:C.warningL,color:'#92400e',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:99,border:`1px solid ${C.warningB}`}}>🏆 الأفضل</span>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    {label:'أصناف',     value:b.products,    color:C.info},
                    {label:'ناقص',      value:b.lowStock,    color:C.danger},
                    {label:'الصرف',     value:b.dispenses,   color:C.primary},
                    {label:'مشتريات',   value:`${b.purchases} ر.س`, color:C.warning},
                  ].map((s,j)=>(
                    <div key={j} style={{background:C.bg,borderRadius:9,padding:'8px 10px'}}>
                      <div style={{fontSize:15,fontWeight:900,color:s.color}}>{s.value}</div>
                      <div style={{fontSize:9,color:C.text4,marginTop:2,fontWeight:600}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Comparison bars */}
          <div className="fu" style={{background:'white',borderRadius:14,padding:'16px',border:`1px solid ${C.border}`,marginBottom:12,animationDelay:'.1s'}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>مقارنة الصرف</div>
            {branches.map((b:any,i:number)=>{
              const max = Math.max(...branches.map((x:any)=>x.dispenses), 1)
              const pct = (b.dispenses/max)*100
              return (
                <div key={i} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                    <span style={{fontWeight:600,color:C.text2}}>{b.name}</span>
                    <span style={{fontWeight:700,color:COLORS[i]}}>{b.dispenses} عملية</span>
                  </div>
                  <div style={{height:8,background:C.bg,borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:COLORS[i],borderRadius:99,transition:'width .8s ease'}}/>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Top products per branch */}
          {branches.map((b:any,i:number)=>b.topProducts?.length>0&&(
            <div key={i} className="fu" style={{background:'white',borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden',marginBottom:10,animationDelay:`${.12+i*.04}s`}}>
              <div style={{padding:'11px 16px',borderBottom:`1px solid ${C.border}`,background:C.bg,display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:COLORS[i]}}/>
                <span style={{fontSize:13,fontWeight:700,color:C.text}}>{b.name} — أكثر الأصناف صرفاً</span>
              </div>
              {b.topProducts.slice(0,5).map((p:any,j:number)=>(
                <div key={j} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:j<4?`1px solid ${C.border}`:'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{width:20,height:20,borderRadius:'50%',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:C.text3,border:`1px solid ${C.border2}`}}>{j+1}</span>
                    <span style={{fontSize:13,fontWeight:600,color:C.text}}>{p.name}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:800,color:COLORS[i]}}>{p.total} {p.unit}</span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
