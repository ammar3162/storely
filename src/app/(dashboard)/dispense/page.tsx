'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { toast } from '@/components/toast'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, pageTitle, pageSub } from '@/lib/ds'

const CAT_COLORS = [
  '#16a34a','#2563eb','#dc2626','#d97706','#7c3aed',
  '#0891b2','#db2777','#65a30d','#ea580c','#4f46e5',
]

export default function DispensePage() {
  const [products, setProducts]     = useState<any[]>([])
  const [history, setHistory]       = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [activecat, setActivecat]   = useState<string|null>(null)
  const [selected, setSelected]     = useState<any>(null)
  const [qty, setQty]               = useState('')
  const [search, setSearch]         = useState('')
  const [visible, setVisible]       = useState(false)
  const orgIdRef     = useRef<string|null>(null)
  const profileIdRef = useRef<string|null>(null)
  const sb = createClient()

  useEffect(()=>{
    let a=0; const c=setInterval(()=>{a++;const b=sessionStorage.getItem('s_branch_id'),o=sessionStorage.getItem('s_org_id');if((b&&o)||a>20){clearInterval(c);init()}},100); return()=>clearInterval(c)
  },[])

  async function init() {
    setLoading(true)
    const cachedOrg=sessionStorage.getItem('s_org_id'); const cachedProfile=sessionStorage.getItem('s_profile_id')
    if(cachedOrg&&cachedProfile){ orgIdRef.current=cachedOrg; profileIdRef.current=cachedProfile; await Promise.all([loadProducts(cachedOrg),loadHistory(cachedOrg)]); setLoading(false); setTimeout(()=>setVisible(true),50); return }
    const{data:{user}}=await sb.auth.getUser(); if(!user) return
    const{data:profile}=await sb.from('profiles').select('id,org_id').eq('id',user.id).single(); if(!profile?.org_id) return
    sessionStorage.setItem('s_org_id',profile.org_id); sessionStorage.setItem('s_profile_id',profile.id)
    orgIdRef.current=profile.org_id; profileIdRef.current=profile.id
    await Promise.all([loadProducts(profile.org_id),loadHistory(profile.org_id)])
    setLoading(false); setTimeout(()=>setVisible(true),50)
  }

  async function loadProducts(oid:string) {
    const branchId=sessionStorage.getItem('s_branch_id')
    let pq=sb.from('products').select('id,name,sku,unit,qty,reorder_point,category').eq('org_id',oid).eq('is_active',true)
    if(branchId) pq=pq.eq('branch_id',branchId)
    const{data}=await pq.order('name')
    if(data) setProducts(data)
  }

  async function loadHistory(oid:string) {
    const bid=sessionStorage.getItem('s_branch_id')
    let mq=sb.from('stock_movements').select('id,qty_change,note,created_at,products!inner(name,unit,org_id,branch_id)').eq('type','out').eq('products.org_id',oid)
    if(bid) mq=mq.eq('products.branch_id',bid)
    const{data}=await mq.order('created_at',{ascending:false}).limit(15)
    setHistory(data||[])
  }

  async function handleDispense() {
    const oid=orgIdRef.current; const pid=profileIdRef.current
    if(!selected||!qty||!oid||!pid) return
    setSaving(true)
    const qtyNum=Number(qty)
    if(selected.qty<qtyNum){ toast('الكمية المطلوبة أكبر من المتاح!','warning'); setSaving(false); return }
    const{error}=await sb.from('stock_movements').insert({product_id:selected.id,profile_id:pid,type:'out',qty_change:-qtyNum,note:'استهلاك يومي'})
    if(error){ toast('خطأ في تسجيل الصرف','error'); setSaving(false); return }
    toast(`✅ تم صرف ${qtyNum} ${selected.unit} من ${selected.name}`,'success')
    fetch('/api/send-pending-notifications',{method:'POST'}).catch(()=>{})
    fetch('/api/notify-supplier',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid})}).catch(()=>{})
    setSelected(null); setQty('')
    setSaving(false); loadProducts(oid); loadHistory(oid)
  }

  // Categories
  const OTHER = 'أخرى'
  const catMap: Record<string,number> = {}
  products.forEach(p=>{ const c=p.category?.trim()||OTHER; catMap[c]=(catMap[c]||0)+1 })
  const categories = Object.keys(catMap).sort((a,b)=>{ if(a===OTHER)return 1; if(b===OTHER)return -1; return catMap[b]-catMap[a] })
  const allCategories = ['كل المنتجات', ...categories]

  const displayProducts = products
    .filter(p => !search || p.name?.includes(search))
    .filter(p => !activecat || activecat==='كل المنتجات' || (p.category?.trim()||OTHER)===activecat)

  function colorFor(cat:string) {
    const idx = categories.indexOf(cat)
    return CAT_COLORS[idx % CAT_COLORS.length]
  }

  if(loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}`}</style>
      <div style={{height:20,width:120,background:colors.border2,borderRadius:6,marginBottom:8}} className="sk"/>
      <div style={{height:12,width:200,background:colors.border,borderRadius:6,marginBottom:24}} className="sk"/>
      <div style={{display:'flex',gap:8,marginBottom:20}}>{[1,2,3,4,5].map(i=>(<div key={i} className="sk" style={{height:40,width:100,borderRadius:20,background:colors.border}}/>))}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>{[1,2,3,4,5,6,7,8].map(i=>(<div key={i} className="sk" style={{height:100,borderRadius:radius.lg,background:colors.border}}/>))}</div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1100,margin:'0 auto',opacity:visible?1:0,transition:'opacity .4s ease'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:none}}
        .su{animation:slideUp .4s ease both}
        .cat-chip{padding:9px 18px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .2s;white-space:nowrap;flex-shrink:0}
        .cat-chip:hover{transform:translateY(-1px)}
        .prod-card{border-radius:${radius.lg};padding:16px;cursor:pointer;border:1.5px solid ${colors.border};background:${colors.surface};transition:all .2s;text-align:right;font-family:inherit;width:100%}
        .prod-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.1);border-color:${colors.primary}}
        .prod-card.out{opacity:.5;cursor:not-allowed}
        .prod-card.out:hover{transform:none;box-shadow:none}
        .qty-btn{width:44px;height:44px;border-radius:12px;border:1.5px solid ${colors.border};background:${colors.bg};color:${colors.text};font-size:20px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;display:flex;align-items:center;justify-content:center}
        .qty-btn:hover{background:${colors.primaryLight};border-color:${colors.primary};color:${colors.primary}}
        .hist-row{transition:background .12s}
        .hist-row:hover{background:${colors.bg}}
        @media(max-width:1024px){.main-grid{grid-template-columns:1fr!important}}
        @media(max-width:900px){.main-grid{grid-template-columns:1fr!important}}
        @media(max-width:768px){.prod-grid{grid-template-columns:repeat(3,1fr)!important}}
        @media(max-width:480px){.prod-grid{grid-template-columns:repeat(2,1fr)!important}.prod-card{padding:10px 8px!important;font-size:12px!important}}
        @media(max-width:640px){.prod-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:400px){.prod-grid{grid-template-columns:repeat(2,1fr)!important}.prod-card{padding:12px 8px!important}.main-grid{gap:10px!important}}
      `}</style>

      {/* Header */}
      <div style={{marginBottom:20}} className="su">
        <h1 style={{...pageTitle}}>تسجيل الصرف</h1>
        <p style={{...pageSub}}>{products.length} صنف متاح — اختر الفئة ثم المنتج</p>
      </div>

      <div className="main-grid" style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,alignItems:'start'}}>
        {/* Left: products */}
        <div>
          {/* Search */}
          <div className="su" style={{marginBottom:14,animationDelay:'.05s',position:'relative'}}>
            <svg style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="16" height="16" fill="none" stroke={colors.text4} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>{setSearch(e.target.value);setActivecat('كل المنتجات')}}
              style={{width:'100%',padding:'12px 42px 12px 16px',border:`1.5px solid ${colors.border}`,borderRadius:radius.lg,fontSize:15,outline:'none',boxSizing:'border-box' as const,background:colors.surface,color:colors.text,fontFamily:'inherit',transition:'border-color .2s'}}
              placeholder="🔍 ابحث عن منتج..."/>
          </div>

          {/* Category chips */}
          <div className="su" style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:8,marginBottom:16,scrollbarWidth:'none',animationDelay:'.08s'}}>
            {allCategories.map(cat=>{
              const isActive=activecat===cat||(cat==='كل المنتجات'&&!activecat)
              const color=cat==='كل المنتجات'?colors.primary:colorFor(cat)
              return (
                <button key={cat} className="cat-chip" onClick={()=>setActivecat(cat)}
                  style={{background:isActive?color:'transparent',color:isActive?'white':colors.text3,border:`1.5px solid ${isActive?color:colors.border}`,boxShadow:isActive?`0 4px 12px ${color}33`:'none'}}>
                  {cat==='كل المنتجات'?`🏷️ ${cat}`:cat} {cat!=='كل المنتجات'&&<span style={{opacity:.7,fontSize:11}}>({catMap[cat]})</span>}
                </button>
              )
            })}
          </div>

          {/* Products grid */}
          {displayProducts.length===0 ? (
            <div style={{...card,padding:48,textAlign:'center'}} className="su">
              <div style={{fontSize:44,marginBottom:12}}>📦</div>
              <div style={{fontSize:font.base,fontWeight:700,color:colors.text2,marginBottom:6}}>لا توجد منتجات</div>
              <div style={{fontSize:font.sm,color:colors.text4}}>{search?'جرب كلمة بحث أخرى':'لا يوجد منتجات في هذه الفئة'}</div>
            </div>
          ) : (
            <div className="prod-grid su" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,animationDelay:'.12s'}}>
              {displayProducts.map(p=>{
                const isLow=p.qty<=p.reorder_point
                const isOut=p.qty===0
                const catColor=colorFor(p.category?.trim()||OTHER)
                return (
                  <button key={p.id} className={`prod-card${isOut?' out':''}`}
                    onClick={()=>{ if(isOut) return; setSelected(p); setQty('1') }}
                    style={{borderColor:selected?.id===p.id?colors.primary:isOut?colors.dangerBorder:colors.border,background:selected?.id===p.id?colors.primaryLight:colors.surface}}>
                    <div style={{width:36,height:36,borderRadius:10,background:catColor+'22',border:`1px solid ${catColor}44`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10,fontSize:18}}>
                      📦
                    </div>
                    <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,marginBottom:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.name}</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:13,fontWeight:900,color:isOut?colors.danger:isLow?colors.warning:colors.primary}}>{p.qty}</span>
                      <span style={{fontSize:10,color:colors.text4}}>{p.unit}</span>
                    </div>
                    <div style={{height:3,background:colors.border,borderRadius:99,marginTop:6,overflow:'hidden'}}>
                      <div style={{height:'100%',width:Math.min((p.qty/Math.max(p.reorder_point*2,p.qty,1))*100,100)+'%',background:isOut?colors.danger:isLow?colors.warning:catColor,borderRadius:99}}/>
                    </div>
                    {isOut&&<div style={{fontSize:9,color:colors.danger,fontWeight:700,marginTop:4}}>نفد المخزون</div>}
                    {isLow&&!isOut&&<div style={{fontSize:9,color:colors.warning,fontWeight:700,marginTop:4}}>مخزون ناقص</div>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: history */}
        <div className="su" style={{animationDelay:'.15s'}}>
          <div style={{...card,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:`1px solid ${colors.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:font.base,fontWeight:800,color:colors.text}}>آخر الصرف</div>
                <div style={{fontSize:font.xs,color:colors.text4,marginTop:1}}>{history.length} عملية</div>
              </div>
              <button onClick={()=>orgIdRef.current&&loadHistory(orgIdRef.current)} style={{...btnSecondary,padding:'6px 10px',fontSize:font.xs}}>↺</button>
            </div>
            <div style={{maxHeight:520,overflowY:'auto'}}>
              {history.length===0 ? (
                <div style={{padding:'40px 16px',textAlign:'center'}}>
                  <div style={{fontSize:36,marginBottom:8}}>📭</div>
                  <div style={{fontSize:font.sm,color:colors.text4}}>لا توجد عمليات بعد</div>
                </div>
              ) : history.map((h,i)=>{
                const prodName=(h.products as any)?.name
                const prodUnit=(h.products as any)?.unit
                const date=new Date(h.created_at)
                return (
                  <div key={h.id} className="hist-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderBottom:i<history.length-1?`1px solid ${colors.border}`:'none',gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{prodName}</div>
                      <div style={{fontSize:10,color:colors.text4,marginTop:2}}>{date.toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <div style={{flexShrink:0,textAlign:'left' as const}}>
                      <span style={{fontSize:font.sm,fontWeight:900,color:colors.danger}}>▼{Math.abs(h.qty_change)}</span>
                      <span style={{fontSize:10,color:colors.text4,marginRight:2}}>{prodUnit}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dispense modal */}
      {selected && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(6px)'}} onClick={()=>{setSelected(null);setQty('')}}/>
          <div style={{background:colors.surface,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:480,position:'relative',animation:'modalIn .25s ease',boxShadow:shadow.lg,padding:24,paddingBottom:32}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontSize:font.lg,fontWeight:900,color:colors.text}}>{selected.name}</div>
                <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>المتاح: <b style={{color:colors.primary}}>{selected.qty} {selected.unit}</b></div>
              </div>
              <button onClick={()=>{setSelected(null);setQty('')}} style={{width:34,height:34,borderRadius:'50%',background:colors.bg,border:`1.5px solid ${colors.border}`,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:colors.text3}}>✕</button>
            </div>

            {/* Stock bar */}
            <div style={{marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:colors.text4,marginBottom:4}}>
                <span>المخزون</span>
                {qty&&Number(qty)>0&&<span style={{color:selected.qty-Number(qty)<0?colors.danger:colors.primary}}>بعد الصرف: {selected.qty-Number(qty)} {selected.unit}</span>}
              </div>
              <div style={{height:8,background:colors.border,borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',width:Math.min((selected.qty/Math.max(selected.reorder_point*2,selected.qty,1))*100,100)+'%',background:colors.primary,borderRadius:99,transition:'width .3s'}}/>
              </div>
            </div>

            {/* Qty controls */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:font.xs,fontWeight:700,color:colors.text3,marginBottom:12,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>الكمية</div>
              <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'center',marginBottom:14}}>
                <button className="qty-btn" onClick={()=>setQty(q=>String(Math.max(1,Number(q)-1)))}>−</button>
                <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}
                  style={{width:100,padding:'12px',border:`2px solid ${colors.border}`,borderRadius:14,fontSize:28,fontWeight:900,textAlign:'center',outline:'none',color:colors.text,background:colors.bg,fontFamily:'inherit'}}
                  inputMode="numeric"/>
                <button className="qty-btn" onClick={()=>setQty(q=>String(Number(q)+1))}>+</button>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                {[1,5,10,20].map(v=>(
                  <button key={v} onClick={()=>setQty(String(v))}
                    style={{padding:'7px 14px',borderRadius:20,border:`1.5px solid ${Number(qty)===v?colors.primary:colors.border}`,background:Number(qty)===v?colors.primaryLight:colors.surface,color:Number(qty)===v?colors.primary:colors.text3,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {Number(qty)>selected.qty&&(
              <div style={{background:colors.dangerLight,border:`1.5px solid ${colors.dangerBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:14,fontSize:font.sm,fontWeight:700,color:colors.danger,display:'flex',alignItems:'center',gap:6}}>
                ⚠️ الكمية تتجاوز المتاح ({selected.qty} {selected.unit})
              </div>
            )}

            <button disabled={saving||!qty||Number(qty)<=0||Number(qty)>selected.qty} onClick={handleDispense}
              style={{
                ...btnPrimary,width:'100%',padding:'16px',fontSize:font.lg,
                background:saving||!qty||Number(qty)<=0||Number(qty)>selected.qty?colors.text4:colors.danger,
                opacity:saving||!qty||Number(qty)<=0||Number(qty)>selected.qty?.6:1,
                cursor:saving||!qty||Number(qty)<=0||Number(qty)>selected.qty?'not-allowed':'pointer',
                boxShadow:saving?'none':`0 6px 20px ${colors.danger}33`,
              }}>
              {saving?'⏳ جاري الحفظ...':`✓ صرف ${qty||0} ${selected.unit} من ${selected.name}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
