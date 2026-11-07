'use client'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { currencySymbol } from '@/lib/currencySymbol'
import { useRouter } from 'next/navigation'
import { getStaffOrg } from '@/lib/session'
import { ClipboardList, Package, ShoppingCart } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
  permissions: {dispense:boolean,inventory:boolean,purchases:boolean,reports:boolean}
}

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
  uploading:        {ar:'جاري الرفع...',en:'Uploading...'},
  clickToUpload:    {ar:'اضغط لرفع الفاتورة',en:'Tap to upload invoice'},
  note:             {ar:'ملاحظة (اختياري)',en:'Note (optional)'},
  notePh:           {ar:'أي تفاصيل إضافية...',en:'Any additional details...'},
  submitting:       {ar:'جاري التسجيل...',en:'Submitting...'},
  submitBtn:        {ar:'تسجيل الشراء',en:'Record Purchase'},
  imgFailed:        {ar:'فشل رفع الصورة',en:'Failed to upload image'},
  imgUploaded:      {ar:'تم رفع الفاتورة ✓',en:'Invoice uploaded ✓'},
  selectVat:        {ar:'حدد هل الفاتورة تشمل الضريبة',en:'Please specify if the invoice includes VAT'},
  invoiceRequired:  {ar:'يرجى رفع صورة الفاتورة',en:'Please upload the invoice photo'},
  supplierRequired: {ar:'يرجى إدخال اسم المورد',en:'Please enter the supplier name'},
  inventoryUpdated: {ar:'✅ تم تحديث المخزون',en:'✅ Inventory updated'},
  purchaseRecorded: {ar:'✅ تم تسجيل الشراء',en:'✅ Purchase recorded'},
  errorPrefix:      {ar:'خطأ: ',en:'Error: '},
}
const pt = (key: string, lang: 'ar'|'en') => PUI[key]?.[lang] || PUI[key]?.ar || key

