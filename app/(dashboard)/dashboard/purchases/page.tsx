'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function PurchasesPage() {
  const [products, setProducts]       = useState<any[]>([])
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState('')
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [hasInvoice, setHasInvoice]   = useState<null|boolean>(null)
  const [invoiceImg, setInvoiceImg]   = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    product_name:'', new_product_name:'', employee_name:'', qty:'', unit_price:'',
    payment_method:'نقد', supplier:'', has_vat:false, notes:''
  })
  const supabase = createClient()
  useEffect(() => { loadProducts() }, [])
  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('حجم الصورة يتجاوز 5MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setInvoiceImg(ev.target?.result as string)
    reader.readAsDataURL(file)
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const productName = isNewProduct ? form.new_product_name : form.product_name
    if (!productName || !form.qty || !form.unit_price) return
    setLoading(true)
    const qty          = Number(form.qty)
    const unitPrice    = Number(form.unit_price)
    const amountNoVat  = +(unitPrice * qty).toFixed(2)
    const vatAmount    = form.has_vat ? +(amountNoVat * 0.15).toFixed(2) : 0
    const totalInclVat = +(amountNoVat + vatAmount).toFixed(2)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
    if (isNewProduct && form.new_product_name) {
      const existing = products.find(p => p.name === form.new_product_name)
      if (!existing) {
        await supabase.from('products').insert({
          org_id: profile?.org_id, name: form.new_product_name,
          unit: 'قطعة', qty, reorder_point: 0, cost_price: unitPrice, category: 'أخرى'
        })
      } else {
        await supabase.from('products').update({ qty: existing.qty + qty, cost_price: unitPrice }).eq('id', existing.id)
      }
    } else {
      const product = products.find(p => p.name === productName)
      if (product) {
        await supabase.from('products').update({ qty: product.qty + qty, cost_price: unitPrice }).eq('id', product.id)
      }
    }
    await supabase.from('purchases').insert({
      org_id: profile?.org_id,
      product_name:   productName,
      employee_name:  form.employee_name,
      qty, unit_price: unitPrice,
      has_vat:        form.has_vat,
      vat_amount:     vatAmount,
      total_incl_vat: totalInclVat,
      payment_method: form.payment_method,
      supplier:       form.supplier,
      notes:          form.notes,
      invoice_url:    invoiceImg ? 'يوجد صورة' : 'لا يوجد'
    })
    setSuccess(`✅ تم التسجيل — الإجمالي: ${totalInclVat} ريال`)
    setForm({ product_name:'', new_product_name:'', employee_name:'', qty:'', unit_price:'',
      payment_method:'نقد', supplier:'', has_vat:false, notes:'' })
    setIsNewProduct(false)
    setHasInvoice(null)
    setInvoiceImg(null)
    setLoading(false)
    loadProducts()
    setTimeout(() => setSuccess(''), 4000)
  }
  const amount = Number(form.unit_price) * Number(form.qty) || 0
  const vat    = form.has_vat ? +(amount * 0.15).toFixed(2) : 0
  const total  = +(amount + vat).toFixed(2)
  const inp: React.CSSProperties = {
    width:'100%', padding:'12px 14px', border:'2px solid #e5e7eb',
    borderRadius:10, fontSize:15, outline:'none', boxSizing:'border-box',
    background:'white', color:'#111827', fontFamily:'system-ui', fontWeight:500
  }
  const lbl: React.CSSProperties = {
    fontSize:13, fontWeight:700, color:'#374151', display:'block', marginBottom:7
  }
  return (
    <div style={{maxWidth:620,margin:'0 auto'}}>
      <h1 style={{fontSize:24,fontWeight:900,marginBottom:4,color:'#111827'}}>🛒 تسجيل مشتريات</h1>
      <p style={{fontSize:14,color:'#6b7280',marginBottom:24}}>أضف مشتريات جديدة وحدّث المخزون تلقائياً</p>
      {success && (
        <div style={{background:'#ecfdf5',border:'2px solid #10b981',borderRadius:12,padding:'14px 18px',marginBottom:20,fontSize:15,fontWeight:700,color:'#059669'}}>
          {success}
        </div>
      )}
      <div style={{background:'white',borderRadius:20,padding:32,boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
        <form onSubmit={handleSubmit}>
          {/* المنتج */}
          <div style={{marginBottom:20}}>
            <label style={lbl}>📦 المنتج</label>
            <select value={isNewProduct ? 'new' : form.product_name}
              onChange={e => {
                if (e.target.value === 'new') { setIsNewProduct(true); setForm({...form,product_name:''}) }
                else { setIsNewProduct(false); setForm({...form,product_name:e.target.value}) }
              }} style={inp}>
              <option value="">— اختر المنتج —</option>
              {products.map(p => <option key={p.id} value={p.name}>{p.name} (متاح: {p.qty})</option>)}
              <option value="new">➕ منتج جديد غير موجود في القائمة</option>
            </select>
          </div>
          {isNewProduct && (
            <div style={{marginBottom:20,background:'#eff6ff',border:'2px solid #93c5fd',borderRadius:12,padding:16}}>
              <label style={{...lbl,color:'#1d4ed8'}}>✏️ اسم المنتج الجديد</label>
              <input type="text" placeholder="مثال: بن إثيوبي..." required
                value={form.new_product_name}
                onChange={e => setForm({...form,new_product_name:e.target.value})}
                style={{...inp,border:'2px solid #93c5fd'}} />
              <div style={{fontSize:12,color:'#3b82f6',marginTop:8,fontWeight:600}}>ℹ️ سيُضاف تلقائياً للمخزون</div>
            </div>
          )}
          {/* الكمية والموظف */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
            <div>
              <label style={lbl}>🔢 الكمية</label>
              <input type="number" placeholder="0" min="1" required
                value={form.qty} onChange={e => setForm({...form,qty:e.target.value})} style={inp} />
            </div>
            <div>
              <label style={lbl}>👤 الموظف</label>
              <input type="text" placeholder="اسم الموظف"
                value={form.employee_name} onChange={e => setForm({...form,employee_name:e.target.value})} style={inp} />
            </div>
          </div>
          {/* المبلغ والمورد */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
            <div>
              <label style={lbl}>💰 المبلغ (ريال)</label>
              <input type="number" placeholder="0.00" step="0.01" min="0" required
                value={form.unit_price} onChange={e => setForm({...form,unit_price:e.target.value})}
                style={{...inp,fontSize:18,fontWeight:700,textAlign:'center'}} />
            </div>
            <div>
              <label style={lbl}>🏭 المورد</label>
              <input type="text" placeholder="اسم المورد"
                value={form.supplier} onChange={e => setForm({...form,supplier:e.target.value})} style={inp} />
            </div>
          </div>
          {/* طريقة الدفع */}
          <div style={{marginBottom:20}}>
            <label style={lbl}>💳 طريقة الدفع</label>
            <select value={form.payment_method} onChange={e => setForm({...form,payment_method:e.target.value})} style={inp}>
              <option value="نقد">💵 نقد</option>
              <option value="تحويل بنكي">🏦 تحويل بنكي</option>
              <option value="بطاقة ائتمانية">💳 بطاقة ائتمانية</option>
              <option value="آجل">📋 آجل</option>
            </select>
          </div>
          {/* VAT */}
          <div style={{marginBottom:20}}>
            <label style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',
              padding:'14px 16px',background:'#f9fafb',borderRadius:12,border:'2px solid #e5e7eb'}}>
              <input type="checkbox" checked={form.has_vat}
                onChange={e => setForm({...form,has_vat:e.target.checked})}
                style={{width:18,height:18,cursor:'pointer'}} />
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'#111827'}}>ضريبة القيمة المضافة 15%</div>
                <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>فعّل إذا كان المبلغ لا يشمل الضريبة</div>
              </div>
            </label>
          </div>
          {/* هل يوجد فاتورة؟ */}
          <div style={{marginBottom:20}}>
            <label style={lbl}>🧾 هل يوجد فاتورة؟</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button type="button" onClick={() => setHasInvoice(true)} style={{
                padding:'14px', borderRadius:12, border:`2px solid ${hasInvoice===true?'#10b981':'#e5e7eb'}`,
                background: hasInvoice===true ? '#ecfdf5' : 'white',
                color: hasInvoice===true ? '#059669' : '#6b7280',
                fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'system-ui'
              }}>✅ نعم، يوجد فاتورة</button>
              <button type="button" onClick={() => { setHasInvoice(false); setInvoiceImg(null) }} style={{
                padding:'14px', borderRadius:12, border:`2px solid ${hasInvoice===false?'#ef4444':'#e5e7eb'}`,
                background: hasInvoice===false ? '#fff5f5' : 'white',
                color: hasInvoice===false ? '#ef4444' : '#6b7280',
                fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'system-ui'
              }}>❌ لا يوجد فاتورة</button>
            </div>
          </div>
          {/* رفع صورة الفاتورة */}
          {hasInvoice === true && (
            <div style={{marginBottom:20}}>
              <label style={lbl}>📸 صورة الفاتورة</label>
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                onChange={handleImageChange} style={{display:'none'}} />
              {!invoiceImg ? (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <button type="button" onClick={() => {
                    if (fileRef.current) { fileRef.current.setAttribute('capture','environment'); fileRef.current.click() }
                  }} style={{
                    padding:'20px', borderRadius:12, border:'2px dashed #93c5fd',
                    background:'#eff6ff', color:'#1d4ed8', fontSize:14, fontWeight:700,
                    cursor:'pointer', fontFamily:'system-ui', display:'flex',
                    flexDirection:'column', alignItems:'center', gap:8
                  }}>
                    <span style={{fontSize:32}}>📷</span>
                    التقاط صورة
                  </button>
                  <button type="button" onClick={() => {
                    if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click() }
                  }} style={{
                    padding:'20px', borderRadius:12, border:'2px dashed #a78bfa',
                    background:'#f5f3ff', color:'#6d28d9', fontSize:14, fontWeight:700,
                    cursor:'pointer', fontFamily:'system-ui', display:'flex',
                    flexDirection:'column', alignItems:'center', gap:8
                  }}>
                    <span style={{fontSize:32}}>🖼️</span>
                    رفع من المعرض
                  </button>
                </div>
              ) : (
                <div style={{position:'relative',borderRadius:12,overflow:'hidden',border:'2px solid #10b981'}}>
                  <img src={invoiceImg} alt="فاتورة" style={{width:'100%',maxHeight:200,objectFit:'cover',display:'block'}} />
                  <button type="button" onClick={() => setInvoiceImg(null)} style={{
                    position:'absolute', top:8, left:8, background:'rgba(0,0,0,0.6)',
                    color:'white', border:'none', borderRadius:50, width:32, height:32,
                    cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center'
                  }}>✕</button>
                  <div style={{background:'#ecfdf5',padding:'8px 12px',fontSize:12,fontWeight:700,color:'#059669'}}>
                    ✅ تم رفع صورة الفاتورة
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ملخص */}
          {amount > 0 && (
            <div style={{background:'#f8faff',border:'2px solid #e0e7ff',borderRadius:14,padding:18,marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:14}}>
                <span style={{color:'#6b7280',fontWeight:600}}>قبل الضريبة</span>
                <span style={{fontWeight:800,color:'#111827'}}>{amount.toFixed(2)} ريال</span>
              </div>
              {form.has_vat && (
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:14}}>
                  <span style={{color:'#6b7280',fontWeight:600}}>الضريبة 15%</span>
                  <span style={{fontWeight:800,color:'#f59e0b'}}>{vat.toFixed(2)} ريال</span>
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',paddingTop:10,borderTop:'2px solid #e0e7ff',fontSize:17}}>
                <span style={{fontWeight:900,color:'#111827'}}>الإجمالي</span>
                <span style={{fontWeight:900,color:'#667eea'}}>{total.toFixed(2)} ريال</span>
              </div>
            </div>
          )}
          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'16px', background:'linear-gradient(135deg,#10b981,#059669)',
            color:'white', border:'none', borderRadius:14, fontSize:16, fontWeight:900, cursor:'pointer'
          }}>
            {loading ? 'جاري الحفظ...' : '✅ حفظ في المشتريات وتحديث المخزون'}
          </button>
        </form>
      </div>
    </div>
  )
}
