'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { currencySymbol } from '@/lib/currencySymbol'
import { Ban, Building2, CheckCircle2, ChevronDown, Clock, CreditCard, FileText, Package, Percent, Plus, Receipt, ScanBarcode, ShoppingCart, Trash2, Upload, X } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyDataTable, StorelyEmptyState, StorelyPageHeader, StorelyStatusBadge, type StorelyDataTableColumn } from '@/components/ui'
import { cache } from '@/lib/cache'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { toast } from '@/components/toast'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import { confirmDialog } from '@/components/ConfirmDialog'

const CATS = ['مخزون','مشتريات','أخرى']
const UNITS = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','درزن','رول','غرام','أخرى']

export default function PurchasesPage() {
  const [history, setHistory]       = useState<any[]>([])
  const [payables, setPayables]     = useState<any[]>([])
  const [showPayables, setShowPayables] = useState(false)
  const [payingId, setPayingId]     = useState<string|null>(null)
  const [deletingId, setDeletingId] = useState<string|null>(null)
  const [products, setProducts]     = useState<any[]>([])
  const [isExisting, setIsExisting] = useState<boolean|null>(null)
  const [orgId, setOrgId]           = useState('')
  const [curr, setCurr]             = useState('ر.س')
  const [loading, setLoading]       = useState(false)
  const submitting = useRef(false)
  const [uploading, setUploading]   = useState(false)
  const [showScan, setShowScan]     = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string|null>(null)
  const [ocrItems, setOcrItems]     = useState<any[]>([])
  const [ocrSelected, setOcrSelected] = useState<Record<number,boolean>>({})
  const [ocrPrices, setOcrPrices] = useState<Record<number,string>>({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [pendingThanks, setPendingThanks] = useState<{productId:string; productName:string; supplierName:string}|null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [filterCat, setFilterCat]       = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [selectedPurchase, setSelectedPurchase] = useState<any|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  function todayRiyadh() {
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  }
  const [form, setForm] = useState({
    category:'مخزون', name:'', sku:'', qty:'', unit:'قطعة',
    reorder_point:'5', total_amount:'', supplier:'',
    note:'', invoice_image:'', hasVat:'', invoice_date: todayRiyadh(),
    payment_status:'paid', due_date:'',
  })
  const sb = createClient()

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
    getMe().then(me=>{ if(me?.org?.currency) setCurr(currencySymbol(me.org.currency)) })
    loadProducts(oid);loadHistory(oid);loadPayables(oid)
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
    toast('✅ تم تسجيل الدفع')
    setPayables(prev=>prev.filter((p:any)=>p.id!==id))
  }

  async function deletePurchase(purchase:any) {
    const confirmMsg = purchase.category==='مخزون' && purchase.qty
      ? `تأكيد حذف فاتورة "${purchase.name}"؟\n\nسيتم أيضاً طرح ${purchase.qty} ${purchase.unit||''} من المخزون (لأن الفاتورة أضافتها سابقاً).`
      : `تأكيد حذف فاتورة "${purchase.name}"؟`
    if(!(await confirmDialog({ title: 'حذف الفاتورة', message: confirmMsg }))) return
    setDeletingId(purchase.id)

    // الخادم يرجّع كمية المخزون (لو فاتورة مخزون) ثم يحذف الفاتورة حذف ناعم
    const r=await api.del('/api/purchases',{org_id:orgId,id:purchase.id})
    setDeletingId(null)
    if(!r.success){toast('فشل حذف الفاتورة — حاول مرة أخرى','error');return}
    toast('🗑️ تم حذف الفاتورة')
    setHistory(prev=>prev.filter((p:any)=>p.id!==purchase.id))
    cache.invalidate('purchases:');cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:')
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
            if (d.items?.length > 1) {
              setOcrItems(d.items)
              const sel: Record<number,boolean> = {}
              const initPrices: Record<number,string> = {}
              const equalShare = d.total_amount ? (Number(d.total_amount)/d.items.length).toFixed(2) : ''
              d.items.forEach((_:any,i:number)=>{ sel[i]=true; initPrices[i]=equalShare })
              setOcrSelected(sel)
              setOcrPrices(initPrices)
            }
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

  async function confirmSupplierThanks() {
    if (!pendingThanks || !orgId) return
    const { productId, productName, supplierName } = pendingThanks
    setPendingThanks(null)
    try {
      const res = await fetch('/api/supplier-delivery-thanks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,product_id:productId,product_name:productName,supplier_name:supplierName})})
      const data = await res.json()
      if (data.sent) toast(`✅ تم إرسال رسالة شكر لـ${data.supplier}`)
      else toast('تعذر إرسال رسالة الشكر (تحقق من ربط المورد أو موافقة واتساب)', 'warning')
    } catch { toast('حدث خطأ أثناء الإرسال', 'error') }
  }

  function pickOcrItem(item: any) {
    setForm(f => ({ ...f, name: item.name || f.name, qty: item.qty ? String(item.qty) : f.qty, unit: item.unit || f.unit }))
  }

  async function saveBulkOcrItems() {
    const selectedIndexes = ocrItems.map((_,i)=>i).filter(i=>ocrSelected[i])
    if (selectedIndexes.length===0 || bulkSaving || !orgId) return
    setBulkSaving(true)
    const bid = sessionStorage.getItem('s_branch_id')
    const isVat = form.hasVat==='yes'

    // كل صنف فاتورة مستقلة بسعره (قابل للتعديل بالواجهة) وضريبته — الحفظ وتحديث المخزون على الخادم
    const r = await api.post('/api/purchases/bulk', {
      org_id:orgId, branch_id:bid||null, supplier:form.supplier||null, note:form.note||null,
      invoice_image:form.invoice_image||null, has_vat:isVat, invoice_date:form.invoice_date,
      items: selectedIndexes.map(i=>({ name:ocrItems[i].name, qty:ocrItems[i].qty, unit:ocrItems[i].unit, total:Number(ocrPrices[i])||0 })),
    })
    if(!r.success){ toast(r.error||'فشل الحفظ','error'); setBulkSaving(false); return }
    if(r.failed?.length) toast(`تنبيه: فشل حفظ ${r.failed.length} صنف: ${r.failed.join('، ')}`,'warning')

    toast(`✅ تم حفظ ${selectedIndexes.length} صنف بنجاح، بكل تفاصيل السعر والضريبة`)
    setOcrItems([]); setOcrSelected([] as any); setOcrPrices({})
    setForm({category:'مخزون',name:'',sku:'',qty:'',unit:'قطعة',reorder_point:'5',total_amount:'',supplier:'',note:'',invoice_image:'',hasVat:'',invoice_date:todayRiyadh(),payment_status:'paid',due_date:''})
    setPreviewUrl(null)
    setBulkSaving(false)
    loadHistory(orgId)
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
    // حفظ الفاتورة + الإشعار + تحديث المخزون ومتوسط التكلفة كلها على الخادم
    const res=await api.post('/api/purchases',{
      org_id:orgId, branch_id:sessionStorage.getItem('s_branch_id')||null,
      category:form.category, name:form.name, sku:form.sku||null, qty:form.qty||null,
      unit:form.unit||null, reorder_point:form.reorder_point, total_amount:form.total_amount,
      supplier:form.supplier, note:form.note||null, invoice_image:form.invoice_image||null,
      has_vat:form.hasVat==='yes', invoice_date:form.invoice_date, payment_status:form.payment_status, due_date:form.due_date||null,
    })
    if(!res.success){toast(res.error||'حدث خطأ','error');setLoading(false);submitting.current=false;return}

    if(res.product_action==='updated') toast(`✅ تم تحديث المخزون (+${res.qty})`,'success')
    else if(res.product_action==='created'){
      toast(`✅ تم إضافة "${form.name}" للمخزون`)
      api.post('/api/sync-product-to-staff',{org_id:orgId,product_id:res.product_id})
    }
    else toast('✅ تم تسجيل الشراء')

    // تأكيد يدوي قبل إرسال رسالة الشكر — يظهر فقط لو المورد مسجّل فعلياً بالنظام والمنتج مرتبط فيه تحديداً
    if (res.thanks_candidate && res.product_id) {
      setPendingThanks({ productId: res.product_id, productName: form.name, supplierName: form.supplier.trim() })
    }

    setForm({category:'مخزون',name:'',sku:'',qty:'',unit:'قطعة',reorder_point:'5',total_amount:'',supplier:'',note:'',invoice_image:'',hasVat:'',invoice_date:todayRiyadh(),payment_status:'paid',due_date:''})
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

  const todayStr = todayRiyadh()
  const overduePayables = payables.filter((p:any)=>p.due_date && p.due_date < todayStr).length
  const totalPayableAmount = payables.reduce((s:number,p:any)=>s+Number(p.total_amount||0),0)

  const purchaseColumns: StorelyDataTableColumn<any>[] = [
    {
      key: 'purchase',
      header: 'العملية',
      sortable: true,
      sortValue: (p:any) => p.name || '',
      cell: (p:any) => (
        <div className="min-w-[220px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#203640]">{p.name || 'بدون اسم'}</span>
            {p.invoice_image ? (
              <a
                href={p.invoice_image}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
                onClick={(event)=>event.stopPropagation()}
              >
                <FileText size={13}/> فاتورة
              </a>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#66737C]">
            <StorelyStatusBadge status={p.category===CATS[0] ? 'success' : p.category===CATS[1] ? 'info' : 'warning'}>
              {p.category || CATS[2]}
            </StorelyStatusBadge>
            {p.qty ? <span>{p.qty} {p.unit}</span> : null}
            {p.sku ? <span>SKU {p.sku}</span> : null}
          </div>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'المورد',
      sortable: true,
      sortValue: (p:any) => p.supplier || '',
      cell: (p:any) => <span className="text-[#43525B]">{p.supplier || 'غير محدد'}</span>,
    },
    {
      key: 'date',
      header: 'التاريخ',
      sortable: true,
      sortValue: (p:any) => p.invoice_date || p.created_at || '',
      cell: (p:any) => (
        <span className="whitespace-nowrap text-[#43525B]">
          {new Date(p.invoice_date || p.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn',day:'numeric',month:'short',year:'numeric'})}
        </span>
      ),
    },
    {
      key: 'payment',
      header: 'الدفع',
      sortable: true,
      sortValue: (p:any) => p.payment_status || 'paid',
      cell: (p:any) => {
        const unpaid = p.payment_status === 'unpaid'
        const overdue = unpaid && p.due_date && p.due_date < todayStr
        return (
          <div className="flex flex-col items-start gap-1">
            <StorelyStatusBadge status={overdue ? 'danger' : unpaid ? 'warning' : 'success'}>
              {overdue ? 'متأخرة' : unpaid ? 'غير مدفوعة' : 'مدفوعة'}
            </StorelyStatusBadge>
            {p.due_date ? <span className="text-xs text-[#66737C]">استحقاق {p.due_date}</span> : null}
          </div>
        )
      },
    },
    {
      key: 'amount',
      header: 'الإجمالي',
      sortable: true,
      sortValue: (p:any) => Number(p.total_amount||0),
      className: 'text-left font-semibold tabular-nums',
      cell: (p:any) => (
        <div className="text-left">
          <div>{Number(p.total_amount||0).toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:2})} {curr}</div>
          {Number(p.vat_amount||0)>0 ? <div className="text-xs font-medium text-[#B45309]">ضريبة {Number(p.vat_amount||0).toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:2})}</div> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[88px] text-left',
      cell: (p:any) => (
        <StorelyButton
          size="sm"
          variant="danger"
          icon={<Trash2 size={14}/>}
          disabled={deletingId===p.id}
          onClick={(event)=>{event.stopPropagation(); deletePurchase(p)}}
        >
          {deletingId===p.id ? '...' : 'حذف'}
        </StorelyButton>
      ),
    },
  ]

  return (
    <div className="min-h-full bg-[#F7F3ED] text-[#203640]">
      {pendingThanks && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-[#203640]/50 p-4">
          <StorelyCard className="w-full max-w-md">
            <div className="p-5 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full border border-[#E7E1D8] bg-[#F7F3ED] text-[#203640]"><Building2 size={19}/></div>
              <div className="text-base font-semibold text-[#203640]">تأكيد استلام الطلبية</div>
              <p className="mt-2 text-sm leading-6 text-[#66737C]">
                هل المورد <b>{pendingThanks.supplierName}</b> هو الذي وصل «{pendingThanks.productName}»؟ عند التأكيد سنرسل له رسالة شكر تلقائية عبر واتساب.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <StorelyButton variant="secondary" onClick={()=>setPendingThanks(null)}>تجاهل</StorelyButton>
                <StorelyButton variant="primary" onClick={confirmSupplierThanks}>إرسال شكر</StorelyButton>
              </div>
            </div>
          </StorelyCard>
        </div>
      )}

      {showScan&&<Suspense fallback={null}><BarcodeScanner onScan={(code:string)=>{setShowScan(false);setForm(f=>({...f,sku:code}))}} onClose={()=>setShowScan(false)}/></Suspense>}

      {selectedPurchase && (
        <div className="fixed inset-0 z-[3500] flex justify-end bg-[#203640]/35" onClick={()=>setSelectedPurchase(null)}>
          <aside className="h-full w-full max-w-lg overflow-y-auto border-r border-[#E7E1D8] bg-white shadow-xl" onClick={(event)=>event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E7E1D8] bg-white px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-[#203640]">تفاصيل الفاتورة</div>
                <div className="mt-1 text-xs text-[#66737C]">{selectedPurchase.id}</div>
              </div>
              <button type="button" className="flex size-8 items-center justify-center rounded-[6px] text-[#66737C] hover:bg-[#F1F5F9]" onClick={()=>setSelectedPurchase(null)} aria-label="إغلاق">
                <X size={18}/>
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <h2 className="m-0 text-xl font-semibold text-[#203640]">{selectedPurchase.name || 'بدون اسم'}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StorelyStatusBadge status={selectedPurchase.category===CATS[0] ? 'success' : selectedPurchase.category===CATS[1] ? 'info' : 'warning'}>{selectedPurchase.category || CATS[2]}</StorelyStatusBadge>
                  <StorelyStatusBadge status={selectedPurchase.payment_status==='unpaid' ? 'warning' : 'success'}>{selectedPurchase.payment_status==='unpaid' ? 'غير مدفوعة' : 'مدفوعة'}</StorelyStatusBadge>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-[6px] border border-[#E7E1D8] p-3"><dt className="text-xs text-[#66737C]">المورد</dt><dd className="mt-1 font-semibold text-[#203640]">{selectedPurchase.supplier || 'غير محدد'}</dd></div>
                <div className="rounded-[6px] border border-[#E7E1D8] p-3"><dt className="text-xs text-[#66737C]">الإجمالي</dt><dd className="mt-1 font-semibold text-[#203640]">{Number(selectedPurchase.total_amount||0).toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:2})} {curr}</dd></div>
                <div className="rounded-[6px] border border-[#E7E1D8] p-3"><dt className="text-xs text-[#66737C]">الكمية</dt><dd className="mt-1 font-semibold text-[#203640]">{selectedPurchase.qty ? `${selectedPurchase.qty} ${selectedPurchase.unit||''}` : 'غير محددة'}</dd></div>
                <div className="rounded-[6px] border border-[#E7E1D8] p-3"><dt className="text-xs text-[#66737C]">تاريخ الفاتورة</dt><dd className="mt-1 font-semibold text-[#203640]">{new Date(selectedPurchase.invoice_date || selectedPurchase.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn'})}</dd></div>
              </dl>
              {selectedPurchase.note ? <div className="rounded-[6px] border border-[#E7E1D8] p-3 text-sm leading-6 text-[#43525B]">{selectedPurchase.note}</div> : null}
              {selectedPurchase.invoice_image ? <a className="inline-flex items-center gap-2 text-sm font-semibold text-[#1D4ED8] hover:underline" href={selectedPurchase.invoice_image} target="_blank" rel="noreferrer"><FileText size={16}/> فتح صورة الفاتورة</a> : null}
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto max-w-[1440px] px-0 py-1">
        <StorelyPageHeader
          eyebrow="المشتريات"
          title="إدارة فواتير الشراء"
          description="سجل مشتريات المخزون والمصاريف، راقب الضريبة والمستحقات، وافتح تفاصيل كل فاتورة من جدول واحد."
          actions={<StorelyButton variant="primary" icon={<Plus size={16}/>} onClick={()=>document.getElementById('purchase-entry-form')?.scrollIntoView({behavior:'smooth',block:'start'})}>تسجيل شراء</StorelyButton>}
        />

        <StorelyCard className="mb-4">
          <div className="grid divide-y divide-[#E7E1D8] md:grid-cols-4 md:divide-x md:divide-y-0 md:divide-x-reverse">
            {[
              { label: '????????', value: filteredHistory.length.toLocaleString('ar-SA', {numberingSystem:'latn'}), tone: 'text-[#203640]', Icon: Receipt },
              { label: '????????', value: totalSpent.toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:0}) + ' ' + curr, tone: 'text-[#203640]', Icon: ShoppingCart },
              { label: '????? 15%', value: totalVat.toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:0}) + ' ' + curr, tone: 'text-[#B45309]', Icon: Percent },
              { label: '??????? ????????', value: totalPayableAmount.toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:0}) + ' ' + curr, tone: 'text-[#203640]', Icon: CreditCard, meta: payables.length + ' ??? ??????? ' + overduePayables + ' ??????' },
            ].map((item) => (
              <div key={item.label} className="p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#66737C]">
                  <span>{item.label}</span>
                  <item.Icon size={15} className="text-[#8EA0B1]" />
                </div>
                <div className={`mt-1.5 text-lg font-semibold tabular-nums ${item.tone}`}>{item.value}</div>
                {item.meta ? <div className="mt-1 text-xs text-[#66737C]">{item.meta}</div> : null}
              </div>
            ))}
          </div>
        </StorelyCard>

        <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
          <StorelyCard id="purchase-entry-form" title="تسجيل شراء جديد" description="القيم التي تؤثر على المخزون يتم حفظها من خلال API المشتريات كما هي." actions={<StorelyStatusBadge status={form.category===CATS[0] ? 'success' : 'info'}>{form.category}</StorelyStatusBadge>}>
            <form onSubmit={handleSubmit} className="space-y-3 p-3">
              <div>
                <label className="storely-label">نوع الشراء</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATS.map(c=>(
                    <button key={c} type="button" onClick={()=>setForm({...form,category:c,name:'',sku:'',unit:UNITS[0]})} className={`storely-choice ${form.category===c?'storely-choice-active':''}`}>{c}</button>
                  ))}
                </div>
                {form.category===CATS[0] ? <p className="mt-2 rounded-[6px] border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-xs font-medium text-[#047857]">سيتم تحديث المخزون تلقائياً بعد حفظ الفاتورة.</p> : null}
              </div>

              <div>
                <label className="storely-label">صورة الفاتورة {form.hasVat==='yes'?<span className="text-[#B91C1C]">*</span>:<span className="font-normal text-[#8EA0B1]">اختياري</span>}</label>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e=>{if(e.target.files?.[0])handleImage(e.target.files[0])}}/>
                <button type="button" onClick={()=>fileRef.current?.click()} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[6px] border border-dashed border-[#D7CDC2] bg-[#F7F3ED] px-3 text-sm font-semibold text-[#66737C] hover:border-[#203640] hover:text-[#203640]">
                  {uploading ? <Clock size={16}/> : previewUrl ? <CheckCircle2 size={16}/> : <Upload size={16}/>} {uploading?'جاري الرفع...':previewUrl?'تم الرفع، اضغط للتغيير':'رفع صورة أو PDF'}
                </button>
                {previewUrl&&previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <img src={previewUrl} alt="فاتورة" className="mt-2 h-24 w-full rounded-[6px] border border-[#E7E1D8] object-cover"/> : null}
                {ocrLoading ? <div className="mt-2 text-xs text-[#66737C]">جاري استخراج بيانات الفاتورة...</div> : null}
              </div>

              {ocrItems.length>0 ? (
                <div className="rounded-[6px] border border-[#BFDBFE] bg-[#EFF6FF] p-3">
                  <div className="mb-2 text-xs font-semibold text-[#1D4ED8]">{ocrItems.length} صنف مكتشف بالفاتورة</div>
                  <div className="max-h-52 space-y-2 overflow-y-auto">
                    {ocrItems.map((item,i)=>(
                      <label key={i} className="grid grid-cols-[auto_1fr_auto_76px] items-center gap-2 rounded-[6px] border border-[#BFDBFE] bg-white px-2 py-2 text-xs">
                        <input type="checkbox" checked={!!ocrSelected[i]} onChange={e=>setOcrSelected(s=>({...s,[i]:e.target.checked}))}/>
                        <button type="button" className="truncate text-right font-semibold text-[#203640]" onClick={()=>pickOcrItem(item)}>{item.name}</button>
                        <span className="text-[#66737C]">{item.qty||0} {item.unit||''}</span>
                        <input type="number" step="0.01" value={ocrPrices[i]||''} onChange={e=>setOcrPrices(p=>({...p,[i]:e.target.value}))} placeholder="السعر" className="storely-input h-8"/>
                      </label>
                    ))}
                  </div>
                  <StorelyButton className="mt-3 w-full" variant="primary" onClick={saveBulkOcrItems} disabled={bulkSaving||Object.values(ocrSelected).every(v=>!v)}>{bulkSaving?'جاري الحفظ...':`حفظ ${Object.values(ocrSelected).filter(Boolean).length} صنف`}</StorelyButton>
                </div>
              ) : null}

              {form.category===CATS[0] ? (
                <div className="grid grid-cols-2 gap-2">
                  {[{v:true,l:'صنف موجود'},{v:false,l:'صنف جديد'}].map(b=><button key={String(b.v)} type="button" onClick={()=>setIsExisting(b.v)} className={`storely-choice ${isExisting===b.v?'storely-choice-active':''}`}>{b.l}</button>)}
                </div>
              ) : null}

              <div>
                <label className="storely-label">{form.category===CATS[0]?'اسم الصنف':'اسم الفاتورة'} *</label>
                {form.category===CATS[0]&&isExisting===true ? (
                  <div className="relative">
                    <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="storely-input" placeholder="ابحث عن صنف..."/>
                    {form.name===''||products.filter((p:any)=>p.name.includes(form.name)&&form.name!==p.name).length>0 ? (
                      <div className="absolute right-0 left-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-[6px] border border-[#E7E1D8] bg-white shadow-lg">
                        {products.filter((p:any)=>!form.name||p.name.includes(form.name)).slice(0,10).map((p:any)=>(
                          <button key={p.id} type="button" onClick={()=>setForm({...form,name:p.name,unit:p.unit})} className="flex w-full items-center justify-between border-b border-[#E7E1D8] px-3 py-2 text-right text-sm hover:bg-[#F7F3ED]"><span className="font-semibold text-[#203640]">{p.name}</span><span className="text-xs text-[#66737C]">{p.qty} {p.unit}</span></button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="storely-input" placeholder="اسم الصنف أو الفاتورة"/>}
              </div>

              {form.category===CATS[0] ? (
                <>
                  <div>
                    <label className="storely-label">باركود</label>
                    <div className="flex gap-2">
                      <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} className="storely-input" placeholder="امسح أو أدخل يدوياً"/>
                      <StorelyButton icon={<ScanBarcode size={16}/>} onClick={()=>setShowScan(true)}>مسح</StorelyButton>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="storely-label">الكمية</label><input type="number" min="0" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} className="storely-input" inputMode="numeric"/></div>
                    <div><label className="storely-label">الوحدة</label><select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} className="storely-input">{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
                    <div><label className="storely-label">الحد الأدنى</label><input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:e.target.value})} className="storely-input" inputMode="numeric"/></div>
                  </div>
                </>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <div><label className="storely-label">الإجمالي ({curr}) *</label><input type="number" min="0" step="0.01" required value={form.total_amount} onChange={e=>setForm({...form,total_amount:e.target.value})} className="storely-input text-base font-semibold" inputMode="decimal"/></div>
                <div><label className="storely-label">المورد *</label><input required value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})} className="storely-input" placeholder="اسم المورد"/></div>
              </div>

              {inputTotal>0&&form.hasVat==='yes' ? (
                <div className="rounded-[6px] border border-[#E7E1D8] bg-[#F7F3ED] p-3 text-xs">
                  <div className="flex justify-between"><span className="text-[#66737C]">بدون ضريبة</span><b>{displayAmount} {curr}</b></div>
                  <div className="mt-1 flex justify-between"><span className="text-[#66737C]">ضريبة 15%</span><b className="text-[#B45309]">{displayVat} {curr}</b></div>
                  <div className="mt-2 flex justify-between border-t border-[#E7E1D8] pt-2"><span className="text-[#66737C]">الإجمالي</span><b className="text-[#203640]">{inputTotal.toFixed(2)} {curr}</b></div>
                </div>
              ) : null}

              <div><label className="storely-label">حالة الدفع</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setForm({...form,payment_status:'unpaid'})} className={`storely-choice ${form.payment_status==='unpaid'?'storely-choice-danger':''}`}><Clock size={14}/> غير مدفوعة</button><button type="button" onClick={()=>setForm({...form,payment_status:'paid'})} className={`storely-choice ${form.payment_status==='paid'?'storely-choice-active':''}`}><CheckCircle2 size={14}/> مدفوعة</button></div></div>
              {form.payment_status==='unpaid' ? <div><label className="storely-label">موعد الاستحقاق</label><input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} className="storely-input"/></div> : null}
              <div className="grid gap-3 md:grid-cols-2"><div><label className="storely-label">تاريخ الفاتورة</label><input type="date" value={form.invoice_date} onChange={e=>setForm({...form,invoice_date:e.target.value})} className="storely-input"/></div><div><label className="storely-label">الضريبة *</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setForm({...form,hasVat:'no',invoice_image:''})} className={`storely-choice ${form.hasVat==='no'?'storely-choice-active':''}`}><Ban size={14}/> بدون</button><button type="button" onClick={()=>setForm({...form,hasVat:'yes'})} className={`storely-choice ${form.hasVat==='yes'?'storely-choice-warning':''}`}><Percent size={14}/> 15%</button></div></div></div>
              <div><label className="storely-label">ملاحظات</label><textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} className="storely-input min-h-20 resize-y" placeholder="تفاصيل إضافية"/></div>
              <StorelyButton type="submit" variant="primary" className="w-full" disabled={loading||uploading} icon={<Plus size={16}/>}>{loading?'جاري الحفظ...':'تسجيل الشراء'}</StorelyButton>
            </form>
          </StorelyCard>

          <div className="space-y-4">
            {payables.length>0 ? (
              <StorelyCard title="مستحقات الموردين" description={`${payables.length} فاتورة غير مدفوعة بقيمة ${totalPayableAmount.toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:0})} ${curr}`} actions={<button type="button" className="flex items-center gap-1 text-xs font-semibold text-[#66737C]" onClick={()=>setShowPayables(v=>!v)}>عرض <ChevronDown size={14} className={showPayables?'rotate-180':''}/></button>}>
                {showPayables ? <div className="divide-y divide-[#E7E1D8]">{payables.map((p:any)=>{ const overdue = p.due_date && p.due_date < todayStr; return <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"><div><div className="font-semibold text-[#203640]">{p.name||'بدون اسم'}</div><div className="mt-1 text-xs text-[#66737C]">{p.supplier||'غير محدد'} {p.due_date ? `- استحقاق ${p.due_date}` : ''}</div></div><div className="flex items-center gap-3"><StorelyStatusBadge status={overdue?'danger':'warning'}>{overdue?'متأخرة':'مستحقة'}</StorelyStatusBadge><span className="font-semibold tabular-nums">{Number(p.total_amount||0).toLocaleString('ar-SA', {numberingSystem:'latn',maximumFractionDigits:0})} {curr}</span><StorelyButton size="sm" variant="primary" disabled={payingId===p.id} onClick={()=>markPaid(p.id)}>{payingId===p.id?'...':'دُفعت'}</StorelyButton></div></div>})}</div> : null}
              </StorelyCard>
            ) : null}

            <StorelyCard title="سجل المشتريات" description="جدول تشغيلي للفواتير مع فرز، فلاتر، وفتح التفاصيل." actions={<StorelyStatusBadge status="info">{filteredHistory.length} فاتورة</StorelyStatusBadge>}>
              <div className="grid gap-2 border-b border-[#E7E1D8] p-2.5 md:grid-cols-[auto_auto_minmax(180px,1fr)]">
                <div className="storely-segmented">{[{v:'all',l:'الكل'},{v:'today',l:'اليوم'},{v:'week',l:'أسبوع'},{v:'month',l:'شهر'}].map(p=><button key={p.v} type="button" onClick={()=>setFilterPeriod(p.v)} className={filterPeriod===p.v?'active':''}>{p.l}</button>)}</div>
                <div className="storely-segmented">{[{v:'all',l:'كل الأنواع'},{v:CATS[0],l:CATS[0]},{v:CATS[1],l:CATS[1]},{v:CATS[2],l:CATS[2]}].map(c=><button key={c.v} type="button" onClick={()=>setFilterCat(c.v)} className={filterCat===c.v?'active':''}>{c.l}</button>)}</div>
                <input value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)} placeholder="بحث بالمورد" className="storely-input h-8"/>
              </div>
              <StorelyDataTable
                columns={purchaseColumns}
                data={filteredHistory}
                rowKey="id"
                searchable={false}
                pageSize={10}
                onRowClick={setSelectedPurchase}
                emptyState={<StorelyEmptyState icon={<Package size={18}/>} title="لا توجد مشتريات" description="سجل أول فاتورة من نموذج الشراء لبدء بناء سجل الموردين والمخزون." action={<StorelyButton variant="primary" onClick={()=>document.getElementById('purchase-entry-form')?.scrollIntoView({behavior:'smooth',block:'start'})}>تسجيل شراء</StorelyButton>}/>} 
              />
            </StorelyCard>
          </div>
        </div>
      </div>

      <style jsx>{`
        .storely-label{display:block;margin-bottom:6px;font-size:12px;font-weight:700;color:#66737C}
        .storely-input{width:100%;border:1px solid #D7CDC2;border-radius:5px;background:white;padding:8px 10px;font-size:13px;color:#203640;outline:none;transition:border-color .15s,box-shadow .15s}
        .storely-input:focus{border-color:#203640;box-shadow:0 0 0 3px rgba(32,54,64,.14)}
        .storely-choice{display:inline-flex;min-height:34px;align-items:center;justify-content:center;gap:6px;border:1px solid #D7CDC2;border-radius:5px;background:white;padding:7px 9px;font-size:12px;font-weight:700;color:#66737C;transition:background .15s,border-color .15s,color .15s}
        .storely-choice:hover{border-color:#8EA0B1;background:#F7F3ED;color:#203640}
        .storely-choice-active{border-color:#203640;background:#ECFDF5;color:#203640}
        .storely-choice-danger{border-color:#FECACA;background:#FEF2F2;color:#B91C1C}
        .storely-choice-warning{border-color:#FDE68A;background:#FFFBEB;color:#B45309}
        .storely-segmented{display:flex;gap:3px;align-items:center;border:1px solid #E7E1D8;background:#F7F3ED;border-radius:5px;padding:2px;overflow-x:auto}
        .storely-segmented button{white-space:nowrap;border:0;border-radius:4px;background:transparent;padding:5px 9px;font-size:12px;font-weight:700;color:#66737C;cursor:pointer}
        .storely-segmented button.active{background:white;color:#203640;box-shadow:none}
      `}</style>
    </div>
  )
}