export default function StaffPurchasesPage() {
  const [lang, setPageLang] = useState<'ar'|'en'>('ar')
  const [session, setSession] = useState<StaffSession|null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string|null>(null)
  const [toast, setToast] = useState('')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [form, setForm] = useState({
    category:'مخزون', name:'', sku:'', qty:'', unit:'قطعة',
    reorder_point:'5', total_amount:'', supplier:'', note:'',
    invoice_image:'', hasVat:''
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

  async function handleImage(file: File) {
    setUploading(true)
    try {
      const staffToken = localStorage.getItem('staff_token')
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/staff-upload-invoice',{method:'POST',headers:{'Authorization':`Bearer ${staffToken}`},body:fd})
      const j = await res.json()
      if(!res.ok||!j.success){showToast(j.error||pt('imgFailed',lang));setUploading(false);return}
      setForm(f=>({...f,invoice_image:j.url}));setPreviewUrl(j.url)
      showToast(pt('imgUploaded',lang))
    } catch {
      showToast(pt('imgFailed',lang))
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if(!form.total_amount||!session)return
    if(submitting.current)return
    submitting.current=true
    if(!form.hasVat){showToast(pt('selectVat',lang));submitting.current=false;return}
    if(form.hasVat==='yes'&&!form.invoice_image){showToast(pt('invoiceRequired',lang));submitting.current=false;return}
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
        staff_name:session.name,
        staff_id:session.id
      })
    })
    const resData = await res.json()
    if(!res.ok){showToast(pt('errorPrefix',lang)+resData.error);setLoading(false);submitting.current=false;return}
    showToast(form.category==='مخزون'?`${pt('inventoryUpdated',lang)} (+${form.qty||0})`:pt('purchaseRecorded',lang))

    setForm({category:'مخزون',name:'',sku:'',qty:'',unit:'قطعة',reorder_point:'5',total_amount:'',supplier:'',note:'',invoice_image:'',hasVat:''})
    setPreviewUrl(null);setLoading(false);submitting.current=false
    // بعد 2 ثانية ارجع لصفحة الموظف
    setTimeout(()=>router.push('/staff/dispense'), 2000)
  }

  const inputTotal = Number(form.total_amount)||0
  const displayAmount = form.hasVat==='yes'&&inputTotal>0?(inputTotal/1.15).toFixed(2):inputTotal.toFixed(2)
  const displayVat = form.hasVat==='yes'&&inputTotal>0?(inputTotal-Number(displayAmount)).toFixed(2):'0.00'

  if(!session) return null

  return (
    <div className="min-h-screen bg-[var(--storely-background)] text-[var(--storely-navy)]" dir={lang==='en'?'ltr':'rtl'}>
      {showScan&&<Suspense fallback={null}><BarcodeScanner onScan={(code:string)=>{setShowScan(false);setForm(f=>({...f,sku:code}))}} onClose={()=>setShowScan(false)}/></Suspense>}
      <div className="!mx-auto max-w-4xl !space-y-6 !px-4 !py-6 sm:!p-8">
        <StorelyPageHeader title={pt('title',lang)} description={<>{session.name} · {session.org_name}</>}
          actions={<StorelyButton onClick={()=>router.push('/staff/dispense')}>{lang==='en'?'→':'←'}</StorelyButton>} />
        {toast&&<div className="storely-notice" style={{color:toast.startsWith('✅')?storelyTokens.color.success:storelyTokens.color.danger,borderColor:toast.startsWith('✅')?storelyTokens.color.successBorder:storelyTokens.color.dangerBorder}}>{toast}</div>}
        <StorelyCard>
          <form onSubmit={handleSubmit} className="!space-y-6 !p-5 sm:!p-6">
            <div>
              <label className="storely-field-label !mb-3 block">{pt('purchaseType',lang)}</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {[['مخزون',pt('catInventory',lang),'📦'],['مشتريات',pt('catPurchases',lang),'🛒'],['أخرى',pt('catOther',lang),'📋']].map(([cat,label,icon])=>(
                  <StorelyButton key={cat} type="button" onClick={()=>setForm(f=>({...f,category:cat}))}
                    variant={form.category===cat?'primary':'secondary'} icon={icon==='📦'?<Package size={16} />:icon==='🛒'?<ShoppingCart size={16} />:<ClipboardList size={16} />}>
                    {label}
                  </StorelyButton>
                ))}
              </div>
            </div>
            <div>
              <label className="storely-field-label !mb-2 block">{pt('itemName',lang)}</label>
              <input className="storely-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={pt('itemNamePh',lang)} required/>
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div>
                <label className="storely-field-label !mb-2 block">{pt('quantity',lang)}</label>
                <input className="storely-input" type="number" min="0" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))} placeholder="0"/>
              </div>
              <div>
                <label className="storely-field-label !mb-2 block">{pt('unit',lang)}</label>
                <select className="storely-input" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>
                  {(lang==='en'?UNITS_EN:UNITS_AR).map((u,i)=><option key={u} value={UNITS_AR[i]}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="storely-field-label !mb-2 block">{pt('supplier',lang)}</label>
              <input className="storely-input" list="sup-list" value={form.supplier} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))} placeholder={pt('supplierPh',lang)} required/>
              <datalist id="sup-list">{suppliers.map(s=><option key={s.id} value={s.name}/>)}</datalist>
            </div>
            <div>
              <label className="storely-field-label !mb-3 block">{pt('vatQuestion',lang)}</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[{v:'yes',l:pt('vatYes',lang)},{v:'no',l:pt('vatNo',lang)}].map(o=>(
                  <StorelyButton key={o.v} type="button" onClick={()=>setForm(f=>({...f,hasVat:o.v}))} variant={form.hasVat===o.v?'primary':'secondary'}>
                    {o.l}
                  </StorelyButton>
                ))}
              </div>
            </div>
            <div>
              <label className="storely-field-label !mb-2 block">{pt('totalAmount',lang)} ({curr}) *</label>
              <input className="storely-input text-center !text-lg font-semibold tabular-nums" type="number" min="0" step="0.01" value={form.total_amount} onChange={e=>setForm(f=>({...f,total_amount:e.target.value}))} placeholder="0.00" required/>
              {inputTotal>0&&form.hasVat&&(
                <div className="!mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-sm)] border border-[var(--storely-border)] !p-4">
                    <div className="text-sm text-[var(--storely-muted)]">{pt('withoutVat',lang)}</div>
                    <div className="!mt-2 text-lg font-semibold tabular-nums">{displayAmount}</div>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-[var(--storely-border)] !p-4">
                    <div className="text-sm text-[var(--storely-muted)]">{pt('vat15',lang)}</div>
                    <div className="!mt-2 text-lg font-semibold tabular-nums">{displayVat}</div>
                  </div>
                </div>
              )}
            </div>
            {form.hasVat==='yes'&&(
              <div>
                <label className="storely-field-label !mb-2 block">{pt('invoiceImage',lang)}</label>
                {previewUrl?(
                  <div className="relative !mb-2">
                    <img src={previewUrl} alt="invoice" className="max-h-64 w-full rounded-[var(--radius-sm)] border border-[var(--storely-border)] object-contain"/>
                    <StorelyButton type="button" onClick={()=>{setPreviewUrl(null);setForm(f=>({...f,invoice_image:''}))}} variant="danger" className="absolute start-2 top-2 !w-10 !px-0">×</StorelyButton>
                  </div>
                ):(
                  <label className="flex min-h-28 cursor-pointer items-center justify-center gap-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--storely-border)] bg-white !p-5">
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&handleImage(e.target.files[0])}/>
                    <span className="text-sm font-medium text-[var(--storely-muted)]">{uploading?pt('uploading',lang):pt('clickToUpload',lang)}</span>
                  </label>
                )}
              </div>
            )}
            <div>
              <label className="storely-field-label !mb-2 block">{pt('note',lang)}</label>
              <textarea className="storely-input !h-auto min-h-24 resize-y" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder={pt('notePh',lang)}/>
            </div>
            <div className="border-t border-[var(--storely-border)] !pt-5">
              <StorelyButton type="submit" disabled={loading||uploading} variant="primary" className="w-full sm:w-auto">
                {loading?pt('submitting',lang):pt('submitBtn',lang)}
              </StorelyButton>
            </div>
          </form>
        </StorelyCard>
      </div>
    </div>
  )
}
