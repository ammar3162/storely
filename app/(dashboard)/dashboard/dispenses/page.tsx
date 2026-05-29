'use client'
export const dynamic = 'force-dynamic'
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
      product_name: form.product_name, employee_name: form.employee_name,
      qty, reason: form.reason, notes: form.notes
    })
    if (product) {
      await supabase.from('products').update({ qty: product.qty - qty }).eq('id', product.id)
    }
    setSuccess(`✅ تم صرف ${qty} ${product?.unit||''} من ${form.product_name}`)
    setForm({ product_name:'', employee_name:'', qty:'', reason:'استهلاك يومي', notes:'' })
    setLoading(false)
    loadProducts()
    loadHistory()
    setTimeout(() => setSuccess(''), 4000)
  }

  const selectedProduct = products.find(p => p.name === form.product_name)
  const isLow = selectedProduct && selectedProduct.qty <= selectedProduct.reorder_point
  const inp: React.CSSProperties = {
    width:'100%', padding:'12px 14px', border:'2px solid #e2e8f0',
    borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500
  }

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>

      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:26,fontWeight:900,color:'#0f172a',marginBottom:4,letterSpacing:'-0.5px'}}>
          📤 تسجيل صرف
        </h1>
        <p style={{fontSize:14,color:'#64748b',fontWeight:500}}>خصم كمية من المخزون وتسجيل السبب</p>
      </div>

      {success && (
        <div style={{background:'#ecfdf5',border:'2px solid #10b981',borderRadius:14,padding:'14px 18px',marginBottom:20,fontSize:14,fontWeight:700,color:'#059669',display:'flex',alignItems:'center',gap:10}}>
          {success}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>

        {/* Form */}
        <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:24}}>
            <div style={{width:40,height:40,background:'linear-gradient(135deg,#ef4444,#dc2626)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>📤</div>
            <div>
              <h3 style={{fontWeight:800,fontSize:16,color:'#0f172a',margin:0}}>بيانات الصرف</h3>
              <p style={{fontSize:12,color:'#94a3b8',margin:0}}>أدخل تفاصيل عملية الصرف</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            {/* المنتج */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>📦 المنتج</label>
              <select value={form.product_name} onChange={e => setForm({...form,product_name:e.target.value})} style={inp} required>
                <option value="">— اختر المنتج —</option>
                {products.map(p => (
                  <option key={p.id} value={p.name}>
                    {p.name} (متاح: {p.qty} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* تنبيه الكمية */}
            {selectedProduct && (
              <div style={{
                background: isLow ? '#fff5f5' : '#f0fdf4',
                border: `2px solid ${isLow ? '#fca5a5' : '#86efac'}`,
                borderRadius:10, padding:'12px 16px', marginBottom:16,
                display:'flex', alignItems:'center', gap:10
              }}>
                <span style={{fontSize:20}}>{isLow ? '⚠️' : '✅'}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color: isLow ? '#ef4444' : '#10b981'}}>
                    الكمية المتاحة: {selectedProduct.qty} {selectedProduct.unit}
                  </div>
                  {isLow && (
                    <div style={{fontSize:11,color:'#f87171',marginTop:2}}>
                      هذا الصنف وصل للحد الأدنى
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* الكمية والموظف */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>🔢 الكمية</label>
                <input type="number" placeholder="0" min="1" required
                  value={form.qty} onChange={e => setForm({...form,qty:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>👤 الموظف</label>
                <input type="text" placeholder="اسم الموظف"
                  value={form.employee_name} onChange={e => setForm({...form,employee_name:e.target.value})} style={inp} />
              </div>
            </div>

            {/* السبب */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>📋 سبب الصرف</label>
              <select value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} style={inp}>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* ملاحظات */}
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>📝 ملاحظات (اختياري)</label>
              <textarea placeholder="أي تفاصيل إضافية..."
                value={form.notes} onChange={e => setForm({...form,notes:e.target.value})}
                style={{...inp,minHeight:80,resize:'none'}} />
            </div>

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'15px',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg,#ef4444,#dc2626)',
              color:'white', border:'none', borderRadius:12,
              fontSize:15, fontWeight:800, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:'system-ui', boxShadow:'0 4px 14px rgba(239,68,68,0.35)'
            }}>
              {loading ? '⏳ جاري الحفظ...' : '📤 تسجيل الصرف'}
            </button>
          </form>
        </div>

        {/* History */}
        <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:40,height:40,background:'linear-gradient(135deg,#f1f5f9,#e2e8f0)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🕐</div>
              <div>
                <h3 style={{fontWeight:800,fontSize:16,color:'#0f172a',margin:0}}>آخر العمليات</h3>
                <p style={{fontSize:12,color:'#94a3b8',margin:0}}>{history.length} عملية مسجلة</p>
              </div>
            </div>
            <button onClick={loadHistory} style={{
              padding:'7px 14px',background:'#f8fafc',border:'1.5px solid #e2e8f0',
              borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',color:'#475569',fontFamily:'system-ui'
            }}>🔄 تحديث</button>
          </div>

          {history.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 20px',color:'#94a3b8'}}>
              <div style={{fontSize:40,marginBottom:12}}>📭</div>
              <div style={{fontSize:14,fontWeight:600}}>لا توجد عمليات صرف بعد</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {history.map((h,i) => (
                <div key={i} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'14px 0',
                  borderBottom: i < history.length-1 ? '1px solid #f1f5f9' : 'none',
                  transition:'background 0.15s'
                }}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,color:'#0f172a',marginBottom:4}}>{h.product_name}</div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <span style={{background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:50,fontSize:11,fontWeight:600}}>
                        {h.reason||'—'}
                      </span>
                      {h.employee_name && (
                        <span style={{background:'#eef2ff',color:'#6366f1',padding:'2px 8px',borderRadius:50,fontSize:11,fontWeight:600}}>
                          👤 {h.employee_name}
                        </span>
                      )}
                      <span style={{color:'#94a3b8',fontSize:11}}>
                        {h.created_at ? new Date(h.created_at).toLocaleDateString('ar-SA') : ''}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    background:'linear-gradient(135deg,#fef2f2,#fee2e2)',
                    color:'#ef4444', padding:'6px 16px', borderRadius:50,
                    fontWeight:900, fontSize:15, flexShrink:0,
                    border:'1.5px solid #fecaca'
                  }}>-{h.qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}