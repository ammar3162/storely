'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))
import { createClient } from '@/lib/supabase/client'
import { colors, font, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'

const CATS = ['مخزون','مشتريات','أخرى']
const CAT_ICONS: Record<string,string> = {'مخزون':'📦','مشتريات':'🛒','أخرى':'📋'}
const UNITS = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','درزن','رول','غرام','أخرى']

export default function PurchasesPage() {
  const [history, setHistory]       = useState<any[]>([])
  const [products, setProducts]     = useState<any[]>([])
  const [isExisting, setIsExisting] = useState<boolean|null>(null)
  const [orgId, setOrgId]           = useState('')
  const [userId, setUserId]         = useState('')
  const [loading, setLoading]       = useState(false)
  const submitting = useRef(false)
  const [uploading, setUploading]   = useState(false)
  const [showScan, setShowScan]     = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    category:'مخزون', name:'', sku:'', qty:'', unit:'قطعة',
    reorder_point:'5', total_amount:'', supplier:'',
    note:'', invoice_image:'', hasVat:'',
  })
  const sb = createClient()

  useEffect(()=>{
    let a=0; const c=setInterval(()=>{a++;const b=sessionStorage.getItem('s_branch_id'),o=sessionStorage.getItem('s_org_id');if((b&&o)||a>20){clearInterval(c);init()}},100); return()=>clearInterval(c)
  },[])
  useVisibilityRefresh(() => { if (orgId) loadHistory(orgId) }, 20*60*1000)

  async function init() {
    let oid = sessionStorage.getItem('s_org_id')
    let uid = sessionStorage.getItem('s_profile_id')
    if (!oid || !uid) {
      const { data:{ user } } = await sb.auth.getUser()
      if (!user) return
      const { data: p } = await sb.from('profiles').select('id,org_id').eq('id', user.id).single()
      if (!p) return
      oid = p.org_id; uid = p.id
      sessionStorage.setItem('s_org_id', oid!)
      sessionStorage.setItem('s_profile_id', uid!)
    }
    setOrgId(oid!); setUserId(uid!)
    loadProducts(oid!)
    setTimeout(()=>loadHistory(oid!), 300)
  }

  async function loadProducts(oid: string) {
    const { data } = await sb.from('products').select('id,name,unit,qty').eq('org_id',oid).eq('is_active',true).order('name')
    setProducts(data||[])
  }

  async function loadHistory(oid: string) {
    // اقرأ branch_id من URL أو sessionStorage
    const urlBid = new URLSearchParams(window.location.search).get('_b')
    if (urlBid) { sessionStorage.setItem('s_branch_id', urlBid); window.history.replaceState({}, '', window.location.pathname) }
    const bid = urlBid || sessionStorage.getItem('s_branch_id')
    let q = sb.from('purchases').select('*').eq('org_id', oid).order('created_at',{ascending:false}).limit(25)
    if(bid) q = (q as any).eq('branch_id', bid)
    const { data } = await q
    setHistory(data||[])
  }

  async function handleImage(file: File) {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = 'invoice-'+Date.now()+'.'+ext
    const { error } = await sb.storage.from('invoices').upload(path, file)
    if (error) { toast('فشل رفع الصورة', 'error'); setUploading(false); return }
    const { data:{ publicUrl } } = sb.storage.from('invoices').getPublicUrl(path)
    setForm(f=>({...f,invoice_image:publicUrl}))
    setPreviewUrl(publicUrl)
    setUploading(false)
    toast('تم رفع الفاتورة ✓')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.total_amount || !orgId) return
    if (submitting.current) return
    submitting.current = true
    if (!form.hasVat) { toast('حدد هل الفاتورة تشمل الضريبة', 'warning'); return }
    if (form.hasVat==='yes' && !form.invoice_image) { toast('يرجى رفع صورة الفاتورة', 'warning'); return }
    if (!form.supplier.trim()) { toast('يرجى إدخال اسم المورد', 'warning'); return }
    setLoading(true)

    const inputTotal = Number(form.total_amount)

    // Supabase generated columns:
    // vat_amount = round(amount * 0.15, 2)
    // total_amount = round(amount * 1.15, 2)
    // يعني: amount = المبلغ بدون ضريبة دائماً
    // إذا الفاتورة شاملة ضريبة: amount = inputTotal / 1.15
    // إذا بدون ضريبة: amount = inputTotal (وسيضيف Supabase 15% في total_amount)
    // المشكلة: إذا بدون ضريبة ما نبي Supabase يضيف ضريبة!
    // الحل: نغير الـ generated columns أو نحسب بطريقة مختلفة

    // نرسل amount = inputTotal/1.15 دائماً إذا شاملة
    // إذا بدون ضريبة: نرسل amount = inputTotal (total_amount سيكون inputTotal*1.15)
    // لكن هذا خطأ للفواتير بدون ضريبة!

    // الحل الصحيح: نغير generated column في Supabase
    // لكن مؤقتاً: نرسل amount بحيث total_amount = inputTotal
    // amount = inputTotal / 1.15 دائماً (Supabase يحسب total_amount = amount*1.15 = inputTotal)
    const amount = parseFloat((inputTotal / 1.15).toFixed(2))

    const { error: insErr } = await sb.from('purchases').insert({
      org_id:orgId, profile_id:userId, branch_id:sessionStorage.getItem('s_branch_id')||null,
      category:form.category, name:form.name,
      qty:form.qty ? Number(form.qty) : null,
      unit:form.unit||null,
      reorder_point:Number(form.reorder_point)||5,
      amount,
      supplier:form.supplier,
      note:form.note||null,
      invoice_image:form.invoice_image||null,
    })

    if (insErr) {
      toast('خطأ في حفظ الفاتورة: ' + insErr.message, 'error')
      setLoading(false)
      return
    }

    if (form.category==='مخزون' && form.name) {
      const qty = form.qty ? Number(form.qty) : 0
      let existing: any = null
      const { data: byNameArr } = await sb.from('products').select('id,qty,sku').eq('org_id',orgId).eq('name',form.name).order('created_at',{ascending:false}).limit(1)
      if (byNameArr && byNameArr.length>0) { existing = byNameArr[0] }
      else if (form.sku) {
        const { data: bySkuArr } = await sb.from('products').select('id,qty,sku,name').eq('org_id',orgId).eq('sku',form.sku).order('created_at',{ascending:false}).limit(1)
        if (bySkuArr && bySkuArr.length>0) existing = bySkuArr[0]
      }
      if (existing) {
        if (form.sku && !existing.sku) await sb.from('products').update({sku:form.sku}).eq('id',existing.id)
        if (qty > 0) await sb.from('stock_movements').insert({product_id:existing.id,profile_id:userId,type:'in',qty_change:qty,note:`شراء من: ${form.supplier}`})
        toast(`✅ المنتج موجود — تم تحديث المخزون (+${qty})`, 'success')
      } else {
        const branchId = sessionStorage.getItem('s_branch_id') || 
          (await sb.from('branches').select('id').eq('org_id',orgId).eq('is_active',true).order('created_at').limit(1).single()).data?.id || null
        const { data: np } = await sb.from('products').insert({org_id:orgId,branch_id:branchId,name:form.name,sku:form.sku||null,unit:form.unit||'قطعة',qty:0,reorder_point:Number(form.reorder_point)||5,is_active:true}).select().single()
        if (np && qty > 0) await sb.from('stock_movements').insert({product_id:np.id,profile_id:userId,type:'in',qty_change:qty,note:`شراء جديد من: ${form.supplier}`})
        toast(`✅ تم إضافة "${form.name}" للمخزون كصنف جديد`)
      }
    } else {
      toast('✅ تم تسجيل الشراء')
    }

    setForm({category:'مخزون',name:'',sku:'',qty:'',unit:'قطعة',reorder_point:'5',total_amount:'',supplier:'',note:'',invoice_image:'',hasVat:''})
    setPreviewUrl(null); setLoading(false)
    submitting.current = false
    loadHistory(orgId)
  }

  const inputTotal = Number(form.total_amount)||0
  const displayAmount = form.hasVat==='yes' && inputTotal>0 ? (inputTotal/1.15).toFixed(2) : inputTotal.toFixed(2)
  const displayVat    = form.hasVat==='yes' && inputTotal>0 ? (inputTotal - Number(displayAmount)).toFixed(2) : '0.00'

  const totalSpent = history.reduce((s,p)=>s+Number(p.total_amount||0),0)
  const totalVat   = history.reduce((s,p)=>s+Number(p.vat_amount||0),0)
  const totalNet   = history.reduce((s,p)=>s+Number(p.amount||0),0)

  const inp: React.CSSProperties = {
    width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',
    borderRadius:9,fontSize:14,outline:'none',boxSizing:'border-box',
    background:'white',color:'#1e293b',fontFamily:'inherit',
  }

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .ru{animation:fadeUp .2s ease both}
        input:focus,select:focus,textarea:focus{outline:none!important;border-color:#16a34a!important;box-shadow:0 0 0 3px rgba(22,163,74,.1)!important}
        .cat-btn{padding:12px 8px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;border:1.5px solid #e2e8f0;background:white;color:#64748b;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:5px;width:100%}
        .cat-btn.active{border-color:#16a34a;background:#f0fdf4;color:#16a34a}
        .vat-btn{padding:12px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;border:1.5px solid #e2e8f0;background:white;color:#64748b;font-family:inherit;width:100%}
        .row-hover:hover{background:#f8fafc!important}
        .trow:hover td{background:#f8fafc!important}
        @media(max-width:768px){
          .p-grid{grid-template-columns:1fr!important}
          .s-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
          .mob-hide{display:none!important}
          .header-row{flex-direction:column!important;gap:10px!important}
          .header-btns{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important}
        }
      `}</style>

      {showScan && (
        <Suspense fallback={null}>
          <BarcodeScanner onScan={(code:string)=>{
            setShowScan(false)
            setForm(f=>({...f,sku:code}))
          }} onClose={()=>setShowScan(false)}/>
        </Suspense>
      )}

      <div style={{marginBottom:20}}>
        <h1 style={{...pageTitle}}>المشتريات</h1>
        <p style={{...pageSub}}>فئة <b style={{color:colors.primary}}>مخزون</b> تُضيف المنتج للمخزون تلقائياً</p>
      </div>

      <div className="s-grid ru" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'عدد الفواتير', value:String(history.length),       color:'#1d4ed8', border:'#bfdbfe'},
          {label:'بدون ضريبة',   value:totalNet.toFixed(0)+' ر.س',   color:'#334155', border:'#e2e8f0'},
          {label:'ضريبة 15%',    value:totalVat.toFixed(0)+' ر.س',   color:'#d97706', border:'#fde68a'},
          {label:'الإجمالي',     value:totalSpent.toFixed(0)+' ر.س', color:'#16a34a', border:'#bbf7d0'},
        ].map((s,i)=>(
          <div key={i} style={{background:'white',borderRadius:12,padding:'14px',border:`1.5px solid ${s.border}`,boxShadow:'0 2px 6px rgba(0,0,0,.04)'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase' as const,letterSpacing:'.06em',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="p-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
        <div className="ru" style={{background:'white',borderRadius:13,padding:20,border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <div style={{fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:16}}>تسجيل شراء جديد</div>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>نوع الشراء</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {CATS.map(c=>(
                  <button key={c} type="button" className={'cat-btn'+(form.category===c?' active':'')}
                    onClick={()=>setForm({...form,category:c,name:'',sku:'',unit:'قطعة'})}>
                    <span style={{fontSize:22}}>{CAT_ICONS[c]}</span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
              {form.category==='مخزون'&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'8px 12px',marginTop:8,fontSize:11,color:'#16a34a',fontWeight:600}}>✅ سيتم إضافة هذا الصنف للمخزون تلقائياً</div>}
            </div>

            {form.category==='مخزون' && (
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <button type="button" onClick={()=>setIsExisting(true)}
                  style={{flex:1,padding:'10px',borderRadius:10,border:`2px solid ${isExisting===true?'#2d7a4f':'#e2e8f0'}`,background:isExisting===true?'#f0fdf4':'white',color:isExisting===true?'#2d7a4f':'#64748b',fontWeight:700,cursor:'pointer',fontFamily:'system-ui',fontSize:13}}>
                  📦 صنف موجود
                </button>
                <button type="button" onClick={()=>setIsExisting(false)}
                  style={{flex:1,padding:'10px',borderRadius:10,border:`2px solid ${isExisting===false?'#2d7a4f':'#e2e8f0'}`,background:isExisting===false?'#f0fdf4':'white',color:isExisting===false?'#2d7a4f':'#64748b',fontWeight:700,cursor:'pointer',fontFamily:'system-ui',fontSize:13}}>
                  ➕ صنف جديد
                </button>
              </div>
            )}

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>{form.category==='مخزون'?'اسم الصنف *':'اسم الخدمة / الفاتورة *'}</label>
              {form.category==='مخزون' && isExisting===true ? (
                <select required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{...inp,cursor:'pointer'}}>
                  <option value="">اختر صنف من المخزون...</option>
                  {products.map((p:any)=>(
                    <option key={p.id} value={p.name}>{p.name} — {p.qty} {p.unit}</option>
                  ))}
                </select>
              ) : (
                <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp}
                  placeholder={form.category==='مخزون'?'مثال: قهوة، سكر...':form.category==='مشتريات'?'مثال: مستلزمات مكتبية...':'مثال: إيجار، كهرباء...'}/>
              )}
            </div>
            {form.category==='مخزون'&&(
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>باركود الصنف (اختياري)</label>
                <div style={{display:'flex',gap:6}}>
                  <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} style={{...inp,flex:1}} placeholder="امسح أو أدخل يدوياً"/>
                  <button type="button" onClick={()=>setShowScan(true)} style={{padding:'0 12px',background:'#f0fdf4',color:'#16a34a',border:'1.5px solid #86efac',borderRadius:9,fontSize:16,cursor:'pointer',flexShrink:0}}>📷</button>
                </div>
                {form.sku&&<div style={{fontSize:11,color:'#16a34a',marginTop:4,fontWeight:600}}>✓ {form.sku}</div>}
              </div>
            )}

            {form.category==='مخزون'&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الكمية</label>
                  <input type="number" min="0" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} style={inp} placeholder="0" inputMode="numeric"/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الوحدة</label>
                  <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={inp}>
                    {UNITS.map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الحد الأدنى</label>
                  <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:e.target.value})} style={inp} inputMode="numeric"/>
                </div>
              </div>
            )}

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>المبلغ الإجمالي (ر.س) *</label>
              <input type="number" min="0" step="0.01" required value={form.total_amount}
                onChange={e=>setForm({...form,total_amount:e.target.value})}
                style={{...inp,fontSize:16,fontWeight:700}} placeholder="0.00" inputMode="decimal"/>
              {inputTotal>0&&form.hasVat==='yes'&&(
                <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 12px',marginTop:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                    <span style={{color:'#64748b'}}>بدون ضريبة</span><span style={{fontWeight:700}}>{displayAmount} ر.س</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,paddingBottom:6,borderBottom:'1px solid #e2e8f0',marginBottom:6}}>
                    <span style={{color:'#64748b'}}>ضريبة 15%</span><span style={{fontWeight:700,color:'#d97706'}}>{displayVat} ر.س</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:800}}>
                    <span>الإجمالي</span><span style={{color:'#16a34a'}}>{inputTotal.toFixed(2)} ر.س</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>المورد *</label>
              <input required value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})} style={inp} placeholder="مثال: شركة الأغذية، محل البقالة..."/>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:8}}>هل الفاتورة شاملة ضريبة 15%؟ *</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <button type="button" className="vat-btn" onClick={()=>setForm({...form,hasVat:'no',invoice_image:''})}
                  style={{borderColor:form.hasVat==='no'?'#16a34a':'#e2e8f0',background:form.hasVat==='no'?'#f0fdf4':'white',color:form.hasVat==='no'?'#16a34a':'#64748b'}}>
                  ❌ بدون ضريبة
                </button>
                <button type="button" className="vat-btn" onClick={()=>setForm({...form,hasVat:'yes'})}
                  style={{borderColor:form.hasVat==='yes'?'#d97706':'#e2e8f0',background:form.hasVat==='yes'?'#fffbeb':'white',color:form.hasVat==='yes'?'#d97706':'#64748b'}}>
                  ✅ شاملة 15%
                </button>
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>
                صورة الفاتورة {form.hasVat==='yes'?<span style={{color:'#ef4444'}}>*</span>:'(اختياري)'}
              </label>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}}
                onChange={e=>{if(e.target.files?.[0]) handleImage(e.target.files[0])}}/>
              <button type="button" onClick={()=>fileRef.current?.click()} style={{
                width:'100%',padding:'12px',borderRadius:9,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,
                border:'1.5px dashed '+(previewUrl?'#16a34a':form.hasVat==='yes'&&!previewUrl?'#ef4444':'#cbd5e1'),
                background:previewUrl?'#f0fdf4':form.hasVat==='yes'&&!previewUrl?'#fef2f2':'#f8fafc',
                color:previewUrl?'#16a34a':form.hasVat==='yes'&&!previewUrl?'#ef4444':'#64748b',
              }}>
                {uploading?'⏳ جاري الرفع...':previewUrl?'✅ تم الرفع — اضغط للتغيير':form.hasVat==='yes'?'📎 رفع صورة الفاتورة (مطلوب)':'📎 رفع صورة الفاتورة'}
              </button>
              {previewUrl&&previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)&&(
                <img src={previewUrl} alt="فاتورة" style={{width:'100%',maxHeight:100,objectFit:'cover',borderRadius:8,marginTop:8,border:'1px solid #bbf7d0'}}/>
              )}
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>ملاحظات (اختياري)</label>
              <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})}
                style={{...inp,minHeight:60,resize:'vertical' as const}} placeholder="أي تفاصيل إضافية..."/>
            </div>

            <button type="submit" disabled={loading||uploading} style={{
              width:'100%',padding:'13px',background:(loading||uploading)?'#94a3b8':'#16a34a',
              color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,
              cursor:(loading||uploading)?'not-allowed':'pointer',fontFamily:'inherit',
              boxShadow:(loading||uploading)?'none':'0 4px 14px rgba(22,163,74,.3)',
            }}>
              {loading?'⏳ جاري الحفظ...':'تسجيل الشراء ←'}
            </button>
          </form>
        </div>

        <div className="ru" style={{background:'white',borderRadius:13,border:'1px solid #f1f5f9',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>آخر المشتريات</div>
            <span style={{background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{history.length} فاتورة</span>
          </div>
          <div style={{maxHeight:580,overflowY:'auto'}}>
            {history.length===0?(
              <div style={{padding:'48px 20px',textAlign:'center'}}>
                <div style={{fontSize:40,marginBottom:10}}>🛒</div>
                <div style={{fontSize:14,fontWeight:700,color:'#475569',marginBottom:4}}>لا توجد مشتريات بعد</div>
                <div style={{fontSize:12,color:'#94a3b8'}}>سجّل أول فاتورة</div>
              </div>
            ):history.map((p,i)=>{
              const cc=p.category==='مخزون'?{bg:'#f0fdf4',color:'#16a34a',border:'#bbf7d0'}:p.category==='مشتريات'?{bg:'#eff6ff',color:'#2563eb',border:'#bfdbfe'}:{bg:'#f8fafc',color:'#64748b',border:'#e2e8f0'}
              return (
                <div key={p.id} className="row-hover" style={{padding:'13px 18px',borderBottom:i<history.length-1?'1px solid #f8fafc':'none'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,flexWrap:'wrap' as const}}>
                        <span style={{background:cc.bg,color:cc.color,border:`1px solid ${cc.border}`,padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700}}>
                          {CAT_ICONS[p.category]} {p.category}
                        </span>
                        {p.invoice_image&&(
                          <a href={p.invoice_image} target="_blank" rel="noreferrer"
                            style={{color:'#3b82f6',fontSize:10,fontWeight:600,textDecoration:'none',background:'#eff6ff',padding:'2px 8px',borderRadius:20,border:'1px solid #bfdbfe'}}>
                            📎 فاتورة
                          </a>
                        )}
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:2}}>{p.name}</div>
                      {p.qty&&<div style={{fontSize:11,color:'#94a3b8',marginBottom:1}}>{p.qty} {p.unit}</div>}
                      <div style={{fontSize:11,color:'#94a3b8',display:'flex',gap:8,flexWrap:'wrap' as const}}>
                        {p.supplier&&<span>🏪 {p.supplier}</span>}
                        <span>📅 {new Date(p.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                    <div style={{textAlign:'left' as const,flexShrink:0}}>
                      <div style={{fontSize:16,fontWeight:900,color:'#16a34a'}}>{Number(p.total_amount||0).toFixed(0)}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>ر.س</div>
                      {Number(p.vat_amount||0)>0&&<div style={{fontSize:10,color:'#d97706',marginTop:2}}>+{Number(p.vat_amount||0).toFixed(0)} ض</div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
