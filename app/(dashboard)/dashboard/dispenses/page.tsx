'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const REASONS = ['استهلاك يومي','طلب فرع','تلف','نقص مخزون','هدية','أخرى']

export default function DispensesPage() {
  const [products, setProducts] = useState<any[]>([])
  const [history, setHistory]   = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState('')
  const [form, setForm] = useState({
    product_name:'', employee_name:'', qty:'', reason:'استهلاك يومي', notes:''
  })
  const supabase = createClient()

  useEffect(() => { loadProducts(); loadHistory() }, [])

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  async function loadHistory() {
    const { data } = await supabase.from('dispenses').select('*').order('created_at', { ascending: false }).limit(20)
    setHistory(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.product_name || !form.qty) return
    setLoading(true)
    const qty = Number(form.qty)
    const product = products.find(p => p.name === form.product_name)
    if (product && product.qty < qty) {
      alert('الكمية المطلوبة أكبر من المتاح!')
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
    await supabase.from('dispenses').insert({
      org_id: profile?.org_id,
      product_name:  form.product_name,
      employee_name: form.employee_name,
      qty, reason: form.reason, notes: form.notes
    })
    if (product) {
      await supabase.from('products').update({ qty: product.qty - qty }).eq('id', product.id)
    }
    setSuccess('تم تسجيل الصرف بنجاح')
    setForm({ product_name:'', employee_name:'', qty:'', reason:'استهلاك يومي', notes:'' })
    setLoading(false)
    loadProducts()
    loadHistory()
    setTimeout(() => setSuccess(''), 4000)
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'11px 14px', border:'1.5px solid #e5e7eb',
    borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1a1a2e', fontFamily:'system-ui'
  }

  const selectedProduct = products.find(p => p.name === form.product_name)

  return (
    <div>
      <h1 style={{fontSize:22,fontWeight:800,marginBottom:4}}>تسجيل صرف</h1>
      <p style={{fontSize:13,color:'#888',marginBottom:24}}>خصم كمية من المخزون وتسجيل السبب</p>
      {success && (
        <div style={{background:'#ecfdf5',border:'1.5px solid #10b981',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:14,fontWeight:700,color:'#059669'}}>
          {success}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>
        <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 2px 14px rgba(0,0,0,0.06)'}}>
          <h3 style={{fontWeight:800,marginBottom:20,fontSize:15}}>بيانات الصرف</h3>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#444',display:'block',marginBottom:6}}>المنتج</label>
              <select value={form.product_name} onChange={e => setForm({...form,product_name:e.target.value})} style={inp} required>
                <option value="">اختر المنتج</option>
                {products.map(p => <option key={p.id} value={p.name}>{p.name} (متاح: {p.qty} {p.unit})</option>)}
              </select>
            </div>
            {selectedProduct && (
              <div style={{background:selectedProduct.qty<=selectedProduct.reorder_point?'#fff5f5':'#f0fdf4',border:`1.5px solid ${selectedProduct.qty<=selectedProduct.reorder_point?'#fca5a5':'#86efac'}`,borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,fontWeight:700,color:selectedProduct.qty<=selectedProduct.reorder_point?'#ef4444':'#10b981'}}>
                الكمية المتاحة: {selectedProduct.qty} {selectedProduct.unit}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#444',display:'block',marginBottom:6}}>الكمية</label>
                <input type="number" placeholder="0" min="1" required value={form.qty} onChange={e => setForm({...form,qty:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#444',display:'block',marginBottom:6}}>الموظف</label>
                <input type="text" placeholder="اسم الموظف" value={form.employee_name} onChange={e => setForm({...form,employee_name:e.target.value})} style={inp} />
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#444',display:'block',marginBottom:6}}>سبب الصرف</label>
              <select value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} style={inp}>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,fontWeight:700,color:'#444',display:'block',marginBottom:6}}>ملاحظات</label>
              <textarea placeholder="أي تفاصيل..." value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} style={{...inp,minHeight:80,resize:'none'}} />
            </div>
            <button type="submit" disabled={loading} style={{width:'100%',padding:'14px',background:'#ef4444',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:'pointer'}}>
              {loading ? 'جاري الحفظ...' : 'تسجيل الصرف'}
            </button>
          </form>
        </div>
        <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 2px 14px rgba(0,0,0,0.06)'}}>
          <h3 style={{fontWeight:800,marginBottom:20,fontSize:15}}>آخر عمليات الصرف</h3>
          {history.length === 0 ? (
            <div style={{textAlign:'center',padding:40,color:'#aaa'}}>لا توجد عمليات بعد</div>
          ) : history.map((h, i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f5f5f5'}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:'#1a1a2e'}}>{h.product_name}</div>
                <div style={{fontSize:12,color:'#888',marginTop:2}}>{h.reason} — {h.employee_name||'—'}</div>
              </div>
              <span style={{background:'#fee2e2',color:'#ef4444',padding:'4px 14px',borderRadius:50,fontWeight:800,fontSize:14}}>-{h.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
