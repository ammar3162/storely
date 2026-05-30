'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DashboardPage() {
  const [products, setProducts]         = useState<any[]>([])
  const [purchases, setPurchases]       = useState<any[]>([])
  const [dispenses, setDispenses]       = useState<any[]>([])
  const [allPurchases, setAllPurchases] = useState<any[]>([])
  const [allDispenses, setAllDispenses] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [time, setTime]                 = useState(new Date())
  const [orgName, setOrgName]           = useState('')
  const [notifySent, setNotifySent]     = useState(false)
  const [notifyLoading, setNotifyLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadAll()
    loadOrgName()
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  async function loadOrgName() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('organizations(name)').eq('id', user.id).single()
    if (data?.organizations) setOrgName((data.organizations as any).name || '')
  }

  async function loadAll() {
    setLoading(true)
    const [p, pu, d, allPu, allD] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('purchases').select('*').order('created_at', { ascending: false }).limit(6),
      supabase.from('dispenses').select('*').order('created_at', { ascending: false }).limit(6),
      supabase.from('purchases').select('*').order('created_at', { ascending: true }),
      supabase.from('dispenses').select('*').order('created_at', { ascending: true }),
    ])
    setProducts(p.data || [])
    setPurchases(pu.data || [])
    setDispenses(d.data || [])
    setAllPurchases(allPu.data || [])
    setAllDispenses(allD.data || [])
    setLoading(false)
  }

  async function sendLowStockAlert() {
    if (lowStock.length === 0) return
    setNotifyLoading(true)
    try {
      const res = await fetch('/api/notify-low-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: lowStock,
          orgName,
          phone: '+966561161448'
        })
      })
      const data = await res.json()
      if (data.success) {
        setNotifySent(true)
        setTimeout(() => setNotifySent(false), 5000)
      } else {
        alert('فشل الإرسال: ' + (data.error || 'خطأ غير معروف'))
      }
    } catch {
      alert('فشل الاتصال بالخادم')
    }
    setNotifyLoading(false)
  }

  const totalValue   = products.reduce((s, p) => s + (p.qty * p.cost_price), 0)
  const lowStock     = products.filter(p => p.qty <= p.reorder_point)
  const totalSpent   = allPurchases.reduce((s, p) => s + (Number(p.total_incl_vat)||0), 0)
  const okStock      = products.length - lowStock.length
  const hour         = time.getHours()
  const greeting     = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور'
  const greetingFull = orgName ? `${greeting}، ${orgName} 👋` : `${greeting} 👋`

  // آخر 7 أيام
  const last7Days = Array.from({length:7}, (_,i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6-i))
    return d
  })

  const chartData = last7Days.map(day => {
    const dayStr  = day.toISOString().split('T')[0]
    const puTotal = allPurchases
      .filter(p => p.created_at?.startsWith(dayStr))
      .reduce((s,p) => s + (Number(p.total_incl_vat)||0), 0)
    const disTotal = allDispenses
      .filter(d => d.created_at?.startsWith(dayStr))
      .reduce((s,d) => s + (Number(d.qty)||0), 0)
    return {
      day: day.toLocaleDateString('ar-SA', {weekday:'short'}),
      purchases: puTotal,
      dispenses: disTotal
    }
  })

  const maxPurchase = Math.max(...chartData.map(d => d.purchases), 1)

  // أعلى 5 منتجات
  const productMap: Record<string,number> = {}
  allPurchases.forEach(p => {
    productMap[p.product_name] = (productMap[p.product_name]||0) + (Number(p.total_incl_vat)||0)
  })
  const top5    = Object.entries(productMap).sort((a,b) => b[1]-a[1]).slice(0,5)
  const maxTop5 = Math.max(...top5.map(t => t[1]), 1)

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'70vh',flexDirection:'column',gap:20}}>
      <div style={{width:56,height:56,border:'4px solid #e2e8f0',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <div style={{fontSize:15,fontWeight:600,color:'#64748b'}}>جاري التحميل...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>
      <style>{`
        @media(max-width:768px){
          .stats-grid{grid-template-columns:1fr 1fr !important}
          .quick-grid{grid-template-columns:1fr !important}
          .recent-grid{grid-template-columns:1fr !important}
          .charts-grid{grid-template-columns:1fr !important}
          .header-greeting{font-size:20px !important}
          .alert-btns{flex-direction:column !important}
        }
      `}</style>

      {/* Header */}
      <div style={{
        background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)',
        borderRadius:20,padding:'24px 28px',marginBottom:24,
        display:'flex',justifyContent:'space-between',alignItems:'center',
        boxShadow:'0 8px 32px rgba(99,102,241,0.3)',flexWrap:'wrap',gap:12
      }}>
        <div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:600,marginBottom:4}}>
            {time.toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </div>
          <h1 className="header-greeting" style={{fontSize:24,fontWeight:900,color:'white',margin:0}}>
            {greetingFull}
          </h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.75)',margin:'4px 0 0'}}>نظرة عامة على مخزونك اليوم</p>
        </div>
        <button onClick={loadAll} style={{
          padding:'10px 18px',background:'rgba(255,255,255,0.15)',color:'white',
          border:'1.5px solid rgba(255,255,255,0.3)',borderRadius:12,
          fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'
        }}>🔄 تحديث</button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{
          background:'linear-gradient(135deg,#fffbeb,#fef3c7)',
          border:'2px solid #fcd34d',borderRadius:14,
          padding:'14px 20px',marginBottom:20,
          display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'
        }}>
          <div style={{width:40,height:40,background:'#f59e0b',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>🔔</div>
          <div style={{flex:1,minWidth:150}}>
            <div style={{fontWeight:800,color:'#92400e',fontSize:14,marginBottom:4}}>
              تنبيه: {lowStock.length} صنف وصل للحد الأدنى!
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {lowStock.map(p => (
                <span key={p.id} style={{background:'rgba(245,158,11,0.15)',padding:'2px 10px',borderRadius:50,fontSize:11,fontWeight:600,color:'#b45309'}}>
                  {p.name} ({p.qty})
                </span>
              ))}
            </div>
          </div>
          <div className="alert-btns" style={{display:'flex',gap:8,flexShrink:0}}>
            <button onClick={sendLowStockAlert} disabled={notifyLoading || notifySent} style={{
              padding:'8px 14px',borderRadius:10,fontSize:12,fontWeight:700,
              cursor: notifySent ? 'default' : 'pointer',fontFamily:'system-ui',
              background: notifySent ? '#10b981' : 'white',
              color: notifySent ? 'white' : '#25d366',
              border: `2px solid ${notifySent ? '#10b981' : '#25d366'}`,
              transition:'all 0.2s'
            }}>
              {notifyLoading ? '⏳ جاري...' : notifySent ? '✅ تم الإرسال' : '📱 إشعار واتساب'}
            </button>
            <Link href="/dashboard/inventory" style={{
              padding:'8px 16px',background:'#f59e0b',color:'white',
              borderRadius:10,fontSize:12,fontWeight:700,textDecoration:'none'
            }}>طلب الآن</Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[
          {label:'قيمة المخزون',icon:'💰',value:totalValue.toLocaleString('ar-SA',{maximumFractionDigits:0})+' ﷼',sub:`${products.length} صنف`,color:'#6366f1',bg:'linear-gradient(135deg,#eef2ff,#e0e7ff)',border:'#c7d2fe'},
          {label:'إجمالي المشتريات',icon:'🧾',value:totalSpent.toLocaleString('ar-SA',{maximumFractionDigits:0})+' ﷼',sub:`${allPurchases.length} عملية`,color:'#0891b2',bg:'linear-gradient(135deg,#ecfeff,#cffafe)',border:'#a5f3fc'},
          {label:'أصناف ناقصة',icon:'⚠️',value:lowStock.length,sub:'تحتاج طلب',color:'#dc2626',bg:'linear-gradient(135deg,#fef2f2,#fee2e2)',border:'#fecaca'},
          {label:'أصناف متوفرة',icon:'✅',value:okStock,sub:'في حالة جيدة',color:'#16a34a',bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'#bbf7d0'},
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:16,padding:'16px 18px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
            <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.label}</div>
            <div style={{fontSize:24,fontWeight:900,color:s.color,marginBottom:2}}>{s.value}</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>

        {/* Bar Chart */}
        <div style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <div style={{marginBottom:16}}>
            <h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:0}}>📊 المشتريات — آخر 7 أيام</h3>
            <p style={{fontSize:12,color:'#94a3b8',margin:'4px 0 0'}}>إجمالي المبالغ بالريال</p>
          </div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:140,padding:'0 4px'}}>
            {chartData.map((d,i) => (
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{fontSize:9,color:'#94a3b8',fontWeight:600,height:16}}>
                  {d.purchases > 0 ? Math.round(d.purchases) : ''}
                </div>
                <div style={{
                  width:'100%',
                  height: d.purchases > 0 ? `${Math.max((d.purchases/maxPurchase)*100,4)}%` : '4%',
                  background: d.purchases > 0 ? 'linear-gradient(180deg,#6366f1,#8b5cf6)' : '#f1f5f9',
                  borderRadius:'6px 6px 0 0',
                  transition:'height 0.5s ease',
                  minHeight:4
                }} />
                <div style={{fontSize:9,color:'#64748b',fontWeight:600,textAlign:'center'}}>{d.day}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:12,paddingTop:12,borderTop:'1px solid #f1f5f9'}}>
            <div style={{width:10,height:10,borderRadius:3,background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}} />
            <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>المشتريات (ريال)</span>
          </div>
        </div>

        {/* Top 5 */}
        <div style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <div style={{marginBottom:16}}>
            <h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:0}}>🏆 أعلى 5 منتجات مشتراة</h3>
            <p style={{fontSize:12,color:'#94a3b8',margin:'4px 0 0'}}>حسب إجمالي المبالغ</p>
          </div>
          {top5.length === 0 ? (
            <div style={{textAlign:'center',padding:'30px 0',color:'#94a3b8'}}>
              <div style={{fontSize:30,marginBottom:8}}>📭</div>
              <div style={{fontSize:13}}>لا توجد بيانات بعد</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {top5.map(([name,val],i) => {
                const pct    = Math.round((val/maxTop5)*100)
                const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6']
                const medals = ['🥇','🥈','🥉','4️⃣','5️⃣']
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:16,flexShrink:0}}>{medals[i]}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
                        <span style={{fontSize:11,fontWeight:800,color:colors[i],flexShrink:0,marginRight:6}}>{Math.round(val)} ﷼</span>
                      </div>
                      <div style={{height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:colors[i],borderRadius:99,transition:'width 0.5s'}} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:12}}>⚡ الإجراءات السريعة</h2>
        <div className="quick-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {[
            {href:'/dashboard/purchases',icon:'🛒',label:'تسجيل مشتريات',desc:'إضافة فاتورة جديدة',gradient:'linear-gradient(135deg,#10b981,#059669)'},
            {href:'/dashboard/dispenses',icon:'📤',label:'تسجيل صرف',desc:'خصم من المخزون',gradient:'linear-gradient(135deg,#ef4444,#dc2626)'},
            {href:'/dashboard/inventory',icon:'📦',label:'إدارة المخزون',desc:'عرض وتعديل الأصناف',gradient:'linear-gradient(135deg,#6366f1,#8b5cf6)'},
          ].map((q,i) => (
            <Link key={i} href={q.href} style={{
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              gap:8,padding:'20px 12px',background:q.gradient,borderRadius:16,
              textDecoration:'none',textAlign:'center',
              boxShadow:'0 6px 20px rgba(0,0,0,0.12)'
            }}>
              <div style={{fontSize:28}}>{q.icon}</div>
              <div style={{fontSize:13,fontWeight:800,color:'white'}}>{q.label}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>{q.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{fontSize:14,fontWeight:800,color:'#0f172a',margin:0}}>🛒 آخر المشتريات</h3>
            <Link href="/dashboard/purchases" style={{fontSize:12,color:'#6366f1',fontWeight:700,textDecoration:'none',background:'#eef2ff',padding:'4px 10px',borderRadius:50}}>+ إضافة</Link>
          </div>
          <div>
            {purchases.length === 0 ? (
              <div style={{textAlign:'center',padding:'28px',color:'#94a3b8',fontSize:13}}>لا توجد مشتريات بعد</div>
            ) : purchases.map((p,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',background:i%2===0?'white':'#fafafa',borderBottom:i<purchases.length-1?'1px solid #f8fafc':'none'}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{p.product_name}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>
                    {p.created_at?new Date(p.created_at).toLocaleDateString('ar-SA'):''}
                    {p.employee_name?` • ${p.employee_name}`:''}
                  </div>
                </div>
                <span style={{background:'#f0fdf4',color:'#16a34a',padding:'4px 12px',borderRadius:50,fontWeight:800,fontSize:13}}>
                  {Number(p.total_incl_vat).toFixed(0)} ﷼
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{fontSize:14,fontWeight:800,color:'#0f172a',margin:0}}>📤 آخر الصرف</h3>
            <Link href="/dashboard/dispenses" style={{fontSize:12,color:'#ef4444',fontWeight:700,textDecoration:'none',background:'#fef2f2',padding:'4px 10px',borderRadius:50}}>+ تسجيل</Link>
          </div>
          <div>
            {dispenses.length === 0 ? (
              <div style={{textAlign:'center',padding:'28px',color:'#94a3b8',fontSize:13}}>لا توجد عمليات صرف بعد</div>
            ) : dispenses.map((d,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',background:i%2===0?'white':'#fafafa',borderBottom:i<dispenses.length-1?'1px solid #f8fafc':'none'}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{d.product_name}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>
                    {d.created_at?new Date(d.created_at).toLocaleDateString('ar-SA'):''}
                    {d.reason?` • ${d.reason}`:''}
                  </div>
                </div>
                <span style={{background:'#fef2f2',color:'#ef4444',padding:'4px 12px',borderRadius:50,fontWeight:800,fontSize:13}}>
                  -{d.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}