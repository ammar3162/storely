'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

const CATS = ['مخزون','صيانة','أخرى']
const CAT_ICONS: Record<string,string> = { 'مخزون':'📦', 'صيانة':'🔧', 'أخرى':'📋' }

const UNITS = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','درزن','رول','غرام','أخرى']

export default function PurchasesPage() {
  const [history, setHistory]       = useState<any[]>([])
  const [loading, setLoading]       = useState(false)
  const [success, setSuccess]       = useState('')
  const [uploading, setUploading]   = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string|null>(null)
  const [showScan, setShowScan]     = useState(false)
  const [orgId, setOrgId]           = useState<string|null>(null)
  const [products, setProducts]     = useState<any[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    category:'مخزون', name:'', qty:'', unit:'قطعة',
    reorder_point:'5', total_amount:'', supplier:'', note:'', invoice_image:'', hasVat:'',
  })
  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const cachedOrg = sessionStorage.getItem('s_org_id')
    if (cachedOrg) {
      setOrgId(cachedOrg)
      await Promise.all([loadHistory(cachedOrg), loadProducts(cachedOrg)])
      return
    }
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id',user.id).single()
    if (!profile?.org_id) return
    sessionStorage.setItem('s_org_id', profile.org_id)
    setOrgId(profile.org_id)
    await Promise.all([loadHistory(profile.org_id), loadProducts(profile.org_id)])
  }

  async function loadHistory(oid: string) {
    const { data } = await sb.from('purchases').select('*')
      .eq('org_id', oid).order('created_at',{ascending:false}).limit(20)
    setHistory(data||[])
  }

  async function loadProducts(oid: string) {
    const { data } = await sb.from('products').select('id,name,sku,unit,qty,reorder_point')
      .eq('org_id', oid).eq('is_active', true).order('name')
    setProducts(data||[])
  }

  function handleScan(code: string) {
    setShowScan(false)
    const found = products.find(p => p.sku === code)
    if (found) {
      setForm(f=>({...f, name:found.name, unit:found.unit, reorder_point:String(found.reorder_point)}))
    } else {
      alert('المنتج غير موجود في المخزون — سيتم إنشاؤه كصنف جديد')
    }
  }

  async function handleImage(file: File) {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = 'invoice-'+Date.now()+'.'+ext
    const { error } = await sb.storage.from('invoices').upload(path, file)
    if (error) { alert('فشل رفع الصورة'); setUploading(false); return }
    const { data:{ publicUrl } } = sb.storage.from('invoices').getPublicUrl(path)
    setForm(f=>({...f,invoice_image:publicUrl}))
    setPreviewUrl(publicUrl)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.total_amount || !orgId) return
    setLoading(true)
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) { setLoading(false); return }

    const total  = Number(form.total_amount)
    const amount = parseFloat((total/1.15).toFixed(2))
    const vat_amount = parseFloat((total - amount).toFixed(2))

    await sb.from('purchases').insert({
      org_id: orgId, profile_id: user.id,
      category: form.category, name: form.name,
      qty: form.qty ? Number(form.qty) : null,
      unit: form.unit||null, reorder_point: Number(form.reorder_point)||5,
      amount, vat_amount, total_amount: total,
      supplier: form.supplier||null,
      note: form.note||null, invoice_image: form.invoice_image||null,
    })

    if (form.category==='مخزون' && form.name) {
      const qty = form.qty ? Number(form.qty) : 0
      const { data: existing } = await sb.from('products').select('id,qty')
        .eq('org_id', orgId).eq('name', form.name).maybeSingle()
      if (existing) {
        if (qty>0) await sb.from('stock_movements').insert({
          product_id:existing.id, profile_id:user.id,
          type:'in', qty_change:qty, note:'شراء: '+(form.supplier||'')
        })
      } else {
        const { data: np } = await sb.from('products').insert({
          org_id: orgId, name:form.name, unit:form.unit||'قطعة',
          qty, reorder_point:Number(form.reorder_point)||5, is_active:true,
        }).select().single()
        if (np && qty>0) await sb.from('stock_movements').insert({
          product_id:np.id, profile_id:user.id,
          type:'in', qty_change:qty, note:'شراء جديد: '+(form.supplier||'')
        })
      }
      await loadProducts(orgId)
    }

    setSuccess('تم تسجيل الشراء'+(form.category==='مخزون'?' وتحديث المخزون ✅':' ✅'))
    setForm({category:'مخزون',name:'',qty:'',unit:'قطعة',reorder_point:'5',total_amount:'',supplier:'',note:'',invoice_image:'',hasVat:''})
    setPreviewUrl(null)
    setLoading(false)
    loadHistory(orgId)
    setTimeout(()=>setSuccess(''),5000)
  }

  const total   = Number(form.total_amount)||0
  const amount  = total>0 ? (total/1.15).toFixed(2) : '0.00'
  const vat     = total>0 ? (total-Number(amount)).toFixed(2) : '0.00'

  const totalSpent = history.reduce((s,p)=>s+Number(p.total_amount||0),0)
  const totalVat   = history.reduce((s,p)=>s+Number(p.vat_amount||0),0)
  const totalNet   = history.reduce((s,p)=>s+Number(p.amount||0),0)

  const inp: React.CSSProperties = {
    width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0',
    borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'inherit', transition:'border 0.15s'
  }

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`
        .p-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
        .s-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
        .q-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media(max-width:768px){.p-grid{grid-template-columns:1fr}.s-grid{grid-template-columns:repeat(2,1fr)}}
        input:focus,select:focus,textarea:focus{border-color:#1a4731!important;box-shadow:0 0 0 3px rgba(26,71,49,0.08)!important}
        .cat-btn{padding:10px 8px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;border:1.5px solid #e2e8f0;background:white;color:#64748b;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:4px}
        .cat-btn.active{border-color:#1a4731;background:#e8f7ee;color:#1a4731}
        .ex-chip{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;white-space:nowrap;transition:all 0.15s}
        .ex-chip:hover{border-color:#1a4731;background:#e8f7ee;color:#1a4731}
      `}</style>

      {showScan && (
        <Suspense fallback={null}>
          <BarcodeScanner onScan={handleScan} onClose={()=>setShowScan(false)}/>
        </Suspense>
      )}

      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:3}}>المشتريات</h1>
        <p style={{fontSize:12,color:'#64748b'}}>فئة مخزون تُحدّث المخزون تلقائياً</p>
      </div>

      {/* Stats */}
      <div className="s-grid">
        {[
          {label:'إجمالي الفواتير', value:String(history.length),       color:'#1a4731', bg:'#e8f7ee'},
          {label:'بدون ضريبة',      value:totalNet.toFixed(2)+' ر.س',   color:'#1e40af', bg:'#dbeafe'},
          {label:'ضريبة 15%',       value:totalVat.toFixed(2)+' ر.س',   color:'#92400e', bg:'#fef3c7'},
          {label:'الإجمالي',        value:totalSpent.toFixed(2)+' ر.س', color:'#166534', bg:'#dcfce7'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:10,padding:'14px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {success && <div style={{background:'#ecfdf5',border:'1.5px solid #10b981',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:700,color:'#059669'}}>{success}</div>}

      <div className="p-grid">
        {/* Form */}
        <div style={{background:'white',borderRadius:12,padding:20,border:'1px solid #e8ecf0',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:16}}>تسجيل شراء جديد</div>
          <form onSubmit={handleSubmit}>

            {/* نوع الشراء */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>نوع الشراء</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {CATS.map(c=>(
                  <button key={c} type="button" className={'cat-btn'+(form.category===c?' active':'')}
                    onClick={()=>setForm({...form,category:c,name:'',unit:'قطعة'})}>
                    <span style={{fontSize:20}}>{CAT_ICONS[c]}</span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
              {form.category==='مخزون' && (
                <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:7,padding:'7px 10px',marginTop:8,fontSize:11,color:'#1e40af',fontWeight:600}}>
                  ✓ سيتم إضافة هذا الصنف للمخزون تلقائياً
                </div>
              )}
            </div>

            {/* اسم الصنف */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>اسم الصنف / الخدمة *</label>

              {/* زر الباركود — فقط في مخزون */}
              {form.category==='مخزون' && (
                <button type="button" onClick={()=>setShowScan(true)}
                  style={{width:'100%',padding:'10px',background:'#f0fdf4',color:'#166534',border:'1.5px solid #86efac',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8}}>
                  📷 مسح باركود المنتج
                </button>
              )}

              <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp}
                placeholder={form.category==='مخزون'?'مثال: مواد خام، مستلزمات، بضاعة...':form.category==='صيانة'?'مثال: صيانة جهاز، تصليح معدات...':'مثال: إيجار، فاتورة، خدمة...'}/>
            </div>

            {/* المبلغ */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>المبلغ الإجمالي (شامل الضريبة) *</label>
              <input type="number" min="0" step="0.01" required value={form.total_amount}
                onChange={e=>setForm({...form,total_amount:e.target.value})} style={inp} placeholder="0.00" inputMode="decimal"/>
              {total>0 && (
                <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 12px',marginTop:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b',marginBottom:4}}>
                    <span>بدون ضريبة (÷ 1.15)</span><span style={{fontWeight:600,color:'#334155'}}>{amount} ر.س</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b',marginBottom:6}}>
                    <span>ضريبة 15%</span><span style={{fontWeight:600,color:'#f59e0b'}}>{vat} ر.س</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:800,borderTop:'1px solid #e2e8f0',paddingTop:7}}>
                    <span>الإجمالي</span><span style={{color:'#10b981'}}>{total.toFixed(2)} ر.س</span>
                  </div>
                </div>
              )}
            </div>

            {/* المورد */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>المورد (اختياري)</label>
              <input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})} style={inp}
                placeholder="مثال: شركة الأغذية، سوبر ماركت الرياض..."/>
            </div>

            {/* كمية ووحدة — فقط في مخزون */}
            {form.category==='مخزون' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الكمية</label>
                  <input type="number" min="0" value={form.qty}
                    onChange={e=>setForm({...form,qty:e.target.value})} style={inp} placeholder="0" inputMode="numeric"/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الوحدة</label>
                  <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={inp}>
                    {UNITS.map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الحد الأدنى</label>
                  <input type="number" min="0" value={form.reorder_point}
                    onChange={e=>setForm({...form,reorder_point:e.target.value})} style={inp} inputMode="numeric"/>
                </div>
              </div>
            )}

            {/* صورة الفاتورة */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>صورة الفاتورة (اختياري)</label>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}}
                onChange={e=>{if(e.target.files?.[0]) handleImage(e.target.files[0])}}/>
              <button type="button" onClick={()=>fileRef.current?.click()}
                required={form.hasVat==='yes'} style={{width:'100%',padding:'10px',border:'1.5px dashed #cbd5e1',borderRadius:8,background:previewUrl?'#f0fdf4':'#f8fafc',color:previewUrl?'#166534':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                {uploading?'⏳ جاري الرفع...':previewUrl?'✅ تم رفع الفاتورة — اضغط لتغييرها':'📎 رفع صورة الفاتورة'}
              </button>
              {previewUrl && previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <img src={previewUrl} alt="فاتورة" style={{width:'100%',objectFit:'cover',maxHeight:100,borderRadius:8,marginTop:8,border:'1px solid #e2e8f0'}}/>
              )}
            </div>

            {/* ملاحظات */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>ملاحظات (اختياري)</label>
              <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})}
                style={{...inp,minHeight:60,resize:'none'}} placeholder="أي تفاصيل إضافية..."/>
            </div>

            <button type="submit" disabled={loading||uploading}
              style={{width:'100%',padding:'13px',background:(loading||uploading)?'#94a3b8':'#1a4731',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:(loading||uploading)?'not-allowed':'pointer',fontFamily:'inherit',transition:'background 0.15s'}}>
              {loading?'⏳ جاري الحفظ...':'تسجيل الشراء ←'}
            </button>
          </form>
        </div>

        {/* History */}
        <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>آخر المشتريات</div>
            <span style={{fontSize:11,color:'#94a3b8',background:'#f1f5f9',padding:'2px 8px',borderRadius:10}}>{history.length} فاتورة</span>
          </div>
          <div style={{maxHeight:600,overflowY:'auto'}}>
            {history.length===0 ? (
              <div style={{padding:'48px 20px',textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:36,marginBottom:10}}>🛒</div>
                <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>لا توجد مشتريات بعد</div>
              </div>
            ) : history.map((p,i)=>(
              <div key={p.id} style={{padding:'14px 18px',borderBottom:i<history.length-1?'1px solid #f8fafc':'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,flexWrap:'wrap' as const}}>
                      <span style={{background:p.category==='مخزون'?'#e8f7ee':p.category==='صيانة'?'#fef3c7':'#f1f5f9',color:p.category==='مخزون'?'#1a4731':p.category==='صيانة'?'#92400e':'#64748b',padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700}}>
                        {CAT_ICONS[p.category]} {p.category}
                      </span>
                      {p.invoice_image && (
                        <a href={p.invoice_image} target="_blank" rel="noreferrer"
                          style={{color:'#3b82f6',fontSize:10,fontWeight:600,textDecoration:'none',background:'#eff6ff',padding:'2px 8px',borderRadius:20}}>
                          📎 فاتورة
                        </a>
                      )}
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:2}}>{p.name}</div>
                    <div style={{fontSize:11,color:'#94a3b8'}}>
                      {p.supplier&&<span>{p.supplier} · </span>}
                      {new Date(p.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                  <div style={{textAlign:'left' as const,flexShrink:0}}>
                    <div style={{fontSize:15,fontWeight:800,color:'#10b981'}}>{Number(p.total_amount||0).toFixed(2)}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>ر.س شامل الضريبة</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
