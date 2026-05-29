'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PurchasesPage() {
  const [products, setProducts]         = useState<any[]>([])
  const [loading, setLoading]           = useState(false)
  const [success, setSuccess]           = useState('')
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [hasInvoice, setHasInvoice]     = useState<null|boolean>(null)
  const [invoiceImg, setInvoiceImg]     = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    product_name:'', new_product_name:'', employee_name:'', qty:'', total_amount:'',
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
    if (!productName || !form.qty || !form.total_amount) return
    setLoading(true)

    const qty          = Number(form.qty)
    const totalAmount  = Number(form.total_amount)  // المبلغ الإجمالي الذي أدخله المستخدم
    const vatAmount    = form.has_vat ? +(totalAmount * 0.15).toFixed(2) : 0
    const totalInclVat = +(totalAmount + vatAmount).toFixed(2)
    const unitPrice    = qty > 0 ? +(totalAmount / qty).toFixed(4) : totalAmount

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
        await supabase.from('products').update({
          qty: existing.qty + qty, cost_price: unitPrice
        }).eq('id', existing.id)
      }
    } else {
      const product = products.find(p => p.name === productName)
      if (product) {
        await supabase.from('products').update({
          qty: product.qty + qty, cost_price: unitPrice
        }).eq('id', product.id)
      }
    }

    await supabase.from('purchases').insert({
      org_id: profile?.org_id,
      product_name: productName, employee_name: form.employee_name,
      qty, unit_price: unitPrice, has_vat: form.has_vat,
      vat_amount: vatAmount, total_incl_vat: totalInclVat,
      payment_method: form.payment_method, supplier: form.supplier,
      notes: form.notes, invoice_url: invoiceImg ? 'يوجد صورة' : 'لا يوجد'
    })

    setSuccess(`✅ تم التسجيل — الإجمالي: ${totalInclVat} ريال`)
    setForm({ product_name:'', new_product_name:'', employee_name:'', qty:'', total_amount:'',
      payment_method:'نقد', supplier:'', has_vat:false, notes:'' })
    setIsNewProduct(false)
    setHasInvoice(null)
    setInvoiceImg(null)
    setLoading(false)
    loadProducts()
    setTimeout(() => setSuccess(''), 4000)
  }

  const amount = Number(form.total_amount) || 0
  const vat    = form.has_vat ? +(amount * 0.15).toFixed(2) : 0
  const total  = +(amount + vat).toFixed(2)

  const inp: React.CSSProperties = {
    width:'100%', padding:'12px 14px', border:'2px solid #e2e8f0',
    borderRadius:12, fontSize:15, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500,
  }

  return (
    <div style={{maxWidth:640,margin:'0 auto',direction:'rtl',fontFamily:'system-ui'}}>
      <style>{`
        @media(max-width:640px){
          .grid-2{grid-template-columns:1fr !important}
          .grid-4{grid-template-columns:1fr 1fr !important}
          .page-pad{padding:16px !important}
        }
        input:focus,select:focus,textarea:focus{
          border-color:#6366f1 !important;
          box-shadow:0 0 0 3px rgba(99,102,241,0.15) !important;
        }
      `}</style>

      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:26,fontWeight:900,color:'#0f172a',marginBottom:4}}>🛒 تسجيل مشتريات</h1>
        <p style={{fontSize:14,color:'#64748b'}}>أضف مشتريات جديدة وحدّث المخزون تلقائياً</p>
      </div>

      {success && (
        <div style={{background:'#ecfdf5',border:'2px solid #10b981',borderRadius:14,padding:'14px 18px',marginBottom:20,fontSize:14,fontWeight:700,color:'#059669',display:'flex',alignItems:'center',gap:10}}>
          {success}
        </div>
      )}

      <div className="page-pad" style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
        <form onSubmit={handleSubmit}>

          {/* المنتج */}
          <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
  <div style={{flex:1}}>
    <select
      value={isNewProduct ? '' : form.product_name}
      onChange={e => {
        setIsNewProduct(false)
        setForm({...form, product_name: e.target.value})
      }}
      style={{...inp, opacity: isNewProduct ? 0.4 : 1}}
      disabled={isNewProduct}
      required={!isNewProduct}
    >
      <option value="">— اختر منتجاً موجوداً —</option>
      {products.map(p => (
        <option key={p.id} value={p.name}>{p.name} (متاح: {p.qty})</option>
      ))}
    </select>
  </div>

  <button type="button" onClick={() => {
    setIsNewProduct(!isNewProduct)
    setForm({...form, product_name:'', new_product_name:''})
  }} style={{
    padding:'12px 14px', borderRadius:12, flexShrink:0,
    border:`2px solid ${isNewProduct ? '#6366f1' : '#e2e8f0'}`,
    background: isNewProduct ? '#eef2ff' : 'white',
    color: isNewProduct ? '#6366f1' : '#64748b',
    fontSize:13, fontWeight:700, cursor:'pointer',
    fontFamily:'system-ui', whiteSpace:'nowrap',
    display:'flex', alignItems:'center', gap:6
  }}>
    {isNewProduct ? '✕ إلغاء' : '➕ منتج جديد'}
  </button>
