'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { cache } from '@/lib/cache'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/toast'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  danger:'#e24b4a',  dangerL:'#fef2f2',  dangerB:'#fecaca',
  warning:'#ba7517', warningL:'#fffbeb', warningB:'#fde68a',
  info:'#378add',    infoL:'#eff6ff',    infoB:'#bfdbfe',
  text:'#1c1c1a', text2:'#3d3d3a', text3:'#5f5e5a', text4:'#888780',
  bg:'#f5f5f4', surface:'#ffffff', border:'#ebebea', border2:'#e0e0dd',
}

const CATS = ['مخزون','مشتريات','أخرى']
const CAT_ICONS: Record<string,string> = {'مخزون':'📦','مشتريات':'🛒','أخرى':'📋'}
const UNITS = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','درزن','رول','غرام','أخرى']

const lbl: React.CSSProperties = {fontSize:10,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'.06em'}
const inp: React.CSSProperties = {width:'100%',padding:'10px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',background:'white',color:C.text,fontFamily:'inherit'}

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
  const [ocrItems, setOcrItems]     = useState<any[]>([])
  const [ocrLoading, setOcrLoading] = useState(false)
  const [filterCat, setFilterCat]       = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [filterSupplier, setFilterSupplier] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  function todayRiyadh() {
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  }
  const [form, setForm] = useState({
    category:'مخزون', name:'', sku:'', qty:'', unit:'قطعة',
    reorder_point:'5', total_amount:'', supplier:'',
    note:'', invoice_image:'', hasVat:'', invoice_date: todayRiyadh(),
  })
  const sb = createClient()

  useEffect(()=>{
    let a=0;const c=setInterval(()=>{a++;const b=sessionStorage.getItem('s_branch_id'),o=sessionStorage.getItem('s_org_id');if((b&&o)||a>20){clearInterval(c);init()}},100);return()=>clearInterval(c)
  },[])
  useVisibilityRefresh(()=>{if(orgId)loadHistory(orgId)},20*60*1000)

  async function init() {
    let oid=sessionStorage.getItem('s_org_id'),uid=sessionStorage.getItem('s_profile_id')
    if(!oid||!uid){
      const{data:{user}}=await sb.auth.getUser();if(!user)return
      const{data:p}=await sb.from('profiles').select('id,org_id').eq('id',user.id).single();if(!p)return
      oid=p.org_id;uid=p.id;sessionStorage.setItem('s_org_id',oid!);sessionStorage.setItem('s_profile_id',uid!)
    }
    setOrgId(oid!);setUserId(uid!)
    loadProducts(oid!);setTimeout(()=>loadHistory(oid!),300)
  }

  async function loadProducts(oid:string) {
    const cached = cache.get('products:'+oid)
    if(cached){ setProducts(cached); }
    const bid=sessionStorage.getItem('s_branch_id')
    let pq=sb.from('products').select('id,name,unit,qty').eq('org_id',oid).eq('is_active',true)
    if(bid) pq=pq.eq('branch_id',bid)
    const{data}=await pq.order('name');setProducts(data||[]);cache.set('products:'+oid,data||[])
  }

  async function loadHistory(oid:string) {
    const cachedH = cache.get('purchases:'+oid)
    if(cachedH){ setHistory(cachedH) }
    const urlBid=new URLSearchParams(window.location.search).get('_b')
    if(urlBid){sessionStorage.setItem('s_branch_id',urlBid);window.history.replaceState({},'',window.location.pathname)}
    const bid=urlBid||sessionStorage.getItem('s_branch_id')
    let q=sb.from('purchases').select('*').eq('org_id',oid).order('created_at',{ascending:false}).limit(50)
    if(bid) q=(q as any).eq('branch_id',bid)
    const{data}=await q;setHistory(data||[]);cache.set('purchases:'+oid,data||[])
  }

  async function compressImage(file:File): Promise<Blob> {
    return new Promise((resolve)=>{
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = ()=>{
        const canvas = document.createElement('canvas')
        const MAX = 1200
        let w = img.width, h = img.height
        if(w>MAX){h=Math.round(h*MAX/w);w=MAX}
        if(h>MAX){w=Math.round(w*MAX/h);h=MAX}
        canvas.width=w; canvas.height=h
        canvas.getContext('2d')!.drawImage(img,0,0,w,h)
        URL.revokeObjectURL(url)
        canvas.toBlob(b=>resolve(b!), 'image/jpeg', 0.75)
      }
      img.src = url
    })
  }

  async function handleImage(file:File) {
    setUploading(true)
    try {
      // ضغط الصورة لو كانت أكبر من 500KB
      const compressed = file.type.startsWith('image/') && file.size > 500*1024
        ? await compressImage(file)
        : file
      const ext = file.type.startsWith('image/') ? 'jpg' : file.name.split('.').pop()
      const path = 'invoice-'+Date.now()+'.'+ext
      const{error}=await sb.storage.from('invoices').upload(path, compressed)
      if(error){toast('فشل رفع الصورة','error');setUploading(false);return}
      const{data:{publicUrl}}=sb.storage.from('invoices').getPublicUrl(path)
      setForm(f=>({...f,invoice_image:publicUrl}));setPreviewUrl(publicUrl)
      toast('تم رفع الفاتورة ✓')

      // محاولة استخراج بيانات الفاتورة تلقائياً بالذكاء الاصطناعي
      if (file.type.startsWith('image/')) {
        setOcrLoading(true)
        try {
          const base64 = await fileToBase64(compressed as File)
          const ocrToken = localStorage.getItem('staff_token')
          const ocrRes = await fetch('/api/ocr-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(ocrToken ? {'Authorization':`Bearer ${ocrToken}`} : {}) },
            body: JSON.stringify({ image: base64, mediaType: 'image/jpeg', org_id: orgId }),
          })
          const ocrData = await ocrRes.json()
          if (ocrRes.ok && ocrData.success) {
            const d = ocrData.data
            setForm(f => ({
              ...f,
              supplier: d.supplier || f.supplier,
              total_amount: d.total_amount ? String(d.total_amount) : f.total_amount,
              invoice_date: d.invoice_date || f.invoice_date,
              hasVat: d.has_vat ? 'yes' : f.hasVat,
              name: d.items?.length === 1 ? d.items[0].name : f.name,
              qty: d.items?.length === 1 && d.items[0].qty ? String(d.items[0].qty) : f.qty,
              unit: d.items?.length === 1 && d.items[0].unit ? d.items[0].unit : f.unit,
            }))
            if (d.items?.length > 1) setOcrItems(d.items)
            toast('✨ تم استخراج بيانات الفاتورة تلقائياً')
          }
        } catch {}
        setOcrLoading(false)
      }
    } catch { toast('فشل رفع الصورة','error') }
    setUploading(false)
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function pickOcrItem(item: any) {
    setForm(f => ({ ...f, name: item.name || f.name, qty: item.qty ? String(item.qty) : f.qty, unit: item.unit || f.unit }))
  }

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault()
    if(!form.total_amount||!orgId)return
    if(submitting.current)return
    submitting.current=true
    if(!form.hasVat){toast('حدد هل الفاتورة تشمل الضريبة','warning');submitting.current=false;return}
    if(form.hasVat==='yes'&&!form.invoice_image){toast('يرجى رفع صورة الفاتورة','warning');submitting.current=false;return}
    if(!form.supplier.trim()){toast('يرجى إدخال اسم المورد','warning');submitting.current=false;return}
    setLoading(true)
    const inputTotal=Number(form.total_amount)
    const amount=parseFloat((inputTotal/1.15).toFixed(2))
    const invoiceTs = `${form.invoice_date}T12:00:00+03:00`
    const{error:insErr}=await (sb.from('purchases') as any).insert({
      org_id:orgId,profile_id:userId,branch_id:sessionStorage.getItem('s_branch_id')||null,
      category:form.category,name:form.name,qty:form.qty?Number(form.qty):null,
      unit:form.unit||null,reorder_point:Number(form.reorder_point)||5,
      amount,supplier:form.supplier,note:form.note||null,invoice_image:form.invoice_image||null,
      created_at:invoiceTs,
    })
    if(insErr){toast('خطأ: '+insErr.message,'error');setLoading(false);submitting.current=false;return}
    if(form.category==='مخزون'&&form.name){
      const qty=form.qty?Number(form.qty):0
      const unitCost = qty>0 ? (amount||0)/qty : 0
      let existing:any=null
      const{data:byNameArr}=await (sb.from('products') as any).select('id,qty,sku,avg_cost').eq('org_id',orgId).eq('name',form.name).order('created_at',{ascending:false}).limit(1)
      if(byNameArr&&byNameArr.length>0){existing=byNameArr[0]}
      else if(form.sku){
        const{data:bySkuArr}=await (sb.from('products') as any).select('id,qty,sku,name,avg_cost').eq('org_id',orgId).eq('sku',form.sku).order('created_at',{ascending:false}).limit(1)
        if(bySkuArr&&bySkuArr.length>0) existing=bySkuArr[0]
      }
      if(existing){
        if(form.sku&&!existing.sku) await sb.from('products').update({sku:form.sku}).eq('id',existing.id)
        if(qty>0) await (sb.from('stock_movements') as any).insert({product_id:existing.id,profile_id:userId,type:'in',qty_change:qty,note:`شراء من: ${form.supplier}`,created_at:invoiceTs})
        const oldQty=Number(existing.qty)||0
        const oldAvgCost=Number(existing.avg_cost)||0
        const newAvgCost=(oldQty+qty)>0?((oldQty*oldAvgCost)+(qty*unitCost))/(oldQty+qty):0
        await (sb.from('products') as any).update({avg_cost:newAvgCost}).eq('id',existing.id)
        toast(`✅ تم تحديث المخزون (+${qty})`,'success')
      } else {
        const branchId=sessionStorage.getItem('s_branch_id')||
          (await sb.from('branches').select('id').eq('org_id',orgId).eq('is_active',true).order('created_at').limit(1).single()).data?.id||null
        const{data:np}=await (sb.from('products') as any).insert({org_id:orgId,branch_id:branchId,name:form.name.trim(),sku:form.sku||null,unit:form.unit||'قطعة',qty:0,reorder_point:Number(form.reorder_point)||5,is_active:true,avg_cost:unitCost}).select().single()
        if(np) {
          if(qty>0) await (sb.from('stock_movements') as any).insert({product_id:np.id,profile_id:userId,type:'in',qty_change:qty,note:`شراء جديد من: ${form.supplier}`,created_at:invoiceTs})
          fetch('/api/sync-product-to-staff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,product_id:np.id})}).catch(()=>{})
        }
        toast(`✅ تم إضافة "${form.name}" للمخزون`)
      }
    } else { toast('✅ تم تسجيل الشراء') }
    setForm({category:'مخزون',name:'',sku:'',qty:'',unit:'قطعة',reorder_point:'5',total_amount:'',supplier:'',note:'',invoice_image:'',hasVat:'',invoice_date:todayRiyadh()})
    setPreviewUrl(null);setLoading(false);submitting.current=false
    cache.invalidate('purchases:');cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:')
    loadHistory(orgId)
  }

  const inputTotal=Number(form.total_amount)||0
  const displayAmount=form.hasVat==='yes'&&inputTotal>0?(inputTotal/1.15).toFixed(2):inputTotal.toFixed(2)
  const displayVat=form.hasVat==='yes'&&inputTotal>0?(inputTotal-Number(displayAmount)).toFixed(2):'0.00'

  const filteredHistory=history.filter(p=>{
    if(filterCat!=='all'&&p.category!==filterCat)return false
    if(filterSupplier&&!p.supplier?.includes(filterSupplier))return false
    if(filterPeriod!=='all'){
      const d=new Date(p.created_at),now=new Date()
      if(filterPeriod==='today')return d.toDateString()===now.toDateString()
      if(filterPeriod==='week')return(now.getTime()-d.getTime())<=7*24*60*60*1000
      if(filterPeriod==='month')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()
    }
    return true
  })

  const totalSpent=filteredHistory.reduce((s,p)=>s+Number(p.total_amount||0),0)
  const totalVat=filteredHistory.reduce((s,p)=>s+Number(p.vat_amount||0),0)
  const totalNet=filteredHistory.reduce((s,p)=>s+Number(p.amount||0),0)

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <style>{`
        @keyframes up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .u{animation:up .3s ease both}
        input:focus,select:focus,textarea:focus{border-color:${C.primary}!important;outline:none!important;box-shadow:0 0 0 3px ${C.primaryL}!important}
        .rh:hover{background:#f9f9f8}
        .tap{transition:all .12s;cursor:pointer}
        .tap:active{transform:scale(.97)}
        @media(max-width:768px){.pgrid{grid-template-columns:1fr!important}}
      `}</style>

      {showScan&&<Suspense fallback={null}><BarcodeScanner onScan={(code:string)=>{setShowScan(false);setForm(f=>({...f,sku:code}))}} onClose={()=>setShowScan(false)}/></Suspense>}

      {/* Header */}
      <div className="u" style={{marginBottom:16}}>
        <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:0,letterSpacing:'-0.3px'}}>المشتريات</h1>
        <p style={{fontSize:11,color:C.text4,margin:'3px 0 0'}}>فئة <b style={{color:C.primary}}>مخزون</b> تُضيف المنتج للمخزون تلقائياً</p>
      </div>

      {/* Stats */}
      <div className="u" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16,animationDelay:'.04s'}}>
        {[
          {label:'الفواتير',   value:filteredHistory.length,       color:C.info},
          {label:'بدون ضريبة',value:totalNet.toFixed(0)+' ر.س',   color:C.text},
          {label:'ضريبة 15%', value:totalVat.toFixed(0)+' ر.س',   color:C.warning},
          {label:'الإجمالي',  value:totalSpent.toFixed(0)+' ر.س', color:C.primary},
        ].map((s,i)=>(
          <div key={i} style={{background:'white',borderRadius:10,padding:'12px 14px',border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,color:C.text4,fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'.05em'}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="pgrid" style={{display:'grid',gridTemplateColumns:'1fr 1.1fr',gap:14,alignItems:'start'}}>

        {/* Form */}
        <div className="u" style={{background:'white',borderRadius:12,padding:18,border:`1px solid ${C.border}`,animationDelay:'.06s'}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14}}>تسجيل شراء جديد</div>
          <form onSubmit={handleSubmit}>

            {/* Category */}
            <div style={{marginBottom:12}}>
              <label style={lbl}>نوع الشراء</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                {CATS.map(c=>(
                  <button key={c} type="button" onClick={()=>setForm({...form,category:c,name:'',sku:'',unit:'قطعة'})}
                    style={{padding:'10px 6px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${form.category===c?C.primary:C.border2}`,background:form.category===c?C.primaryL:'white',color:form.category===c?C.primary:C.text3,fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:4,transition:'all .15s'}}>
                    <span style={{fontSize:18}}>{CAT_ICONS[c]}</span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
              {form.category==='مخزون'&&<div style={{background:C.primaryL,border:`1px solid ${C.primaryB}`,borderRadius:7,padding:'7px 10px',marginTop:8,fontSize:11,color:C.primary,fontWeight:600}}>سيتم إضافة الصنف للمخزون تلقائياً</div>}
            </div>

            {/* Existing/New toggle */}
            {form.category==='مخزون'&&(
              <div style={{display:'flex',gap:6,marginBottom:12}}>
                {[{v:true,l:'📦 صنف موجود'},{v:false,l:'➕ صنف جديد'}].map(b=>(
                  <button key={String(b.v)} type="button" onClick={()=>setIsExisting(b.v)}
                    style={{flex:1,padding:'9px',borderRadius:8,border:`1.5px solid ${isExisting===b.v?C.primary:C.border2}`,background:isExisting===b.v?C.primaryL:'white',color:isExisting===b.v?C.primary:C.text3,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:12,transition:'all .15s'}}>
                    {b.l}
                  </button>
                ))}
              </div>
            )}

            {/* Name */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>{form.category==='مخزون'?'اسم الصنف':'اسم الفاتورة'} *</label>
              {form.category==='مخزون'&&isExisting===true?(
                <div style={{position:'relative'}}>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{...inp,marginBottom:4}} placeholder="ابحث عن صنف..."/>
                  {form.name===''||products.filter((p:any)=>p.name.includes(form.name)&&form.name!==p.name).length>0?(
                    <div style={{position:'absolute',top:'100%',right:0,left:0,background:'white',border:`1px solid ${C.border2}`,borderRadius:8,zIndex:50,maxHeight:200,overflowY:'auto',boxShadow:'0 4px 12px rgba(0,0,0,.1)'}}>
                      {products.filter((p:any)=>!form.name||p.name.includes(form.name)).slice(0,10).map((p:any)=>(
                        <div key={p.id} onClick={()=>setForm({...form,name:p.name,unit:p.unit})}
                          style={{padding:'9px 12px',cursor:'pointer',fontSize:12,color:C.text,borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=C.bg}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='white'}>
                          <span style={{fontWeight:600}}>{p.name}</span>
                          <span style={{color:C.text4,fontSize:11}}>{p.qty} {p.unit}</span>
                        </div>
                      ))}
                    </div>
                  ):null}
                </div>
              ):(
                <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp}
                  placeholder={form.category==='مخزون'?'قهوة، سكر...':form.category==='مشتريات'?'مستلزمات مكتبية...':'إيجار، كهرباء...'}/>
              )}
            </div>

            {/* Barcode + qty */}
            {form.category==='مخزون'&&(
              <>
                <div style={{marginBottom:10}}>
                  <label style={lbl}>باركود (اختياري)</label>
                  <div style={{display:'flex',gap:5}}>
                    <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} style={{...inp,flex:1}} placeholder="امسح أو أدخل يدوياً"/>
                    <button type="button" onClick={()=>setShowScan(true)} style={{padding:'0 10px',background:C.primaryL,color:C.primary,border:`1px solid ${C.primaryB}`,borderRadius:8,fontSize:14,cursor:'pointer'}}>📷</button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                  <div>
                    <label style={lbl}>الكمية</label>
                    <input type="number" min="0" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} style={inp} placeholder="0" inputMode="numeric"/>
                  </div>
                  <div>
                    <label style={lbl}>الوحدة</label>
                    <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={inp}>
                      {UNITS.map(u=><option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>الحد الأدنى</label>
                    <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:e.target.value})} style={inp} inputMode="numeric"/>
                  </div>
                </div>
              </>
            )}

            {/* Amount */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>المبلغ الإجمالي (ر.س) *</label>
              <input type="number" min="0" step="0.01" required value={form.total_amount}
                onChange={e=>setForm({...form,total_amount:e.target.value})}
                style={{...inp,fontSize:16,fontWeight:700}} placeholder="0.00" inputMode="decimal"/>
              {inputTotal>0&&form.hasVat==='yes'&&(
                <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:'9px 12px',marginTop:6}}>
                  {[['بدون ضريبة',displayAmount+' ر.س',C.text],['ضريبة 15%',displayVat+' ر.س',C.warning],['الإجمالي',inputTotal.toFixed(2)+' ر.س',C.primary]].map(([k,v,c],i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:i<2?4:0,paddingTop:i===2?6:0,borderTop:i===2?`1px solid ${C.border}`:undefined}}>
                      <span style={{color:C.text3}}>{k}</span><span style={{fontWeight:700,color:String(c)}}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Supplier */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>المورد *</label>
              <input required value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})} style={inp} placeholder="اسم المورد أو الشركة"/>
            </div>

            {/* Invoice Date */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>تاريخ الفاتورة</label>
              <input type="date" value={form.invoice_date} onChange={e=>setForm({...form,invoice_date:e.target.value})} style={inp}/>
            </div>

            {/* VAT */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>الفاتورة شاملة ضريبة 15%؟ *</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[{v:'no',l:'بدون ضريبة',c:C.primary},{v:'yes',l:'شاملة 15%',c:C.warning}].map(b=>(
                  <button key={b.v} type="button" onClick={()=>setForm({...form,hasVat:b.v,invoice_image:b.v==='no'?'':form.invoice_image})}
                    style={{padding:'10px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${form.hasVat===b.v?b.c:C.border2}`,background:form.hasVat===b.v?b.v==='no'?C.primaryL:C.warningL:'white',color:form.hasVat===b.v?b.c:C.text3,fontFamily:'inherit',transition:'all .15s'}}>
                    {b.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoice image */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>صورة الفاتورة {form.hasVat==='yes'?<span style={{color:C.danger}}>*</span>:'(اختياري)'}</label>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])handleImage(e.target.files[0])}}/>
              <button type="button" onClick={()=>fileRef.current?.click()} style={{
                width:'100%',padding:'10px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,
                border:`1.5px dashed ${previewUrl?C.primary:form.hasVat==='yes'&&!previewUrl?C.danger:C.border2}`,
                background:previewUrl?C.primaryL:form.hasVat==='yes'&&!previewUrl?C.dangerL:C.bg,
                color:previewUrl?C.primary:form.hasVat==='yes'&&!previewUrl?C.danger:C.text3,
              }}>
                {uploading?'⏳ جاري الرفع...':previewUrl?'✅ تم الرفع — اضغط للتغيير':form.hasVat==='yes'?'📎 رفع صورة الفاتورة (مطلوب)':'📎 رفع صورة الفاتورة'}
              </button>
              {previewUrl&&previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)&&(
                <img src={previewUrl} alt="فاتورة" style={{width:'100%',maxHeight:80,objectFit:'cover',borderRadius:7,marginTop:6,border:`1px solid ${C.primaryB}`}}/>
              )}
              {ocrLoading&&(
                <div style={{fontSize:11,color:C.text3,marginTop:6,display:'flex',alignItems:'center',gap:6}}>
                  <span>✨</span><span>جاري استخراج بيانات الفاتورة...</span>
                </div>
              )}
              {ocrItems.length>0&&(
                <div style={{marginTop:8,padding:10,background:C.infoL,borderRadius:8,border:`1px solid ${C.infoB}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.info,marginBottom:6}}>📋 أصناف مكتشفة بالفاتورة — اختر واحد لتعبئة الفورم</div>
                  <div style={{display:'flex',flexWrap:'wrap' as const,gap:6}}>
                    {ocrItems.map((item,i)=>(
                      <button key={i} type="button" onClick={()=>pickOcrItem(item)}
                        style={{padding:'6px 10px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',border:`1px solid ${C.infoB}`,background:'white',color:C.info,fontFamily:'inherit'}}>
                        {item.name}{item.qty?` (${item.qty} ${item.unit||''})`:''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div style={{marginBottom:14}}>
              <label style={lbl}>ملاحظات (اختياري)</label>
              <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})}
                style={{...inp,minHeight:52,resize:'vertical'}} placeholder="أي تفاصيل إضافية..."/>
            </div>

            <button type="submit" disabled={loading||uploading} style={{
              width:'100%',padding:'12px',background:loading||uploading?C.text4:C.primary,
              color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,
              cursor:loading||uploading?'not-allowed':'pointer',fontFamily:'inherit',
              opacity:loading||uploading?.7:1,transition:'all .15s',
            }}>
              {loading?'جاري الحفظ...':'تسجيل الشراء'}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="u" style={{background:'white',borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden',animationDelay:'.08s'}}>
          {/* Filters */}
          <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:700,color:C.text}}>آخر المشتريات</span>
              <span style={{fontSize:10,fontWeight:600,color:C.primary,background:C.primaryL,padding:'2px 8px',borderRadius:99,border:`1px solid ${C.primaryB}`}}>{filteredHistory.length} فاتورة</span>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {/* Period */}
              <div style={{display:'flex',gap:3,background:C.bg,borderRadius:7,padding:3,border:`1px solid ${C.border}`}}>
                {[{v:'all',l:'الكل'},{v:'today',l:'اليوم'},{v:'week',l:'أسبوع'},{v:'month',l:'شهر'}].map(p=>(
                  <button key={p.v} onClick={()=>setFilterPeriod(p.v)}
                    style={{padding:'4px 9px',borderRadius:5,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:filterPeriod===p.v?C.primary:'transparent',color:filterPeriod===p.v?'white':C.text3,transition:'all .15s'}}>
                    {p.l}
                  </button>
                ))}
              </div>
              {/* Type */}
              <div style={{display:'flex',gap:3,background:C.bg,borderRadius:7,padding:3,border:`1px solid ${C.border}`}}>
                {[{v:'all',l:'الكل'},{v:'مخزون',l:'📦'},{v:'مشتريات',l:'🛒'},{v:'أخرى',l:'📋'}].map(c=>(
                  <button key={c.v} onClick={()=>setFilterCat(c.v)}
                    style={{padding:'4px 9px',borderRadius:5,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:filterCat===c.v?C.primary:'transparent',color:filterCat===c.v?'white':C.text3,transition:'all .15s'}}>
                    {c.l}
                  </button>
                ))}
              </div>
              {/* Supplier search */}
              <input value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)} placeholder="بحث بالمورد..."
                style={{flex:1,minWidth:80,padding:'5px 10px',border:`1px solid ${C.border2}`,borderRadius:7,fontSize:11,fontFamily:'inherit',outline:'none',background:'white',color:C.text}}/>
            </div>
          </div>

          {/* List */}
          <div style={{maxHeight:600,overflowY:'auto'}}>
            {filteredHistory.length===0?(
              <div style={{padding:'48px 20px',textAlign:'center'}}>
                <div style={{fontSize:36,marginBottom:8}}>🛒</div>
                <div style={{fontSize:13,fontWeight:600,color:C.text2,marginBottom:4}}>لا توجد مشتريات</div>
                <div style={{fontSize:11,color:C.text4}}>سجّل أول فاتورة من النموذج</div>
              </div>
            ):filteredHistory.map((p,i)=>{
              const cc=p.category==='مخزون'?{bg:C.primaryL,color:C.primary,border:C.primaryB}:p.category==='مشتريات'?{bg:C.infoL,color:C.info,border:C.infoB}:{bg:C.bg,color:C.text3,border:C.border2}
              return(
                <div key={p.id} className="rh" style={{padding:'12px 14px',borderBottom:i<filteredHistory.length-1?`1px solid ${C.border}`:'none'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:5,flexWrap:'wrap'}}>
                        <span style={{background:cc.bg,color:cc.color,border:`1px solid ${cc.border}`,padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:600}}>
                          {CAT_ICONS[p.category]} {p.category}
                        </span>
                        {p.invoice_image&&(
                          <a href={p.invoice_image} target="_blank" rel="noreferrer"
                            style={{color:C.info,fontSize:10,fontWeight:600,textDecoration:'none',background:C.infoL,padding:'2px 8px',borderRadius:99,border:`1px solid ${C.infoB}`}}>
                            📎 فاتورة
                          </a>
                        )}
                      </div>
                      <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{p.name}</div>
                      {p.qty&&<div style={{fontSize:11,color:C.text4,marginBottom:1}}>{p.qty} {p.unit}</div>}
                      <div style={{fontSize:10,color:C.text4,display:'flex',gap:8,flexWrap:'wrap'}}>
                        {p.supplier&&<span>🏪 {p.supplier}</span>}
                        <span>{new Date(p.created_at).toLocaleDateString('ar-SA',{day:'numeric',month:'short'})}</span>
                      </div>
                    </div>
                    <div style={{textAlign:'left',flexShrink:0}}>
                      <div style={{fontSize:15,fontWeight:700,color:C.primary,fontVariantNumeric:'tabular-nums'}}>{Number(p.total_amount||0).toFixed(0)}</div>
                      <div style={{fontSize:10,color:C.text4}}>ر.س</div>
                      {Number(p.vat_amount||0)>0&&<div style={{fontSize:10,color:C.warning,marginTop:1}}>+{Number(p.vat_amount||0).toFixed(0)} ض</div>}
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
