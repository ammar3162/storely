'use client'
import StaffHeader, { staffHeaderBtn } from '@/components/StaffHeader'
import TaxInvoiceFields, { type ZatcaState } from '@/components/TaxInvoiceFields'
import { zatcaFromImage, shrinkImage, blobToBase64 } from '@/lib/zatcaScan'
import { zatcaDate } from '@/lib/zatcaQr'
import { normalizeVat, isValidVat } from '@/lib/taxInvoice'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { currencySymbol } from '@/lib/currencySymbol'
import { useRouter } from 'next/navigation'
import { getStaffOrg } from '@/lib/session'

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
  permissions: {dispense:boolean,inventory:boolean,purchases:boolean,reports:boolean}
}

const C = {
  primary:'#029FA2', primaryD:'#0f766e', primaryL:'#f0fdfa', primaryB:'#99f6e4',
  danger:'#e24b4a', dangerL:'#fef2f2',
  warning:'#ba7517', warningL:'#fffbeb',
  text:'#1c1c1a', text2:'#3d3d3a', text3:'#5f5e5a', text4:'#888780',
  bg:'#f5f5f4', surface:'#ffffff', border:'#ebebea', border2:'#e0e0dd',
}

const inp: React.CSSProperties = {width:'100%',padding:'10px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box' as const,background:'white',color:C.text,fontFamily:'inherit'}
const lbl: React.CSSProperties = {fontSize:10,fontWeight:700,color:C.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.06em'}

const UNITS_AR = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','درزن','رول','غرام','أخرى']
const UNITS_EN = ['Piece','Kg','Bag','Carton','Liter','Can','Packet','Dozen','Roll','Gram','Other']

const PUI: Record<string,Record<'ar'|'en',string>> = {
  title:            {ar:'تسجيل مشتريات',en:'Record Purchase'},
  purchaseType:     {ar:'نوع الشراء',en:'Purchase Type'},
  catInventory:     {ar:'مخزون',en:'Inventory'},
  catPurchases:     {ar:'مشتريات',en:'Purchases'},
  catOther:         {ar:'أخرى',en:'Other'},
  itemName:         {ar:'اسم الصنف *',en:'Item Name *'},
  itemNamePh:       {ar:'مثال: دقيق',en:'e.g. Flour'},
  quantity:         {ar:'الكمية',en:'Quantity'},
  unit:             {ar:'الوحدة',en:'Unit'},
  supplier:         {ar:'المورد *',en:'Supplier *'},
  supplierPh:       {ar:'اسم المورد',en:'Supplier name'},
  vatQuestion:      {ar:'هل الفاتورة تشمل ضريبة 15%؟',en:'Does the invoice include 15% VAT?'},
  vatYes:           {ar:'نعم — شاملة',en:'Yes — included'},
  vatNo:            {ar:'لا — بدون ضريبة',en:'No — VAT excluded'},
  totalAmount:      {ar:'المبلغ الإجمالي',en:'Total Amount'},
  withoutVat:       {ar:'بدون ضريبة',en:'Without VAT'},
  vat15:            {ar:'ضريبة 15%',en:'15% VAT'},
  invoiceImage:     {ar:'صورة الفاتورة *',en:'Invoice Photo *'},
  uploading:        {ar:'⏳ جاري الرفع...',en:'⏳ Uploading...'},
  clickToUpload:    {ar:'📸 اضغط لرفع الفاتورة',en:'📸 Tap to upload invoice'},
  note:             {ar:'ملاحظة (اختياري)',en:'Note (optional)'},
  notePh:           {ar:'أي تفاصيل إضافية...',en:'Any additional details...'},
  submitting:       {ar:'⏳ جاري التسجيل...',en:'⏳ Submitting...'},
  submitBtn:        {ar:'✅ تسجيل الشراء',en:'✅ Record Purchase'},
  imgFailed:        {ar:'فشل رفع الصورة',en:'Failed to upload image'},
  imgUploaded:      {ar:'تم رفع الفاتورة ✓',en:'Invoice uploaded ✓'},
  selectVat:        {ar:'حدد هل الفاتورة تشمل الضريبة',en:'Please specify if the invoice includes VAT'},
  invoiceRequired:  {ar:'يرجى رفع صورة الفاتورة',en:'Please upload the invoice photo'},
  supplierRequired: {ar:'يرجى إدخال اسم المورد',en:'Please enter the supplier name'},
  vatInvalid:       {ar:'الرقم الضريبي للمورد غير صحيح — ١٥ رقم يبدأ وينتهي بـ 3',en:'Supplier VAT number is invalid — 15 digits, starts and ends with 3'},
  inventoryUpdated: {ar:'✅ تم تحديث المخزون',en:'✅ Inventory updated'},
  purchaseRecorded: {ar:'✅ تم تسجيل الشراء',en:'✅ Purchase recorded'},
  errorPrefix:      {ar:'خطأ: ',en:'Error: '},
  snapTitle:        {ar:'صوّر الفاتورة — ونعبّي البيانات عنك',en:'Snap the invoice — we fill it in for you'},
  camera:           {ar:'📷 الكاميرا',en:'📷 Camera'},
  gallery:          {ar:'🖼️ من الصور',en:'🖼️ From photos'},
  reading:          {ar:'⏳ جاري قراءة الفاتورة...',en:'⏳ Reading the invoice...'},
  readOk:           {ar:'✅ قرأنا الفاتورة — راجع البيانات قبل الحفظ',en:'✅ Invoice read — please review before saving'},
  readQr:           {ar:'✅ قرأنا الفاتورة وباركود الهيئة — البيانات موثقة',en:'✅ Invoice and ZATCA QR read — data verified'},
  readFail:         {ar:'ما قدرنا نقرأ الفاتورة — عبّي البيانات يدوي',en:"Couldn't read the invoice — please fill it in manually"},
  changePhoto:      {ar:'تغيير الصورة',en:'Change photo'},
  itemsFound:       {ar:'بالفاتورة — حدد اللي تبي تسجله واكتب سعره',en:'on the invoice — pick and price them'},
  itemPrice:        {ar:'السعر',en:'Price'},
  saveItems:        {ar:'حفظ الأصناف المحددة',en:'Save selected items'},
  itemsSaved:       {ar:'✅ تم تسجيل الأصناف',en:'✅ Items recorded'},
  needSupplier:     {ar:'اكتب اسم المورد أول',en:'Enter the supplier first'},
  pickPrice:        {ar:'حدد صنف واكتب سعره',en:'Pick an item and enter its price'},
}
const pt = (key: string, lang: 'ar'|'en') => PUI[key]?.[lang] || PUI[key]?.ar || key
const itemsCount = (n: number, lang: 'ar'|'en') => lang === 'en' ? `${n} items` : n === 2 ? 'صنفين' : n <= 10 ? `${n} أصناف` : `${n} صنف`

export default function StaffPurchasesPage() {
  const [lang, setPageLang] = useState<'ar'|'en'>('ar')
  const [session, setSession] = useState<StaffSession|null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string|null>(null)
  const [toast, setToast] = useState('')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [vatFromSupplier, setVatFromSupplier] = useState(false)
  const [zatca, setZatcaState] = useState<ZatcaState>(null)
  // القراءة الذكية للفاتورة
  const [readState, setReadState] = useState<'' | 'reading' | 'ok' | 'qr' | 'fail'>('')
  const [ocrItems, setOcrItems] = useState<{ name: string; qty?: number; unit?: string }[]>([])
  const [ocrSel, setOcrSel] = useState<Record<number, boolean>>({})
  const [ocrPrice, setOcrPrice] = useState<Record<number, string>>({})
  const [bulkSaving, setBulkSaving] = useState(false)
  function setZatca(z:ZatcaState){
    setZatcaState(z)
    if(!z) return
    setForm(f=>({...f, hasVat:'yes', supplier: f.supplier || z.inv.sellerName, supplier_vat_number: z.inv.vatNumber, total_amount: f.total_amount || String(z.inv.total)}))
  }
  const [form, setForm] = useState({
    category:'مخزون', name:'', sku:'', qty:'', unit:'قطعة',
    reorder_point:'5', total_amount:'', supplier:'', note:'',
    invoice_image:'', hasVat:'', invoice_number:'', supplier_vat_number:''
  })
  const submitting = useRef(false)
  const [curr, setCurr] = useState('ر.س')
  const router = useRouter()

  useEffect(()=>{
    const savedLang = localStorage.getItem('staff_lang')
    if(savedLang==='en') setPageLang('en')
    const saved = localStorage.getItem('staff_session')
    if (!saved) { router.push('/staff'); return }
    const s = JSON.parse(saved) as StaffSession
    if (!s.permissions?.purchases) { router.push('/staff/dispense'); return }
    setSession(s)
    loadSuppliers(s.org_id)
    getStaffOrg().then(org=>{ if(org?.currency) setCurr(currencySymbol(org.currency)) })
  },[])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(()=>setToast(''),3000)
  }

  async function loadSuppliers(orgId: string) {
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-suppliers',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({})})
      const j = await res.json()
      if(j.success) setSuppliers(j.suppliers||[])
    } catch {}
  }

  // الصورة (كاميرا أو من الصور): رفع + باركود الهيئة + قراءة ذكية — بالتوازي
  async function handleImage(file: File) {
    setUploading(true); setReadState('reading'); setOcrItems([]); setOcrSel({}); setOcrPrice({})
    setPreviewUrl(URL.createObjectURL(file))
    const staffToken = localStorage.getItem('staff_token')
    const small = await shrinkImage(file)
    const upload = (async () => {
      const fd = new FormData()
      fd.append('file', new File([small], 'invoice.jpg', { type: small.type || 'image/jpeg' }))
      const res = await fetch('/api/staff-upload-invoice', { method: 'POST', headers: { 'Authorization': `Bearer ${staffToken}` }, body: fd })
      const j = await res.json().catch(() => ({}))
      return res.ok && j.success ? j.url as string : null
    })().catch(() => null)
    const ocr = (async () => {
      const res = await fetch('/api/ocr-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
        body: JSON.stringify({ image: await blobToBase64(small), mediaType: 'image/jpeg', org_id: session?.org_id }) })
      const j = await res.json().catch(() => ({}))
      return res.ok && j.success ? j.data : null
    })().catch(() => null)
    const [z, url, d] = await Promise.all([zatcaFromImage(file), upload, ocr])

    if (url) setForm(f => ({ ...f, invoice_image: url }))
    else showToast(pt('imgFailed', lang))
    if (d) {
      const items = Array.isArray(d.items) ? d.items.filter((x: any) => x?.name) : []
      setForm(f => ({ ...f,
        supplier: f.supplier || d.supplier || '', total_amount: f.total_amount || (d.total_amount ? String(d.total_amount) : ''),
        hasVat: d.has_vat ? 'yes' : (f.hasVat || (d.has_vat === false ? 'no' : '')),
        invoice_number: f.invoice_number || d.invoice_number || '', supplier_vat_number: f.supplier_vat_number || d.supplier_vat_number || '',
        ...(items.length === 1 ? { name: f.name || items[0].name, qty: f.qty || (items[0].qty ? String(items[0].qty) : ''), unit: items[0].unit || f.unit } : {}) }))
      if (items.length > 1) { setOcrItems(items); setOcrSel(Object.fromEntries(items.map((_: any, i: number) => [i, true]))) }
    }
    if (z) setZatca(z)   // الباركود أدق — يغطي على القراءة الذكية بالمورد والمبلغ والرقم الضريبي
    setReadState(z ? 'qr' : d ? 'ok' : 'fail')
    setUploading(false)
  }

  async function saveItems() {
    if (!session || bulkSaving) return
    if (!form.supplier.trim()) { showToast(pt('needSupplier', lang)); return }
    const picked = ocrItems.map((it, i) => ({ ...it, total: Number(ocrPrice[i]) || 0, i })).filter(it => ocrSel[it.i] && it.total > 0)
    if (!picked.length) { showToast(pt('pickPrice', lang)); return }
    setBulkSaving(true)
    const res = await fetch('/api/staff-purchase/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('staff_token')}` },
      body: JSON.stringify({ supplier: form.supplier, has_vat: form.hasVat !== 'no', invoice_image: form.invoice_image || null,
        invoice_number: form.invoice_number || null, supplier_vat_number: form.supplier_vat_number || null, zatca_qr: zatca?.raw || null,
        items: picked.map(it => ({ name: it.name, qty: it.qty || 0, unit: it.unit || 'قطعة', total: it.total })) }) })
    const j = await res.json().catch(() => ({}))
    setBulkSaving(false)
    if (!res.ok || !j.success) { showToast(pt('errorPrefix', lang) + (j.error || '')); return }
    showToast(`${pt('itemsSaved', lang)} (${j.saved})`)
    setTimeout(() => router.push('/staff/dispense'), 1800)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if(!form.total_amount||!session)return
    if(submitting.current)return
    submitting.current=true
    if(!form.hasVat){showToast(pt('selectVat',lang));submitting.current=false;return}
    if(form.hasVat==='yes'&&!form.invoice_image){showToast(pt('invoiceRequired',lang));submitting.current=false;return}
    if(form.hasVat==='yes'&&form.supplier_vat_number.trim()&&!isValidVat(normalizeVat(form.supplier_vat_number))){showToast(pt('vatInvalid',lang));submitting.current=false;return}
    if(!form.supplier.trim()){showToast(pt('supplierRequired',lang));submitting.current=false;return}
    setLoading(true)
    const total_amount = Number(form.total_amount).toFixed(2)

    const staffToken = localStorage.getItem('staff_token')
    const res = await fetch('/api/staff-purchase', {
      method: 'POST',
      headers: {'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},
      body: JSON.stringify({
        org_id:session.org_id, branch_id:session.branch_id,
        category:form.category, name:form.name,
        qty:form.qty?Number(form.qty):null,
        unit:form.unit||null, reorder_point:Number(form.reorder_point)||5,
        total_amount, has_vat: form.hasVat==='yes',
        supplier:form.supplier,
        note:form.note||null,
        invoice_image:form.invoice_image||null,
        invoice_number:form.hasVat==='yes'?form.invoice_number||null:null,
        supplier_vat_number:form.hasVat==='yes'?form.supplier_vat_number||null:null,
        zatca_qr:form.hasVat==='yes'?zatca?.raw||null:null,
        staff_name:session.name,
        staff_id:session.id
      })
    })
    const resData = await res.json()
    if(!res.ok){showToast(pt('errorPrefix',lang)+resData.error);setLoading(false);submitting.current=false;return}
    showToast(form.category==='مخزون'?`${pt('inventoryUpdated',lang)} (+${form.qty||0})`:pt('purchaseRecorded',lang))

    setForm({category:'مخزون',name:'',sku:'',qty:'',unit:'قطعة',reorder_point:'5',total_amount:'',supplier:'',note:'',invoice_image:'',hasVat:'',invoice_number:'',supplier_vat_number:''})
    setVatFromSupplier(false); setZatca(null)
    setPreviewUrl(null);setReadState('');setOcrItems([]);setLoading(false);submitting.current=false
    // بعد 2 ثانية ارجع لصفحة الموظف
    setTimeout(()=>router.push('/staff/dispense'), 2000)
  }

  const multi = ocrItems.length > 1   // فاتورة فيها أكثر من صنف → نحفظها أصناف (زر واحد)
  const inputTotal = Number(form.total_amount)||0
  const displayAmount = form.hasVat==='yes'&&inputTotal>0?(inputTotal/1.15).toFixed(2):inputTotal.toFixed(2)
  const displayVat = form.hasVat==='yes'&&inputTotal>0?(inputTotal-Number(displayAmount)).toFixed(2):'0.00'

  if(!session) return null

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:lang==='en'?'ltr':'rtl'}}>
      {showScan&&<Suspense fallback={null}><BarcodeScanner onScan={(code:string)=>{setShowScan(false);setForm(f=>({...f,sku:code}))}} onClose={()=>setShowScan(false)}/></Suspense>}

      {/* Header */}
      <StaffHeader title={pt('title',lang)} subtitle={`${session.name} · ${session.org_name}`} rtl={lang!=='en'} />

      {toast&&<div style={{background:toast.startsWith('✅')?C.primaryL:C.dangerL,color:toast.startsWith('✅')?C.primary:C.danger,padding:'12px 20px',fontSize:13,fontWeight:700,textAlign:'center'}}>{toast}</div>}

      <div style={{padding:'16px 20px',maxWidth:520,margin:'0 auto'}}>
        {/* صوّر الفاتورة — كاميرا أو من الصور */}
        <div style={{background:'white',border:`1.5px solid ${previewUrl?C.primary:C.border2}`,borderRadius:14,padding:14,marginBottom:14}}>
          <div style={{fontSize:13.5,fontWeight:800,color:C.text,marginBottom:10}}>{pt('snapTitle',lang)}</div>
          {previewUrl && <img src={previewUrl} alt="invoice" style={{width:'100%',maxHeight:180,objectFit:'cover' as const,borderRadius:10,marginBottom:10}}/>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[{k:'cam',l:pt('camera',lang),cap:true},{k:'gal',l:pt('gallery',lang),cap:false}].map(o=>(
              <label key={o.k} style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'12px 8px',borderRadius:10,cursor:uploading?'wait':'pointer',fontSize:13,fontWeight:800,
                background:o.cap?C.primary:C.primaryL,color:o.cap?'white':C.primary,border:`1.5px solid ${C.primary}`,opacity:uploading?.6:1}}>
                {/* capture يفتح الكاميرا مباشرة؛ بدونه يفتح الصور */}
                <input type="file" accept="image/*" {...(o.cap?{capture:'environment' as const}:{})} disabled={uploading} style={{display:'none'}}
                  onChange={e=>{const f=e.target.files?.[0]; e.target.value=''; if(f) handleImage(f)}}/>
                {previewUrl&&!o.cap?pt('changePhoto',lang):o.l}
              </label>
            ))}
          </div>
          {readState&&<div style={{marginTop:10,fontSize:12.5,fontWeight:700,lineHeight:1.6,color:readState==='fail'?C.warning:readState==='reading'?C.text3:C.primary}}>
            {pt(readState==='reading'?'reading':readState==='qr'?'readQr':readState==='ok'?'readOk':'readFail',lang)}
          </div>}
        </div>

        <form onSubmit={handleSubmit}>

          {!multi&&<>
          {/* نوع الفاتورة */}
          <div style={{marginBottom:14}}>
            <label style={lbl}>{pt('purchaseType',lang)}</label>
            <div style={{display:'flex',gap:8}}>
              {[['مخزون',pt('catInventory',lang),'📦'],['مشتريات',pt('catPurchases',lang),'🛒'],['أخرى',pt('catOther',lang),'📋']].map(([cat,label,icon])=>(
                <button key={cat} type="button" onClick={()=>setForm(f=>({...f,category:cat}))}
                  style={{flex:1,padding:'9px',borderRadius:8,border:`1.5px solid ${form.category===cat?C.primary:C.border2}`,background:form.category===cat?C.primaryL:'white',color:form.category===cat?C.primary:C.text2,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* اسم المنتج */}
          <div style={{marginBottom:12}}>
            <label style={lbl}>{pt('itemName',lang)}</label>
            <input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={pt('itemNamePh',lang)} required/>
          </div>

          {/* الكمية والوحدة */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            <div>
              <label style={lbl}>{pt('quantity',lang)}</label>
              <input style={inp} type="number" min="0" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))} placeholder="0"/>
            </div>
            <div>
              <label style={lbl}>{pt('unit',lang)}</label>
              <select style={inp} value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>
                {(lang==='en'?UNITS_EN:UNITS_AR).map((u,i)=><option key={u} value={UNITS_AR[i]}>{u}</option>)}
              </select>
            </div>
          </div>

          </>}

          {/* المورد */}
          <div style={{marginBottom:12}}>
            <label style={lbl}>{pt('supplier',lang)}</label>
            <input style={inp} list="sup-list" value={form.supplier} onChange={e=>{
              const name=e.target.value, sup=suppliers.find((x:any)=>x.name===name.trim())
              const fill=!!sup?.vat_number&&!form.supplier_vat_number
              if(fill) setVatFromSupplier(true)
              setForm(f=>({...f,supplier:name,supplier_vat_number:fill?sup.vat_number:f.supplier_vat_number}))
            }} placeholder={pt('supplierPh',lang)} required/>
            <datalist id="sup-list">{suppliers.map(s=><option key={s.id} value={s.name}/>)}</datalist>
          </div>

          {/* الضريبة */}
          <div style={{marginBottom:12}}>
            <label style={lbl}>{pt('vatQuestion',lang)}</label>
            <div style={{display:'flex',gap:8}}>
              {[{v:'yes',l:pt('vatYes',lang)},{v:'no',l:pt('vatNo',lang)}].map(o=>(
                <button key={o.v} type="button" onClick={()=>{ if(o.v==='no') setZatca(null); setForm(f=>({...f,hasVat:o.v})) }}
                  style={{flex:1,padding:'9px',borderRadius:8,border:`1.5px solid ${form.hasVat===o.v?C.primary:C.border2}`,background:form.hasVat===o.v?C.primaryL:'white',color:form.hasVat===o.v?C.primary:C.text2,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* المبلغ */}
          {!multi&&<div style={{marginBottom:12}}>
            <label style={lbl}>{pt('totalAmount',lang)} ({curr}) *</label>
            <input style={{...inp,fontSize:18,fontWeight:700,textAlign:'center' as const}} type="number" min="0" step="0.01" value={form.total_amount} onChange={e=>setForm(f=>({...f,total_amount:e.target.value}))} placeholder="0.00" required/>
            {inputTotal>0&&form.hasVat&&(
              <div style={{display:'flex',gap:8,marginTop:6}}>
                <div style={{flex:1,background:C.bg,borderRadius:8,padding:'8px 10px',textAlign:'center' as const}}>
                  <div style={{fontSize:9,color:C.text4,fontWeight:700}}>{pt('withoutVat',lang)}</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{displayAmount}</div>
                </div>
                <div style={{flex:1,background:C.warningL,borderRadius:8,padding:'8px 10px',textAlign:'center' as const}}>
                  <div style={{fontSize:9,color:C.warning,fontWeight:700}}>{pt('vat15',lang)}</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.warning}}>{displayVat}</div>
                </div>
              </div>
            )}
          </div>}

          {form.hasVat==='yes'&&(
            <TaxInvoiceFields lang={lang} invoiceNumber={form.invoice_number} vatNumber={form.supplier_vat_number} savedFromSupplier={vatFromSupplier}
              zatca={zatca} onZatca={setZatca} enteredTotal={multi?ocrItems.reduce((t,_,i)=>t+(ocrSel[i]?Number(ocrPrice[i])||0:0),0):Number(form.total_amount)||0} onError={showToast}
              onChange={p=>{ if('supplier_vat_number' in p) setVatFromSupplier(false); setForm(f=>({...f,...p})) }} inputStyle={inp} labelStyle={lbl}/>
          )}

          {/* الفاتورة فيها أكثر من صنف */}
          {ocrItems.length>1&&(
            <div style={{background:'white',border:`1.5px solid ${C.primary}`,borderRadius:14,padding:14,marginBottom:14}}>
              <div style={{fontSize:12.5,fontWeight:800,color:C.primary,marginBottom:10}}>📋 {itemsCount(ocrItems.length,lang)} {pt('itemsFound',lang)}</div>
              {ocrItems.map((it,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:`1px solid ${C.border}`}}>
                  <input type="checkbox" checked={!!ocrSel[i]} onChange={e=>setOcrSel(s=>({...s,[i]:e.target.checked}))} style={{width:17,height:17}}/>
                  <div style={{flex:1,minWidth:0,fontSize:13,fontWeight:700,color:C.text}}>{it.name}<span style={{fontSize:11,color:C.text4,fontWeight:500}}>{it.qty?` · ${it.qty} ${it.unit||''}`:''}</span></div>
                  <input type="number" step="0.01" min="0" inputMode="decimal" value={ocrPrice[i]||''} onChange={e=>setOcrPrice(p=>({...p,[i]:e.target.value}))}
                    placeholder={pt('itemPrice',lang)} style={{...inp,width:90,padding:'7px 8px',textAlign:'center' as const}}/>
                </div>
              ))}
              <button type="button" onClick={saveItems} disabled={bulkSaving}
                style={{width:'100%',marginTop:10,padding:'11px',borderRadius:10,border:'none',background:bulkSaving?'#9ca3af':C.primary,color:'white',fontSize:13.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                {bulkSaving?pt('submitting',lang):`${pt('saveItems',lang)} (${Object.values(ocrSel).filter(Boolean).length})`}
              </button>
            </div>
          )}

          {/* ملاحظة */}
          <div style={{marginBottom:16}}>
            <label style={lbl}>{pt('note',lang)}</label>
            <textarea style={{...inp,resize:'none' as const,minHeight:60}} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder={pt('notePh',lang)}/>
          </div>

          {!multi&&<button type="submit" disabled={loading||uploading}
            style={{width:'100%',padding:'14px',background:loading?'#9ca3af':C.primary,color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:`0 4px 14px rgba(22,163,74,.3)`}}>
            {loading?pt('submitting',lang):pt('submitBtn',lang)}
          </button>}
        </form>
      </div>
    </div>
  )
}
