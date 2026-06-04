'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const REASONS = ['استهلاك يومي','طلب فرع','تلف','هدية','أخرى']

export default function DispensePage() {
  const [products, setProducts] = useState<any[]>([])
  const [history, setHistory]   = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty]           = useState('')
  const [reason, setReason]     = useState('استهلاك يومي')
  const [note, setNote]         = useState('')
  const supabase = createClient()

  useEffect(() => { loadProducts(); loadHistory() }, [])

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('stock_movements')
      .select('*, products(name, unit)')
      .eq('type', 'out')
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || !qty) return
    setLoading(true)
    const qtyNum  = Number(qty)
    const product = products.find(p => p.id === productId)
    if (!product) { setLoading(false); return }
    if (product.qty < qtyNum) {
      alert('الكمية المطلوبة أكبر من المتاح!'); setLoading(false); return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase.from('profiles').select('id').eq('id', user!.id).single()
    await supabase.from('stock_movements').insert({
      product_id: productId,
      profile_id: profile?.id,
      type: 'out',
      qty_change: -qtyNum,
      note: reason + (note ? ' — ' + note : ''),
    })
    setSuccess('تم صرف ' + qtyNum + ' ' + product.unit + ' من ' + product.name)
    setProductId(''); setQty(''); setNote(''); setReason('استهلاك يومي')
    setLoading(false)
    loadProducts(); loadHistory()
    setTimeout(() => setSuccess(''), 4000)
  }

  const selected  = products.find(p => p.id === productId) ?? null
  const isLow     = selected ? selected.qty <= selected.reorder_point : false
  const remaining = selected && qty ? selected.qty - Number(qty) : null
  const inp: React.CSSProperties = {
    width:'100%', padding:'12px 14px', border:'2px solid #e2e8f0',
    borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500,
  }

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',marginBottom:4}}>صرف من المخزون</h1>
        <p style={{fontSize:13,color:'#64748b'}}>خصم كمية من المخزون وتسجيل السبب</p>
      </div>
      {success && (
        <div style={{background:'#ecfdf5',border:'2px solid #10b981',borderRadius:14,padding:'14px 18px',marginBottom:20,fontSize:14,fontWeight:700,color:'#059669'}}>
          {success}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
        <div style={{background:'white',borderRadius:20,padding:24,boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
          <h3 style={{fontWeight:800,fontSize:15,color:'#0f172a',margin:'0 0 20px'}}>بيانات الصرف</h3>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>المنتج</label>
              <select value={productId} onChange={e=>setProductId(e.target.value)} style={inp} required>
                <option value="">اختر المنتج</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (متاح: {p.qty} {p.unit})</option>
                ))}
              </select>
            </div>
            {selected && (
              <div style={{background:isLow?'#fff5f5':'#f0fdf4',border:'2px solid ' + (isLow?'#fca5a5':'#86efac'),borderRadius:10,padding:'12px 16px',marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:700,color:isLow?'#ef4444':'#10b981'}}>المتاح: {selected.qty} {selected.unit}</div>
                {isLow && <div style={{fontSize:11,color:'#f87171',marginTop:2}}>وصل للحد الادنى</div>}
              </div>
            )}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>الكمية</label>
              <input type="number" min="1" required value={qty} onChange={e=>setQty(e.target.value)} style={inp} placeholder="0"/>
            </div>
            {remaining !== null && (
              <div style={{background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,color:remaining<0?'#ef4444':'#64748b',fontWeight:remaining<0?700:500}}>
                {remaining < 0 ? 'الكمية تتجاوز المتاح!' : 'المتبقي بعد الصرف: ' + remaining + ' ' + selected?.unit}
              </div>
            )}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:8}}>سبب الصرف</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {REASONS.map(r => (
                  <button key={r} type="button" onClick={() => setReason(r)}
                    style={{padding:'9px 6px',borderRadius:10,border:'2px solid ' + (reason===r?'#ef4444':'#e2e8f0'),background:reason===r?'#fef2f2':'white',color:reason===r?'#ef4444':'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>ملاحظات (اختياري)</label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} style={{...inp,minHeight:72,resize:'none'}} placeholder="اي تفاصيل اضافية..."/>
            </div>
            <button type="submit" disabled={loading} style={{width:'100%',padding:'14px',background:loading?'#94a3b8':'linear-gradient(135deg,#ef4444,#dc2626)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:loading?'not-allowed':'pointer',fontFamily:'system-ui'}}>
              {loading ? 'جاري الحفظ...' : 'تسجيل الصرف'}
            </button>
          </form>
        </div>
        <div style={{background:'white',borderRadius:20,padding:24,boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 style={{fontWeight:800,fontSize:15,color:'#0f172a',margin:0}}>اخر العمليات</h3>
            <button onClick={loadHistory} style={{padding:'6px 12px',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',color:'#475569',fontFamily:'system-ui'}}>تحديث</button>
          </div>
          {history.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 20px',color:'#94a3b8'}}>
              <div style={{fontSize:14,fontWeight:600}}>لا توجد عمليات بعد</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',maxHeight:520,overflowY:'auto'}}>
              {history.map((h,i) => (
                <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 0',borderBottom:i<history.length-1?'1px solid #f1f5f9':'none'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:'#0f172a',marginBottom:4}}>{(h.products as any)?.name}</div>
                    <div style={{display:'flex',gap:6}}>
                      <span style={{background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:50,fontSize:11,fontWeight:600}}>{h.note||'—'}</span>
                      <span style={{color:'#94a3b8',fontSize:11}}>{new Date(h.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                  <span style={{background:'#fef2f2',color:'#ef4444',padding:'5px 14px',borderRadius:50,fontWeight:900,fontSize:14,border:'1.5px solid #fecaca',marginRight:8}}>
                    {h.qty_change} {(h.products as any)?.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
