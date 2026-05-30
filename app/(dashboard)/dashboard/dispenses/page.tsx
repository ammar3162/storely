'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const REASONS = ['استهلاك يومي','طلب فرع','تلف','نقص مخزون','هدية','أخرى']

export default function DispensesPage() {
  const [products, setProducts] = useState<any[]>([])
  const [history, setHistory]   = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState('')
  const [productName, setProductName]     = useState('')
  const [employeeName, setEmployeeName]   = useState('')
  const [qty, setQty]                     = useState('')
  const [reason, setReason]               = useState('استهلاك يومي')
  const [notes, setNotes]                 = useState('')
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName || !qty) return
    setLoading(true)
    const qtyNum = Number(qty)
    const product = products.find(p => p.name === productName)
    if (product && product.qty < qtyNum) {
      alert('الكمية المطلوبة أكبر من المتاح!')
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
    await supabase.from('dispenses').insert({
      org_id: profile?.org_id,
      product_name: productName,
      employee_name: employeeName,
      qty: qtyNum,
      reason,
      notes
    })
    if (product) {
      await supabase.from('products').update({ qty: product.qty - qtyNum }).eq('id', product.id)
    }
    setSuccess(`✅ تم صرف ${qtyNum} ${product?.unit||''} من ${productName}`)
    setProductName('')
    setEmployeeName('')
    setQty('')
    setReason('استهلاك يومي')
    setNotes('')
    setLoading(false)
    loadProducts()
    loadHistory()
    setTimeout(() => setSuccess(''), 4000)
  }, [productName, employeeName, qty, reason, notes, products])

  const selectedProduct = products.find(p => p.name === productName) ?? null
  const isLow      = selectedProduct ? selectedProduct.qty <= selectedProduct.reorder_point : false
  const remaining  = selectedProduct && qty ? selectedProduct.qty - Number(qty) : null

  const inp: React.CSSProperties = {
    width:'100%', padding:'12px 14px', border:'2px solid #e2e8f0',
    borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500
  }

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>
      <style>{`
        @media(max-width:768px){
          .dispense-grid{grid-template-columns:1fr !important}
          .qty-grid{grid-template-columns:1fr !important}
        }
        input:focus,select:focus,textarea:focus{
          border-color:#ef4444 !important;
          box-shadow:0 0 0 3px rgba(239,68,68,0.12) !important;
        }
      `}</style>

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

      <div className="dispense-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>

        {/* Form */}
        <div style={{background:'white',borderRadius:20,padding:24,boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingBottom:16,borderBottom:'1px solid #f1f5f9'}}>
            <div style={{width:40,height:40,background:'linear-gradient(135deg,#ef4444,#dc2626)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>📤</div>
            <div>
              <h3 style={{fontWeight:800,fontSize:15,color:'#0f172a',margin:0}}>بيانات الصرف</h3>
              <p style={{fontSize:12,color:'#94a3b8',margin:0}}>أدخل تفاصيل عملية الصرف</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            {/* المنتج */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>📦 المنتج</label>
              <select
                value={productName}
                onChange={e => setProductName(e.target.value)}
                style={inp}
                required
              >
                <option value="">— اختر المنتج —</option>
                {products.map(p => (
                  <option key={p.id} value={p.name}>{p.name} (متاح: {p.qty} {p.unit})</option>
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
                  {isLow && <div style={{fontSize:11,color:'#f87171',marginTop:2}}>هذا الصنف وصل للحد الأدنى</div>}
                </div>
              </div>
            )}

            {/* الكمية والموظف */}
            <div className="qty-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>🔢 الكمية</label>
                <input
                  type="number"
                  placeholder="0"
                  min="1"
                  required
                  autoComplete="off"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  style={inp}
                />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>👤 الموظف</label>
                <input
                  type="text"
                  placeholder="اسم الموظف"
                  autoComplete="off"
                  value={employeeName}
                  onChange={e => setEmployeeName(e.target.value)}
                  style={inp}
                />
              </div>
            </div>

            {/* السبب */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:8}}>📋 سبب الصرف</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {REASONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    style={{
                      padding:'10px 6px',borderRadius:10,
                      border:`2px solid ${reason===r?'#ef4444':'#e2e8f0'}`,
                      background:reason===r?'#fef2f2':'white',
                      color:reason===r?'#ef4444':'#64748b',
                      fontSize:12,fontWeight:700,cursor:'pointer',
                      fontFamily:'system-ui',transition:'all 0.2s',
                      textAlign:'center' as const
                    }}
                  >{r}</button>
                ))}
              </div>
            </div>

            {/* ملاحظات */}
            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>📝 ملاحظات (اختياري)</label>
              <textarea
                placeholder="أي تفاصيل إضافية..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{...inp,minHeight:72,resize:'none'}}
              />
            </div>

            {/* ملخص */}
            {productName && qty && (
              <div style={{background:'linear-gradient(135deg,#fef2f2,#fee2e2)',border:'2px solid #fecaca',borderRadius:12,padding:14,marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{productName}</span>
                  <span style={{background:'#ef4444',color:'white',padding:'4px 12px',borderRadius:50,fontWeight:900,fontSize:14}}>
                    -{qty} {selectedProduct?.unit||''}
                  </span>
                </div>
                {remaining !== null && (
                  <div style={{fontSize:12,color: remaining < 0 ? '#ef4444' : '#94a3b8',marginTop:6,fontWeight: remaining < 0 ? 700 : 400}}>
                    {remaining < 0 ? '⚠️ الكمية تتجاوز المتاح!' : `المتبقي بعد الصرف: ${remaining} ${selectedProduct?.unit||''}`}
                  </div>
                )}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'14px',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg,#ef4444,#dc2626)',
              color:'white', border:'none', borderRadius:12,
              fontSize:15, fontWeight:800, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:'system-ui', boxShadow:'0 4px 14px rgba(239,68,68,0.3)',
              transition:'all 0.2s'
            }}>
              {loading ? '⏳ جاري الحفظ...' : '📤 تسجيل الصرف'}
            </button>
          </form>
        </div>

        {/* History */}
        <div style={{background:'white',borderRadius:20,padding:24,boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,paddingBottom:16,borderBottom:'1px solid #f1f5f9'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:40,height:40,background:'linear-gradient(135deg,#f1f5f9,#e2e8f0)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🕐</div>
              <div>
                <h3 style={{fontWeight:800,fontSize:15,color:'#0f172a',margin:0}}>آخر العمليات</h3>
                <p style={{fontSize:12,color:'#94a3b8',margin:0}}>{history.length} عملية مسجلة</p>
              </div>
            </div>
            <button onClick={loadHistory} style={{
              padding:'7px 12px',background:'#f8fafc',border:'1.5px solid #e2e8f0',
              borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',color:'#475569',fontFamily:'system-ui'
            }}>🔄</button>
          </div>

          {history.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 20px',color:'#94a3b8'}}>
              <div style={{fontSize:40,marginBottom:12}}>📭</div>
              <div style={{fontSize:14,fontWeight:600}}>لا توجد عمليات صرف بعد</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',maxHeight:520,overflowY:'auto'}}>
              {history.map((h,i) => (
                <div key={i} style={{
                  display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'13px 0',
                  borderBottom: i < history.length-1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:'#0f172a',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>
                      {h.product_name}
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
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
                    color:'#ef4444',padding:'5px 14px',borderRadius:50,
                    fontWeight:900,fontSize:14,flexShrink:0,marginRight:8,
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