'use client'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api-client'
import { getMe, getOrgId } from '@/lib/session'
import { cache } from '@/lib/cache'
import { toast } from '@/components/toast'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import { C, STARTER_PRODUCTS } from './constants'
import type { Product } from './constants'

/** حالة صفحة المخزون ودوالها — منقولة كما هي من page.tsx */
export function useInventory() {
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
  const [countSheet, setCountSheet] = useState<Record<string, any> | null>(null)
  async function openCount() {
    const j = await api.get('/api/stock-counts', { org_id: sessionStorage.getItem('s_org_id'), branch_id: sessionStorage.getItem('s_branch_id') })
    setCountSheet(j.latest || {})
  }
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
    toast(`تم إضافة ${items.length} صنف`)
    setTemplateDismissed(true)
    setAddingTemplate(false)
    load()
  }

  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null, ['products','stock_movements'], ()=>load(true))
  useEffect(()=>{ load() },[])
  useVisibilityRefresh(load, 20*60*1000)

  // تحديث صامت كل 20 ثانية — بدون شاشة تحميل، عشان يبان صرف موظف من فرع تاني بدون تحديث يدوي
  useEffect(() => {
    const interval = setInterval(() => load(true), 90000)   // احتياط — التحديث الفوري يجي من useLiveRefresh
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
      toast('يجب أن يكون معامل التحويل رقماً أكبر من صفر','warning')
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
      toast('تم حفظ التعديلات ')
    } else {
      if(!form.qty){toast('أدخل كمية أكبر من صفر','warning');setSaving(false);return}
      // لو ما فيه فرع محدد، الخادم يستخدم أول فرع نشط
      const r=await api.post('/api/products',{org_id:oid,branch_id:sessionStorage.getItem('s_branch_id'),...fields,qty:Number(form.qty)})
      if(!r.success){toast('فشل إضافة المنتج — حاول مرة أخرى','error');setSaving(false);return}
      if(r.movement_failed){toast('تمت إضافة المنتج لكن فشل تسجيل الكمية الابتدائية — عدّلها يدوياً','warning')}
      else toast('تم إضافة المنتج — يظهر بصفحة الموظفين لتخصيصه لمن تحب')
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

  // مكتبة CSV تنحمّل وقت الاستيراد بس (مو مع فتح الصفحة)
  async function handleImportFile(file: File) {
    const Papa = (await import('papaparse')).default
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
      error: () => { toast('تعذر قراءة الملف — تأكد من أنه بصيغة CSV صحيحة', 'error') }
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
    else toast(`تم استيراد ${importPreview.length} صنف (${added} جديد، ${updated} محدّث)`)
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

  return { products, setProducts, currentPage, setCurrentPage, hasMore, setHasMore, totalCount, setTotalCount, page, setPage, loading, setLoading, search, setSearch, statusFilter, setStatusFilter, catFilter, setCatFilter, showAdd, setShowAdd, saving, setSaving, editItem, setEditItem, addQty, setAddQty, confirm, setConfirm, form, setForm, showAudit, setShowAudit, showScan, setShowScan, showJardScan, setShowJardScan, countSheet, setCountSheet, showImport, setShowImport, importPreview, setImportPreview, importing, setImporting, jardNotFound, setJardNotFound, visible, setVisible, businessType, setBusinessType, selectedTemplate, setSelectedTemplate, addingTemplate, setAddingTemplate, templateDismissed, setTemplateDismissed, PAGE_SIZE, PER, importFileRef, allCats, filtered, paginated, lowCount, totalQty, lbl, inp, openCount, addTemplateProducts, load, handleSave, doDelete, downloadImportTemplate, handleImportFile, confirmImport, openEdit, exportCSV }
}

export type InventoryState = ReturnType<typeof useInventory>
