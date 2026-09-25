'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Upload, Download, Paperclip, X, AlertTriangle, Camera, Ruler, CheckCircle2, Trash2, Sparkles, Package, Plus, ScanLine, Search } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getMe, getOrgId } from '@/lib/session'
import { cache } from '@/lib/cache'
import { colors as dsColors } from '@/lib/ds'
import { toast } from '@/components/toast'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import Pagination from '@/components/pagination'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))
import Papa from 'papaparse'

// موحّد مع نظام التصميم المشترك (@/lib/ds)
const C = {
  primary:dsColors.primary, primaryD:dsColors.primaryDark, primaryL:dsColors.primaryLight, primaryB:dsColors.primaryBorder,
  danger:dsColors.danger,  dangerL:dsColors.dangerLight,  dangerB:dsColors.dangerBorder,
  warning:dsColors.warning, warningL:dsColors.warningLight, warningB:dsColors.warningBorder,
  info:dsColors.info,    infoL:dsColors.infoLight,    infoB:dsColors.infoBorder,
  text:dsColors.text, text2:dsColors.text2, text3:dsColors.text3, text4:dsColors.text4,
  bg:dsColors.bg, surface:dsColors.surface, border:dsColors.border, border2:dsColors.border2,
}

interface Product {
  id:string; name:string; sku:string|null; unit:string
  qty:number; reorder_point:number; category:string|null; expiry_date?:string|null
  org_id:string; is_active:boolean; created_at:string; updated_at:string
}

const UNITS = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','درزن','رول','غرام','أخرى']
const CATS_BY_TYPE: Record<string,string[]> = {
  'مطعم':['مواد غذائية','لحوم ودواجن','خضار وفواكه','توابل وصلصات','تغليف','مشروبات','ورقيات','نظافة','أخرى'],
  'كوفي':['قهوة وشاي','حليب وكريمة','سكر ومحليات','أكواب وأغطية','حلويات','مشروبات','ورقيات','نظافة','أخرى'],
  'مخبز':['دقيق وسكر','زبدة وزيوت','بيض وألبان','مكسرات','تغليف','ورقيات','نظافة','أخرى'],
  'بقالة':['مواد غذائية','مشروبات','ألبان وأجبان','منظفات','ورقيات','معلبات','وجبات خفيفة','أخرى'],
  'صيدلية':['أدوية','مستلزمات طبية','مستحضرات تجميل','مكملات غذائية','عناية بالطفل','أخرى'],
  'مستودع':['تغليف','مواد خام','قطع غيار','أدوات','أخرى'],
  'متجر إلكتروني':['تغليف وشحن','ملصقات وطباعة','منتجات للبيع','أخرى'],
  'أخرى':['مواد غذائية','مشروبات','ورقيات','تغليف','نظافة','أخرى'],
}
const DEFAULT_CATS = ['مواد غذائية','مشروبات','ورقيات','تغليف','نظافة','توابل','أخرى']

// منتجات مقترحة جاهزة حسب نوع النشاط — اختيارية بالكامل، تظهر بس لما يكون المخزون فارغ
const STARTER_PRODUCTS: Record<string,{name:string;unit:string;category:string}[]> = {
  'مطعم':[
    {name:'دجاج',unit:'كجم',category:'لحوم ودواجن'},{name:'لحم بقري',unit:'كجم',category:'لحوم ودواجن'},
    {name:'أرز',unit:'كيس',category:'مواد غذائية'},{name:'طماطم',unit:'كجم',category:'خضار وفواكه'},
    {name:'بصل',unit:'كجم',category:'خضار وفواكه'},{name:'زيت طبخ',unit:'لتر',category:'مواد غذائية'},
    {name:'صوص باربكيو',unit:'زجاجة',category:'توابل وصلصات'},{name:'خبز',unit:'كيس',category:'مواد غذائية'},
    {name:'أكياس تغليف',unit:'كرتون',category:'تغليف'},{name:'مياه معدنية',unit:'كرتون',category:'مشروبات'},
  ],
  'كوفي':[
    {name:'حبوب قهوة',unit:'كيس',category:'قهوة وشاي'},{name:'حليب كامل الدسم',unit:'لتر',category:'حليب وكريمة'},
    {name:'شاي',unit:'علبة',category:'قهوة وشاي'},{name:'سكر',unit:'كيس',category:'سكر ومحليات'},
    {name:'أكواب ورقية',unit:'كرتون',category:'أكواب وأغطية'},{name:'أغطية أكواب',unit:'كرتون',category:'أكواب وأغطية'},
    {name:'شوكولاتة',unit:'كجم',category:'حلويات'},{name:'كريمة خفق',unit:'لتر',category:'حليب وكريمة'},
  ],
  'مخبز':[
    {name:'دقيق',unit:'كيس',category:'دقيق وسكر'},{name:'سكر',unit:'كيس',category:'دقيق وسكر'},
    {name:'زبدة',unit:'كجم',category:'زبدة وزيوت'},{name:'بيض',unit:'طبق',category:'بيض وألبان'},
    {name:'خميرة',unit:'كيس',category:'دقيق وسكر'},{name:'حليب',unit:'لتر',category:'بيض وألبان'},
    {name:'مكسرات مشكلة',unit:'كجم',category:'مكسرات'},{name:'أكياس تغليف',unit:'كرتون',category:'تغليف'},
  ],
  'صيدلية':[
    {name:'باراسيتامول',unit:'علبة',category:'أدوية'},{name:'كمامات',unit:'كرتون',category:'مستلزمات طبية'},
    {name:'قفازات طبية',unit:'كرتون',category:'مستلزمات طبية'},{name:'معقم يدين',unit:'زجاجة',category:'مستلزمات طبية'},
    {name:'شاش طبي',unit:'علبة',category:'مستلزمات طبية'},{name:'فيتامينات',unit:'علبة',category:'مكملات غذائية'},
  ],
  // بقالة، مستودع، متجر إلكتروني، أخرى: أصنافها تعتمد كلياً على اختيار صاحب النشاط
  // (منتجات متنوعة جداً بلا معيار موحّد) — نكتفي لهم بالفئات المقترحة بدون قائمة أصناف جاهزة
}