</div>

          {isNewProduct && (
            <div style={{marginBottom:20,background:'#eff6ff',border:'2px solid #93c5fd',borderRadius:14,padding:16}}>
              <label style={{fontSize:13,fontWeight:700,color:'#1d4ed8',display:'block',marginBottom:7}}>✏️ اسم المنتج الجديد</label>
              <input type="text" placeholder="مثال: بن إثيوبي، حليب فريش..." required
                value={form.new_product_name}
                onChange={e => setForm({...form,new_product_name:e.target.value})}
                style={{...inp,border:'2px solid #93c5fd'}} />
              <div style={{fontSize:12,color:'#3b82f6',marginTop:6,fontWeight:600}}>ℹ️ سيُضاف تلقائياً إلى قائمة المخزون</div>
            </div>
          )}

          {/* الكمية والموظف */}
          <div className="grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
            <div>
              <label style={{fontSize:13,fontWeight:700,color:'#374151',display:'block',marginBottom:7}}>🔢 الكمية</label>
              <input type="number" placeholder="0" min="1" required
                value={form.qty} onChange={e => setForm({...form,qty:e.target.value})} style={inp} />
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:700,color:'#374151',display:'block',marginBottom:7}}>👤 الموظف</label>
              <input type="text" placeholder="اسم الموظف"
                value={form.employee_name} onChange={e => setForm({...form,employee_name:e.target.value})} style={inp} />
            </div>
          </div>

          {/* المبلغ الكلي والمورد */}
          <div className="grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
            <div>
              <label style={{fontSize:13,fontWeight:700,color:'#374151',display:'block',marginBottom:7}}>
                💰 المبلغ الكلي (ريال)
              </label>
              <input type="number" placeholder="0.00" step="0.01" min="0" required
                value={form.total_amount} onChange={e => setForm({...form,total_amount:e.target.value})}
                style={{...inp,fontSize:20,fontWeight:800,textAlign:'center'}} />
              {form.qty && form.total_amount && (
                <div style={{fontSize:11,color:'#94a3b8',marginTop:4,textAlign:'center'}}>
                  سعر الوحدة: {(Number(form.total_amount)/Number(form.qty)).toFixed(2)} ريال
                </div>
              )}
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:700,color:'#374151',display:'block',marginBottom:7}}>🏭 المورد</label>
              <input type="text" placeholder="اسم المورد"
                value={form.supplier} onChange={e => setForm({...form,supplier:e.target.value})} style={inp} />
            </div>
          </div>

          {/* طريقة الدفع */}
          <div style={{marginBottom:20}}>
            <label style={{fontSize:13,fontWeight:700,color:'#374151',display:'block',marginBottom:7}}>💳 طريقة الدفع</label>
            <div className="grid-4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {[
                {val:'نقد',icon:'💵'},
                {val:'تحويل بنكي',icon:'🏦'},
                {val:'بطاقة ائتمانية',icon:'💳'},
                {val:'آجل',icon:'📋'},
              ].map(opt => (
                <button key={opt.val} type="button"
                  onClick={() => setForm({...form,payment_method:opt.val})}
                  style={{
                    padding:'10px 6px',borderRadius:10,
                    border:`2px solid ${form.payment_method===opt.val?'#6366f1':'#e2e8f0'}`,
                    background: form.payment_method===opt.val ? '#eef2ff' : 'white',
                    color: form.payment_method===opt.val ? '#6366f1' : '#64748b',
                    fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',
                    display:'flex',flexDirection:'column',alignItems:'center',gap:4
                  }}>
                  <span style={{fontSize:20}}>{opt.icon}</span>
                  {opt.val}
                </button>
              ))}
            </div>
          </div>

          {/* VAT */}
          <div style={{marginBottom:20}}>
            <label style={{
              display:'flex',alignItems:'center',gap:14,cursor:'pointer',
              padding:'14px 16px',background:'#f8fafc',borderRadius:12,border:'2px solid #e2e8f0'
            }}>
              <input type="checkbox" checked={form.has_vat}
                onChange={e => setForm({...form,has_vat:e.target.checked})}
                style={{width:20,height:20,cursor:'pointer',accentColor:'#6366f1'}} />
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'#1e293b'}}>ضريبة القيمة المضافة 15%</div>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>فعّل إذا كان المبلغ لا يشمل الضريبة</div>
              </div>
              {form.has_vat && (
                <span style={{marginRight:'auto',background:'#fef3c7',color:'#d97706',padding:'3px 10px',borderRadius:50,fontSize:12,fontWeight:700}}>
                  +15%
                </span>
              )}
            </label>
          </div>

          {/* الفاتورة */}
          <div style={{marginBottom:20}}>
            <label style={{fontSize:13,fontWeight:700,color:'#374151',display:'block',marginBottom:7}}>🧾 هل يوجد فاتورة؟</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button type="button" onClick={() => setHasInvoice(true)} style={{
                padding:'14px',borderRadius:12,
                border:`2px solid ${hasInvoice===true?'#10b981':'#e2e8f0'}`,
                background: hasInvoice===true ? '#ecfdf5' : 'white',
                color: hasInvoice===true ? '#059669' : '#64748b',
                fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8
              }}>✅ نعم، يوجد</button>
              <button type="button" onClick={() => { setHasInvoice(false); setInvoiceImg(null) }} style={{
                padding:'14px',borderRadius:12,
                border:`2px solid ${hasInvoice===false?'#ef4444':'#e2e8f0'}`,
                background: hasInvoice===false ? '#fff5f5' : 'white',
                color: hasInvoice===false ? '#ef4444' : '#64748b',
                fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8
              }}>❌ لا يوجد</button>
            </div>
          </div>

          {/* رفع الفاتورة */}
          {hasInvoice === true && (
            <div style={{marginBottom:20}}>
              <label style={{fontSize:13,fontWeight:700,color:'#374151',display:'block',marginBottom:7}}>📸 صورة الفاتورة</label>
              <input ref={fileRef} type="file" accept="image/*"
                onChange={handleImageChange} style={{display:'none'}} />
              {!invoiceImg ? (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <button type="button" onClick={() => {
                    if (fileRef.current) { fileRef.current.setAttribute('capture','environment'); fileRef.current.click() }
                  }} style={{padding:'20px',borderRadius:14,border:'2px dashed #93c5fd',background:'#eff6ff',color:'#1d4ed8',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                    <span style={{fontSize:32}}>📷</span>التقاط صورة
                  </button>
                  <button type="button" onClick={() => {
                    if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click() }
                  }} style={{padding:'20px',borderRadius:14,border:'2px dashed #a78bfa',background:'#f5f3ff',color:'#6d28d9',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                    <span style={{fontSize:32}}>🖼️</span>من المعرض
                  </button>
                </div>
              ) : (
                <div style={{borderRadius:14,overflow:'hidden',border:'2px solid #10b981'}}>
                  <img src={invoiceImg} alt="فاتورة" style={{width:'100%',maxHeight:200,objectFit:'cover',display:'block'}} />
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#ecfdf5',padding:'8px 14px'}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#059669'}}>✅ تم رفع الفاتورة</span>
                    <button type="button" onClick={() => setInvoiceImg(null)} style={{background:'#fef2f2',color:'#ef4444',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'system-ui'}}>حذف ✕</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ملاحظات */}
          <div style={{marginBottom:20}}>
            <label style={{fontSize:13,fontWeight:700,color:'#374151',display:'block',marginBottom:7}}>📝 ملاحظات (اختياري)</label>
            <textarea placeholder="أي تفاصيل إضافية..."
              value={form.notes} onChange={e => setForm({...form,notes:e.target.value})}
              style={{...inp,minHeight:80,resize:'none'}} />
          </div>

          {/* ملخص */}
          {amount > 0 && (
            <div style={{background:'linear-gradient(135deg,#f8faff,#eef2ff)',border:'2px solid #c7d2fe',borderRadius:14,padding:18,marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:14}}>
                <span style={{color:'#64748b',fontWeight:600}}>المبلغ قبل الضريبة</span>
                <span style={{fontWeight:800,color:'#1e293b'}}>{amount.toFixed(2)} ريال</span>
              </div>
              {form.has_vat && (
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:14}}>
                  <span style={{color:'#64748b',fontWeight:600}}>الضريبة 15%</span>
                  <span style={{fontWeight:800,color:'#d97706'}}>{vat.toFixed(2)} ريال</span>
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',paddingTop:12,borderTop:'2px solid #c7d2fe',fontSize:18}}>
                <span style={{fontWeight:900,color:'#1e293b'}}>الإجمالي النهائي</span>
                <span style={{fontWeight:900,color:'#6366f1',fontSize:22}}>{total.toFixed(2)} ﷼</span>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%',padding:'16px',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg,#10b981,#059669)',
            color:'white',border:'none',borderRadius:14,fontSize:16,fontWeight:900,
            cursor: loading ? 'not-allowed' : 'pointer',fontFamily:'system-ui',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',transition:'all 0.2s'
          }}>
            {loading ? '⏳ جاري الحفظ...' : '✅ حفظ في المشتريات وتحديث المخزون'}
          </button>

        </form>
      </div>
    </div>
  )
}