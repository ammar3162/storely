'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [stats, setStats] = useState({ products:0, lowStock:0, todayPurchases:0, todayDispenses:0, totalPurchasesAmount:0 })
  const [lowItems, setLowItems] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [{ data: products }, { data: purchases }, { data: movements }] = await Promise.all([
      supabase.from('products').select('id,name,qty,reorder_point,unit'),
      supabase.from('purchases').select('amount,created_at'),
      supabase.from('stock_movements').select('qty_change,type,created_at'),
    ])
    const today = new Date().toDateString()
    const todayPurchases  = (purchases||[]).filter(p => new Date(p.created_at).toDateString()===today).length
    const todayDispenses  = (movements||[]).filter(m => m.type==='out' && new Date(m.created_at).toDateString()===today).length
    const totalAmount     = (purchases||[]).reduce((s,p) => s+Number(p.amount||0), 0)
    const low             = (products||[]).filter(p => p.qty <= p.reorder_point)
    setLowItems(low.slice(0,5))
    setStats({ products:(products||[]).length, lowStock:low.length, todayPurchases, todayDispenses, totalPurchasesAmount:totalAmount })
  }

  const cards = [
    { label:'إجمالي الأصناف',    value:stats.products,                    color:'#667eea', bg:'#eef2ff', border:'#c7d2fe', href:'/inventory' },
    { label:'مخزون ناقص',        value:stats.lowStock,                    color:'#ef4444', bg:'#fef2f2', border:'#fecaca', href:'/inventory' },
    { label:'مشتريات اليوم',     value:stats.todayPurchases,              color:'#10b981', bg:'#f0fdf4', border:'#bbf7d0', href:'/purchases' },
    { label:'صرف اليوم',         value:stats.todayDispenses,              color:'#f59e0b', bg:'#fffbeb', border:'#fde68a', href:'/dispense'  },
    { label:'إجمالي المشتريات',  value:stats.totalPurchasesAmount.toFixed(0)+' ر.س', color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc', href:'/reports' },
  ]

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',marginBottom:4}}>لوحة التحكم</h1>
        <p style={{fontSize:13,color:'#64748b'}}>نظرة عامة على المخزون والمشتريات</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:28}}>
        {cards.map((c,i) => (
          <a key={i} href={c.href} style={{background:c.bg,border:'1.5px solid '+c.border,borderRadius:14,padding:'18px 20px',textDecoration:'none',display:'block',transition:'transform 0.15s'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:8,textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>{c.label}</div>
            <div style={{fontSize:26,fontWeight:900,color:c.color}}>{c.value}</div>
          </a>
        ))}
      </div>

      {lowItems.length > 0 && (
        <div style={{background:'white',borderRadius:16,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h2 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>تنبيه — مخزون ناقص</h2>
            <a href="/inventory" style={{fontSize:13,color:'#667eea',fontWeight:600,textDecoration:'none'}}>عرض الكل</a>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {lowItems.map((p,i) => (
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:i<lowItems.length-1?'1px solid #f1f5f9':'none'}}>
                <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{p.name}</div>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:13,color:'#94a3b8'}}>الحد الأدنى: {p.reorder_point} {p.unit}</span>
                  <span style={{background:'#fef2f2',color:'#ef4444',padding:'4px 12px',borderRadius:50,fontWeight:800,fontSize:14,border:'1px solid #fecaca'}}>{p.qty} {p.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {[
          { title:'إضافة شراء', desc:'تسجيل مشتريات جديدة', href:'/purchases', color:'#10b981', bg:'#f0fdf4', border:'#bbf7d0' },
          { title:'تسجيل صرف', desc:'خصم من المخزون', href:'/dispense',  color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
          { title:'تقرير الصرف', desc:'تحليل عمليات الصرف', href:'/reports',  color:'#6366f1', bg:'#eef2ff', border:'#c7d2fe' },
          { title:'إعدادات واتساب', desc:'تنبيهات نقص المخزون', href:'/settings', color:'#25d366', bg:'#f0fdf4', border:'#bbf7d0' },
        ].map((b,i) => (
          <a key={i} href={b.href} style={{background:b.bg,border:'1.5px solid '+b.border,borderRadius:14,padding:'20px',textDecoration:'none',display:'block'}}>
            <div style={{fontSize:15,fontWeight:800,color:b.color,marginBottom:4}}>{b.title}</div>
            <div style={{fontSize:13,color:'#64748b'}}>{b.desc}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
