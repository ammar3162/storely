'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, lazy, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cache } from '@/lib/cache'
import { toast } from '@/components/toast'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import Pagination from '@/components/pagination'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  danger:'#e24b4a',  dangerL:'#fef2f2',  dangerB:'#fecaca',
  warning:'#ba7517', warningL:'#fffbeb', warningB:'#fde68a',
  info:'#378add',    infoL:'#eff6ff',    infoB:'#bfdbfe',
  text:'#1c1c1a', text2:'#3d3d3a', text3:'#5f5e5a', text4:'#888780',
  bg:'#f5f5f4', surface:'#ffffff', border:'#ebebea', border2:'#e0e0dd',
}

interface Product {
  id:string; name:string; sku:string|null; unit:string
  qty:number; reorder_point:number; category:string|null
  org_id:string; is_active:boolean; created_at:string; updated_at:string
}

const UNITS = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','درزن','رول','غرام','أخرى']
const CATS_BY_TYPE: Record<string,string[]> = {
  'مطعم':['مواد غذائية','لحوم ودواجن','خضار وفواكه','توابل وصلصات','تغليف','مشروبات','ورقيات','نظافة','أخرى'],
  'كوفي':['قهوة وشاي','حليب وكريمة','سكر ومحليات','أكواب وأغطية','حلويات','مشروبات','ورقيات','نظافة','أخرى'],
  'مخبز':['دقيق وسكر','زبدة وزيوت','بيض وألبان','مكسرات','تغليف','ورقيات','نظافة','أخرى'],
  'بقالة':['مواد غذائية','مشروبات','ألبان وأجبان','منظفات','ورقيات','معلبات','وجبات خفيفة','أخرى'],
  'أخرى':['مواد غذائية','مشروبات','ورقيات','تغليف','نظافة','أخرى'],
}
const DEFAULT_CATS = ['مواد غذائية','مشروبات','ورقيات','تغليف','نظافة','توابل','أخرى']

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
  const [form, setForm]           = useState({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''})
  const [showScan, setShowScan]   = useState(false)
  const [visible, setVisible]     = useState(false)
  const [businessType, setBusinessType] = useState('')
  const sb = createClient()

  useEffect(()=>{ load() },[])
  useVisibilityRefresh(load, 20*60*1000)

  async function load() {
    setLoading(true)
    let oid = sessionStorage.getItem('s_org_id')
    // عرض الكاش فوراً
    if(oid){
      const cached = cache.get('inventory:'+oid)
      if(cached){ setProducts(cached); setLoading(false) }
    }
    if (!oid) {
      const{data:{user}}=await sb.auth.getUser()
      if(!user){setLoading(false);return}
      const{data:p}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
      if(!p){setLoading(false);return}
      oid=p.org_id; sessionStorage.setItem('s_org_id',oid!)
    }
    const bid = sessionStorage.getItem('s_branch_id')
    // جيب العدد الكلي
    const { count } = await sb.from('products').select('*',{count:'exact',head:true}).eq('org_id',oid).eq('is_active',true)
    setTotalCount(count||0)
    
    let q = sb.from('products').select('*').eq('org_id',oid).eq('is_active',true)
    if (bid) q = q.eq('branch_id',bid)
    const{data}=await q.order('name')
    setProducts(data||[])
    setHasMore(false)
    setCurrentPage(0)
    if(oid) cache.set('inventory:'+oid, data||[])
    const{data:org}=await (sb.from('organizations') as any).select('business_type').eq('id',oid).single()
    if((org as any)?.business_type) setBusinessType((org as any).business_type)
    setLoading(false)
    setTimeout(()=>setVisible(true),50)
  }

  async function handleSave(e:React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const{data:{user}}=await sb.auth.getUser()
    if(!user){setSaving(false);return}
    const oid=sessionStorage.getItem('s_org_id')
    if(!oid){setSaving(false);return}
    if(editItem){
      await sb.from('products').update({name:form.name.trim(),sku:form.sku||null,unit:form.unit,reorder_point:Number(form.reorder_point),category:form.category?.trim()||null}).eq('id',editItem.id)
      if(addQty>0) await sb.from('stock_movements').insert({product_id:editItem.id,profile_id:user.id,type:'in',qty_change:addQty,note:'إضافة مخزون'})
      toast('تم حفظ التعديلات ✓')
    } else {
      if(!form.qty){toast('أدخل كمية أكبر من صفر','warning');setSaving(false);return}
      let bid=sessionStorage.getItem('s_branch_id')
      if(!bid){
        const{data:b}=await sb.from('branches').select('id').eq('org_id',oid).eq('is_active',true).order('created_at').limit(1).single()
        bid=b?.id||null
      }
      const{data:np}=await sb.from('products').insert({org_id:oid,branch_id:bid,name:form.name.trim(),sku:form.sku||null,unit:form.unit,qty:Number(form.qty),reorder_point:Number(form.reorder_point),category:form.category?.trim()||null,is_active:true}).select().single()
      if(np) {
        await sb.from('stock_movements').insert({product_id:np.id,profile_id:user.id,type:'in',qty_change:Number(form.qty),note:'إضافة أولية'})
        fetch('/api/sync-product-to-staff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid,product_id:np.id})}).catch(()=>{})
      }
      toast('تم إضافة المنتج ✓')
    }
    setShowAdd(false);setEditItem(null);setAddQty(0)
    setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''})
    cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:');setSaving(false);load()
  }

  async function doDelete() {
    if(!confirm) return
    await sb.from('products').update({is_active:false}).eq('id',confirm.id)
    toast('تم حذف المنتج');cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:');setConfirm(null);load()
  }

  function openEdit(p:Product) {
    setEditItem(p);setAddQty(0)
    setForm({name:p.name,sku:p.sku||'',unit:p.unit,qty:p.qty,reorder_point:p.reorder_point,category:p.category||''})
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
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',opacity:visible?1:0,transition:'opacity .3s'}}>
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
        .mgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
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

      {/* Add/Edit Sheet */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:'18px 18px 0 0',padding:'0 0 env(safe-area-inset-bottom)',width:'100%',maxWidth:500,maxHeight:'92vh',display:'flex',flexDirection:'column',animation:'slideUp .25s ease',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
            <div style={{padding:'10px 18px 0',flexShrink:0}}>
              <div style={{width:32,height:3,borderRadius:99,background:C.border2,margin:'0 auto 14px'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{fontSize:15,fontWeight:700,color:C.text}}>{editItem?'تعديل المنتج':'منتج جديد'}</div>
                <button onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{width:28,height:28,borderRadius:'50%',border:`1px solid ${C.border2}`,background:C.bg,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',color:C.text3}}>✕</button>
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'0 18px 18px'}}>
              <form onSubmit={handleSave}>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div>
                    <label style={lbl}>اسم المنتج *</label>
                    <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp()} placeholder="مثال: قهوة عربية"/>
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
                        <button type="button" onClick={()=>setShowScan(true)} style={{padding:'0 10px',background:C.primaryL,color:C.primary,border:`1px solid ${C.primaryB}`,borderRadius:8,fontSize:14,cursor:'pointer'}}>📷</button>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>الحد الأدنى</label>
                      <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:Number(e.target.value)})} style={inp()}/>
                    </div>
                  </div>
                  {editItem?(
                    <div style={{background:C.primaryL,border:`1px solid ${C.primaryB}`,borderRadius:10,padding:12}}>
                      <div style={{fontSize:12,color:C.primary,marginBottom:8,fontWeight:600}}>الكمية الحالية: <b style={{fontSize:18}}>{editItem.qty} {form.unit}</b></div>
                      <label style={lbl}>كمية تضيفها</label>
                      <input type="number" min="0" value={addQty||''} onChange={e=>setAddQty(Number(e.target.value)||0)} style={{...inp(),fontSize:20,fontWeight:700,textAlign:'center'}} placeholder="0"/>
                      {addQty>0&&<div style={{fontSize:11,color:C.primary,marginTop:6,fontWeight:600}}>الإجمالي بعد الإضافة: {editItem.qty+addQty} {form.unit}</div>}
                    </div>
                  ):(
                    <div>
                      <label style={lbl}>الكمية الابتدائية *</label>
                      <input type="number" min="1" required value={form.qty||''} onChange={e=>setForm({...form,qty:Number(e.target.value)})} style={{...inp(),fontSize:20,fontWeight:700,textAlign:'center'}} placeholder="0"/>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:8,marginTop:16}}>
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

      {/* Header */}
      <div className="u" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:8}}>
        <div style={{minWidth:0}}>
          <h1 style={{fontSize:18,fontWeight:700,color:C.text,margin:0,letterSpacing:'-0.3px',whiteSpace:'nowrap'}}>المخزون</h1>
          <p style={{fontSize:11,color:C.text4,margin:'2px 0 0',fontVariantNumeric:'tabular-nums'}}>
            {products.length} صنف
            {lowCount>0&&<span style={{color:C.danger,fontWeight:600}}> · {lowCount} ناقص</span>}
          </p>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
          <button onClick={exportCSV} title="تصدير CSV"
            style={{width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',background:'white',border:`1px solid ${C.border2}`,borderRadius:8,cursor:'pointer',color:C.text3,flexShrink:0}}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>
          <button onClick={()=>{setEditItem(null);setAddQty(0);setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''});setShowAdd(true)}}
            style={{height:32,padding:'0 12px',background:C.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4,flexShrink:0,whiteSpace:'nowrap'}}>
            <svg width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            إضافة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="u" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:14,animationDelay:'.05s'}} >
        <style>{`@media(min-width:640px){.sg{grid-template-columns:repeat(4,1fr)!important}}`}</style>
        {[
          {label:'إجمالي الأصناف', value:products.length,   color:C.info,    key:'all'  as const},
          {label:'مخزون ناقص',     value:lowCount,           color:C.danger,  key:'low'  as const},
          {label:'مخزون كافٍ',     value:products.length-lowCount, color:C.primary, key:'ok' as const},
          {label:'إجمالي الكميات', value:totalQty,           color:C.warning, key:'all'  as const},
        ].map((s,i)=>(
          <button key={i} onClick={()=>{if(s.key!=='all'||i===0){setStatusFilter(s.key);setCatFilter('all');setPage(1)}}}
            className="tap"
            style={{background:'white',borderRadius:10,padding:'12px 14px',border:`1px solid ${statusFilter===s.key&&i<3?s.color:C.border}`,textAlign:'right',cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
            <div style={{fontSize:22,fontWeight:700,color:s.color,letterSpacing:'-0.5px',fontVariantNumeric:'tabular-nums'}}>{s.value.toLocaleString()}</div>
            <div style={{fontSize:10,color:C.text4,marginTop:3,fontWeight:500}}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="u" style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',animationDelay:'.08s',flexWrap:'wrap'}}>
        {/* Search */}
        <div style={{position:'relative',flex:1,minWidth:160}}>
          <svg style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="13" height="13" fill="none" stroke={C.text4} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="ابحث بالاسم أو الباركود..."
            style={{width:'100%',padding:'8px 32px 8px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:12,outline:'none',background:'white',color:C.text,fontFamily:'inherit',boxSizing:'border-box'}}/>
        </div>
        {/* Category chips */}
        <div style={{display:'flex',gap:5,overflowX:'auto',scrollbarWidth:'none',flexShrink:0}}>
          {allCats.map(cat=>(
            <button key={cat} className="chip" onClick={()=>{setCatFilter(cat);setPage(1)}}
              style={{background:catFilter===cat?C.primary:'white',color:catFilter===cat?'white':C.text3,borderColor:catFilter===cat?C.primary:C.border2,flexShrink:0}}>
              {cat==='all'?'الكل':cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length===0?(
        <div className="u" style={{background:'white',borderRadius:12,padding:'48px 24px',textAlign:'center',border:`1px solid ${C.border}`}}>
          <div style={{fontSize:36,marginBottom:8}}>📦</div>
          <div style={{fontSize:14,fontWeight:600,color:C.text2,marginBottom:4}}>{search||catFilter!=='all'?'لا توجد نتائج':'المخزون فارغ'}</div>
          <div style={{fontSize:11,color:C.text4,marginBottom:12}}>{search||catFilter!=='all'?'جرب كلمة أو فئة أخرى':'ابدأ بإضافة أول منتج'}</div>
          {(search||catFilter!=='all')&&<button onClick={()=>{setSearch('');setCatFilter('all');setStatusFilter('all')}} style={{padding:'7px 16px',background:C.bg,color:C.text2,border:`1px solid ${C.border2}`,borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إزالة الفلاتر</button>}
        </div>
      ):(
        <>
          {/* Mobile grid */}
          <div className="mgrid u" style={{animationDelay:'.1s'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
              {paginated.map(p=>{
                const isOut=p.qty===0,isLow=p.qty<=p.reorder_point
                const sc=isOut?C.danger:isLow?C.warning:C.primary
                return (
                  <div key={p.id} className="tap" onClick={()=>openEdit(p)}
                    style={{background:'white',borderRadius:10,padding:'12px',border:`1px solid ${isOut?C.dangerB:isLow?C.warningB:C.border}`,cursor:'pointer'}}>
                    <div style={{fontSize:22,fontWeight:700,color:sc,lineHeight:1,fontVariantNumeric:'tabular-nums',marginBottom:4}}>{p.qty}</div>
                    <div style={{fontSize:11,fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2}}>{p.name}</div>
                    <div style={{fontSize:9,color:C.text4}}>{p.unit} · حد {p.reorder_point}</div>
                    <div style={{height:2,background:C.border,borderRadius:99,overflow:'hidden',marginTop:8}}>
                      <div style={{height:'100%',width:Math.min((p.qty/Math.max(p.reorder_point*2,p.qty,1))*100,100)+'%',background:sc,borderRadius:99}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Desktop table */}
          <div className="dtable u" style={{background:'white',borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden',animationDelay:'.1s'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:C.bg,borderBottom:`1px solid ${C.border}`}}>
                  {['المنتج','الفئة','المخزون','الحد الأدنى','الحالة',''].map((h,i)=>(
                    <th key={i} style={{padding:'10px 16px',color:C.text4,fontSize:10,fontWeight:700,textAlign:i===5?'center':'right',textTransform:'uppercase',letterSpacing:'.06em',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(p=>{
                  const isOut=p.qty===0,isLow=p.qty<=p.reorder_point
                  const sc=isOut?C.danger:isLow?C.warning:C.primary
                  const sb2=isOut?C.dangerL:isLow?C.warningL:C.primaryL
                  const sbb=isOut?C.dangerB:isLow?C.warningB:C.primaryB
                  const pct=Math.min((p.qty/Math.max(p.reorder_point*2,p.qty,1))*100,100)
                  return (
                    <tr key={p.id} className="rh" style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'12px 16px',minWidth:180}}>
                        <div style={{fontWeight:600,fontSize:13,color:C.text}}>{p.name}</div>
                        {p.sku&&<div style={{fontSize:10,color:C.text4,marginTop:1,fontFamily:'monospace'}}>#{p.sku}</div>}
                        <div style={{height:2,background:C.border,borderRadius:99,overflow:'hidden',marginTop:6,width:80}}>
                          <div style={{height:'100%',width:pct+'%',background:sc,borderRadius:99}}/>
                        </div>
                      </td>
                      <td style={{padding:'12px 16px'}}>
                        {p.category
                          ?<span style={{background:C.bg,color:C.text2,padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:500,border:`1px solid ${C.border2}`}}>{p.category}</span>
                          :<span style={{color:C.text4,fontSize:12}}>—</span>}
                      </td>
                      <td style={{padding:'12px 16px',whiteSpace:'nowrap'}}>
                        <span style={{fontWeight:700,fontSize:18,color:sc,fontVariantNumeric:'tabular-nums'}}>{p.qty}</span>
                        <span style={{fontSize:11,color:C.text4,marginRight:4}}>{p.unit}</span>
                      </td>
                      <td style={{padding:'12px 16px',color:C.text3,fontSize:12,fontVariantNumeric:'tabular-nums'}}>{p.reorder_point} {p.unit}</td>
                      <td style={{padding:'12px 16px'}}>
                        <span style={{background:sb2,color:sc,padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:`1px solid ${sbb}`}}>
                          {isOut?'نفد':isLow?'ناقص':'كافٍ'}
                        </span>
                      </td>
                      <td style={{padding:'12px 16px'}}>
                        <div style={{display:'flex',gap:5,justifyContent:'center'}}>
                          <button onClick={()=>openEdit(p)}
                            style={{padding:'5px 12px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',border:`1px solid ${C.border2}`,background:'white',color:C.text2,fontFamily:'inherit'}}>
                            تعديل
                          </button>
                          <button onClick={()=>setConfirm({id:p.id,name:p.name})}
                            style={{padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',border:`1px solid ${C.dangerB}`,background:C.dangerL,color:C.danger,fontFamily:'inherit'}}>
                            حذف
                          </button>
                        </div>
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
