'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
export default function DashboardPage() {
  const [products, setProducts]   = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [dispenses, setDispenses] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [time, setTime]           = useState(new Date())
  const supabase = createClient()
  useEffect(() => {
    loadAll()
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])
  async function loadAll() {
    setLoading(true)
    const [p, pu, d] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('purchases').select('*').order('created_at', { ascending: false }).limit(6),
      supabase.from('dispenses').select('*').order('created_at', { ascending: false }).limit(6),
    ])
    setProducts(p.data || [])
    setPurchases(pu.data || [])
    setDispenses(d.data || [])
    setLoading(false)
  }
  const totalValue = products.reduce((s, p) => s + (p.qty * p.cost_price), 0)
  const lowStock   = products.filter(p => p.qty <= p.reorder_point)
  const totalSpent = purchases.reduce((s, p) => s + (Number(p.total_incl_vat)||0), 0)
  const okStock    = products.length - lowStock.length
  const hour = time.getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور'
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'70vh',flexDirection:'column',gap:20}}>
      <div style={{width:56,height:56,border:'4px solid #e2e8f0',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <div style={{fontSize:15,fontWeight:600,color:'#64748b'}}>جاري تحميل لوحة التحكم...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  return (
    <div style={{direction:'rtl',fontFamily:'system-ui',maxWidth:1100,margin:'0 auto'}}>
      {/* Header */}
      <div style={{
        background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)',
        borderRadius:20, padding:'28px 32px', marginBottom:28,
        display:'flex', justifyContent:'space-between', alignItems:'center',
        boxShadow:'0 8px 32px rgba(99,102,241,0.3)', flexWrap:'wrap', gap:16
      }}>
        <div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.7)',fontWeight:600,marginBottom:6}}>
            {time.toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </div>
          <h1 style={{fontSize:28,fontWeight:900,color:'white',margin:0,letterSpacing:'-0.5px'}}>
            {greeting} 👋
          </h1>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.75)',margin:'6px 0 0',fontWeight:500}}>
            نظرة عامة على حالة مخزونك اليوم
          </p>
        </div>
        <div style={{display:'flex',gap:12}}>
          <button onClick={loadAll} style={{
            padding:'10px 20px', background:'rgba(255,255,255,0.15)',
            color:'white', border:'1.5px solid rgba(255,255,255,0.3)',
            borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'system-ui',
            backdropFilter:'blur(10px)'
          }}>🔄 تحديث</button>
        </div>
      </div>
      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{
          background:'linear-gradient(135deg,#fffbeb,#fef3c7)',
          border:'2px solid #fcd34d', borderRadius:16,
          padding:'16px 22px', marginBottom:24,
          display:'flex', alignItems:'center', gap:16,
          boxShadow:'0 4px 16px rgba(245,158,11,0.15)'
        }}>
          <div style={{width:44,height:44,background:'#f59e0b',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
            🔔
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,color:'#92400e',fontSize:15,marginBottom:4}}>
              تنبيه: {lowStock.length} صنف وصل للحد الأدنى!
            </div>
            <div style={{fontSize:12,color:'#b45309',display:'flex',flexWrap:'wrap',gap:6}}>
              {lowStock.map(p => (
                <span key={p.id} style={{background:'rgba(245,158,11,0.15)',padding:'2px 10px',borderRadius:50,fontWeight:600}}>
                  {p.name} ({p.qty})
                </span>
              ))}
            </div>
          </div>
          <Link href="/dashboard/inventory" style={{
            padding:'10px 20px', background:'#f59e0b', color:'white',
            borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none',
            flexShrink:0, boxShadow:'0 4px 12px rgba(245,158,11,0.3)'
          }}>طلب الآن</Link>
        </div>
      )}
      {/* Stats Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginBottom:28}}>
        {[
          {
            label:'قيمة المخزون الكلية', icon:'💰',
            value: totalValue.toLocaleString('ar-SA',{maximumFractionDigits:0})+' ﷼',
            sub: `${products.length} صنف مسجل`,
            color:'#6366f1', bg:'linear-gradient(135deg,#eef2ff,#e0e7ff)', border:'#c7d2fe'
          },
          {
            label:'إجمالي المشتريات', icon:'🧾',
            value: totalSpent.toLocaleString('ar-SA',{maximumFractionDigits:0})+' ﷼',
            sub: `${purchases.length} عملية شراء`,
            color:'#0891b2', bg:'linear-gradient(135deg,#ecfeff,#cffafe)', border:'#a5f3fc'
          },
          {
            label:'أصناف ناقصة', icon:'⚠️',
            value: lowStock.length,
            sub: 'تحتاج طلب عاجل',
            color:'#dc2626', bg:'linear-gradient(135deg,#fef2f2,#fee2e2)', border:'#fecaca'
          },
          {
            label:'أصناف متوفرة', icon:'✅',
            value: okStock,
            sub: 'في حالة جيدة',
            color:'#16a34a', bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'#bbf7d0'
          },
        ].map((s,i) => (
          <div key={i} style={{
            background:s.bg, border:`1.5px solid ${s.border}`,
            borderRadius:18, padding:'22px 24px',
            boxShadow:'0 2px 8px rgba(0,0,0,0.05)',
            transition:'transform 0.2s'
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div style={{
                width:44,height:44,borderRadius:12,
                background:'rgba(255,255,255,0.7)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:22
              }}>{s.icon}</div>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.label}</div>
            <div style={{fontSize:30,fontWeight:900,color:s.color,marginBottom:4,letterSpacing:'-0.5px'}}>{s.value}</div>
            <div style={{fontSize:12,color:'#94a3b8',fontWeight:500}}>{s.sub}</div>
          </div>
        ))}
      </div>
      {/* Quick Actions */}
      <div style={{marginBottom:28}}>
        <h2 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
          <span style={{background:'#eef2ff',padding:'4px 10px',borderRadius:8,color:'#6366f1'}}>⚡</span>
          الإجراءات السريعة
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
          {[
            { href:'/dashboard/purchases', icon:'🛒', label:'تسجيل مشتريات', desc:'إضافة فاتورة جديدة', gradient:'linear-gradient(135deg,#10b981,#059669)', shadow:'rgba(16,185,129,0.3)' },
            { href:'/dashboard/dispenses', icon:'📤', label:'تسجيل صرف', desc:'خصم من المخزون', gradient:'linear-gradient(135deg,#ef4444,#dc2626)', shadow:'rgba(239,68,68,0.3)' },
            { href:'/dashboard/inventory', icon:'📦', label:'إدارة المخزون', desc:'عرض وتعديل الأصناف', gradient:'linear-gradient(135deg,#6366f1,#8b5cf6)', shadow:'rgba(99,102,241,0.3)' },
          ].map((q,i) => (
            <Link key={i} href={q.href} style={{
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:10, padding:'24px 16px',
              background:q.gradient, borderRadius:16,
              textDecoration:'none', textAlign:'center',
              boxShadow:`0 8px 24px ${q.shadow}`,
              transition:'transform 0.2s, box-shadow 0.2s'
            }}>
              <div style={{fontSize:32}}>{q.icon}</div>
              <div style={{fontSize:14,fontWeight:800,color:'white'}}>{q.label}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.75)',fontWeight:500}}>{q.desc}</div>
            </Link>
          ))}
        </div>
      </div>
      {/* Recent Activity */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        {/* آخر المشتريات */}
        <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <div style={{padding:'18px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:8}}>
              <span style={{background:'#f0fdf4',padding:'4px 8px',borderRadius:8,fontSize:16}}>🛒</span>
              آخر المشتريات
            </h3>
            <Link href="/dashboard/purchases" style={{fontSize:12,color:'#6366f1',fontWeight:700,textDecoration:'none',background:'#eef2ff',padding:'5px 12px',borderRadius:50}}>+ إضافة</Link>
          </div>
          <div style={{padding:'8px 0'}}>
            {purchases.length === 0 ? (
              <div style={{textAlign:'center',padding:'32px 20px',color:'#94a3b8'}}>
                <div style={{fontSize:32,marginBottom:8}}>📭</div>
                <div style={{fontSize:13,fontWeight:600}}>لا توجد مشتريات بعد</div>
              </div>
            ) : purchases.map((p,i) => (
              <div key={i} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'12px 22px',
                background: i%2===0 ? 'white' : '#fafafa',
                borderBottom: i<purchases.length-1 ? '1px solid #f8fafc' : 'none'
              }}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{p.product_name}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:3,display:'flex',gap:8}}>
                    <span>{p.created_at ? new Date(p.created_at).toLocaleDateString('ar-SA') : ''}</span>
                    {p.employee_name && <span>• {p.employee_name}</span>}
                    {p.payment_method && <span>• {p.payment_method}</span>}
                  </div>
                </div>
                <span style={{
                  background:'#f0fdf4', color:'#16a34a',
                  padding:'5px 14px', borderRadius:50,
                  fontWeight:800, fontSize:13, flexShrink:0
                }}>
                  {Number(p.total_incl_vat).toFixed(0)} ﷼
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* آخر الصرف */}
        <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <div style={{padding:'18px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:8}}>
              <span style={{background:'#fef2f2',padding:'4px 8px',borderRadius:8,fontSize:16}}>📤</span>
              آخر عمليات الصرف
            </h3>
            <Link href="/dashboard/dispenses" style={{fontSize:12,color:'#ef4444',fontWeight:700,textDecoration:'none',background:'#fef2f2',padding:'5px 12px',borderRadius:50}}>+ تسجيل</Link>
          </div>
          <div style={{padding:'8px 0'}}>
            {dispenses.length === 0 ? (
              <div style={{textAlign:'center',padding:'32px 20px',color:'#94a3b8'}}>
                <div style={{fontSize:32,marginBottom:8}}>📭</div>
                <div style={{fontSize:13,fontWeight:600}}>لا توجد عمليات صرف بعد</div>
              </div>
            ) : dispenses.map((d,i) => (
              <div key={i} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'12px 22px',
                background: i%2===0 ? 'white' : '#fafafa',
                borderBottom: i<dispenses.length-1 ? '1px solid #f8fafc' : 'none'
              }}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{d.product_name}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:3,display:'flex',gap:8}}>
                    <span>{d.created_at ? new Date(d.created_at).toLocaleDateString('ar-SA') : ''}</span>
                    {d.reason && <span>• {d.reason}</span>}
                    {d.employee_name && <span>• {d.employee_name}</span>}
                  </div>
                </div>
                <span style={{
                  background:'#fef2f2', color:'#ef4444',
                  padding:'5px 14px', borderRadius:50,
                  fontWeight:800, fontSize:13, flexShrink:0
                }}>
                  -{d.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}export const dynamic = 'force-dynamic'
