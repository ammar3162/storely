'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [stats, setStats] = useState({ products:0, lowStock:0, todayPurchases:0, totalAmount:0, todayDispenses:0 })
  const [lowItems, setLowItems] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [orgName, setOrgName] = useState('')
  const [userName, setUserName] = useState('')
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('full_name, org_id, organizations(name)').eq('id', user.id).single()
    if (profile) {
      setUserName(profile.full_name || '')
      setOrgName((profile.organizations as any)?.name || '')
    }
    const [{ data: products }, { data: purchases }, { data: movements }] = await Promise.all([
      supabase.from('products').select('id,name,qty,reorder_point,unit'),
      supabase.from('purchases').select('amount,created_at'),
      supabase.from('stock_movements').select('qty_change,type,created_at,products(name,unit)').order('created_at',{ascending:false}).limit(5),
    ])
    const today = new Date().toDateString()
    const low = (products||[]).filter(p => p.qty <= p.reorder_point)
    setStats({
      products: (products||[]).length,
      lowStock: low.length,
      todayPurchases: (purchases||[]).filter(p => new Date(p.created_at).toDateString()===today).length,
      totalAmount: (purchases||[]).reduce((s,p)=>s+Number(p.amount||0),0),
      todayDispenses: (movements||[]).filter(m=>m.type==='out'&&new Date(m.created_at).toDateString()===today).length,
    })
    setLowItems(low.slice(0,5))
    setRecentActivity((movements||[]).slice(0,6))
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور'

  const cards = [
    { label:'إجمالي الأصناف', value:stats.products, sub:'صنف في المخزون', icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color:'#1a4731', bg:'#e8f7ee', href:'/inventory' },
    { label:'مخزون ناقص', value:stats.lowStock, sub:'يحتاج إعادة طلب', icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color:'#991b1b', bg:'#fee2e2', href:'/inventory' },
    { label:'مشتريات اليوم', value:stats.todayPurchases, sub:'فاتورة جديدة', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', color:'#1e40af', bg:'#dbeafe', href:'/purchases' },
    { label:'إجمالي المشتريات', value:stats.totalAmount.toLocaleString('ar-SA', {maximumFractionDigits:0})+' ر.س', sub:'هذا الشهر', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color:'#92400e', bg:'#fef3c7', href:'/purchase-report' },
    { label:'صرف اليوم', value:stats.todayDispenses, sub:'عملية صرف', icon:'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4', color:'#6b21a8', bg:'#f3e8ff', href:'/dispense' },
  ]

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:22,fontWeight:800,color:'#0f172a',letterSpacing:'-0.5px'}}>{greeting}، {userName || 'مرحباً'} 👋</div>
        <div style={{fontSize:13,color:'#94a3b8',marginTop:4}}>{orgName} — {new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>

      {stats.lowStock > 0 && (
        <a href="/inventory" style={{textDecoration:'none',display:'block',marginBottom:20}}>
          <div style={{background:'#fffbeb',border:'1.5px solid #fcd34d',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'background 0.15s'}}>
            <div style={{width:36,height:36,background:'#fef3c7',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="18" height="18" fill="none" stroke="#f59e0b" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'#92400e'}}>{stats.lowStock} أصناف وصلت للحد الأدنى</div>
              <div style={{fontSize:11,color:'#b45309',marginTop:2}}>اضغط لعرض التفاصيل وإرسال تنبيه واتساب</div>
            </div>
            <svg width="16" height="16" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          </div>
        </a>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:24}}>
        {cards.map((c,i) => (
          <a key={i} href={c.href} style={{textDecoration:'none'}}>
            <div style={{background:'white',borderRadius:12,padding:'16px',border:'1px solid #e2e8f0',cursor:'pointer',transition:'all 0.15s',height:'100%'}}>
              <div style={{width:38,height:38,background:c.bg,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
                <svg width="18" height="18" fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  {c.icon.split(' M').map((d,j) => <path key={j} d={(j===0?'':' M')+d}/>)}
                </svg>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:4}}>{c.label}</div>
              <div style={{fontSize:22,fontWeight:900,color:'#0f172a',letterSpacing:'-0.5px'}}>{c.value}</div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>{c.sub}</div>
            </div>
          </a>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:16,marginBottom:16}}>
        <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>أصناف تحتاج إعادة طلب</div>
            {lowItems.length > 0 && <span style={{background:'#fee2e2',color:'#991b1b',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>{lowItems.length} أصناف</span>}
          </div>
          <div style={{padding:'0 18px'}}>
            {lowItems.length === 0 ? (
              <div style={{padding:'32px 0',textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:28,marginBottom:8}}>✅</div>
                <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>كل المخزون بحالة جيدة</div>
              </div>
            ) : lowItems.map((p,i) => {
              const pct = Math.round((p.qty / p.reorder_point) * 100)
              const isRed = pct < 50
              return (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:i<lowItems.length-1?'1px solid #f8fafc':'none'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#0f172a',marginBottom:3}}>{p.name}</div>
                    <div style={{height:4,background:'#f1f5f9',borderRadius:99,width:'80%',overflow:'hidden'}}>
                      <div style={{height:'100%',width:pct+'%',background:isRed?'#ef4444':'#f59e0b',borderRadius:99,transition:'width 0.3s'}}/>
                    </div>
                  </div>
                  <div style={{textAlign:'left' as const,minWidth:80}}>
                    <div style={{fontSize:13,fontWeight:800,color:isRed?'#ef4444':'#f59e0b'}}>{p.qty} {p.unit}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>الحد: {p.reorder_point}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>آخر الحركات</div>
          </div>
          <div style={{padding:'0 18px'}}>
            {recentActivity.length === 0 ? (
              <div style={{padding:'32px 0',textAlign:'center',color:'#94a3b8',fontSize:13}}>لا توجد حركات بعد</div>
            ) : recentActivity.map((m,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:i<recentActivity.length-1?'1px solid #f8fafc':'none'}}>
                <div style={{width:32,height:32,background:m.type==='out'?'#fee2e2':'#e8f7ee',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:14}}>
                  {m.type==='out'?'📤':'📥'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{(m.products as any)?.name||'—'}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{new Date(m.created_at).toLocaleDateString('ar-SA')}</div>
                </div>
                <span style={{background:m.type==='out'?'#fee2e2':'#dcfce7',color:m.type==='out'?'#991b1b':'#166534',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700,flexShrink:0}}>
                  {m.qty_change > 0 ? '+' : ''}{m.qty_change} {(m.products as any)?.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          { title:'إضافة منتج', desc:'أضف صنفاً جديداً للمخزون', href:'/inventory', icon:'M12 4v16m8-8H4', color:'#1a4731', bg:'#e8f7ee' },
          { title:'تسجيل شراء', desc:'سجل فاتورة مشتريات', href:'/purchases', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', color:'#1e40af', bg:'#dbeafe' },
          { title:'تسجيل صرف', desc:'خصم كمية من المخزون', href:'/dispense', icon:'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4', color:'#991b1b', bg:'#fee2e2' },
          { title:'تنبيه واتساب', desc:'إشعار بالمخزون الناقص', href:'/settings', icon:'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color:'#166534', bg:'#dcfce7' },
        ].map((b,i) => (
          <a key={i} href={b.href} style={{textDecoration:'none'}}>
            <div style={{background:'white',borderRadius:12,padding:'16px',border:'1px solid #e2e8f0',cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'all 0.15s'}}>
              <div style={{width:38,height:38,background:b.bg,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="18" height="18" fill="none" stroke={b.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  {b.icon.split(' M').map((d,j) => <path key={j} d={(j===0?'':' M')+d}/>)}
                </svg>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{b.title}</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{b.desc}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
