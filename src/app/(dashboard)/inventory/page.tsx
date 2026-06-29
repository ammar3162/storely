'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, lazy, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/toast'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import Pagination from '@/components/pagination'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  danger:'#ef4444',  dangerL:'#fef2f2',  dangerB:'#fecaca',
  warning:'#f59e0b', warningL:'#fffbeb', warningB:'#fde68a',
  info:'#3b82f6',    infoL:'#eff6ff',    infoB:'#bfdbfe',
  text:'#111827', text2:'#374151', text3:'#6b7280', text4:'#9ca3af',
  bg:'#f9fafb', surface:'#ffffff', border:'#f3f4f6', border2:'#e5e7eb',
}

interface Product {
  id:string; name:string; sku:string|null; unit:string
  qty:number; reorder_point:number; category:string|null
  org_id:string; is_active:boolean; created_at:string; updated_at:string
}

const UNITS = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','درزن','رول','غرام','أخرى']
const CATS_BY_TYPE: Record<string,string[]> = {
  'مطعم':['مواد غذائية','لحوم ودواجن','خضار وفواكه','توابل وصلصات','تغليف','مشروبات','ورقيات','نظافة','أخرى'],
  'كوفي':['قهوة وشاي','حليب وكريمة','سكر ومحليات','أكواب وأغطية','حلويات ومعجنات','مشروبات','ورقيات','نظافة','أخرى'],
  'مخبز':['دقيق وسكر','زبدة وزيوت','بيض وألبان','مكسرات','تغليف','ورقيات','نظافة','أخرى'],
  'بقالة':['مواد غذائية','مشروبات','ألبان وأجبان','منظفات','ورقيات','معلبات','وجبات خفيفة','أخرى'],
  'صيدلية':['أدوية','مستلزمات طبية','عناية شخصية','مكملات غذائية','تجميل','أخرى'],
  'مستودع':['مواد خام','تغليف','قطع غيار','أدوات','كيميائيات','نظافة','أخرى'],
  'متجر إلكتروني':['منتجات للبيع','تغليف وشحن','مواد حماية','ملصقات وطباعة','إكسسوار','أخرى'],
  'أخرى':['مواد غذائية','مشروبات','ورقيات','تغليف','نظافة','أخرى'],
}
const DEFAULT_CATS = ['مواد غذائية','مشروبات','ورقيات','تغليف','نظافة','توابل','أخرى']
const CAT_ICONS: Record<string,string> = {
  'مشروبات':'🥤','قهوة وشاي':'☕','مواد غذائية':'🍽️','ورقيات':'🧻',
  'تغليف':'📦','نظافة':'🧼','توابل':'🧂','أخرى':'🏷️',
}

function StockBar({ qty, reorder }: { qty:number; reorder:number }) {
  const max = Math.max(reorder*2,qty,1)
  const pct = Math.min((qty/max)*100,100)
  const color = qty===0?C.danger:qty<=reorder?C.warning:C.primary
  return (
    <div style={{height:3,background:C.border,borderRadius:99,overflow:'hidden',marginTop:6}}>
      <div style={{height:'100%',width:pct+'%',background:color,borderRadius:99,transition:'width .5s ease'}}/>
    </div>
  )
}