export default function InventoryPage() {
  const [products, setProducts]   = useState<Product[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore]     = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 50
  const [page, setPage]           = useState(1)
  const PER = 25
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'low'|'ok'>('all')
  const [catFilter, setCatFilter] = useState('all')
  const [showAdd, setShowAdd]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [editItem, setEditItem]   = useState<Product|null>(null)
  const [addQty, setAddQty]       = useState(0)
  const [confirm, setConfirm]     = useState<{id:string,name:string}|null>(null)
  const [form, setForm]           = useState({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:'',expiry_date:'',recipe_unit:'',recipe_unit_factor:'' as string|number})
  const [showAudit, setShowAudit] = useState(false)
  const [showScan, setShowScan]   = useState(false)
  const [showJardScan, setShowJardScan] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)
  const [jardNotFound, setJardNotFound] = useState('')
  const [visible, setVisible]     = useState(false)
  const [businessType, setBusinessType] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string,boolean>>({})
  const [addingTemplate, setAddingTemplate] = useState(false)
  const [templateDismissed, setTemplateDismissed] = useState(false)

  async function addTemplateProducts() {
    const items = (STARTER_PRODUCTS[businessType]||[]).filter(p=>selectedTemplate[p.name])
    if(items.length===0) return
    setAddingTemplate(true)
    const oid = sessionStorage.getItem('s_org_id')
    if(!oid){ setAddingTemplate(false); return }
    // لو ما فيه فرع محدد، الخادم يستخدم أول فرع نشط
    const r = await api.post('/api/products', { org_id: oid, branch_id: sessionStorage.getItem('s_branch_id'), items: items.map(i=>({name:i.name,unit:i.unit,category:i.category})) })
    if(!r.success){ toast(r.error||'فشل إضافة الأصناف','error'); setAddingTemplate(false); return }
    for(const id of (r.ids||[])){
      api.post('/api/sync-product-to-staff',{org_id:oid,product_id:id})
    }
    toast(`✅ تم إضافة ${items.length} صنف`)
    setTemplateDismissed(true)
    setAddingTemplate(false)
    load()
  }

  useEffect(()=>{ load() },[])
  useVisibilityRefresh(load, 20*60*1000)

  // تحديث صامت كل 20 ثانية — بدون شاشة تحميل، عشان يبان صرف موظف من فرع تاني بدون تحديث يدوي
  useEffect(() => {
    const interval = setInterval(() => load(true), 20000)
    return () => clearInterval(interval)
  }, [])

  async function load(silent = false) {
    if (!silent) setLoading(true)
    let oid = sessionStorage.getItem('s_org_id')
    // عرض الكاش فوراً
    if(oid){
      const cached = cache.get('inventory:'+oid)
      if(cached && !silent){ setProducts(cached); setLoading(false) }
    }
    if (!oid) {
      oid = await getOrgId()
      if(!oid){if(!silent)setLoading(false);return}
    }
    const bid = sessionStorage.getItem('s_branch_id')
    const [res, me] = await Promise.all([
      api.get('/api/products', { org_id: oid, branch_id: bid, full: 1 }),
      getMe(),
    ])
    if(!res.success){if(!silent)setLoading(false);return}
    const data = res.products
    const org = me?.org
    setProducts((data||[]) as Product[])
    setTotalCount((data||[]).length)
    setHasMore(false)
    setCurrentPage(0)
    if(oid) cache.set('inventory:'+oid, data||[])
    if((org as any)?.business_type) setBusinessType((org as any).business_type)
    if (!silent) { setLoading(false); setTimeout(()=>setVisible(true),50) }
  }

  async function handleSave(e:React.FormEvent) {
    e.preventDefault()
    if(form.recipe_unit_factor && Number(form.recipe_unit_factor)<=0){
      toast('معامل التحويل لازم يكون رقم أكبر من صفر','warning')
      return
    }
    setSaving(true)
    const oid=sessionStorage.getItem('s_org_id')
    if(!oid){setSaving(false);return}
    const fields={name:form.name.trim(),sku:form.sku||null,unit:form.unit,reorder_point:Number(form.reorder_point),category:form.category?.trim()||null,expiry_date:form.expiry_date||null,recipe_unit:form.recipe_unit||null,recipe_unit_factor:form.recipe_unit_factor?Number(form.recipe_unit_factor):null}
    if(editItem){
      const r=await api.patch('/api/products',{org_id:oid,id:editItem.id,...fields,add_qty:addQty})
      if(!r.success){toast('فشل حفظ التعديلات — حاول مرة أخرى','error');setSaving(false);return}
      if(addQty>0){
        if(r.movement_failed){toast('تم حفظ التعديلات لكن فشلت إضافة الكمية — حاول تضيفها مرة أخرى','warning');setSaving(false);setShowAdd(false);setEditItem(null);setAddQty(0);cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:');load();return}
      }
      toast('تم حفظ التعديلات ✓')
    } else {
      if(!form.qty){toast('أدخل كمية أكبر من صفر','warning');setSaving(false);return}
      // لو ما فيه فرع محدد، الخادم يستخدم أول فرع نشط
      const r=await api.post('/api/products',{org_id:oid,branch_id:sessionStorage.getItem('s_branch_id'),...fields,qty:Number(form.qty)})
      if(!r.success){toast('فشل إضافة المنتج — حاول مرة أخرى','error');setSaving(false);return}
      if(r.movement_failed){toast('تمت إضافة المنتج لكن فشل تسجيل الكمية الابتدائية — عدّلها يدوياً','warning')}
      else toast('تم إضافة المنتج ✓ — يظهر بصفحة الموظفين لتخصيصه لمن تحب')
      // ملاحظة: ما نزامنه تلقائياً لأي موظف — يفضل مخفي عن الكل لحد ما تخصصه يدوياً من صفحة "الموظفون"
    }
    setShowAdd(false);setEditItem(null);setAddQty(0)
    setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:'',expiry_date:'',recipe_unit:'',recipe_unit_factor:''})
    cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:');setSaving(false);load()
  }

  async function doDelete() {
    if(!confirm) return
    // الخادم يعطّل الصنف ويشيله من قوائم تخصيص الموظفين (حتى ما يبقى "عالق" بصمت)
    const r=await api.del('/api/products',{org_id:sessionStorage.getItem('s_org_id'),id:confirm.id})
    if(!r.success){toast('فشل حذف المنتج — حاول مرة أخرى','error');setConfirm(null);return}
    toast('تم حذف المنتج');cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:');setConfirm(null);load()
  }

  function downloadImportTemplate() {
    const csv = '\ufeff' + 'اسم المنتج,الفئة,الكمية,الوحدة,الحد الأدنى\nمثال: جبنة شيدر,ألبان,20,كيلو,5\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'نموذج_استيراد_المنتجات.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const rows = (results.data as any[]).map(r => ({
          name: (r['اسم المنتج'] || '').trim(),
          category: (r['الفئة'] || '').trim(),
          qty: Number(r['الكمية']) || 0,
          unit: (r['الوحدة'] || 'قطعة').trim(),
          reorder_point: Number(r['الحد الأدنى']) || 5,
        })).filter(r => r.name)
        setImportPreview(rows)
      },
      error: () => { toast('تعذر قراءة الملف — تأكد إنه بصيغة CSV صحيحة', 'error') }
    })
  }

  async function confirmImport() {
    if (importing || importPreview.length === 0) return
    setImporting(true)
    const oid = sessionStorage.getItem('s_org_id')
    const bid = sessionStorage.getItem('s_branch_id')
    if (!oid) { toast('خطأ بالجلسة', 'error'); setImporting(false); return }

    // المطابقة بالاسم، وتسوية الكمية عبر حركات (مو كتابة مباشرة) — كلها على الخادم
    const r = await api.post('/api/products/import', { org_id: oid, branch_id: bid, rows: importPreview })
    if (!r.success) { toast(r.error || 'فشل الاستيراد', 'error'); setImporting(false); return }
    const added = r.added||0, updated = r.updated||0, failed = r.failed||0
    if(failed>0) toast(`تم استيراد ${added+updated} صنف (${added} جديد، ${updated} محدّث) — لكن فشل ${failed} صنف، حاول تستوردهم يدوياً`,'warning')
    else toast(`✅ تم استيراد ${importPreview.length} صنف (${added} جديد، ${updated} محدّث)`)
    setImportPreview([])
    setShowImport(false)
    setImporting(false)
    load()
  }

  function openEdit(p:Product) {
    setEditItem(p);setAddQty(0)
    const pAny = p as any
    setForm({name:p.name,sku:p.sku||'',unit:p.unit,qty:p.qty,reorder_point:p.reorder_point,category:p.category||'',expiry_date:pAny.expiry_date||'',recipe_unit:pAny.recipe_unit||'',recipe_unit_factor:pAny.recipe_unit_factor||''})
    setShowAdd(true)
  }

  function exportCSV() {
    const csv='\ufeff'+[['اسم المنتج','الفئة','الكمية','الوحدة','الحد الأدنى','الحالة'],...products.map(p=>[p.name,p.category||'—',p.qty,p.unit,p.reorder_point,p.qty<=p.reorder_point?'ناقص':'كافي'])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'المخزون.csv'}).click()
  }

  const allCats=['all',...Array.from(new Set(products.map(p=>p.category||'أخرى'))).sort()]
  const filtered=products
    .filter(p=>!search||p.name?.includes(search)||p.category?.includes(search)||p.sku?.includes(search))
    .filter(p=>statusFilter==='all'||(statusFilter==='low'?p.qty<=p.reorder_point:p.qty>p.reorder_point))
    .filter(p=>catFilter==='all'||(p.category||'أخرى')===catFilter)
  const paginated=filtered.slice((page-1)*PER,page*PER)
  const lowCount=products.filter(p=>p.qty<=p.reorder_point).length
  const totalQty=products.reduce((s,p)=>s+p.qty,0)

  const lbl: React.CSSProperties = {fontSize:10,fontWeight:700,color:C.text3,display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'.06em'}
  const inp = (extra?:any): React.CSSProperties => ({width:'100%',padding:'10px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',background:'white',color:C.text,fontFamily:'inherit',...extra})

  if(loading) return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.4s ease infinite}`}</style>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
        <div className="sk" style={{height:24,width:100,background:C.border2,borderRadius:6}}/>
        <div className="sk" style={{height:34,width:80,background:C.border,borderRadius:8}}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
        {[1,2,3,4].map(i=><div key={i} className="sk" style={{height:72,borderRadius:10,background:C.border}}/>)}
      </div>
      <div className="sk" style={{height:400,borderRadius:12,background:C.border}}/>
    </div>
  )

  return (
    <div className="iv" style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <style>{IV_CSS}</style>
      <style>{`
        @keyframes up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .u{animation:up .3s ease both}
        input:focus,select:focus{border-color:${C.primary}!important;outline:none!important;box-shadow:0 0 0 3px ${C.primaryL}!important}
        .chip{padding:5px 12px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;border:1px solid;transition:all .15s;font-family:inherit}
        .rh{transition:background .1s}
        .rh:hover{background:#f9f9f8}
        .tap{transition:all .12s;cursor:pointer}
        .tap:active{transform:scale(.97)}
        /* mobile grid */
        .mgrid{display:block}
        .dtable{display:none}
        @media(min-width:640px){
          .mgrid{display:none}
          .dtable{display:block}
        }
        @media(min-width:768px){
          .s4{grid-template-columns:repeat(4,1fr)!important}
        }
      `}</style>

      {/* Delete confirm */}
      {confirm&&(
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:300,fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',animation:'slideUp .2s ease'}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:6,textAlign:'center'}}>حذف "{confirm.name}"؟</div>
            <div style={{fontSize:11,color:C.text3,textAlign:'center',marginBottom:16}}>لا يمكن التراجع عن هذا الإجراء</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setConfirm(null)} style={{flex:1,padding:'10px',background:C.bg,color:C.text2,border:`1px solid ${C.border2}`,borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
              <button onClick={doDelete} style={{flex:1,padding:'10px',background:C.danger,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode */}
      {showScan&&<Suspense fallback={null}><BarcodeScanner onScan={(code:string)=>{setForm(f=>({...f,sku:code}));setShowScan(false)}} onClose={()=>setShowScan(false)}/></Suspense>}
      {showJardScan&&<Suspense fallback={null}><BarcodeScanner onScan={(code:string)=>{
        setShowJardScan(false)
        const found=products.find(p=>p.sku===code)
        if(found){ setJardNotFound(''); openEdit(found) }
        else { setJardNotFound(code) }
      }} onClose={()=>setShowJardScan(false)}/></Suspense>}
      {showImport&&(
        <div style={{position:'fixed',inset:0,zIndex:3000,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:520,maxHeight:'85vh',overflowY:'auto' as const,padding:20}}>
            <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:4,display:'flex',alignItems:'center',gap:6}}><Upload size={16} strokeWidth={2.25}/> استيراد منتجات من ملف</div>
            <div style={{fontSize:12,color:C.text4,marginBottom:16}}>ارفع ملف CSV بصيغة Excel — سيتم تحديث الأصناف الموجودة وإضافة الجديدة تلقائياً</div>

            {importPreview.length===0 ? (
              <>
                <button onClick={downloadImportTemplate} type="button" style={{width:'100%',padding:10,background:C.bg,border:`1px solid ${C.border2}`,borderRadius:10,fontSize:12,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:'inherit',marginBottom:10}}>
                  تحميل نموذج فارغ (CSV)
                </button>
                <input ref={importFileRef} type="file" accept=".csv" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])handleImportFile(e.target.files[0])}}/>
                <button onClick={()=>importFileRef.current?.click()} type="button" style={{width:'100%',padding:14,background:C.primaryL,border:`1.5px dashed ${C.primaryB}`,borderRadius:10,fontSize:13,fontWeight:700,color:C.primary,cursor:'pointer',fontFamily:'inherit'}}>
                  <Paperclip size={13} strokeWidth={2.25} style={{display:'inline',verticalAlign:'-2px',marginLeft:4}}/> اختر ملف CSV للاستيراد
                </button>
              </>
            ) : (
              <>
                <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8}}>معاينة ({importPreview.length} صنف)</div>
                <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden',marginBottom:14,maxHeight:280,overflowY:'auto' as const}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead>
                      <tr style={{background:C.bg}}>
                        <th style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:C.text3}}>الاسم</th>
                        <th style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:C.text3}}>الكمية</th>
                        <th style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:C.text3}}>الوحدة</th>
                        <th style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:C.text3}}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((r,i)=>{
                        const exists = products.some(p=>p.name.trim()===r.name)
                        return (
                          <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                            <td style={{padding:'6px 8px',color:C.text}}>{r.name}</td>
                            <td style={{padding:'6px 8px',color:C.text2}}>{r.qty}</td>
                            <td style={{padding:'6px 8px',color:C.text2}}>{r.unit}</td>
                            <td style={{padding:'6px 8px'}}>
                              <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:5,background:exists?C.warningL:C.primaryL,color:exists?C.warning:C.primary}}>
                                {exists?'تحديث':'جديد'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setImportPreview([])} type="button" style={{flex:1,padding:11,background:C.bg,border:`1px solid ${C.border2}`,borderRadius:10,fontSize:12,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                  <button onClick={confirmImport} disabled={importing} type="button" style={{flex:2,padding:11,background:C.primary,border:'none',borderRadius:10,fontSize:12,fontWeight:700,color:'white',cursor:importing?'not-allowed':'pointer',fontFamily:'inherit',opacity:importing?.7:1}}>
                    {importing?'جاري الاستيراد...':<span style={{display:'inline-flex',alignItems:'center',gap:6}}><CheckCircle2 size={14} strokeWidth={2.25}/> تأكيد استيراد {importPreview.length} صنف</span>}
                  </button>
                </div>
              </>
            )}

            <button onClick={()=>{setShowImport(false);setImportPreview([])}} type="button" style={{width:'100%',padding:9,background:'none',border:'none',fontSize:11,color:C.text4,cursor:'pointer',fontFamily:'inherit',marginTop:10}}>إغلاق</button>
          </div>
        </div>
      )}

      {jardNotFound&&(
        <div style={{position:'fixed',bottom:20,left:'50%',transform:'translateX(-50%)',background:C.dangerL,color:C.danger,border:`1px solid ${C.dangerB}`,borderRadius:10,padding:'10px 16px',fontSize:12,fontWeight:600,zIndex:2000,boxShadow:'0 4px 16px rgba(0,0,0,.1)'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:5}}><AlertTriangle size={13} strokeWidth={2.25}/> لا يوجد منتج بهذا الباركود: {jardNotFound}</span>
          <button onClick={()=>setJardNotFound('')} style={{marginRight:8,background:'none',border:'none',color:C.danger,cursor:'pointer',display:'flex',alignItems:'center'}}><X size={15} strokeWidth={2.5}/></button>
        </div>
      )}

      {/* Add/Edit Sheet */}
      {showAdd&&(
        <div className="iv-sheet-wrap" style={{position:'fixed',inset:0,background:'rgba(16,24,40,.45)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div className="iv-sheet" style={{background:'white',borderRadius:'14px 14px 0 0',padding:'0 0 env(safe-area-inset-bottom)',width:'100%',maxWidth:520,maxHeight:'92vh',display:'flex',flexDirection:'column',animation:'slideUp .25s ease',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
            <div style={{padding:'10px 18px 0',flexShrink:0}}>
              <div style={{width:36,height:4,borderRadius:99,background:C.border2,margin:'0 auto 14px'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{fontSize:17,fontWeight:700,color:C.text}}>{editItem?'تعديل المنتج':'منتج جديد'}</div>
                <button onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{width:28,height:28,borderRadius:'50%',border:`1px solid ${C.border2}`,background:C.bg,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.text3}}><X size={14} strokeWidth={2.25}/></button>
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'0 18px 18px'}}>
              <form onSubmit={handleSave}>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div>
                    <label style={lbl}>اسم المنتج *</label>
                    <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp()} placeholder="مثال: اسم المنتج"/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <label style={lbl}>الفئة</label>
                      <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp()}>
                        <option value="">— اختر —</option>
                        {(CATS_BY_TYPE[businessType]||DEFAULT_CATS).map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>الوحدة</label>
                      <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={inp()}>
                        {UNITS.map(u=><option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <label style={lbl}>باركود</label>
                      <div style={{display:'flex',gap:5}}>
                        <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} style={{...inp(),flex:1}} placeholder="اختياري"/>
                        <button type="button" onClick={()=>setShowScan(true)} style={{padding:'0 10px',background:C.primaryL,color:C.primary,border:`1px solid ${C.primaryB}`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Camera size={15} strokeWidth={2.25}/></button>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>الحد الأدنى</label>
                      <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:Number(e.target.value)})} style={inp()}/>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>تاريخ انتهاء الصلاحية (اختياري)</label>
                    <input type="date" value={form.expiry_date} onChange={e=>setForm({...form,expiry_date:e.target.value})} style={inp()}/>
                  </div>

                  {/* تحويل الوحدة الدقيقة — لدقة استخدام هذا المنتج بالوصفات */}
                  <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                      <span style={{display:'flex',alignItems:'center'}}><Ruler size={13} strokeWidth={2.25}/></span>
                      <div style={{fontSize:13,fontWeight:600,color:C.text}}>تحويل الوحدة الدقيقة (اختياري)</div>
                      {form.recipe_unit && form.recipe_unit_factor && Number(form.recipe_unit_factor)>0 && (
                        <span style={{fontSize:12,fontWeight:600,color:C.primary,marginRight:'auto'}}>محدد</span>
                      )}
                    </div>
                    <div style={{fontSize:12,color:C.text3,marginBottom:8,lineHeight:1.6}}>مفيد لو تستخدم هذا المنتج بوصفات — مثال: الكيس فيه كم جرام، الكرتون فيه كم علبة</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      <div>
                        <label style={lbl}>الوحدة الدقيقة</label>
                        <input value={form.recipe_unit} onChange={e=>setForm({...form,recipe_unit:e.target.value})} style={inp()} placeholder="مثال: جرام"/>
                      </div>
                      <div>
                        <label style={lbl}>الكمية بالوحدة الدقيقة</label>
                        <input type="number" min="0" step="any" value={form.recipe_unit_factor} onChange={e=>setForm({...form,recipe_unit_factor:e.target.value})} style={inp()} placeholder={`1 ${form.unit} = ؟ ${form.recipe_unit||'وحدة'}`}/>
                      </div>
                    </div>
                    {form.recipe_unit && form.recipe_unit_factor && Number(form.recipe_unit_factor)>0 && (
                      <div style={{fontSize:12,fontWeight:600,color:C.text2,marginTop:8}}>
                        1 {form.unit} = {form.recipe_unit_factor} {form.recipe_unit}
                      </div>
                    )}
                  </div>

                  {editItem?(
                    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
                      <div style={{fontSize:13,color:C.text2,marginBottom:8}}>الكمية الحالية: <b style={{color:C.text}}>{editItem.qty} {form.unit}</b></div>
                      <label style={lbl}>كمية تضيفها</label>
                      <input type="number" min="0" value={addQty||''} onChange={e=>setAddQty(Number(e.target.value)||0)} style={{...inp(),fontSize:16,fontWeight:600}} placeholder="0"/>
                      {addQty>0&&<div style={{fontSize:12,color:C.text2,marginTop:6}}>الإجمالي بعد الإضافة: {editItem.qty+addQty} {form.unit}</div>}
                    </div>
                  ):(
                    <div>
                      <label style={lbl}>الكمية الابتدائية *</label>
                      <input type="number" min="1" required value={form.qty||''} onChange={e=>setForm({...form,qty:Number(e.target.value)})} style={{...inp(),fontSize:16,fontWeight:600}} placeholder="0"/>
                    </div>
                  )}
                </div>
                {editItem && (
                  <button type="button" onClick={()=>{setConfirm({id:editItem.id,name:editItem.name});setShowAdd(false)}}
                    style={{width:'100%',padding:'10px',marginTop:16,background:C.dangerL,color:C.danger,border:`1px solid ${C.dangerB}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    <Trash2 size={13} strokeWidth={2.25} style={{display:'inline',verticalAlign:'-2px',marginLeft:4}}/> حذف هذا المنتج
                  </button>
                )}
                <div style={{display:'flex',gap:8,marginTop:editItem?8:16}}>
                  <button type="button" onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{flex:1,padding:'11px',background:C.bg,color:C.text2,border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                  <button type="submit" disabled={saving} style={{flex:2,padding:'11px',background:C.primary,color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:saving?.7:1}}>
                    {saving?'جاري الحفظ...':editItem?'حفظ التعديلات':'إضافة المنتج'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* العنوان + الأدوات */}
      <div className="iv-head">
        <div style={{minWidth:0}}>
          <h1 className="iv-title">المخزون</h1>
          <p className="iv-sub">{products.length} صنف · {totalQty.toLocaleString('en-US')} وحدة إجمالاً</p>
        </div>
        <div className="iv-tools">
          <button className="sh-btn" onClick={exportCSV} title="تصدير CSV"><Download size={16}/><span className="iv-hide-sm">تصدير</span></button>
          <button className="sh-btn" onClick={()=>setShowImport(true)} title="استيراد من ملف"><Upload size={16}/><span className="iv-hide-sm">استيراد</span></button>
          <button className="sh-btn" onClick={()=>setShowJardScan(true)} title="جرد بالكاميرا"><ScanLine size={16}/><span className="iv-hide-sm">جرد بالباركود</span></button>
          <button className="sh-btn sh-btn-primary" onClick={()=>{setEditItem(null);setAddQty(0);setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:'',expiry_date:'',recipe_unit:'',recipe_unit_factor:''});setShowAdd(true)}}>
            <Plus size={16}/> إضافة منتج
          </button>
        </div>
      </div>

      {/* الوحدات الدقيقة الناقصة */}
      {(()=>{
        const missing = products.filter((p:any)=>!p.recipe_unit_factor)
        if(missing.length===0) return null
        return (
          <div className="iv-note">
            <button type="button" className="iv-note-head" onClick={()=>setShowAudit(v=>!v)}>
              <Ruler size={15}/>
              <span style={{flex:1}}>{missing.length} منتج بدون تحويل للوحدة الدقيقة — مهم لو تستخدمها في وصفات</span>
              <span className="iv-link">{showAudit?'إخفاء':'عرض'}</span>
            </button>
            {showAudit && (
              <div className="iv-note-list">
                {missing.map((p:any)=>(
                  <button key={p.id} type="button" className="iv-note-item" onClick={()=>openEdit(p)}>
                    <span>{p.name}</span><span className="iv-link">تحديد التحويل</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* الفلاتر */}
      <div className="iv-bar">
        <div className="iv-tabs">
          {([
            {k:'all' as const, l:'الكل', n:products.length},
            {k:'low' as const, l:'ناقص', n:lowCount},
            {k:'ok' as const, l:'كافٍ', n:products.length-lowCount},
          ]).map(tb=>(
            <button key={tb.k} className={`iv-tab${statusFilter===tb.k?' on':''}`} onClick={()=>{setStatusFilter(tb.k);setPage(1)}}>
              {tb.l} <span className="iv-tab-n" style={tb.k==='low'&&tb.n>0?{color:C.danger}:undefined}>{tb.n}</span>
            </button>
          ))}
        </div>
        <div className="iv-search">
          <Search size={15}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="ابحث بالاسم أو الباركود"/>
        </div>
      </div>
      {allCats.length>1 && (
        <div className="iv-cats">
          {allCats.map(cat=>(
            <button key={cat} className={`iv-cat${catFilter===cat?' on':''}`} onClick={()=>{setCatFilter(cat);setPage(1)}}>{cat==='all'?'كل الفئات':cat}</button>
          ))}
        </div>
      )}

      {filtered.length===0 && !search && catFilter==='all' && STARTER_PRODUCTS[businessType] && !templateDismissed ? (
        <div className="u" style={{background:'white',borderRadius:14,padding:'28px 24px',border:`1.5px solid ${C.primaryB}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            <div style={{display:'flex',justifyContent:'center'}}><Sparkles size={22} strokeWidth={1.75}/></div>
            <div style={{fontSize:15,fontWeight:800,color:C.text}}>نقترح عليك هذي الأصناف الشائعة لـ{businessType}</div>
          </div>
          <div style={{fontSize:12,color:C.text4,marginBottom:18}}>اختر اللي يناسبك وراح نضيفها لمخزونك بضغطة وحدة — أو تجاهل وابدأ يدوياً</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8,marginBottom:18}}>
            {(STARTER_PRODUCTS[businessType]||[]).map(item=>(
              <label key={item.name} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:selectedTemplate[item.name]?(C.primaryL):C.bg,border:`1.5px solid ${selectedTemplate[item.name]?(C.primaryB):C.border}`,borderRadius:9,cursor:'pointer',transition:'all .15s'}}>
                <input type="checkbox" checked={!!selectedTemplate[item.name]}
                  onChange={e=>setSelectedTemplate(prev=>({...prev,[item.name]:e.target.checked}))}
                  style={{width:16,height:16,accentColor:C.primary,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:600,color:C.text}}>{item.name}</span>
              </label>
            ))}
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' as const}}>
            <button onClick={addTemplateProducts} disabled={addingTemplate||Object.values(selectedTemplate).every(v=>!v)}
              style={{padding:'10px 20px',background:Object.values(selectedTemplate).every(v=>!v)?C.border2:(C.primary),color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:Object.values(selectedTemplate).every(v=>!v)?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {addingTemplate?'جاري الإضافة...':<span style={{display:'inline-flex',alignItems:'center',gap:6}}><CheckCircle2 size={14} strokeWidth={2.25}/> أضف المحدد ({Object.values(selectedTemplate).filter(Boolean).length})</span>}
            </button>
            <button onClick={()=>{
                const all: Record<string,boolean> = {}
                for(const p of (STARTER_PRODUCTS[businessType]||[])) all[p.name]=true
                setSelectedTemplate(all)
              }}
              style={{padding:'10px 16px',background:'none',color:C.primary,border:`1.5px solid ${C.primaryB}`,borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              تحديد الكل
            </button>
            <button onClick={()=>setTemplateDismissed(true)}
              style={{padding:'10px 16px',background:'none',color:C.text4,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginRight:'auto'}}>
              تجاهل، أبدأ يدوياً
            </button>
          </div>
        </div>
      ) : filtered.length===0?(
        <div className="u" style={{background:'white',borderRadius:12,padding:'48px 24px',textAlign:'center',border:`1px solid ${C.border}`}}>
          <div style={{marginBottom:8,display:'flex',justifyContent:'center',color:C.text4}}><Package size={32} strokeWidth={1.5}/></div>
          <div style={{fontSize:14,fontWeight:600,color:C.text2,marginBottom:4}}>{search||catFilter!=='all'?'لا توجد نتائج':'المخزون فارغ'}</div>
          <div style={{fontSize:11,color:C.text4,marginBottom:12}}>{search||catFilter!=='all'?'جرب كلمة أو فئة أخرى':'ابدأ بإضافة أول منتج'}</div>
          {(search||catFilter!=='all')&&<button onClick={()=>{setSearch('');setCatFilter('all');setStatusFilter('all')}} style={{padding:'7px 16px',background:C.bg,color:C.text2,border:`1px solid ${C.border2}`,borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إزالة الفلاتر</button>}
        </div>
      ):(
        <>
          {/* الجوال: قائمة */}
          <div className="mgrid iv-list">
            {paginated.map(p=>{
              const isOut=p.qty===0,isLow=p.qty<=p.reorder_point
              const exp=(p as any).expiry_date?Math.ceil((new Date((p as any).expiry_date).getTime()-Date.now())/86400000):null
              return (
                <button key={p.id} className="iv-item" onClick={()=>openEdit(p)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="iv-name">{p.name}</div>
                    <div className="iv-meta">
                      <StatusDot out={isOut} low={isLow}/>
                      {p.category&&<span>· {p.category}</span>}
                      {exp!==null&&exp<=7&&<span style={{color:exp<0?C.danger:C.warning}}>· {exp<0?'منتهي الصلاحية':exp===0?'ينتهي اليوم':`ينتهي خلال ${exp} يوم`}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'left',flexShrink:0}}>
                    <div className="iv-qty" style={{color:isOut?C.danger:isLow?C.warning:C.text}}>{p.qty} <span className="iv-unit">{p.unit}</span></div>
                    <div className="iv-min">الحد {p.reorder_point}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* الكمبيوتر: جدول */}
          <div className="dtable iv-table-wrap">
            <table className="iv-table">
              <thead>
                <tr>{['المنتج','الفئة','الكمية','الحد الأدنى','الحالة',''].map((h,i)=><th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {paginated.map(p=>{
                  const isOut=p.qty===0,isLow=p.qty<=p.reorder_point
                  const exp=(p as any).expiry_date?Math.ceil((new Date((p as any).expiry_date).getTime()-Date.now())/86400000):null
                  return (
                    <tr key={p.id} onClick={()=>openEdit(p)}>
                      <td>
                        <div className="iv-name">{p.name}</div>
                        <div className="iv-meta">
                          {p.sku&&<span dir="ltr">#{p.sku}</span>}
                          {exp!==null&&exp<=7&&<span style={{color:exp<0?C.danger:C.warning}}>{exp<0?'منتهي الصلاحية':exp===0?'ينتهي اليوم':`ينتهي خلال ${exp} يوم`}</span>}
                        </div>
                      </td>
                      <td style={{color:C.text3}}>{p.category||'—'}</td>
                      <td style={{whiteSpace:'nowrap'}}><span className="iv-qty" style={{color:isOut?C.danger:isLow?C.warning:C.text}}>{p.qty}</span> <span className="iv-unit">{p.unit}</span></td>
                      <td style={{color:C.text3,whiteSpace:'nowrap'}}>{p.reorder_point} {p.unit}</td>
                      <td><StatusDot out={isOut} low={isLow}/></td>
                      <td style={{textAlign:'left',whiteSpace:'nowrap'}} onClick={e=>e.stopPropagation()}>
                        <button className="iv-act" onClick={()=>openEdit(p)}>تعديل</button>
                        <button className="iv-act" style={{color:C.danger}} onClick={()=>setConfirm({id:p.id,name:p.name})}>حذف</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination total={filtered.length} page={page} perPage={PER} onPage={setPage}/>
        </>
      )}
    </div>
  )
}

function StatusDot({ out, low }: { out: boolean; low: boolean }) {
  const c = out ? C.danger : low ? C.warning : C.primary
  return <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12.5,fontWeight:500,color:C.text2}}><span style={{width:7,height:7,borderRadius:'50%',background:c}}/>{out?'نفد':low?'ناقص':'كافٍ'}</span>
}

const IV_CSS = `
  .iv{max-width:1180px}
  .iv-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
  .iv-title{font-size:20px;font-weight:700;color:${C.text};margin:0}
  .iv-sub{font-size:13px;color:${C.text3};margin:4px 0 0;font-variant-numeric:tabular-nums}
  .iv-tools{display:flex;gap:8px;flex-wrap:wrap}
  @media(max-width:640px){.iv-hide-sm{display:none}.iv-tools .sh-btn{padding:9px 11px}}
  .iv-note{background:${C.surface};border:1px solid ${C.border};border-radius:10px;margin-bottom:14px}
  .iv-note-head{width:100%;display:flex;align-items:center;gap:10px;padding:11px 14px;border:none;background:none;font-family:inherit;font-size:13px;color:${C.text2};cursor:pointer;text-align:right}
  .iv-note-head svg{color:${C.text4};flex-shrink:0}
  .iv-link{color:${C.primary};font-weight:600;font-size:13px}
  .iv-note-list{border-top:1px solid ${C.border};max-height:240px;overflow-y:auto}
  .iv-note-item{width:100%;display:flex;justify-content:space-between;padding:10px 14px;border:none;border-bottom:1px solid ${C.border};background:none;font-family:inherit;font-size:13px;color:${C.text};cursor:pointer;text-align:right}
  .iv-note-item:hover{background:#f9fafb}
  .iv-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
  .iv-tabs{display:inline-flex;background:#eef0f3;border-radius:9px;padding:3px}
  .iv-tab{border:none;background:none;padding:7px 14px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;color:${C.text2};cursor:pointer;white-space:nowrap}
  .iv-tab.on{background:white;color:${C.text};font-weight:600;box-shadow:0 1px 2px rgba(16,24,40,.08)}
  .iv-tab-n{color:${C.text4};font-weight:500;margin-right:4px;font-variant-numeric:tabular-nums}
  .iv-search{flex:1;min-width:200px;position:relative;display:flex;align-items:center}
  .iv-search svg{position:absolute;right:11px;color:${C.text4};pointer-events:none}
  .iv-search input{width:100%;padding:9px 34px 9px 12px;border:1px solid ${C.border2};border-radius:8px;font-size:13px;font-family:inherit;background:white;color:${C.text};outline:none}
  .iv-cats{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:12px}
  .iv-cat{flex-shrink:0;padding:5px 11px;border-radius:99px;border:1px solid ${C.border};background:white;font-family:inherit;font-size:12.5px;color:${C.text2};cursor:pointer;white-space:nowrap}
  .iv-cat.on{border-color:${C.text};color:${C.text};font-weight:600}
  .iv-list{display:block;background:white;border:1px solid ${C.border};border-radius:12px;overflow:hidden}
  .iv-item{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border:none;border-bottom:1px solid ${C.border};background:none;font-family:inherit;text-align:right;cursor:pointer}
  .iv-item:last-child{border-bottom:none}
  .iv-item:active{background:#f9fafb}
  .iv-name{font-size:14px;font-weight:600;color:${C.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .iv-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;color:${C.text3};margin-top:3px}
  .iv-qty{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
  .iv-unit{font-size:12px;font-weight:400;color:${C.text3}}
  .iv-min{font-size:11.5px;color:${C.text4};margin-top:2px}
  .iv-table-wrap{background:white;border:1px solid ${C.border};border-radius:12px;overflow:hidden}
  .iv-table{width:100%;border-collapse:collapse}
  .iv-table th{text-align:right;padding:10px 16px;font-size:12px;font-weight:600;color:${C.text3};background:#f9fafb;border-bottom:1px solid ${C.border};white-space:nowrap}
  .iv-table td{padding:12px 16px;border-bottom:1px solid ${C.border};font-size:13px;color:${C.text};vertical-align:middle}
  .iv-table tbody tr{cursor:pointer}
  .iv-table tbody tr:hover td{background:#f9fafb}
  .iv-table tbody tr:last-child td{border-bottom:none}
  .iv-act{border:none;background:none;padding:4px 8px;font-family:inherit;font-size:13px;font-weight:500;color:${C.text2};cursor:pointer;border-radius:6px}
  .iv-act:hover{background:#f2f4f7}
  @media(min-width:768px){.iv-sheet-wrap{align-items:center!important;padding:20px}.iv-sheet{border-radius:14px!important}}
`

