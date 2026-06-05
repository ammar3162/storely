'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['مخزون', 'صيانة', 'أخرى']

export default function PurchasesPage() {
  const [history, setHistory]     = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState('')
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    category: 'مخزون',
    name: '',
    qty: '',
    unit: 'قطعة',
    reorder_point: '5',
    total_amount: '',
    supplier: '',
    note: '',
    invoice_image: '',
  })
  const supabase = createClient()

  useEffect(() => { loadHistory() }, [])

  async function loadHistory() {
    const { data } = await supabase
      .from('purchases').select('*')
      .order('created_at', { ascending: false }).limit(30)
    setHistory(data || [])
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = 'invoice-' + Date.now() + '.' + ext
    const { error } = await supabase.storage.from('invoices').upload(path, file)
    if (error) { alert('فشل رفع الصورة'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(path)
    setForm(f => ({ ...f, invoice_image: publicUrl }))
    setPreviewUrl(publicUrl)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.total_amount) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) { alert('لا يوجد org_id'); setLoading(false); return }

    const totalAmount = Number(form.total_amount)
    const amount      = parseFloat((totalAmount / 1.15).toFixed(2))
    const vatAmount   = parseFloat((totalAmount - amount).toFixed(2))

    const { error: purchaseErr } = await supabase.from('purchases').insert({
      org_id:        profile.org_id,
      profile_id:    user.id,
      category:      form.category,
      name:          form.name,
      qty:           form.qty ? Number(form.qty) : null,
      unit:          form.unit || null,
      reorder_point: form.reorder_point ? Number(form.reorder_point) : 5,
      amount,
      supplier:      form.supplier || null,
      note:          form.note || null,
      invoice_image: form.invoice_image || null,
    })

    if (purchaseErr) { alert('خطأ: ' + purchaseErr.message); setLoading(false); return }

    if (form.category === 'مخزون' && form.name) {
      const qty = form.qty ? Number(form.qty) : 0
      const { data: existing } = await supabase.from('products')
        .select('id,qty').eq('org_id', profile.org_id).eq('name', form.name).single()

      if (existing) {
        if (qty > 0) {
          await supabase.from('stock_movements').insert({
            product_id: existing.id, profile_id: user.id,
            type: 'in', qty_change: qty,
            note: 'شراء: ' + (form.supplier || ''),
          })
        }
      } else {
        const { data: newProduct } = await supabase.from('products').insert({
          org_id: profile.org_id, name: form.name,
          unit: form.unit || 'قطعة', qty,
          reorder_point: form.reorder_point ? Number(form.reorder_point) : 5,
          category: 'مشتريات',
        }).select().single()

        if (newProduct && qty > 0) {
          await supabase.from('stock_movements').insert({
            product_id: newProduct.id, profile_id: user.id,
            type: 'in', qty_change: qty,
            note: 'شراء جديد: ' + (form.supplier || ''),
          })
        }
      }
    }

    setSuccess('تم تسجيل الشراء' + (form.category === 'مخزون' ? ' وتحديث المخزون تلقائياً ✅' : ' ✅'))
    setForm({ category:'مخزون', name:'', qty:'', unit:'قطعة', reorder_point:'5', total_amount:'', supplier:'', note:'', invoice_image:'' })
    setPreviewUrl(null)
    setLoading(false)
    loadHistory()
    setTimeout(() => setSuccess(''), 5000)
  }

  const totalAmount = Number(form.total_amount) || 0
  const amount      = totalAmount > 0 ? parseFloat((totalAmount / 1.15).toFixed(2)) : 0
  const vatAmount   = totalAmount > 0 ? parseFloat((totalAmount - amount).toFixed(2)) : 0

  const inp: React.CSSProperties = {
    width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0',
    borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'inherit',
  }

  return (
    <div style={{direction:'rtl', fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:3}}>المشتريات</h1>
        <p style={{fontSize:12,color:'#64748b'}}>تسجيل المشتريات — فئة مخزون تُحدّث المخزون تلقائياً</p>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          { label:'إجمالي الفواتير',      value:history.length,                                                          color:'#1a4731', bg:'#e8f7ee' },
          { label:'إجمالي بدون ضريبة',    value:history.reduce((s,p)=>s+Number(p.amount||0),0).toFixed(2)+' ر.س',       color:'#1e40af', bg:'#dbeafe' },
          { label:'ضريبة 15%',            value:(history.reduce((s,p)=>s+Number(p.vat_amount||0),0)).toFixed(2)+' ر.س', color:'#92400e', bg:'#fef3c7' },
          { label:'الإجمالي مع الضريبة',  value:history.reduce((s,p)=>s+Number(p.total_amount||0),0).toFixed(2)+' ر.س', color:'#10b981', bg:'#dcfce7' },
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,borderRadius:10,padding:'14px 16px',border:'1px solid '+s.bg}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {success && (
        <div style={{background:'#ecfdf5',border:'2px solid #10b981',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:700,color:'#059669'}}>
          {success}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
        {/* Form */}
        <div style={{background:'white',borderRadius:12,padding:20,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:16}}>تسجيل شراء جديد</div>
          <form onSubmit={handleSubmit}>

            {/* Category */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>نوع الشراء</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                {CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => setForm({...form, category:c})}
                    style={{padding:'9px',borderRadius:8,border:'1.5px solid '+(form.category===c?'#1a4731':'#e2e8f0'),background:form.category===c?'#e8f7ee':'white',color:form.category===c?'#1a4731':'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    {c==='مخزون'?'📦 ':c==='صيانة'?'🔧 ':'📋 '}{c}
                  </button>
                ))}
              </div>
              {form.category === 'مخزون' && (
                <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:7,padding:'7px 10px',marginTop:7,fontSize:11,color:'#1e40af',fontWeight:600}}>
                  سيتم إضافة هذا الصنف للمخزون تلقائياً
                </div>
              )}
            </div>

            {/* Name */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>اسم الصنف / الخدمة *</label>
              <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp} placeholder="مثال: قهوة عربية / صيانة مكيف"/>
            </div>

            {/* Amount */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>المبلغ الإجمالي (شامل الضريبة) *</label>
              <input type="number" min="0" step="0.01" required value={form.total_amount} onChange={e=>setForm({...form,total_amount:e.target.value})} style={inp} placeholder="0.00"/>
              {totalAmount > 0 && (
                <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 12px',marginTop:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b',marginBottom:4}}>
                    <span>بدون ضريبة (÷ 1.15)</span>
                    <span style={{fontWeight:600,color:'#334155'}}>{amount.toFixed(2)} ر.س</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b',marginBottom:6}}>
                    <span>ضريبة القيمة المضافة 15%</span>
                    <span style={{fontWeight:600,color:'#f59e0b'}}>{vatAmount.toFixed(2)} ر.س</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:800,borderTop:'1px solid #e2e8f0',paddingTop:6}}>
                    <span style={{color:'#0f172a'}}>الإجمالي</span>
                    <span style={{color:'#10b981'}}>{totalAmount.toFixed(2)} ر.س</span>
                  </div>
                </div>
              )}
            </div>

            {/* Supplier */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>المورد (اختياري)</label>
              <input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})} style={inp} placeholder="اسم المورد"/>
            </div>

            {/* Qty - only for مخزون and optional */}
            {form.category === 'مخزون' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الكمية (اختياري)</label>
                  <input type="number" min="0" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} style={inp} placeholder="0"/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الوحدة</label>
                  <input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={inp} placeholder="كيلو"/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الحد الأدنى</label>
                  <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:e.target.value})} style={inp}/>
                </div>
              </div>
            )}

            {/* Invoice Image */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>صورة الفاتورة (اختياري)</label>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}}
                onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }}/>
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{width:'100%',padding:'10px',border:'1.5px dashed #cbd5e1',borderRadius:8,background:'#f8fafc',color:'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}>
                {uploading ? '⏳ جاري الرفع...' : previewUrl ? '✅ تم رفع الفاتورة — اضغط لتغييرها' : '📎 اضغط لرفع صورة الفاتورة'}
              </button>
              {previewUrl && previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <div style={{marginTop:8,borderRadius:8,overflow:'hidden',border:'1px solid #e2e8f0',maxHeight:120}}>
                  <img src={previewUrl} alt="فاتورة" style={{width:'100%',objectFit:'cover',maxHeight:120}}/>
                </div>
              )}
            </div>

            {/* Note */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>ملاحظات (اختياري)</label>
              <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} style={{...inp,minHeight:60,resize:'none'}} placeholder="أي تفاصيل إضافية..."/>
            </div>

            <button type="submit" disabled={loading||uploading}
              style={{width:'100%',padding:'12px',background:loading?'#94a3b8':'linear-gradient(135deg,#1a4731,#2d7a4f)',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {loading ? 'جاري الحفظ...' : 'تسجيل الشراء'}
            </button>
          </form>
        </div>

        {/* History */}
        <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>آخر المشتريات</div>
            <span style={{fontSize:11,color:'#94a3b8'}}>{history.length} فاتورة</span>
          </div>
          <div style={{maxHeight:580,overflowY:'auto'}}>
            {history.length === 0 ? (
              <div style={{padding:'40px',textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:32,marginBottom:8}}>🛒</div>
                <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>لا توجد مشتريات بعد</div>
              </div>
            ) : history.map((p,i) => (
              <div key={p.id} style={{padding:'12px 16px',borderBottom:i<history.length-1?'1px solid #f8fafc':'none',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{background:p.category==='مخزون'?'#e8f7ee':p.category==='صيانة'?'#fef3c7':'#f1f5f9',color:p.category==='مخزون'?'#1a4731':p.category==='صيانة'?'#92400e':'#64748b',padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700}}>{p.category}</span>
                    {p.invoice_image && <span style={{fontSize:10,color:'#3b82f6'}}>📎 فاتورة</span>}
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:'#0f172a',marginBottom:2}}>{p.name}</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>
                    {p.supplier && p.supplier + ' · '}
                    {new Date(p.created_at).toLocaleDateString('ar-SA')}
                  </div>
                </div>
                <div style={{textAlign:'left' as const,flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:'#10b981'}}>{Number(p.total_amount||0).toFixed(2)} ر.س</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>شامل الضريبة</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