export default function InventoryPage() {
  const [products, setProducts]   = useState<Product[]>([])
  const [page, setPage]           = useState(1)
  const PER = 20
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
    if (!oid) {
      const{data:{user}}=await sb.auth.getUser()
      if(!user){setLoading(false);return}
      const{data:p}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
      if(!p){setLoading(false);return}
      oid=p.org_id; sessionStorage.setItem('s_org_id',oid!)
    }
    const bid = sessionStorage.getItem('s_branch_id')
    let q = sb.from('products').select('*').eq('org_id',oid).eq('is_active',true)
    if (bid) q = q.eq('branch_id',bid)
    const{data}=await q.order('name')
    setProducts(data||[])
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
      if(np) await sb.from('stock_movements').insert({product_id:np.id,profile_id:user.id,type:'in',qty_change:Number(form.qty),note:'إضافة أولية'})
      toast('تم إضافة المنتج ✓')
    }
    setShowAdd(false);setEditItem(null);setAddQty(0)
    setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''})
    setSaving(false);load()
  }

  async function doDelete() {
    if(!confirm) return
    await sb.from('products').update({is_active:false}).eq('id',confirm.id)
    toast('تم حذف المنتج');setConfirm(null);load()
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

  const lbl: React.CSSProperties = {fontSize:10,fontWeight:700,color:C.text3,display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'.05em'}
  const inp = (extra?:any): React.CSSProperties => ({width:'100%',padding:'11px 14px',border:`1.5px solid ${C.border2}`,borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box',background:'white',color:C.text,fontFamily:'inherit',transition:'border .15s',...extra})

  if(loading) return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',maxWidth:'100%'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.4s ease infinite}`}</style>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
        <div className="sk" style={{height:26,width:80,background:C.border2,borderRadius:8}}/>
        <div className="sk" style={{height:36,width:90,background:C.border,borderRadius:8}}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:14}}>
        {[1,2,3,4].map(i=><div key={i} className="sk" style={{height:80,borderRadius:12,background:C.border}}/>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
        {[1,2,3,4,5,6].map(i=><div key={i} className="sk" style={{height:90,borderRadius:12,background:C.border}}/>)}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',maxWidth:'100%',opacity:visible?1:0,transition:'opacity .3s ease'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes modalSlide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .fu{animation:fadeUp .35s ease both}
        .tap{transition:all .15s;cursor:pointer}
        .tap:active{transform:scale(.97)!important}
        input:focus,select:focus{border-color:${C.primary}!important;box-shadow:0 0 0 3px ${C.primaryL}!important;outline:none!important}
        .cat-chip{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;border:1.5px solid;transition:all .15s;font-family:inherit;background:white}
        .row:hover{background:${C.bg}}
        .prod-card{background:white;border-radius:12px;border:1.5px solid;padding:12px;cursor:pointer;transition:all .15s}
        .prod-card:active{transform:scale(.97)}

        /* Stats — 4 col always */
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}

        /* Products — 2 col mobile */
        .prod-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}

        /* Desktop table */
        @media(min-width:640px){
          .mob-grid{display:none!important}
          .desk-table{display:block!important}
          .stats{gap:12px}
          .prod-grid{grid-template-columns:repeat(3,1fr);gap:10px}
        }
        @media(max-width:639px){
          .desk-table{display:none!important}
          .mob-grid{display:block!important}
        }
      `}</style>

      {/* Delete Modal */}
      {confirm && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,.5)',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:18,padding:24,width:'100%',maxWidth:320,animation:'modalSlide .2s ease',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
            <div style={{width:48,height:48,borderRadius:13,background:C.dangerL,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:20}}>🗑️</div>
            <h3 style={{fontSize:16,fontWeight:800,color:C.text,textAlign:'center',marginBottom:6}}>حذف المنتج</h3>
            <p style={{fontSize:13,color:C.text3,textAlign:'center',lineHeight:1.6,marginBottom:18}}>سيتم حذف <b style={{color:C.text}}>"{confirm.name}"</b> نهائياً</p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setConfirm(null)} style={{flex:1,padding:'11px',background:C.bg,color:C.text2,border:`1.5px solid ${C.border2}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
              <button onClick={doDelete} style={{flex:2,padding:'11px',background:C.danger,color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode */}
      {showScan && (
        <Suspense fallback={null}>
          <BarcodeScanner onScan={(code:string)=>{setForm(f=>({...f,sku:code}));setShowScan(false)}} onClose={()=>setShowScan(false)}/>
        </Suspense>
      )}

      {/* Add/Edit — Bottom Sheet */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:'0 0 env(safe-area-inset-bottom)',width:'100%',maxWidth:520,maxHeight:'94vh',display:'flex',flexDirection:'column',animation:'modalSlide .25s ease',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
            <div style={{padding:'12px 20px 0',flexShrink:0}}>
              <div style={{width:36,height:4,borderRadius:99,background:C.border2,margin:'0 auto 16px'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:C.text}}>{editItem?'تعديل المنتج':'منتج جديد'}</div>
                  <div style={{fontSize:11,color:C.text4,marginTop:2}}>{editItem?'عدّل بيانات المنتج':'أضف صنف جديد للمخزون'}</div>
                </div>
                <button onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{width:32,height:32,borderRadius:9,border:`1.5px solid ${C.border2}`,background:C.bg,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:C.text3}}>×</button>
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'0 20px 20px'}}>
              <form onSubmit={handleSave}>
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div>
                    <label style={lbl}>اسم المنتج *</label>
                    <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp()} placeholder="مثال: قهوة عربية"/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
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
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div>
                      <label style={lbl}>باركود</label>
                      <div style={{display:'flex',gap:6}}>
                        <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} style={{...inp(),flex:1}} placeholder="اختياري"/>
                        <button type="button" onClick={()=>setShowScan(true)} style={{padding:'0 10px',background:C.primaryL,color:C.primary,border:`1.5px solid ${C.primaryB}`,borderRadius:9,fontSize:16,cursor:'pointer'}}>📷</button>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>الحد الأدنى</label>
                      <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:Number(e.target.value)})} style={inp()}/>
                    </div>
                  </div>
                  {editItem ? (
                    <div style={{background:C.primaryL,border:`1.5px solid ${C.primaryB}`,borderRadius:12,padding:14}}>
                      <div style={{fontSize:13,color:C.primary,marginBottom:10,fontWeight:700}}>الكمية الحالية: <span style={{fontSize:20,fontWeight:900}}>{editItem.qty} {form.unit}</span></div>
                      <label style={lbl}>كمية تضيفها</label>
                      <input type="number" min="0" value={addQty||''} onChange={e=>setAddQty(Number(e.target.value)||0)} style={{...inp(),fontSize:22,fontWeight:800,textAlign:'center'}} placeholder="0"/>
                      {addQty>0&&<div style={{fontSize:12,color:C.primary,marginTop:8,fontWeight:700}}>✓ الإجمالي: {editItem.qty+addQty} {form.unit}</div>}
                    </div>
                  ) : (
                    <div>
                      <label style={lbl}>الكمية الابتدائية *</label>
                      <input type="number" min="1" required value={form.qty||''} onChange={e=>setForm({...form,qty:Number(e.target.value)})} style={{...inp(),fontSize:22,fontWeight:800,textAlign:'center'}} placeholder="0"/>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:10,marginTop:18}}>
                  <button type="button" onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{flex:1,padding:'13px',background:C.bg,color:C.text2,border:`1.5px solid ${C.border2}`,borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                  <button type="submit" disabled={saving} style={{flex:2,padding:'13px',background:C.primary,color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:saving?.7:1}}>
                    {saving?'جاري الحفظ...':editItem?'حفظ ✓':'إضافة ✓'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,animationDelay:'.05s'}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:C.text,letterSpacing:'-0.3px',margin:0}}>المخزون</h1>
          <p style={{fontSize:11,color:C.text3,margin:'2px 0 0'}}>
            {products.length} صنف{lowCount>0&&<span style={{color:C.danger,fontWeight:700}}> · {lowCount} ناقص</span>}
          </p>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={exportCSV} style={{padding:'8px 10px',background:'white',color:C.text2,border:`1.5px solid ${C.border2}`,borderRadius:9,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontFamily:'inherit'}}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>
          <button onClick={()=>{setEditItem(null);setAddQty(0);setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''});setShowAdd(true)}}
            style={{padding:'8px 16px',background:C.primary,color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            إضافة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats fu" style={{animationDelay:'.08s'}}>
        {[
          {label:'الأصناف',  value:products.length,              color:C.info,    bg:C.infoL,    key:'all' as const},
          {label:'ناقص',     value:lowCount,                     color:C.danger,  bg:C.dangerL,  key:'low' as const},
          {label:'كافٍ',     value:products.length-lowCount,     color:C.primary, bg:C.primaryL, key:'ok' as const},
          {label:'الكميات',  value:products.reduce((s,p)=>s+p.qty,0), color:C.warning, bg:C.warningL, key:'all' as const},
        ].map((s,i)=>(
          <button key={i} onClick={()=>{setStatusFilter(s.key);setCatFilter('all');setPage(1)}} className="tap"
            style={{background:statusFilter===s.key&&s.key!=='all'?s.bg:'white',borderRadius:12,padding:'12px 8px',border:`1.5px solid ${statusFilter===s.key&&s.key!=='all'?s.color:C.border}`,textAlign:'center',cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
            <div style={{fontSize:20,fontWeight:900,color:s.color,letterSpacing:'-0.5px',lineHeight:1}}>{s.value.toLocaleString()}</div>
            <div style={{fontSize:9,color:C.text3,marginTop:4,fontWeight:600}}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Category chips */}
      {allCats.length>2 && (
        <div className="fu" style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:6,marginBottom:10,scrollbarWidth:'none',animationDelay:'.1s'}}>
          {allCats.map(cat=>{
            const active=catFilter===cat
            return (
              <button key={cat} className="cat-chip" onClick={()=>{setCatFilter(cat);setPage(1)}}
                style={{background:active?C.primary:'white',color:active?'white':C.text3,borderColor:active?C.primary:C.border2}}>
                {cat==='all'?'الكل':`${CAT_ICONS[cat]||'📦'} ${cat}`}
              </button>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="fu" style={{position:'relative',marginBottom:12,animationDelay:'.12s'}}>
        <svg style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="14" height="14" fill="none" stroke={C.text4} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="ابحث بالاسم أو الفئة أو الباركود..."
          style={{width:'100%',padding:'11px 38px 11px 14px',border:`1.5px solid ${C.border2}`,borderRadius:10,fontSize:13,outline:'none',background:'white',color:C.text,fontFamily:'inherit',transition:'border .15s',boxSizing:'border-box'}}/>
      </div>

      {filtered.length===0 ? (
        <div className="fu" style={{background:'white',borderRadius:14,padding:'40px 24px',textAlign:'center',border:`1px solid ${C.border}`,animationDelay:'.14s'}}>
          <div style={{fontSize:40,marginBottom:10}}>📦</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text2,marginBottom:6}}>{search||catFilter!=='all'?'لا توجد نتائج':'المخزون فارغ'}</div>
          <div style={{fontSize:12,color:C.text4,marginBottom:14}}>{search||catFilter!=='all'?'جرب كلمة أو فئة أخرى':'ابدأ بإضافة منتجك الأول'}</div>
          {(search||catFilter!=='all')&&<button onClick={()=>{setSearch('');setCatFilter('all');setStatusFilter('all')}} style={{padding:'8px 20px',background:C.bg,color:C.text2,border:`1.5px solid ${C.border2}`,borderRadius:9,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إزالة الفلاتر</button>}
        </div>
      ) : (
        <>
          {/* Mobile Grid */}
          <div className="mob-grid fu" style={{animationDelay:'.14s'}}>
            <div className="prod-grid">
              {paginated.map(p=>{
                const isOut=p.qty===0,isLow=p.qty<=p.reorder_point
                const sc=isOut?C.danger:isLow?C.warning:C.primary
                const sb2=isOut?C.dangerL:isLow?C.warningL:C.primaryL
                const sbb=isOut?C.dangerB:isLow?C.warningB:C.primaryB
                const sl=isOut?'نفد':isLow?'ناقص':'كافٍ'
                return (
                  <div key={p.id} className="prod-card" onClick={()=>openEdit(p)} style={{borderColor:sbb}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div style={{fontSize:24,fontWeight:900,color:sc,lineHeight:1}}>{p.qty}</div>
                      <span style={{fontSize:9,fontWeight:700,color:sc,background:sb2,padding:'2px 7px',borderRadius:99,border:`1px solid ${sbb}`,flexShrink:0,marginTop:2}}>{sl}</span>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2}}>{p.name}</div>
                    <div style={{fontSize:10,color:C.text4,marginBottom:4}}>{p.unit}</div>
                    <StockBar qty={p.qty} reorder={p.reorder_point}/>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="desk-table fu" style={{background:'white',borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden',animationDelay:'.14s'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:C.bg,borderBottom:`1.5px solid ${C.border}`}}>
                  {['المنتج','الفئة','المخزون','الحد','الحالة',''].map((h,i)=>(
                    <th key={i} style={{padding:'11px 16px',color:C.text4,fontSize:10,fontWeight:700,textAlign:'right',textTransform:'uppercase',letterSpacing:'.06em',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(p=>{
                  const isOut=p.qty===0,isLow=p.qty<=p.reorder_point
                  const sc=isOut?C.danger:isLow?C.warning:C.primary
                  const sb2=isOut?C.dangerL:isLow?C.warningL:C.primaryL
                  const sbb=isOut?C.dangerB:isLow?C.warningB:C.primaryB
                  const sl=isOut?'نفد':isLow?'ناقص':'كافٍ'
                  return (
                    <tr key={p.id} className="row" style={{borderBottom:`1px solid ${C.border}`,transition:'background .1s'}}>
                      <td style={{padding:'13px 16px'}}>
                        <div style={{fontWeight:700,fontSize:14,color:C.text}}>{p.name}</div>
                        {p.sku&&<div style={{fontSize:11,color:C.text4,marginTop:1,fontFamily:'monospace'}}>#{p.sku}</div>}
                        <StockBar qty={p.qty} reorder={p.reorder_point}/>
                      </td>
                      <td style={{padding:'13px 16px'}}>
                        {p.category?<span style={{background:C.bg,color:C.text2,padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:`1px solid ${C.border2}`}}>{CAT_ICONS[p.category]||'📦'} {p.category}</span>:<span style={{color:C.text4}}>—</span>}
                      </td>
                      <td style={{padding:'13px 16px',whiteSpace:'nowrap'}}>
                        <span style={{fontWeight:900,fontSize:20,color:sc}}>{p.qty}</span>
                        <span style={{fontSize:11,color:C.text4,marginRight:4}}>{p.unit}</span>
                      </td>
                      <td style={{padding:'13px 16px',color:C.text3,fontSize:13}}>{p.reorder_point} {p.unit}</td>
                      <td style={{padding:'13px 16px'}}>
                        <span style={{background:sb2,color:sc,padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700,border:`1px solid ${sbb}`}}>{sl}</span>
                      </td>
                      <td style={{padding:'13px 16px'}}>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>openEdit(p)} style={{padding:'6px 10px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:'none',background:C.infoL,color:C.info,fontFamily:'inherit'}}>تعديل</button>
                          <button onClick={()=>setConfirm({id:p.id,name:p.name})} style={{padding:'6px 10px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:'none',background:C.dangerL,color:C.danger,fontFamily:'inherit'}}>حذف</button>
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
