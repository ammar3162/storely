'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, lazy, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/toast'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import Pagination from '@/components/pagination'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, inp, tag, pageTitle, pageSub } from '@/lib/ds'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

interface Product {
  id:string; name:string; sku:string|null; unit:string
  qty:number; reorder_point:number; category:string|null
  org_id:string; is_active:boolean
  created_at:string; updated_at:string
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
  'مشروبات':'🥤','قهوة وشاي':'☕','مواد غذائية':'🍽️','ألبان وبيض':'🥛',
  'ورقيات':'🧻','تغليف':'📦','نظافة':'🧼','توابل':'🧂','مواد جافة':'🌾','أخرى':'🏷️'
}
const lbl: React.CSSProperties = { fontSize:font.xs, fontWeight:700, color:colors.text3, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }

function StockBar({ qty, reorder }: { qty:number; reorder:number }) {
  const max = Math.max(reorder * 2, qty, 1)
  const pct = Math.min((qty / max) * 100, 100)
  const color = qty === 0 ? colors.danger : qty <= reorder ? colors.warning : colors.primary
  return (
    <div style={{height:3,background:colors.border,borderRadius:99,overflow:'hidden',marginTop:6}}>
      <div style={{height:'100%',width:pct+'%',background:color,borderRadius:99,transition:'width .5s ease'}}/>
    </div>
  )
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [page, setPage]         = useState(1)
  const PER = 20
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'low'|'ok'>('all')
  const [catFilter, setCatFilter]       = useState<string>('all')
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [editItem, setEditItem] = useState<Product|null>(null)
  const [addQty, setAddQty]     = useState(0)
  const [confirm, setConfirm]   = useState<{id:string,name:string}|null>(null)
  const [form, setForm]         = useState({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''})
  const [showScan, setShowScan] = useState(false)
  const [visible, setVisible]   = useState(false)
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
    const branchId = sessionStorage.getItem('s_branch_id')
    let q = sb.from('products').select('*').eq('org_id',oid).eq('is_active',true)
    if (branchId) q = q.eq('branch_id', branchId)
    const{data}=await q.order('name')
    setProducts(data||[])
    const{data:orgData}=await (sb.from('organizations') as any).select('business_type').eq('id',oid).single()
    if((orgData as any)?.business_type) setBusinessType((orgData as any).business_type)
    setLoading(false)
    setTimeout(()=>setVisible(true),50)
  }

  async function handleSave(e:React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const {data:{user}} = await sb.auth.getUser()
    if (!user) { setSaving(false); return }
    const oid = sessionStorage.getItem('s_org_id')
    if (!oid) { setSaving(false); return }
    if (editItem) {
      await sb.from('products').update({ name:form.name.trim(), sku:form.sku||null, unit:form.unit, reorder_point:Number(form.reorder_point), category:form.category?.trim()||null }).eq('id',editItem.id)
      if (addQty>0) await sb.from('stock_movements').insert({ product_id:editItem.id, profile_id:user.id, type:'in', qty_change:addQty, note:'إضافة مخزون' })
      toast('تم حفظ التعديلات ✓')
    } else {
      if (!form.qty) { toast('أدخل كمية أكبر من صفر','warning'); setSaving(false); return }
      let branchId = sessionStorage.getItem('s_branch_id')
      if (!branchId) {
        const { data: defBranch } = await sb.from('branches').select('id').eq('org_id',oid).eq('is_active',true).order('created_at').limit(1).single()
        branchId = defBranch?.id || null
      }
      const {data:np} = await sb.from('products').insert({ org_id:oid, branch_id:branchId, name:form.name.trim(), sku:form.sku||null, unit:form.unit, qty:Number(form.qty), reorder_point:Number(form.reorder_point), category:form.category?.trim()||null, is_active:true }).select().single()
      if (np) await sb.from('stock_movements').insert({ product_id:np.id, profile_id:user.id, type:'in', qty_change:Number(form.qty), note:'إضافة أولية' })
      toast('تم إضافة المنتج ✓')
    }
    setShowAdd(false); setEditItem(null); setAddQty(0)
    setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''})
    setSaving(false); load()
  }

  async function doDelete() {
    if (!confirm) return
    await sb.from('products').update({is_active:false}).eq('id',confirm.id)
    toast('تم حذف المنتج'); setConfirm(null); load()
  }

  function openEdit(p:Product) {
    setEditItem(p); setAddQty(0)
    setForm({name:p.name,sku:p.sku||'',unit:p.unit,qty:p.qty,reorder_point:p.reorder_point,category:p.category||''})
    setShowAdd(true)
  }

  function exportCSV() {
    const csv = '\ufeff' + [['اسم المنتج','الفئة','الكمية','الوحدة','الحد الأدنى','الحالة'],...products.map(p=>[p.name,p.category||'—',p.qty,p.unit,p.reorder_point,p.qty<=p.reorder_point?'ناقص':'كافي'])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'المخزون.csv'}).click()
  }

  const allCats = ['all', ...Array.from(new Set(products.map(p=>p.category||'أخرى'))).sort()]
  const filtered = products
    .filter(p=>!search || p.name?.includes(search)||p.category?.includes(search)||p.sku?.includes(search))
    .filter(p=>statusFilter==='all' || (statusFilter==='low'?p.qty<=p.reorder_point:p.qty>p.reorder_point))
    .filter(p=>catFilter==='all' || (p.category||'أخرى')===catFilter)
  const paginated = filtered.slice((page-1)*PER, page*PER)
  const lowCount  = products.filter(p=>p.qty<=p.reorder_point).length

  if (loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto',padding:'0 4px'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.5s ease-in-out infinite}`}</style>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
        <div className="sk" style={{height:28,width:100,background:colors.border2,borderRadius:8}}/>
        <div style={{display:'flex',gap:8}}>
          <div className="sk" style={{height:36,width:40,borderRadius:8,background:colors.border}}/>
          <div className="sk" style={{height:36,width:80,borderRadius:8,background:colors.border}}/>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
        {[1,2,3,4].map(i=>(<div key={i} className="sk" style={{height:60,borderRadius:12,background:colors.border}}/>))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
        {[1,2,3,4,5,6].map(i=>(<div key={i} className="sk" style={{height:80,borderRadius:12,background:colors.border}}/>))}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto',opacity:visible?1:0,transition:'opacity .3s ease'}}>
      <style>{`
        @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
        input:focus,select:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px ${colors.primaryLight}!important;outline:none!important}
        .act-btn{padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .15s}
        .cat-chip{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;border:1px solid;transition:all .15s;font-family:inherit}
        .mob-card{background:white;border-radius:12px;padding:12px;cursor:pointer;transition:all .15s;border:1px solid}
        .mob-card:active{transform:scale(.98)}
        @media(max-width:639px){
          .desk-only{display:none!important}
          .mob-only{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
          .stats-grid{grid-template-columns:repeat(4,1fr)!important;gap:6px!important}
          .stat-pad{padding:8px 4px!important}
          .stat-num{font-size:16px!important}
          .stat-lbl{font-size:8px!important}
        }
        @media(min-width:640px){
          .mob-only{display:none!important}
          .desk-only{display:block!important}
        }
      `}</style>

      {/* Delete Modal */}
      {confirm && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,.5)',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:320,animation:'modalIn .2s ease',boxShadow:shadow.lg,direction:'rtl',fontFamily:font.family}}>
            <div style={{width:52,height:52,borderRadius:14,background:colors.dangerLight,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:22}}>🗑️</div>
            <h3 style={{fontSize:16,fontWeight:800,color:colors.text,textAlign:'center',marginBottom:6}}>حذف المنتج</h3>
            <p style={{fontSize:13,color:colors.text3,textAlign:'center',lineHeight:1.6,marginBottom:20}}>سيتم حذف <b>"{confirm.name}"</b> نهائياً</p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setConfirm(null)} style={{...btnSecondary,flex:1,padding:'11px',fontSize:13}}>إلغاء</button>
              <button onClick={doDelete} style={{flex:2,padding:'11px',background:colors.danger,color:'white',border:'none',borderRadius:radius.md,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode */}
      {showScan && (
        <Suspense fallback={null}>
          <BarcodeScanner onScan={(code:string)=>{ setForm(f=>({...f,sku:code})); setShowScan(false) }} onClose={()=>setShowScan(false)}/>
        </Suspense>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <div style={{background:colors.surface,borderRadius:'20px 20px 0 0',padding:24,width:'100%',maxWidth:520,maxHeight:'92vh',overflowY:'auto',animation:'modalIn .2s ease',boxShadow:shadow.lg}}>
            <div style={{width:36,height:4,borderRadius:99,background:colors.border2,margin:'0 auto 20px'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:colors.text}}>{editItem?'تعديل المنتج':'منتج جديد'}</div>
                <div style={{fontSize:11,color:colors.text4,marginTop:2}}>{editItem?'عدّل بيانات المنتج':'أضف صنف جديد للمخزون'}</div>
              </div>
              <button onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{width:32,height:32,borderRadius:9,border:`1.5px solid ${colors.border2}`,background:colors.bg,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:colors.text3}}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
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
                      <button type="button" onClick={()=>setShowScan(true)} style={{padding:'0 10px',background:colors.primaryLight,color:colors.primary,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:radius.sm,fontSize:16,cursor:'pointer'}}>📷</button>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>الحد الأدنى</label>
                    <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:Number(e.target.value)})} style={inp()}/>
                  </div>
                </div>
                {editItem ? (
                  <div style={{background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:12,padding:16}}>
                    <div style={{fontSize:13,color:colors.primary,marginBottom:10,fontWeight:700}}>الكمية الحالية: <span style={{fontSize:20,fontWeight:900}}>{editItem.qty} {form.unit}</span></div>
                    <label style={lbl}>كمية تضيفها</label>
                    <input type="number" min="0" value={addQty||''} onChange={e=>setAddQty(Number(e.target.value)||0)} style={{...inp(),fontSize:22,fontWeight:800,textAlign:'center'}} placeholder="0"/>
                    {addQty>0&&<div style={{fontSize:12,color:colors.primary,marginTop:8,fontWeight:700}}>✓ الإجمالي: {editItem.qty+addQty} {form.unit}</div>}
                  </div>
                ) : (
                  <div>
                    <label style={lbl}>الكمية الابتدائية *</label>
                    <input type="number" min="1" required value={form.qty||''} onChange={e=>setForm({...form,qty:Number(e.target.value)})} style={{...inp(),fontSize:22,fontWeight:800,textAlign:'center'}} placeholder="0"/>
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <button type="button" onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{...btnSecondary,flex:1,padding:'13px',fontSize:14}}>إلغاء</button>
                <button type="submit" disabled={saving} style={{...btnPrimary,flex:2,padding:'13px',fontSize:14,opacity:saving?.7:1}}>
                  {saving?'جاري الحفظ...':editItem?'حفظ ✓':'إضافة ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:8}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:colors.text,letterSpacing:'-0.3px'}}>المخزون</h1>
          <p style={{fontSize:11,color:colors.text4,marginTop:2}}>
            {products.length} صنف
            {lowCount>0&&<span style={{color:colors.danger,fontWeight:700}}> · {lowCount} ناقص</span>}
          </p>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={exportCSV} style={{...btnSecondary,padding:'8px 10px',fontSize:12,display:'flex',alignItems:'center',gap:4}}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            <span className="desk-only">CSV</span>
          </button>
          <button onClick={()=>{setEditItem(null);setAddQty(0);setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''});setShowAdd(true)}}
            style={{...btnPrimary,padding:'8px 14px',fontSize:13,display:'flex',alignItems:'center',gap:5}}>
            <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            إضافة
          </button>
        </div>
      </div>

      {/* Stats — 4 columns always */}
      <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
        {[
          {label:'الأصناف',value:products.length,color:colors.info,bg:colors.infoLight,border:colors.infoBorder,key:'all' as const},
          {label:'ناقص',value:lowCount,color:colors.danger,bg:colors.dangerLight,border:colors.dangerBorder,key:'low' as const},
          {label:'كافٍ',value:products.length-lowCount,color:colors.primary,bg:colors.primaryLight,border:colors.primaryBorder,key:'ok' as const},
          {label:'الكميات',value:products.reduce((s,p)=>s+p.qty,0),color:colors.warning,bg:colors.warningLight,border:colors.warningBorder,key:'all' as const},
        ].map((s,i)=>(
          <button key={i} onClick={()=>{setStatusFilter(s.key);setCatFilter('all');setPage(1)}}
            className="stat-pad"
            style={{background:statusFilter===s.key&&s.key!=='all'?s.bg:'white',borderRadius:12,padding:'12px 8px',border:`1.5px solid ${statusFilter===s.key&&s.key!=='all'?s.color:colors.border}`,textAlign:'center',cursor:'pointer',fontFamily:font.family,transition:'all .15s',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
            <div className="stat-num" style={{fontSize:22,fontWeight:900,color:s.color,letterSpacing:'-0.5px',lineHeight:1}}>{s.value.toLocaleString()}</div>
            <div className="stat-lbl" style={{fontSize:9,color:colors.text3,marginTop:4,fontWeight:600}}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Category chips */}
      {allCats.length > 2 && (
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:6,marginBottom:12,scrollbarWidth:'none'}}>
          {allCats.map(cat=>{
            const isActive = catFilter===cat
            return (
              <button key={cat} className="cat-chip" onClick={()=>{setCatFilter(cat);setPage(1)}}
                style={{background:isActive?colors.primary:'white',color:isActive?'white':colors.text3,borderColor:isActive?colors.primary:colors.border2}}>
                {cat==='all'?'الكل':`${CAT_ICONS[cat]||'📦'} ${cat}`}
              </button>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div style={{position:'relative',marginBottom:12}}>
        <svg style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="14" height="14" fill="none" stroke={colors.text4} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="ابحث بالاسم أو الفئة أو الباركود..."
          style={{...inp(),paddingRight:38,background:'white'}}/>
      </div>

      {filtered.length===0 ? (
        <div style={{background:'white',borderRadius:16,padding:'48px 24px',textAlign:'center',border:`1px solid ${colors.border}`}}>
          <div style={{fontSize:44,marginBottom:12}}>📦</div>
          <div style={{fontSize:15,fontWeight:700,color:colors.text2,marginBottom:6}}>{search||catFilter!=='all'?'لا توجد نتائج':'المخزون فارغ'}</div>
          <div style={{fontSize:12,color:colors.text4,marginBottom:16}}>{search||catFilter!=='all'?'جرب كلمة أو فئة أخرى':'ابدأ بإضافة منتجك الأول'}</div>
          {(search||catFilter!=='all')&&<button onClick={()=>{setSearch('');setCatFilter('all');setStatusFilter('all')}} style={{...btnSecondary,padding:'8px 20px',fontSize:12}}>إزالة الفلاتر</button>}
        </div>
      ) : (
        <>
          {/* Mobile Grid */}
          <div className="mob-only">
              {paginated.map(p=>{
                const isOut=p.qty===0
                const isLow=p.qty<=p.reorder_point
                const statusColor=isOut?colors.danger:isLow?colors.warning:colors.primary
                const statusBg=isOut?colors.dangerLight:isLow?colors.warningLight:colors.primaryLight
                const statusBorder=isOut?colors.dangerBorder:isLow?colors.warningBorder:colors.primaryBorder
                const statusLabel=isOut?'نفد':isLow?'ناقص':'كافٍ'
                return (
                  <div key={p.id} className="mob-card" onClick={()=>openEdit(p)}
                    style={{borderColor:statusBorder,background:'white'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div style={{fontSize:22,fontWeight:900,color:statusColor,lineHeight:1}}>{p.qty}</div>
                      <span style={{fontSize:9,fontWeight:700,color:statusColor,background:statusBg,padding:'2px 7px',borderRadius:99,border:`1px solid ${statusBorder}`,flexShrink:0}}>{statusLabel}</span>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'as const,marginBottom:2}}>{p.name}</div>
                    <div style={{fontSize:10,color:colors.text4,marginBottom:4}}>{p.unit}</div>
                    <StockBar qty={p.qty} reorder={p.reorder_point}/>
                  </div>
                )
              })}
          </div>

          {/* Desktop Table */}
          <div className="desk-only" style={{background:'white',borderRadius:16,border:`1px solid ${colors.border}`,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const}}>
              <thead>
                <tr style={{background:colors.bg,borderBottom:`1.5px solid ${colors.border}`}}>
                  {['المنتج','الفئة','المخزون','الحد الأدنى','الحالة',''].map((h,i)=>(
                    <th key={i} style={{padding:'11px 16px',color:colors.text4,fontSize:font.xs,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.06em',whiteSpace:'nowrap' as const}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(p=>{
                  const isOut=p.qty===0; const isLow=p.qty<=p.reorder_point
                  const statusColor=isOut?colors.danger:isLow?colors.warning:colors.primary
                  const statusBg=isOut?colors.dangerLight:isLow?colors.warningLight:colors.primaryLight
                  const statusBorder=isOut?colors.dangerBorder:isLow?colors.warningBorder:colors.primaryBorder
                  const statusLabel=isOut?'نفد':isLow?'ناقص':'كافٍ'
                  return (
                    <tr key={p.id} style={{borderBottom:`1px solid ${colors.border}`,transition:'background .1s'}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=colors.bg}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='white'}>
                      <td style={{padding:'13px 16px'}}>
                        <div style={{fontWeight:700,fontSize:font.base,color:colors.text}}>{p.name}</div>
                        {p.sku&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:1,fontFamily:'monospace'}}>#{p.sku}</div>}
                        <StockBar qty={p.qty} reorder={p.reorder_point}/>
                      </td>
                      <td style={{padding:'13px 16px'}}>
                        {p.category?<span style={{...tag(colors.text2,colors.bg,colors.border2)}}>{CAT_ICONS[p.category]||'📦'} {p.category}</span>:<span style={{color:colors.text4}}>—</span>}
                      </td>
                      <td style={{padding:'13px 16px',whiteSpace:'nowrap' as const}}>
                        <span style={{fontWeight:900,fontSize:20,color:statusColor}}>{p.qty}</span>
                        <span style={{fontSize:font.xs,color:colors.text4,marginRight:4}}>{p.unit}</span>
                      </td>
                      <td style={{padding:'13px 16px',color:colors.text3,fontSize:font.sm}}>{p.reorder_point} {p.unit}</td>
                      <td style={{padding:'13px 16px'}}>
                        <span style={{...tag(statusColor,statusBg,statusBorder)}}>{statusLabel}</span>
                      </td>
                      <td style={{padding:'13px 16px'}}>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>openEdit(p)} className="act-btn" style={{background:colors.infoLight,color:colors.info}}>تعديل</button>
                          <button onClick={()=>setConfirm({id:p.id,name:p.name})} className="act-btn" style={{background:colors.dangerLight,color:colors.danger}}>حذف</button>
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
