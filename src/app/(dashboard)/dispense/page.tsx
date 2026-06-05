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
  const sb = createClient()

  useEffect(() => { loadProducts(); loadHistory() }, [])

  async function loadProducts() {
    const { data } = await sb.from('products').select('*').order('name')
    setProducts(data||[])
  }

  async function loadHistory() {
    const { data } = await sb.from('stock_movements')
      .select('*, products(name,unit)').eq('type','out')
      .order('created_at',{ascending:false}).limit(15)
    setHistory(data||[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId||!qty) return
    setLoading(true)
    const qtyNum  = Number(qty)
    const product = products.find(p=>p.id===productId)
    if (!product) { setLoading(false); return }
    if (product.qty < qtyNum) { alert('الكمية المطلوبة أكبر من المتاح!'); setLoading(false); return }
    const { data:{ user } } = await sb.auth.getUser()
    const { data: profile }  = await sb.from('profiles').select('id').eq('id',user!.id).single()
    await sb.from('stock_movements').insert({
      product_id: productId, profile_id: profile?.id,
      type:'out', qty_change:-qtyNum,
      note: reason+(note?' — '+note:''),
    })
    setSuccess('تم صرف '+qtyNum+' '+product.unit+' من '+product.name+' ✅')
    // أرسل إشعارات واتساب للرسائل الـ pending
    fetch('/api/send-pending-notifications', { method:'POST' }).catch(()=>{})
    setProductId(''); setQty(''); setNote(''); setReason('استهلاك يومي')
    setLoading(false)
    loadProducts(); loadHistory()
    setTimeout(()=>setSuccess(''),4000)
  }

  const selected  = products.find(p=>p.id===productId)??null
  const isLow     = selected ? selected.qty<=selected.reorder_point : false
  const remaining = selected&&qty ? selected.qty-Number(qty) : null

  const inp: React.CSSProperties = {
    width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0',
    borderRadius:9, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'inherit', transition:'border 0.15s',
  }

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`
        .d-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
        .r-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        @media(max-width:768px){.d-grid{grid-template-columns:1fr}.r-grid{grid-template-columns:repeat(3,1fr)}}
        input:focus,select:focus,textarea:focus{border-color:#1a4731!important;box-shadow:0 0 0 3px rgba(26,71,49,0.08)!important}
        .r-btn{padding:10px 6px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;border:1.5px solid #e2e8f0;background:white;color:#64748b;font-family:inherit;text-align:center}
        .r-btn.active{border-color:#ef4444;background:#fef2f2;color:#ef4444}
        .r-btn:hover{border-color:#fca5a5;background:#fff5f5}
      `}</style>

      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:3}}>تسجيل الصرف</h1>
        <p style={{fontSize:12,color:'#64748b'}}>خصم كمية من المخزون وتسجيل السبب</p>
      </div>

      {success && (
        <div style={{background:'#ecfdf5',border:'1.5px solid #10b981',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:700,color:'#059669'}}>
          {success}
        </div>
      )}

      <div className="d-grid">
        {/* Form */}
        <div style={{background:'white',borderRadius:12,padding:20,border:'1px solid #e8ecf0',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:16}}>بيانات الصرف</div>
          <form onSubmit={handleSubmit}>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>المنتج</label>
              <select value={productId} onChange={e=>setProductId(e.target.value)} style={inp} required>
                <option value="">— اختر المنتج —</option>
                {products.map(p=>(
                  <option key={p.id} value={p.id}>{p.name} (متاح: {p.qty} {p.unit})</option>
                ))}
              </select>
            </div>

            {selected && (
              <div style={{background:isLow?'#fff5f5':'#f0fdf4',border:'1.5px solid '+(isLow?'#fca5a5':'#86efac'),borderRadius:9,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:isLow?'#ef4444':'#10b981',flexShrink:0}}/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:isLow?'#ef4444':'#10b981'}}>المتاح: {selected.qty} {selected.unit}</div>
                  {isLow && <div style={{fontSize:11,color:'#f87171',marginTop:1}}>وصل للحد الأدنى</div>}
                </div>
              </div>
            )}

            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>الكمية</label>
              <input type="number" min="1" required value={qty} onChange={e=>setQty(e.target.value)} style={inp} placeholder="0"/>
              {remaining!==null && (
                <div style={{marginTop:6,fontSize:12,color:remaining<0?'#ef4444':'#64748b',fontWeight:remaining<0?700:400,padding:'6px 10px',background:remaining<0?'#fef2f2':'#f8fafc',borderRadius:7}}>
                  {remaining<0 ? '⚠️ الكمية تتجاوز المتاح!' : 'المتبقي بعد الصرف: '+remaining+' '+selected?.unit}
                </div>
              )}
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:8}}>سبب الصرف</label>
              <div className="r-grid">
                {REASONS.map(r=>(
                  <button key={r} type="button" className={'r-btn'+(reason===r?' active':'')} onClick={()=>setReason(r)}>{r}</button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:18}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>ملاحظات (اختياري)</label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} style={{...inp,minHeight:72,resize:'none'}} placeholder="أي تفاصيل إضافية..."/>
            </div>

            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'13px',background:loading?'#94a3b8':'#ef4444',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',transition:'background 0.15s',boxShadow:'0 2px 8px rgba(239,68,68,0.25)'}}>
              {loading ? 'جاري الحفظ...' : 'تسجيل الصرف ←'}
            </button>
          </form>
        </div>

        {/* History */}
        <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>آخر عمليات الصرف</div>
            <button onClick={loadHistory} style={{width:30,height:30,borderRadius:7,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b'}}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
            </button>
          </div>
          <div style={{maxHeight:520,overflowY:'auto'}}>
            {history.length===0 ? (
              <div style={{padding:'48px 20px',textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:36,marginBottom:10}}>📭</div>
                <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>لا توجد عمليات بعد</div>
              </div>
            ) : history.map((h,i)=>(
              <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 18px',borderBottom:i<history.length-1?'1px solid #f8fafc':'none',gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{(h.products as any)?.name}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                    <span style={{background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600}}>{h.note||'—'}</span>
                    <span style={{color:'#94a3b8',fontSize:10}}>{new Date(h.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
                <span style={{background:'#fef2f2',color:'#ef4444',padding:'5px 12px',borderRadius:20,fontWeight:800,fontSize:13,border:'1px solid #fecaca',flexShrink:0}}>
                  {h.qty_change} {(h.products as any)?.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
