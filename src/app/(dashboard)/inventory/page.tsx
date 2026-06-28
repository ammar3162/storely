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
  'مطعم':          ['مواد غذائية','لحوم ودواجن','خضار وفواكه','توابل وصلصات','تغليف','مشروبات','ورقيات','نظافة','أخرى'],
  'كوفي':          ['قهوة وشاي','حليب وكريمة','سكر ومحليات','أكواب وأغطية','حلويات ومعجنات','مشروبات','ورقيات','نظافة','أخرى'],
  'مخبز':          ['دقيق وسكر','زبدة وزيوت','بيض وألبان','مكسرات','تغليف','ورقيات','نظافة','أخرى'],
  'بقالة':         ['مواد غذائية','مشروبات','ألبان وأجبان','منظفات','ورقيات','معلبات','وجبات خفيفة','أخرى'],
  'صيدلية':        ['أدوية','مستلزمات طبية','عناية شخصية','مكملات غذائية','تجميل','أخرى'],
  'مستودع':        ['مواد خام','تغليف','قطع غيار','أدوات','كيميائيات','نظافة','أخرى'],
  'متجر إلكتروني': ['منتجات للبيع','تغليف وشحن','مواد حماية','ملصقات وطباعة','إكسسوار','أخرى'],
  'أخرى':          ['مواد غذائية','مشروبات','ورقيات','تغليف','نظافة','أخرى'],
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
  const isRed = qty <= reorder * 0.5
  const isOrange = qty <= reorder
  const color = isRed ? colors.danger : isOrange ? colors.warning : colors.primary
  return (
    <div style={{marginTop:6}}>
      <div style={{height:4,background:colors.border,borderRadius:99,overflow:'hidden'}}>
        <div style={{height:'100%',width:pct+'%',background:color,borderRadius:99,transition:'width .6s cubic-bezier(.4,0,.2,1)'}}/>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const [products, setProducts]         = useState<Product[]>([])
  const [page, setPage]                 = useState(1)
  const PER = 15
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'low'|'ok'>('all')
  const [catFilter, setCatFilter]       = useState<string>('all')
  const [showAdd, setShowAdd]           = useState(false)
  const [saving, setSaving]             = useState(false)
  const [editItem, setEditItem]         = useState<Product|null>(null)
  const [addQty, setAddQty]             = useState(0)
  const [confirm, setConfirm]           = useState<{id:string,name:string}|null>(null)
  const [form, setForm]                 = useState({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''})
  const [showScan, setShowScan]         = useState(false)
  const [visible, setVisible]           = useState(false)
  const [businessType, setBusinessType]   = useState('')
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
    // load business type
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
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}`}</style>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><div className="sk" style={{height:22,width:80,background:colors.border2,borderRadius:6,marginBottom:8}}/><div className="sk" style={{height:12,width:140,background:colors.border,borderRadius:6}}/></div>
        <div style={{display:'flex',gap:8}}><div className="sk" style={{height:38,width:80,borderRadius:radius.md,background:colors.border}}/><div className="sk" style={{height:38,width:100,borderRadius:radius.md,background:colors.border}}/></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>{[1,2,3,4].map(i=>(<div key={i} className="sk" style={{height:76,borderRadius:radius.lg,background:colors.border}}/>))}</div>
      <div className="sk" style={{height:44,borderRadius:radius.lg,background:colors.border,marginBottom:14}}/>
      <div className="sk" style={{height:380,borderRadius:radius.lg,background:colors.border}}/>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto',opacity:visible?1:0,transition:'opacity .4s ease'}}>
      <style>{`
        @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        input:focus,select:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px ${colors.primaryLight}!important}
        .act-btn{padding:6px 12px;border-radius:${radius.sm};font-size:${font.xs};font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .15s}
        .act-btn:hover{transform:scale(1.05)}
        .trow{transition:background .12s}
        .trow:hover td{background:${colors.bg}!important}
        .cat-btn{padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .2s;white-space:nowrap}
        .cat-btn:hover{transform:translateY(-1px)}
        .prod-card{transition:all .2s cubic-bezier(.4,0,.2,1)}
        .prod-card:hover{transform:translateY(-2px);box-shadow:${shadow.md}!important}
        @media(max-width:640px){
          .inv-stats{grid-template-columns:1fr 1fr!important;gap:8px!important}
          .hide-mob{display:none!important}
          .inv-header{flex-direction:row!important;align-items:center!important}
          .inv-btns{display:flex!important;gap:6px!important}
          .inv-btns button{padding:8px 12px!important;font-size:12px!important}
          .cat-btn{padding:6px 10px!important;font-size:11px!important}
          .mob-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
          .page-wrap{padding:0 12px!important}
        }
        @media(max-width:400px){
          .inv-stats{grid-template-columns:1fr 1fr!important;gap:6px!important}
          .mob-grid{grid-template-columns:1fr 1fr!important;gap:6px!important}
        }
      `}</style>

      {/* Confirm delete modal */}
      {confirm && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(4px)'}} onClick={()=>setConfirm(null)}/>
          <div style={{...card,padding:28,width:'100%',maxWidth:340,position:'relative',boxShadow:shadow.lg,animation:'modalIn .2s ease',direction:'rtl',fontFamily:font.family}}>
            <div style={{width:56,height:56,borderRadius:radius.md,background:colors.dangerLight,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',border:`1.5px solid ${colors.dangerBorder}`,fontSize:24}}>🗑️</div>
            <h3 style={{fontSize:font.md,fontWeight:800,color:colors.text,textAlign:'center',marginBottom:8}}>حذف المنتج</h3>
            <p style={{fontSize:font.sm,color:colors.text3,textAlign:'center',lineHeight:1.6,marginBottom:22}}>هل تريد حذف <b>"{confirm.name}"</b>؟<br/>لا يمكن التراجع.</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirm(null)} style={{...btnSecondary,flex:1,padding:'11px',fontSize:font.sm}}>إلغاء</button>
              <button onClick={doDelete} style={{flex:2,padding:'11px',background:colors.danger,color:'white',border:'none',borderRadius:radius.md,fontSize:font.sm,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>حذف نهائياً</button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode scanner */}
      {showScan && (
        <Suspense fallback={null}>
          <BarcodeScanner onScan={(code:string)=>{ setForm(f=>({...f,sku:code})); setShowScan(false) }} onClose={()=>setShowScan(false)}/>
        </Suspense>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(6px)'}}>
          <div style={{background:colors.surface,borderRadius:radius.xl,padding:24,width:'100%',maxWidth:460,maxHeight:'92vh',overflowY:'auto',animation:'modalIn .2s ease',boxShadow:shadow.lg}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontSize:font.md,fontWeight:800,color:colors.text}}>{editItem?'تعديل المنتج':'منتج جديد'}</div>
                <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>{editItem?'عدّل بيانات المنتج':'أضف صنف جديد للمخزون'}</div>
              </div>
              <button onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{width:34,height:34,borderRadius:radius.sm,border:`1.5px solid ${colors.border2}`,background:colors.bg,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:colors.text3}}>×</button>
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
                      <button type="button" onClick={()=>setShowScan(true)} style={{padding:'0 12px',background:colors.primaryLight,color:colors.primary,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:radius.sm,fontSize:16,cursor:'pointer'}}>📷</button>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>الحد الأدنى</label>
                    <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:Number(e.target.value)})} style={inp()}/>
                  </div>
                </div>
                {editItem ? (
                  <div style={{background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:radius.md,padding:'16px'}}>
                    <div style={{fontSize:font.sm,color:colors.primary,marginBottom:10,fontWeight:700}}>الكمية الحالية: <span style={{fontSize:font.xl,fontWeight:900}}>{editItem.qty} {form.unit}</span></div>
                    <label style={lbl}>كمية تضيفها</label>
                    <input type="number" min="0" value={addQty||''} onChange={e=>setAddQty(Number(e.target.value)||0)} style={{...inp(),fontSize:22,fontWeight:800,textAlign:'center'}} placeholder="0"/>
                    {addQty>0&&<div style={{fontSize:font.sm,color:colors.primary,marginTop:8,fontWeight:700,background:'white',padding:'8px 12px',borderRadius:radius.sm,display:'inline-block'}}>✓ الإجمالي بعد الإضافة: {editItem.qty+addQty} {form.unit}</div>}
                  </div>
                ) : (
                  <div>
                    <label style={lbl}>الكمية الابتدائية *</label>
                    <input type="number" min="1" required value={form.qty||''} onChange={e=>setForm({...form,qty:Number(e.target.value)})} style={{...inp(),fontSize:22,fontWeight:800,textAlign:'center'}} placeholder="0"/>
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <button type="button" onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{...btnSecondary,flex:1,padding:'12px',fontSize:font.sm}}>إلغاء</button>
                <button type="submit" disabled={saving} style={{...btnPrimary,flex:2,padding:'13px',fontSize:font.base,opacity:saving?.7:1,cursor:saving?'not-allowed':'pointer'}}>
                  {saving?'جاري الحفظ...':editItem?'حفظ التعديلات ✓':'إضافة المنتج ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:8,flexWrap:'wrap'}}>
        <div>
          <h1 style={{...pageTitle}}>المخزون</h1>
          <p style={{...pageSub}}>{products.length} صنف {lowCount>0?`· `:''}
            {lowCount>0&&<span style={{color:colors.danger,fontWeight:700}}>{lowCount} ناقص</span>}
          </p>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <button onClick={exportCSV} style={{...btnSecondary,padding:'9px 12px',fontSize:font.sm,display:'flex',alignItems:'center',gap:5}}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            <span className="hide-mob">CSV</span>
          </button>
          <button onClick={()=>{setEditItem(null);setAddQty(0);setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''});setShowAdd(true)}} style={{...btnPrimary,padding:'9px 16px',fontSize:font.sm,display:'flex',alignItems:'center',gap:5}}>
            <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            إضافة
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="inv-stats" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'الأصناف',  value:products.length,                      color:colors.info,    bg:colors.infoLight,    border:colors.infoBorder,    key:'all' as const},
          {label:'مخزون ناقص', value:lowCount,                           color:colors.danger,  bg:colors.dangerLight,  border:colors.dangerBorder,  key:'low' as const},
          {label:'مخزون كافٍ', value:products.length-lowCount,           color:colors.primary, bg:colors.primaryLight, border:colors.primaryBorder, key:'ok' as const},
          {label:'إجمالي الكميات', value:products.reduce((s,p)=>s+p.qty,0), color:colors.warning, bg:colors.warningLight, border:colors.warningBorder, key:'all' as const},
        ].map((s,i)=>(
          <button key={i} onClick={()=>{setStatusFilter(s.key);setCatFilter('all');setPage(1)}}
            style={{
              background: statusFilter===s.key && s.key!=='all' ? s.bg : colors.surface,
              borderRadius:radius.lg, padding:'12px 10px',
              border: `1.5px solid ${statusFilter===s.key && s.key!=='all' ? s.color : colors.border}`,
              textAlign:'center' as const, cursor:'pointer', fontFamily:font.family,
              boxShadow: statusFilter===s.key && s.key!=='all' ? `0 4px 14px ${s.color}22` : 'none',
              transition:'all .2s',
            }}>
            <div style={{fontSize:20,fontWeight:900,color:s.color,letterSpacing:'-0.5px'}}>{s.value.toLocaleString()}</div>
            <div style={{fontSize:10,color:colors.text3,marginTop:3,fontWeight:600}}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Category filter */}
      {allCats.length > 2 && (
        <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,marginBottom:14,scrollbarWidth:'none'}}>
          {allCats.map(cat=>{
            const isActive = catFilter===cat
            return (
              <button key={cat} className="cat-btn" onClick={()=>{setCatFilter(cat);setPage(1)}}
                style={{
                  background: isActive ? colors.primary : colors.surface,
                  color: isActive ? 'white' : colors.text3,
                  border: `1.5px solid ${isActive ? colors.primary : colors.border}`,
                  boxShadow: isActive ? `0 4px 12px ${colors.primary}33` : 'none',
                }}>
                {cat==='all' ? '🏷️ الكل' : `${CAT_ICONS[cat]||'📦'} ${cat}`}
              </button>
            )
          })}
        </div>
      )}

      {/* Main table card */}
      <div style={{...card}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${colors.border}`}}>
          <div style={{position:'relative'}}>
            <svg style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="15" height="15" fill="none" stroke={colors.text4} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="ابحث بالاسم أو الفئة أو الباركود..." style={{...inp(),paddingRight:38,background:colors.bg,border:`1.5px solid ${colors.border}`}}/>
          </div>
        </div>

        {filtered.length===0 ? (
          <div style={{padding:64,textAlign:'center'}}>
            <div style={{fontSize:52,marginBottom:12}}>📦</div>
            <div style={{fontSize:font.md,fontWeight:700,color:colors.text2,marginBottom:6}}>{search||catFilter!=='all'?'لا توجد نتائج':'المخزون فارغ'}</div>
            <div style={{fontSize:font.sm,color:colors.text4,marginBottom:20}}>{search||catFilter!=='all'?'جرب كلمة أو فئة أخرى':'ابدأ بإضافة منتجك الأول'}</div>
            {(search||catFilter!=='all') && <button onClick={()=>{setSearch('');setCatFilter('all');setStatusFilter('all')}} style={{...btnSecondary,padding:'8px 20px',fontSize:font.sm}}>إزالة الفلاتر</button>}
          </div>
        ) : (
          <>
            {/* Mobile cards grid */}
            <div className="mob-cards" style={{padding:'10px'}}>
              <style>{`@media(min-width:640px){.mob-cards{display:none!important}.desk-table{display:block!important}}@media(max-width:639px){.desk-table{display:none!important}}.mob-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}`}</style>
              <div className="mob-grid">
              {paginated.map((p,i)=>{
                const isLow=p.qty<=p.reorder_point
                const isOut=p.qty===0
                const statusColor = isOut ? colors.danger : isLow ? colors.warning : colors.primary
                const statusBg = isOut ? colors.dangerLight : isLow ? colors.warningLight : colors.primaryLight
                const statusBorder = isOut ? colors.dangerBorder : isLow ? colors.warningBorder : colors.primaryBorder
                const statusLabel = isOut ? 'نفد' : isLow ? 'ناقص' : 'كافٍ'
                return (
                  <div key={p.id} onClick={()=>openEdit(p)} style={{background:colors.surface,border:`1px solid ${statusBorder}`,borderRadius:10,padding:'8px 6px',cursor:'pointer',aspectRatio:'1',display:'flex',flexDirection:'column' as const,overflow:'hidden'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                      <div style={{width:32,height:32,borderRadius:8,background:statusBg,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${statusBorder}`,flexShrink:0}}>
                        <span style={{fontSize:12,fontWeight:900,color:statusColor}}>{p.qty}</span>
                      </div>
                      <span style={{fontSize:9,fontWeight:700,color:statusColor,background:statusBg,padding:'2px 6px',borderRadius:20,border:`1px solid ${statusBorder}`}}>{statusLabel}</span>
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'as const}}>{p.name}</div>
                    <div style={{fontSize:9,color:colors.text4,marginBottom:4}}>{p.unit}</div>
                    <StockBar qty={p.qty} reorder={p.reorder_point}/>
                  </div>
                )
              })}
              </div>
            </div>

            {/* Desktop table */}
            <div className="desk-table" style={{display:'none',overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:520}}>
                <thead>
                  <tr style={{background:colors.bg,borderBottom:`1.5px solid ${colors.border}`}}>
                    {['المنتج','الفئة','المخزون','الحد الأدنى','الحالة',''].map((h,i)=>(
                      <th key={i} className={i===1||i===3?'hide-mob':''} style={{padding:'11px 16px',color:colors.text4,fontSize:font.xs,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.06em',whiteSpace:'nowrap' as const}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(p=>{
                    const isLow=p.qty<=p.reorder_point
                    const isOut=p.qty===0
                    const statusColor = isOut ? colors.danger : isLow ? colors.warning : colors.primary
                    const statusBg = isOut ? colors.dangerLight : isLow ? colors.warningLight : colors.primaryLight
                    const statusBorder = isOut ? colors.dangerBorder : isLow ? colors.warningBorder : colors.primaryBorder
                    const statusLabel = isOut ? 'نفد' : isLow ? 'ناقص' : 'كافٍ'
                    return (
                      <tr key={p.id} className="trow" style={{borderBottom:`1px solid ${colors.border}`}}>
                        <td style={{padding:'14px 16px'}}>
                          <div style={{fontWeight:700,fontSize:font.base,color:colors.text}}>{p.name}</div>
                          {p.sku&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:2,fontFamily:'monospace'}}>#{p.sku}</div>}
                          <StockBar qty={p.qty} reorder={p.reorder_point}/>
                        </td>
                        <td className="hide-mob" style={{padding:'14px 16px'}}>
                          {p.category
                            ? <span style={{...tag(colors.text2,colors.bg,colors.border2)}}>{CAT_ICONS[p.category]||'📦'} {p.category}</span>
                            : <span style={{color:colors.text4}}>—</span>}
                        </td>
                        <td style={{padding:'14px 16px',whiteSpace:'nowrap' as const}}>
                          <span style={{fontWeight:900,fontSize:22,color:statusColor,letterSpacing:'-0.5px'}}>{p.qty}</span>
                          <span style={{fontSize:font.xs,color:colors.text4,marginRight:4}}>{p.unit}</span>
                        </td>
                        <td className="hide-mob" style={{padding:'14px 16px',color:colors.text3,fontSize:font.sm}}>{p.reorder_point} {p.unit}</td>
                        <td style={{padding:'14px 16px'}}>
                          <span style={{...tag(statusColor,statusBg,statusBorder)}}>{statusLabel}</span>
                        </td>
                        <td style={{padding:'14px 16px'}}>
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
    </div>
  )
}
