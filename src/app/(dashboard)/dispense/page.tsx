'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { toast } from '@/components/toast'
import { cache } from '@/lib/cache'
import { createClient } from '@/lib/supabase/client'
import { colors as dsColors } from '@/lib/ds'

// موحّد مع نظام التصميم المشترك (@/lib/ds)
const C = {
  primary:dsColors.primary, primaryD:dsColors.primaryDark, primaryL:dsColors.primaryLight, primaryB:dsColors.primaryBorder,
  danger:dsColors.danger, dangerL:dsColors.dangerLight, dangerB:dsColors.dangerBorder,
  warning:dsColors.warning, warningL:dsColors.warningLight, warningB:dsColors.warningBorder,
  text:dsColors.text, text2:dsColors.text2, text3:dsColors.text3, text4:dsColors.text4,
  bg:dsColors.bg, surface:dsColors.surface, border:dsColors.border, border2:dsColors.border2,
}

const CAT_COLORS = ['#16a34a','#2563eb','#dc2626','#d97706','#7c3aed','#0891b2','#db2777','#65a30d']
const OTHER = 'أخرى'

export default function DispensePage() {
  const [products, setProducts]   = useState<any[]>([])
  const [history, setHistory]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [activeCat, setActiveCat] = useState('كل المنتجات')
  const [selected, setSelected]   = useState<any>(null)
  const [restrictedIds, setRestrictedIds] = useState<Set<string>>(new Set())
  const [activeSection, setActiveSection] = useState<'menu'|'inventory'>('menu')
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [qty, setQty]             = useState('')
  const [wasteMode, setWasteMode] = useState(false)
  const [wasteReason, setWasteReason] = useState('')
  const [search, setSearch]       = useState('')
  const [visible, setVisible]     = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const orgRef  = useRef<string|null>(null)
  const profRef = useRef<string|null>(null)
  const sb = createClient()

  useEffect(()=>{
    let a=0
    const c=setInterval(()=>{
      a++
      const b=sessionStorage.getItem('s_branch_id'),o=sessionStorage.getItem('s_org_id')
      if((b&&o)||a>20){clearInterval(c);init()}
    },100)
    return()=>clearInterval(c)
  },[])

  async function init() {
    setLoading(true)
    const co=sessionStorage.getItem('s_org_id'),cp=sessionStorage.getItem('s_profile_id')
    if(co&&cp){orgRef.current=co;profRef.current=cp;await Promise.all([loadProducts(co),loadHistory(co)]);setLoading(false);setTimeout(()=>setVisible(true),50);return}
    const{data:{user}}=await sb.auth.getUser();if(!user)return
    const{data:p}=await sb.from('profiles').select('id,org_id').eq('id',user.id).single();if(!p?.org_id)return
    sessionStorage.setItem('s_org_id',p.org_id);sessionStorage.setItem('s_profile_id',p.id)
    orgRef.current=p.org_id;profRef.current=p.id
    await Promise.all([loadProducts(p.org_id),loadHistory(p.org_id)])
    setLoading(false);setTimeout(()=>setVisible(true),50)
  }

  async function loadProducts(oid:string) {
    const bid=sessionStorage.getItem('s_branch_id')
    let q=sb.from('products').select('id,name,sku,unit,qty,reorder_point,category,is_recipe,recipe_unit,recipe_unit_factor,allow_direct_dispense').eq('org_id',oid).eq('is_active',true)
    if(bid) q=q.eq('branch_id',bid)
    const{data}=await q.order('qty',{ascending:true})
    if(data){
      setProducts(data)
      const recipeIds=(data as any[]).filter(p=>p.is_recipe).map(p=>p.id)
      if(recipeIds.length){
        const{data:ri}=await (sb.from('recipe_items' as any) as any).select('component_product_id').in('product_id',recipeIds)
        const compIds=new Set((ri||[]).map((r:any)=>r.component_product_id))
        const restricted=new Set<string>()
        ;(data as any[]).forEach(p=>{ if(compIds.has(p.id) && p.allow_direct_dispense===false) restricted.add(p.id) })
        setRestrictedIds(restricted)
      } else setRestrictedIds(new Set())
    }
  }

  async function loadHistory(oid:string) {
    const bid=sessionStorage.getItem('s_branch_id')
    let q=sb.from('stock_movements').select('id,qty_change,type,waste_reason,created_at,products!inner(name,unit,org_id,branch_id)').in('type',['out','waste']).eq('products.org_id',oid)
    if(bid) q=q.eq('products.branch_id',bid)
    const{data}=await q.order('created_at',{ascending:false}).limit(30)
    setHistory(data||[])
  }

  async function handleDispense() {
    const oid=orgRef.current,pid=profRef.current
    if(!selected||!qty||!oid||!pid)return
    if(restrictedIds.has(selected.id)){toast('هذا مكوّن داخل وصفة — يُصرف تلقائياً معها، لا يُباع مباشرة','warning');return}
    setSaving(true)
    const qn=Number(qty)

    if((selected as any).is_recipe){
      const{data:items}=await (sb.from('recipe_items' as any) as any).select('component_product_id,qty').eq('product_id',selected.id)
      if(!items||items.length===0){toast('هذه الوصفة بدون مكوّنات معرّفة — أضفها من صفحة المخزون أولاً','warning');setSaving(false);return}
      for(const it of items as any[]){
        const comp=products.find((p:any)=>p.id===it.component_product_id)
        const factor=(comp as any)?.recipe_unit_factor||1
        const deduct=(Number(it.qty)*qn)/factor
        await sb.from('stock_movements').insert({product_id:it.component_product_id,profile_id:pid,type:'out',qty_change:-deduct,note:`صرف ضمن وصفة: ${selected.name} × ${qn}`})
        fetch('/api/notify-low-stock-instant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid,product_id:it.component_product_id,new_qty:(comp?.qty||0)-deduct,reorder_point:comp?.reorder_point||0})}).catch(()=>{})
      }
      await (sb.from('recipe_sales_log' as any) as any).insert({product_id:selected.id,org_id:oid,branch_id:sessionStorage.getItem('s_branch_id')||null,qty:qn,profile_id:pid,staff_name:sessionStorage.getItem('s_full_name')||'المالك'})
      cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:')
      toast(`✅ تم صرف ${qn} ${selected.unit} من ${selected.name} — خُصمت المكوّنات تلقائياً`)
      fetch('/api/notify-staff-dispense',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid,branch_id:sessionStorage.getItem('s_branch_id')||null,staff_name:sessionStorage.getItem('s_full_name')||'المالك',product_name:selected.name,qty:qn,unit:selected.unit})}).catch(()=>{})
      setSelected(null);setQty('');setWasteMode(false);setWasteReason('')
      setSaving(false);loadProducts(oid);loadHistory(oid)
      return
    }

    if(selected.qty<qn){toast('الكمية أكبر من المتاح!','warning');setSaving(false);return}
    const{error}=await sb.from('stock_movements').insert({product_id:selected.id,profile_id:pid,type:'out',qty_change:-qn,note:'استهلاك يومي'})
    if(error){toast('خطأ','error');setSaving(false);return}
    cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:')
    toast(`✅ تم صرف ${qn} ${selected.unit} من ${selected.name}`)
    fetch('/api/notify-low-stock-instant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid,product_id:selected.id,new_qty:selected.qty-qn,reorder_point:selected.reorder_point})}).catch(()=>{})
    fetch('/api/notify-staff-dispense',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid,branch_id:sessionStorage.getItem('s_branch_id')||null,staff_name:sessionStorage.getItem('s_full_name')||'المالك',product_name:selected.name,qty:qn,unit:selected.unit})}).catch(()=>{})
    setSelected(null);setQty('');setWasteMode(false);setWasteReason('')
    setSaving(false);loadProducts(oid);loadHistory(oid)
  }

  async function handleWaste() {
    const oid=orgRef.current,pid=profRef.current
    if(!selected||!qty||!oid||!pid||!wasteReason)return
    setSaving(true)
    const qn=Number(qty)
    if(selected.qty<qn){toast('الكمية أكبر من المتاح!','warning');setSaving(false);return}
    const{error}=await (sb as any).from('stock_movements').insert({product_id:selected.id,profile_id:pid,type:'waste',qty_change:-qn,waste_reason:wasteReason,note:`هدر: ${wasteReason}`})
    if(error){toast('خطأ','error');setSaving(false);return}
    cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:')
    fetch('/api/notify-waste',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid,branch_id:sessionStorage.getItem('s_branch_id')||null,staff_name:sessionStorage.getItem('s_full_name')||'المالك',product_name:selected.name,qty:qn,unit:selected.unit,waste_reason:wasteReason})}).catch(()=>{})
    toast(`🗑️ تم تسجيل هدر ${qn} ${selected.unit} من ${selected.name}`)
    setSelected(null);setQty('');setWasteMode(false);setWasteReason('')
    setSaving(false);loadProducts(oid);loadHistory(oid)
  }

  const WASTE_REASONS = ['تالف','منتهي الصلاحية','كسر','سرقة/فقدان','خطأ تحضير','أخرى']

  const sectionProducts = products.filter((p:any)=>activeSection==='menu' ? !!p.is_recipe : !p.is_recipe)

  const catMap: Record<string,number>={}
  sectionProducts.forEach((p:any)=>{const c=p.category?.trim()||OTHER;catMap[c]=(catMap[c]||0)+1})
  const categories=Object.keys(catMap).sort((a,b)=>{if(a===OTHER)return 1;if(b===OTHER)return -1;return catMap[b]-catMap[a]})
  const allCats=['كل المنتجات',...categories]
  const catColor=(cat:string)=>CAT_COLORS[categories.indexOf(cat)%CAT_COLORS.length]

  const displayed=sectionProducts
    .filter((p:any)=>!search||(p.name?.toLowerCase().includes(search.toLowerCase())))
    .filter((p:any)=>activeCat==='كل المنتجات'||(p.category?.trim()||OTHER)===activeCat)

  const outCount=products.filter(p=>p.qty===0).length
  const lowCount=products.filter(p=>p.qty>0&&p.qty<=p.reorder_point).length

  if(loading) return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:'0 4px'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.4s ease infinite}`}</style>
      <div style={{height:24,width:120,background:'#e5e7eb',borderRadius:6,marginBottom:14}} className="sk"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:8}}>
        {Array(12).fill(0).map((_,i)=><div key={i} className="sk" style={{height:80,borderRadius:10,background:'#f0f0f0'}}/>)}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',opacity:visible?1:0,transition:'opacity .3s'}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .chip{padding:5px 12px;border-radius:99px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;border:1.5px solid;transition:all .15s;font-family:inherit}
        .chip:active{transform:scale(.95)}
        .qbtn{width:44px;height:44px;border-radius:10px;border:1.5px solid #e5e7eb;background:#f9fafb;font-size:20px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:inherit}
        .qbtn:active{background:#f0fdf4;border-color:#16a34a;color:#16a34a}
        input:focus{border-color:#16a34a!important;box-shadow:0 0 0 3px #f0fdf4!important;outline:none!important}
        /* Product card */
        .pcard{
          background:white;border-radius:12px;padding:10px 8px;
          cursor:pointer;border:1.5px solid #f0f0f0;
          box-shadow:0 1px 3px rgba(15,23,42,.04),0 1px 2px rgba(15,23,42,.03);
          transition:all .15s;font-family:inherit;
          display:flex;flex-direction:column;align-items:center;
          text-align:center;gap:6px;
        }
        .pcard:hover{border-color:#16a34a;transform:translateY(-1px);box-shadow:0 4px 12px rgba(22,163,74,.1)}
        .pcard:active{transform:scale(.97)}
        .pcard.selected{border-color:#16a34a;background:#f0fdf4;box-shadow:0 0 0 2px #16a34a40}
        .pcard.out{opacity:.45;cursor:not-allowed}
        .pcard.out:hover{transform:none;box-shadow:none;border-color:#f0f0f0}
        /* Grid — auto fill */
        .pgrid{
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
          gap:8px;
        }
        @media(min-width:640px){.pgrid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}}
        @media(min-width:1024px){.pgrid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <h1 style={{fontSize:18,fontWeight:800,color:C.text,margin:0}}>الصرف</h1>
          <p style={{fontSize:10,color:C.text3,margin:'2px 0 0'}}>
            {products.length} صنف
            {outCount>0&&<span style={{color:C.danger,fontWeight:700}}> · {outCount} نفد</span>}
            {lowCount>0&&<span style={{color:C.warning,fontWeight:700}}> · {lowCount} ناقص</span>}
          </p>
        </div>
        <button onClick={()=>setShowHistory(true)}
          style={{display:'flex',alignItems:'center',gap:5,padding:'7px 12px',background:'white',border:`1.5px solid ${C.border2}`,borderRadius:9,fontSize:11,fontWeight:700,color:C.text2,cursor:'pointer',fontFamily:'inherit'}}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          السجل ({history.length})
        </button>
      </div>

      {/* Section tabs: القائمة vs المخزون */}
      <div style={{display:'flex',gap:6,marginBottom:12,background:C.bg,borderRadius:10,padding:4}}>
        <button onClick={()=>{setActiveSection('menu');setActiveCat('كل المنتجات');setSearch('')}}
          style={{flex:1,padding:'9px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,background:activeSection==='menu'?'white':'transparent',color:activeSection==='menu'?C.primary:C.text3,boxShadow:activeSection==='menu'?'0 1px 3px rgba(0,0,0,.08)':'none',transition:'all .15s'}}>
          🍔 القائمة
        </button>
        <button onClick={()=>{setActiveSection('inventory');setActiveCat('كل المنتجات');setSearch('')}}
          style={{flex:1,padding:'9px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,background:activeSection==='inventory'?'white':'transparent',color:activeSection==='inventory'?C.primary:C.text3,boxShadow:activeSection==='inventory'?'0 1px 3px rgba(0,0,0,.08)':'none',transition:'all .15s'}}>
          📦 المخزون
        </button>
      </div>

      {activeSection==='menu' && (
        <button onClick={()=>setShowRecipeModal(true)}
          style={{width:'100%',padding:'10px',marginBottom:10,background:C.primaryL,color:C.primary,border:`1.5px dashed ${C.primaryB}`,borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          + إضافة صنف جديد للقائمة
        </button>
      )}

      {/* Search */}
      <div style={{position:'relative',marginBottom:10}}>
        <svg style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="13" height="13" fill="none" stroke={C.text4} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e=>{setSearch(e.target.value);setActiveCat('كل المنتجات')}}
          style={{width:'100%',padding:'9px 32px 9px 12px',border:`1.5px solid ${C.border2}`,borderRadius:9,fontSize:12,background:'white',color:C.text,fontFamily:'inherit'}}
          placeholder="ابحث..."/>
      </div>

      {/* Category chips */}
      <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:8,marginBottom:12,scrollbarWidth:'none'}}>
        {allCats.map(cat=>{
          const active=activeCat===cat
          const color=cat==='كل المنتجات'?C.primary:catColor(cat)
          return (
            <button key={cat} className="chip" onClick={()=>setActiveCat(cat)}
              style={{background:active?color:'white',color:active?'white':C.text3,borderColor:active?color:C.border2,flexShrink:0}}>
              {cat==='كل المنتجات'?'الكل':cat}
              {cat!=='كل المنتجات'&&<span style={{opacity:.6,fontSize:9,marginRight:2}}>({catMap[cat]})</span>}
            </button>
          )
        })}
      </div>

      {/* Products Grid */}
      {displayed.length===0 ? (
        <div style={{background:'white',borderRadius:12,padding:'40px 20px',textAlign:'center',border:`1px solid ${C.border}`}}>
          <div style={{fontSize:36,marginBottom:8}}>📦</div>
          <div style={{fontSize:13,fontWeight:700,color:C.text2}}>{search?'لا توجد نتائج':'لا يوجد منتجات'}</div>
        </div>
      ) : (
        <div className="pgrid">
          {displayed.map((p:any)=>{
            const isRecipe=!!p.is_recipe
            const isOut=!isRecipe&&p.qty===0
            const isLow=!isRecipe&&!isOut&&p.qty<=p.reorder_point
            const sc=isRecipe?C.primary:isOut?C.danger:isLow?C.warning:C.primary
            const isSel=selected?.id===p.id
            return (
              <button key={p.id}
                className={`pcard${isSel?' selected':''}${isOut?' out':''}`}
                onClick={()=>{if(isOut)return;setSelected(p);setQty('1')}}>
                {/* Qty or icon */}
                {isRecipe ? (
                  <div style={{fontSize:22,lineHeight:1}}>🍔</div>
                ) : (
                  <div style={{fontSize:22,fontWeight:900,color:sc,lineHeight:1}}>{p.qty}</div>
                )}
                {/* Name */}
                <div style={{fontSize:11,fontWeight:700,color:C.text,lineHeight:1.3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>{p.name}</div>
                {/* Unit */}
                <div style={{fontSize:9,color:C.text4}}>{p.unit}</div>
                {/* Status */}
                {isRecipe ? (
                  <span style={{fontSize:8,fontWeight:700,color:C.primary,background:C.primaryL,padding:'2px 8px',borderRadius:99,border:`1px solid ${C.primaryB}`}}>متاح</span>
                ) : (
                  <span style={{fontSize:8,fontWeight:700,color:sc,background:isOut?C.dangerL:isLow?C.warningL:C.primaryL,padding:'2px 8px',borderRadius:99,border:`1px solid ${isOut?C.dangerB:isLow?C.warningB:C.primaryB}`}}>
                    {isOut?'نفد':isLow?'ناقص':'كافٍ'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* History Sheet */}
      {showHistory && (
        <div style={{position:'fixed',inset:0,zIndex:900,display:'flex',alignItems:'flex-end'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}} onClick={()=>setShowHistory(false)}/>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'75vh',display:'flex',flexDirection:'column',position:'relative',animation:'slideUp .3s ease',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
            <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div style={{width:32,height:3,borderRadius:99,background:C.border2,position:'absolute',top:8,left:'50%',transform:'translateX(-50%)'}}/>
              <span style={{fontSize:14,fontWeight:700,color:C.text}}>آخر الصرف</span>
              <button onClick={()=>setShowHistory(false)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:C.text3,padding:4}}>✕</button>
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              {history.length===0?(
                <div style={{padding:'32px',textAlign:'center',color:C.text4,fontSize:12}}>لا توجد عمليات بعد</div>
              ):history.map((h,i)=>{
                const isWaste=h.type==='waste'
                const badgeColor=isWaste?'#d97706':C.danger
                const badgeBg=isWaste?C.warningL:C.dangerL
                const badgeBorder=isWaste?C.warningB:C.dangerB
                return (
                <div key={h.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 20px',borderBottom:i<history.length-1?`1px solid ${C.border}`:'none'}}>
                  <div style={{width:30,height:30,borderRadius:8,background:badgeBg,border:`1px solid ${badgeBorder}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:13}}>
                    {isWaste?'🗑️':<svg width="12" height="12" fill="none" stroke={C.danger} strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {(h.products as any)?.name}
                      {isWaste&&<span style={{fontSize:9,fontWeight:700,color:'#b45309',background:'#fffbeb',padding:'1px 6px',borderRadius:99,marginRight:6,border:'1px solid #fde68a'}}>هدر{h.waste_reason?` · ${h.waste_reason}`:''}</span>}
                    </div>
                    <div style={{fontSize:10,color:C.text4,marginTop:1}}>{new Date(h.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  <span style={{fontSize:13,fontWeight:800,color:badgeColor,flexShrink:0}}>{Math.abs(h.qty_change)} <span style={{fontSize:10,color:C.text4,fontWeight:400}}>{(h.products as any)?.unit}</span></span>
                </div>
              )})}
            </div>
          </div>
        </div>
      )}

      {/* Dispense Sheet */}
      {selected && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(6px)'}} onClick={()=>{setSelected(null);setQty('')}}/>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,position:'relative',animation:'slideUp .25s ease',paddingBottom:'env(safe-area-inset-bottom)',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
            <div style={{width:32,height:3,borderRadius:99,background:C.border2,margin:'10px auto 0'}}/>
            <div style={{padding:'14px 20px 0'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:C.text}}>{selected.name}</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}>متاح: <b style={{color:C.primary,fontSize:14}}>{selected.qty}</b> {selected.unit}</div>
                </div>
                <button onClick={()=>{setSelected(null);setQty('');setWasteMode(false);setWasteReason('')}} style={{width:28,height:28,borderRadius:'50%',background:C.bg,border:`1px solid ${C.border2}`,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',color:C.text3}}>✕</button>
              </div>

              <div style={{display:'flex',gap:6,marginBottom:14,background:C.bg,padding:4,borderRadius:12}}>
                <button onClick={()=>{setWasteMode(false);setWasteReason('')}}
                  style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:!wasteMode?'white':'transparent',color:!wasteMode?C.danger:C.text3,fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:'inherit',boxShadow:!wasteMode?'0 1px 4px rgba(0,0,0,.08)':'none',transition:'all .15s'}}>
                  📤 صرف عادي
                </button>
                <button onClick={()=>setWasteMode(true)}
                  style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:wasteMode?'white':'transparent',color:wasteMode?'#b45309':C.text3,fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:'inherit',boxShadow:wasteMode?'0 1px 4px rgba(0,0,0,.08)':'none',transition:'all .15s'}}>
                  🗑️ تسجيل هدر
                </button>
              </div>

              {wasteMode && (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text3,marginBottom:6}}>سبب الهدر *</div>
                  <div style={{display:'flex',flexWrap:'wrap' as const,gap:6}}>
                    {WASTE_REASONS.map(r=>(
                      <button key={r} onClick={()=>setWasteReason(r)}
                        style={{padding:'6px 12px',borderRadius:99,border:`1.5px solid ${wasteReason===r?'#d97706':C.border2}`,background:wasteReason===r?'#fffbeb':'white',color:wasteReason===r?'#b45309':C.text3,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{height:5,background:C.border,borderRadius:99,overflow:'hidden',marginBottom:18}}>
                <div style={{height:'100%',width:Math.min((selected.qty/Math.max(selected.reorder_point*2,selected.qty,1))*100,100)+'%',background:selected.qty<=selected.reorder_point?C.warning:C.primary,borderRadius:99}}/>
              </div>

              <div style={{marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'center',marginBottom:10}}>
                  <button className="qbtn" onClick={()=>setQty(q=>String(Math.max(1,Number(q)-1)))}>−</button>
                  <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} inputMode="numeric"
                    style={{width:88,padding:'8px',border:`2px solid ${C.border}`,borderRadius:12,fontSize:30,fontWeight:900,textAlign:'center',outline:'none',color:C.text,background:C.bg,fontFamily:'inherit'}}/>
                  <button className="qbtn" onClick={()=>setQty(q=>String(Number(q)+1))}>+</button>
                </div>
                <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                  {[1,5,10,20].map(v=>(
                    <button key={v} onClick={()=>setQty(String(v))}
                      style={{padding:'5px 12px',borderRadius:99,border:`1.5px solid ${Number(qty)===v?C.primary:C.border2}`,background:Number(qty)===v?C.primaryL:'white',color:Number(qty)===v?C.primary:C.text3,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {Number(qty)>selected.qty&&(
                <div style={{background:C.dangerL,border:`1px solid ${C.dangerB}`,borderRadius:9,padding:'8px 14px',marginBottom:10,fontSize:12,fontWeight:700,color:C.danger}}>
                  ⚠️ الكمية تتجاوز المتاح
                </div>
              )}
            </div>

            <div style={{padding:'8px 20px 16px'}}>
              {wasteMode ? (
                <button disabled={saving||!qty||Number(qty)<=0||(!selected.is_recipe&&Number(qty)>selected.qty)||!wasteReason} onClick={handleWaste}
                  style={{width:'100%',padding:'14px',fontSize:14,fontWeight:800,background:saving||!qty||Number(qty)<=0||(!selected.is_recipe&&Number(qty)>selected.qty)||!wasteReason?C.text4:'#d97706',color:'white',border:'none',borderRadius:12,cursor:'pointer',fontFamily:'inherit',opacity:saving||!qty||Number(qty)<=0||(!selected.is_recipe&&Number(qty)>selected.qty)||!wasteReason?.6:1,boxShadow:'0 6px 16px #d9770630',transition:'all .2s'}}>
                  {saving?'⏳ جاري الحفظ...':`🗑️ تسجيل هدر ${qty||0} ${selected.unit}`}
                </button>
              ) : (
                <button disabled={saving||!qty||Number(qty)<=0||(!selected.is_recipe&&Number(qty)>selected.qty)} onClick={handleDispense}
                  style={{width:'100%',padding:'14px',fontSize:14,fontWeight:800,background:saving||!qty||Number(qty)<=0||(!selected.is_recipe&&Number(qty)>selected.qty)?C.text4:C.danger,color:'white',border:'none',borderRadius:12,cursor:'pointer',fontFamily:'inherit',opacity:saving||!qty||Number(qty)<=0||(!selected.is_recipe&&Number(qty)>selected.qty)?.6:1,boxShadow:`0 6px 16px ${C.danger}30`,transition:'all .2s'}}>
                  {saving?'⏳ جاري الحفظ...':`✓ صرف ${qty||0} ${selected.unit} من ${selected.name}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showRecipeModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)'}} onClick={()=>setShowRecipeModal(false)}>
          <RecipeQuickAdd
            onClose={()=>setShowRecipeModal(false)}
            onSaved={()=>{setShowRecipeModal(false); const oid=orgRef.current; if(oid) loadProducts(oid)}}
            rawMaterials={products.filter((p:any)=>!p.is_recipe)}
            sb={sb}
            orgId={orgRef.current}
            branchId={typeof window!=='undefined'?sessionStorage.getItem('s_branch_id'):null}
          />
        </div>
      )}
    </div>
  )
}

function RecipeQuickAdd({onClose,onSaved,rawMaterials,sb,orgId,branchId}:{onClose:()=>void,onSaved:()=>void,rawMaterials:any[],sb:any,orgId:string|null,branchId:string|null}) {
  const [name,setName]=useState('')
  const [unit,setUnit]=useState('قطعة')
  const [components,setComponents]=useState<{component_product_id:string,qty:string}[]>([])
  const [newCompId,setNewCompId]=useState('')
  const [newCompQty,setNewCompQty]=useState('')
  const [newCompSubUnit,setNewCompSubUnit]=useState(1)
  const [customSubLabel,setCustomSubLabel]=useState('')
  const [customSubCount,setCustomSubCount]=useState('')

  function subUnitOptions(baseUnit:string) {
    const u=(baseUnit||'').trim()
    if(['كيلو','كجم','كيلوجرام','كيلو جرام'].includes(u)) return [{label:'جرام',factor:1000},{label:'كيلو',factor:1}]
    if(['لتر','ليتر'].includes(u)) return [{label:'مل',factor:1000},{label:'لتر',factor:1}]
    return [{label:u||'وحدة',factor:1}]
  }
  function isStandardUnit(baseUnit:string) {
    const u=(baseUnit||'').trim()
    return ['كيلو','كجم','كيلوجرام','كيلو جرام','لتر','ليتر'].includes(u)
  }
  const [saving,setSaving]=useState(false)

  function addComp() {
    if(!newCompId||!newCompQty||Number(newCompQty)<=0) return
    if(components.some(c=>c.component_product_id===newCompId)) return
    const customFactor=Number(customSubCount)
    const factor = customFactor>0 ? customFactor : newCompSubUnit
    const baseQty=Number(newCompQty)/factor
    setComponents(prev=>[...prev,{component_product_id:newCompId,qty:String(baseQty)}])
    setNewCompId('');setNewCompQty('');setNewCompSubUnit(1);setCustomSubLabel('');setCustomSubCount('')
  }

  async function save() {
    if(!name.trim()||!orgId) return
    setSaving(true)
    const{data:np,error}=await sb.from('products').insert({org_id:orgId,branch_id:branchId||null,name:name.trim(),unit,qty:0,reorder_point:0,is_active:true,is_recipe:true}).select().single()
    if(error||!np){setSaving(false);return}
    if(components.length>0){
      const rows=components.map(c=>({product_id:np.id,component_product_id:c.component_product_id,qty:Number(c.qty)}))
      await (sb.from('recipe_items' as any) as any).insert(rows)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:400,maxHeight:'85vh',overflowY:'auto',padding:20}}>
      <div style={{fontSize:15,fontWeight:800,marginBottom:14}}>🍔 صنف جديد للقائمة</div>
      <label style={{fontSize:11,fontWeight:700,color:'#6b7280',display:'block',marginBottom:5}}>اسم الصنف *</label>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="مثال: برجر بالجبن" style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e7eb',borderRadius:9,fontSize:13,marginBottom:12,fontFamily:'inherit'}}/>
      <label style={{fontSize:11,fontWeight:700,color:'#6b7280',display:'block',marginBottom:5}}>وحدة البيع</label>
      <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="قطعة، كوب، طبق..." style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e7eb',borderRadius:9,fontSize:13,marginBottom:14,fontFamily:'inherit'}}/>

      <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>مكوّنات الصنف</div>
      {components.length>0 && (
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:8}}>
          {components.map(c=>{
            const comp=rawMaterials.find(r=>r.id===c.component_product_id)
            return (
              <div key={c.component_product_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'6px 10px'}}>
                <span style={{fontSize:11}}>{comp?.name||'—'} — {c.qty} {comp?.unit}</span>
                <button onClick={()=>setComponents(prev=>prev.filter(x=>x.component_product_id!==c.component_product_id))} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:14}}>×</button>
              </div>
            )
          })}
        </div>
      )}
      <div style={{display:'flex',gap:6,marginBottom:6}}>
        <select value={newCompId} onChange={e=>{const id=e.target.value;setNewCompId(id);const r=rawMaterials.find(x=>x.id===id);const opts=subUnitOptions(r?.unit||'');setNewCompSubUnit(opts[0].factor)}} style={{flex:2,padding:'8px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:11}}>
          <option value="">اختر مكوّن...</option>
          {rawMaterials.filter(r=>!components.some(c=>c.component_product_id===r.id)).map(r=>(
            <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>
          ))}
        </select>
      </div>
      {newCompId && !isStandardUnit(rawMaterials.find(x=>x.id===newCompId)?.unit||'') && (
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:8,marginBottom:8}}>
          <div style={{fontSize:10,color:'#92400e',marginBottom:6}}>كم قطعة/وحدة بكل {rawMaterials.find(x=>x.id===newCompId)?.unit} واحد؟ (اختياري — يخليك تكتب الكمية بوحدة أدق)</div>
          <div style={{display:'flex',gap:6}}>
            <input value={customSubLabel} onChange={e=>setCustomSubLabel(e.target.value)} placeholder="اسم الوحدة (مثال: رغيف)" style={{flex:2,padding:'7px',border:'1.5px solid #fde68a',borderRadius:7,fontSize:10}}/>
            <input type="number" min="1" value={customSubCount} onChange={e=>setCustomSubCount(e.target.value)} placeholder="العدد" style={{flex:1,padding:'7px',border:'1.5px solid #fde68a',borderRadius:7,fontSize:10}}/>
          </div>
        </div>
      )}
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        <input type="number" step="0.01" min="0" value={newCompQty} onChange={e=>setNewCompQty(e.target.value)} placeholder={customSubCount?`الكمية بـ${customSubLabel||'وحدة'}`:'الكمية'} style={{flex:1,padding:'8px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:11}}/>
        {newCompId && (()=>{const r=rawMaterials.find(x=>x.id===newCompId);const opts=subUnitOptions(r?.unit||'');return opts.length>1 ? (
          <select value={newCompSubUnit} onChange={e=>setNewCompSubUnit(Number(e.target.value))} style={{flex:1,padding:'8px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:11}}>
            {opts.map(o=>(<option key={o.label} value={o.factor}>{o.label}</option>))}
          </select>
        ) : (
          <div style={{flex:1,padding:'8px',fontSize:11,color:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>{customSubLabel||opts[0].label}</div>
        )})()}
        <button onClick={addComp} style={{padding:'0 12px',background:'#16a34a',color:'white',border:'none',borderRadius:8,fontSize:16,fontWeight:700,cursor:'pointer'}}>+</button>
      </div>

      <div style={{display:'flex',gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:'11px',background:'#f9fafb',color:'#374151',border:'1px solid #e5e7eb',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
        <button onClick={save} disabled={saving||!name.trim()} style={{flex:2,padding:'11px',background:'#16a34a',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:saving||!name.trim()?.6:1}}>
          {saving?'جاري الحفظ...':'حفظ الصنف'}
        </button>
      </div>
    </div>
  )
}
