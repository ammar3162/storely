'use client'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { type ZatcaState } from '@/components/TaxInvoiceFields'
import { zatcaFromImage } from '@/lib/zatcaScan'
import { prepareInvoiceFile } from '@/lib/invoiceFile'
import { zatcaDate } from '@/lib/zatcaQr'
import { normalizeVat, isValidVat } from '@/lib/taxInvoice'
import { useState, useEffect, useRef } from 'react'
import { currencySymbol } from '@/lib/currencySymbol'
import { cache } from '@/lib/cache'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { toast } from '@/components/toast'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import { confirmDialog } from '@/components/ConfirmDialog'
import { unitFor } from '@/lib/arabicCount'

/** حالة صفحة المشتريات ودوالها — منقولة كما هي من page.tsx */
export function usePurchases() {
  const [history, setHistory]       = useState<any[]>([])
  const [isOwner, setIsOwner]       = useState(false)
  const [editLog, setEditLog]       = useState<any|null>(null)   // سجل تعديلات فاتورة (والترجيع)
  const [payables, setPayables]     = useState<any[]>([])
  const [showPayables, setShowPayables] = useState(false)
  const [payingId, setPayingId]     = useState<string|null>(null)
  const [deletingId, setDeletingId] = useState<string|null>(null)
  const [products, setProducts]     = useState<any[]>([])
  const [isExisting, setIsExisting] = useState<boolean|null>(null)
  const [orgId, setOrgId]           = useState('')
  const [curr, setCurr]             = useState('⃁')
  const [loading, setLoading]       = useState(false)
  const submitting = useRef(false)
  const [uploading, setUploading]   = useState(false)
  // قسم واحد: الوكيل هو الطريق الأساسي، والتسجيل اليدوي يفتح عند الطلب بس
  const [showManual, setShowManual] = useState(false)
  const [bizType, setBizType]       = useState<string|null>(null)
  const [showScan, setShowScan]     = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string|null>(null)
  const [pendingThanks, setPendingThanks] = useState<{productId:string; productName:string; supplierName:string}|null>(null)
  const [filterCat, setFilterCat]       = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [filterSupplier, setFilterSupplier] = useState('')
  function todayRiyadh() {
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  }
  const [invOn, setInvOn] = useState(true)
  const [form, setForm] = useState({
    category:'مخزون', name:'', sku:'', qty:'', unit:'قطعة', unit_factor:'',
    reorder_point:'5', total_amount:'', supplier:'',
    note:'', invoice_image:'', hasVat:'', invoice_date: todayRiyadh(),
    payment_status:'paid', due_date:'', invoice_number:'', supplier_vat_number:'',
  })
  const [suppliers, setSuppliers] = useState<{name:string;vat_number:string|null}[]>([])
  const [vatFromSupplier, setVatFromSupplier] = useState(false)
  // باركود هيئة الزكاة: يعبّي البيانات ويوثّقها (والسيرفر يفكه بنفسه ويطابق المبالغ)
  const [zatca, setZatcaState] = useState<ZatcaState>(null)
  const zatcaRef = useRef<ZatcaState>(null)
  function setZatca(z:ZatcaState, silent=false){
    zatcaRef.current = z; setZatcaState(z)
    if(!z) return
    setForm(f=>({...f, hasVat:'yes', supplier: f.supplier || z.inv.sellerName, supplier_vat_number: z.inv.vatNumber,
      invoice_date: zatcaDate(z.inv), total_amount: f.total_amount || String(z.inv.total)}))
    if(!silent) toast('قرأنا باركود الفاتورة — البيانات موثقة')
  }
  // اختيار مورد محفوظ رقمه الضريبي → يتعبى تلقائياً
  function setSupplierName(name:string){
    const sup = suppliers.find(x=>x.name===name.trim())
    const fill = !!sup?.vat_number && !form.supplier_vat_number
    if (fill) setVatFromSupplier(true)
    setForm(f=>({...f, supplier:name, supplier_vat_number: fill ? sup!.vat_number! : f.supplier_vat_number}))
  }
  const sb = createClient()

  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(orgId, ['purchases','products','suppliers'], ()=>{ if(orgId){ loadHistory(orgId); loadPayables(orgId); loadProducts(orgId) } })
  useEffect(()=>{
    let a=0;const c=setInterval(()=>{a++;const b=sessionStorage.getItem('s_branch_id'),o=sessionStorage.getItem('s_org_id');if((b&&o)||a>20){clearInterval(c);init()}},100);return()=>clearInterval(c)
  },[])
  useVisibilityRefresh(()=>{if(orgId)loadHistory(orgId)},20*60*1000)

  async function init() {
    let oid=sessionStorage.getItem('s_org_id')
    if(!oid){
      const me=await getMe();if(!me)return
      oid=me.org_id
    }
    setOrgId(oid)
    getMe().then(me=>{ if(me?.org?.currency) setCurr(currencySymbol(me.org.currency)); setBizType(me?.org?.business_type??null); setIsOwner(me?.role==='owner')
      // «ابنِ باقتك»: الفرع بدون المخزون — الفاتورة تنحفظ مشتريات (مصروف) والخيار «مخزون» ينخفي
      const bid = typeof window!=='undefined' ? sessionStorage.getItem('s_branch_id') : null
      const inv = ((bid && me?.org?.branch_features?.[bid]) || me?.org?.features)?.inventory !== false
      setInvOn(inv)
      if(!inv) setForm(f=>f.category==='مخزون'?{...f,category:'مشتريات'}:f) })
    loadProducts(oid);loadHistory(oid);loadPayables(oid)
    api.get('/api/suppliers',{org_id:oid}).then(j=>{ if(j.success) setSuppliers((j.suppliers||[]).map((x:any)=>({name:x.name,vat_number:x.vat_number||null}))) }).catch(()=>{})
  }

  async function loadProducts(oid:string) {
    const cached = cache.get('products:'+oid)
    if(cached){ setProducts(cached); }
    const bid=sessionStorage.getItem('s_branch_id')
    const j=await api.get('/api/products',{org_id:oid,branch_id:bid})
    if(!j.success)return
    setProducts(j.products||[]);cache.set('products:'+oid,j.products||[])
  }

  async function loadHistory(oid:string) {
    const cachedH = cache.get('purchases:'+oid)
    if(cachedH){ setHistory(cachedH) }
    const urlBid=new URLSearchParams(window.location.search).get('_b')
    if(urlBid){sessionStorage.setItem('s_branch_id',urlBid);window.history.replaceState({},'',window.location.pathname)}
    const bid=urlBid||sessionStorage.getItem('s_branch_id')
    const j=await api.get('/api/purchases',{org_id:oid,branch_id:bid,view:'history'})
    if(!j.success)return
    setHistory(j.purchases||[]);cache.set('purchases:'+oid,j.purchases||[])
  }

  async function loadPayables(oid:string) {
    const bid=sessionStorage.getItem('s_branch_id')
    const j=await api.get('/api/purchases',{org_id:oid,branch_id:bid,view:'payables'})
    if(!j.success){ console.error('loadPayables error:', j.error); setPayables([]); return }
    // الترتيب حسب تاريخ الاستحقاق يصير على الخادم
    const sorted:any[] = j.payables||[]
    setPayables(sorted)
    if(sorted.length>0) setShowPayables(true)
  }

  async function markPaid(id:string) {
    setPayingId(id)
    const r=await api.patch('/api/purchases',{org_id:orgId,id,mark_paid:true})
    setPayingId(null)
    if(!r.success){toast('فشل تحديث الحالة — حاول مرة أخرى','error');return}
    toast('تم تسجيل الدفع')
    setPayables(prev=>prev.filter((p:any)=>p.id!==id))
  }

  async function deletePurchase(purchase:any) {
    const confirmMsg = purchase.category==='مخزون' && purchase.qty
      ? `تأكيد حذف فاتورة "${purchase.name}"؟\n\nسيتم أيضاً طرح ${purchase.qty} ${unitFor(purchase.qty, purchase.unit||'')} من المخزون (لأن الفاتورة أضافتها سابقاً).`
      : `تأكيد حذف فاتورة "${purchase.name}"؟`
    if(!(await confirmDialog({ title: 'حذف الفاتورة', message: confirmMsg }))) return
    setDeletingId(purchase.id)

    // الخادم يرجّع كمية المخزون (لو فاتورة مخزون) ثم يحذف الفاتورة حذف ناعم
    const r=await api.del('/api/purchases',{org_id:orgId,id:purchase.id})
    setDeletingId(null)
    if(!r.success){toast('فشل حذف الفاتورة — حاول مرة أخرى','error');return}
    toast('تم حذف الفاتورة')
    setHistory(prev=>prev.filter((p:any)=>p.id!==purchase.id))
    cache.invalidate('purchases:');cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:')
  }

  async function handleImage(file:File) {
    const prep = await prepareInvoiceFile(file)
    if('error' in prep){toast(prep.error,'warning');return}
    setUploading(true)
    // باركود الهيئة من الصورة نفسها (على الجهاز) — بالتوازي مع الرفع
    if(!prep.isPdf) zatcaFromImage(file).then(z=>{ if(z&&!zatcaRef.current){ setZatca(z,true); toast('لقينا باركود الهيئة بالفاتورة — البيانات موثقة') } })
    try {
      const path = orgId+'/invoice-'+Date.now()+'.'+prep.ext   // مجلد المنشأة (سياسة التخزين تسمح بمجلدها بس)
      const{error}=await sb.storage.from('invoices').upload(path, prep.blob, { contentType: prep.type })
      if(error){toast('فشل رفع الفاتورة','error');setUploading(false);return}
      const{data:{publicUrl}}=sb.storage.from('invoices').getPublicUrl(path)
      setForm(f=>({...f,invoice_image:publicUrl}));setPreviewUrl(publicUrl)
      toast(prep.isPdf?'تم إرفاق ملف الفاتورة ':'تم رفع الفاتورة ')

    } catch { toast('فشل رفع الصورة','error') }
    setUploading(false)
  }

  async function confirmSupplierThanks() {
    if (!pendingThanks || !orgId) return
    const { productId, productName, supplierName } = pendingThanks
    setPendingThanks(null)
    try {
      const res = await fetch('/api/supplier-delivery-thanks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,product_id:productId,product_name:productName,supplier_name:supplierName})})
      const data = await res.json()
      if (data.sent) toast(`تم إرسال رسالة شكر لـ${data.supplier}`)
      else toast('تعذر إرسال رسالة الشكر (تحقق من ربط المورد أو موافقة واتساب)', 'warning')
    } catch { toast('حدث خطأ أثناء الإرسال', 'error') }
  }

  function pickOcrItem(item: any) {
    setForm(f => ({ ...f, name: item.name || f.name, qty: item.qty ? String(item.qty) : f.qty, unit: item.unit || f.unit }))
  }

  // حفظ أصناف الفاتورة: الصنف الموجود تزيد كميته، والجديد ينضاف — والفاتورة كلها تنسجل وحدة

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault()
    if(!orgId||submitting.current)return
    if(form.category==='مخزون'&&!form.name.trim()){toast('اكتب اسم الصنف','warning');return}
    if(!(Number(form.total_amount)>0)){toast('اكتب المبلغ الإجمالي','warning');return}
    if(form.qty&&!(Number.isInteger(Number(form.qty))&&Number(form.qty)>=0)){toast('يجب أن تكون الكمية رقماً صحيحاً — إذا كانت فيها كسور فاستخدم وحدة أصغر (مثل الغرام بدل الكيلو)','warning');return}
    submitting.current=true
    if(!form.hasVat){toast('حدد هل الفاتورة تشمل الضريبة','warning');submitting.current=false;return}
    if(form.hasVat==='yes'&&!form.invoice_image){toast('يجب إرفاق صورة الفاتورة الضريبية أو ملفها','warning');submitting.current=false;return}
    if(!form.supplier.trim()){toast('يرجى إدخال اسم المورد','warning');submitting.current=false;return}
    if(form.hasVat==='yes'&&form.supplier_vat_number.trim()&&!isValidVat(normalizeVat(form.supplier_vat_number))){toast('الرقم الضريبي للمورد غير صحيح — يتكون من 15 رقماً ويبدأ وينتهي بالرقم 3','warning');submitting.current=false;return}
    setLoading(true)
    // حفظ الفاتورة + الإشعار + تحديث المخزون ومتوسط التكلفة كلها على الخادم
    const body:any={
      org_id:orgId, branch_id:sessionStorage.getItem('s_branch_id')||null,
      category:form.category, name:form.name, sku:form.sku||null, qty:form.qty||null,
      unit:form.unit||null, unit_factor:Number(form.unit_factor)>0?Number(form.unit_factor):null, reorder_point:form.reorder_point, total_amount:form.total_amount,
      supplier:form.supplier, note:form.note||null, invoice_image:form.invoice_image||null,
      has_vat:form.hasVat==='yes', invoice_date:form.invoice_date, payment_status:form.payment_status, due_date:form.due_date||null,
      invoice_number:form.hasVat==='yes'?form.invoice_number||null:null, supplier_vat_number:form.hasVat==='yes'?form.supplier_vat_number||null:null, zatca_qr:form.hasVat==='yes'?zatca?.raw||null:null,
    }
    let res=await api.post('/api/purchases',body)
    // نفس الفاتورة مسجلة قبل؟ نسأل بدل ما تنكرر وتزيد المخزون مرتين
    if(!res.success&&res.duplicate&&await confirmDialog({title:'الفاتورة مسجلة قبل',message:res.error+'\n\nتسجلها مرة ثانية؟',confirmText:'سجّلها'}))
      res=await api.post('/api/purchases',{...body,allow_duplicate:true})
    if(!res.success){if(!res.duplicate)toast(res.error||'حدث خطأ','error');setLoading(false);submitting.current=false;return}

    if(res.product_action==='updated') toast(`تم تحديث المخزون (+${res.qty})`,'success')
    else if(res.product_action==='created'){
      toast(`تم إضافة "${form.name}" للمخزون`)
      api.post('/api/sync-product-to-staff',{org_id:orgId,product_id:res.product_id})
    }
    else toast('تم تسجيل الشراء')
    if(form.invoice_date&&form.invoice_date!==todayRiyadh()) toast(`حُفظت بتاريخ الفاتورة ${form.invoice_date} — ستجدها في التقارير بهذا التاريخ`)

    // تأكيد يدوي قبل إرسال رسالة الشكر — يظهر فقط لو المورد مسجّل فعلياً بالنظام والمنتج مرتبط فيه تحديداً
    if (res.thanks_candidate && res.product_id) {
      setPendingThanks({ productId: res.product_id, productName: form.name, supplierName: form.supplier.trim() })
    }

    setForm({category:invOn?'مخزون':'مشتريات',name:'',sku:'',qty:'',unit:'قطعة',unit_factor:'',reorder_point:'5',total_amount:'',supplier:'',note:'',invoice_image:'',hasVat:'',invoice_date:todayRiyadh(),payment_status:'paid',due_date:'',invoice_number:'',supplier_vat_number:''});setZatca(null);setVatFromSupplier(false)
    setPreviewUrl(null);setLoading(false);submitting.current=false
    cache.invalidate('purchases:');cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:')
    loadHistory(orgId);loadPayables(orgId)
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

  return { invOn, history, setHistory, isOwner, setIsOwner, editLog, setEditLog, payables, setPayables, showPayables, setShowPayables, payingId, setPayingId, deletingId, setDeletingId, products, setProducts, isExisting, setIsExisting, orgId, setOrgId, curr, setCurr, loading, setLoading, uploading, setUploading, showManual, setShowManual, bizType, setBizType, showScan, setShowScan, previewUrl, setPreviewUrl, pendingThanks, setPendingThanks, filterCat, setFilterCat, filterPeriod, setFilterPeriod, filterSupplier, setFilterSupplier, form, setForm, suppliers, setSuppliers, vatFromSupplier, setVatFromSupplier, zatca, setZatcaState, submitting, zatcaRef, sb, inputTotal, displayAmount, displayVat, filteredHistory, totalSpent, totalVat, totalNet, todayRiyadh, setZatca, setSupplierName, init, loadProducts, loadHistory, loadPayables, markPaid, deletePurchase, handleImage, confirmSupplierThanks, pickOcrItem, handleSubmit }
}

export type PurchasesState = ReturnType<typeof usePurchases>
