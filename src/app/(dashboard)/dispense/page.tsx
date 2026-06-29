'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { toast } from '@/components/toast'
import { createClient } from '@/lib/supabase/client'

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  danger:'#ef4444',  dangerL:'#fef2f2',  dangerB:'#fecaca',
  warning:'#f59e0b', warningL:'#fffbeb', warningB:'#fde68a',
  text:'#111827', text2:'#374151', text3:'#6b7280', text4:'#9ca3af',
  bg:'#f9fafb', surface:'#ffffff', border:'#f3f4f6', border2:'#e5e7eb',
}

const CAT_COLORS = ['#16a34a','#2563eb','#dc2626','#d97706','#7c3aed','#0891b2','#db2777','#65a30d']
const OTHER = 'أخرى'

export default function DispensePage() {
  const [products, setProducts]     = useState<any[]>([])
  const [history, setHistory]       = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [activeCat, setActiveCat]   = useState('كل المنتجات')
  const [selected, setSelected]     = useState<any>(null)
  const [qty, setQty]               = useState('')
  const [search, setSearch]         = useState('')
  const [visible, setVisible]       = useState(false)
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
    let q=sb.from('products').select('id,name,sku,unit,qty,reorder_point,category').eq('org_id',oid).eq('is_active',true)
    if(bid) q=q.eq('branch_id',bid)
    const{data}=await q.order('qty',{ascending:true})
    if(data) setProducts(data)
  }

  async function loadHistory(oid:string) {
    const bid=sessionStorage.getItem('s_branch_id')
    let q=sb.from('stock_movements').select('id,qty_change,created_at,products!inner(name,unit,org_id,branch_id)').eq('type','out').eq('products.org_id',oid)
    if(bid) q=q.eq('products.branch_id',bid)
    const{data}=await q.order('created_at',{ascending:false}).limit(20)
    setHistory(data||[])
  }

  async function handleDispense() {
    const oid=orgRef.current,pid=profRef.current
    if(!selected||!qty||!oid||!pid)return
    setSaving(true)
    const qn=Number(qty)
    if(selected.qty<qn){toast('الكمية أكبر من المتاح!','warning');setSaving(false);return}
    const{error}=await sb.from('stock_movements').insert({product_id:selected.id,profile_id:pid,type:'out',qty_change:-qn,note:'استهلاك يومي'})
    if(error){toast('خطأ في تسجيل الصرف','error');setSaving(false);return}
    toast(`✅ تم صرف ${qn} ${selected.unit} من ${selected.name}`)
    fetch('/api/notify-low-stock-instant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid})}).catch(()=>{})
    try{
      const{data:org}=await sb.from('organizations').select('supplier_notify_mode').eq('id',oid).single()
      if((org as any)?.supplier_notify_mode==='instant')
        fetch('/api/notify-supplier',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid})}).catch(()=>{})
    }catch{}
    setSelected(null);setQty('')
    setSaving(false);loadProducts(oid);loadHistory(oid)
  }

  const catMap: Record<string,number> = {}
  products.forEach(p=>{const c=p.category?.trim()||OTHER;catMap[c]=(catMap[c]||0)+1})
  const categories=Object.keys(catMap).sort((a,b)=>{if(a===OTHER)return 1;if(b===OTHER)return -1;return catMap[b]-catMap[a]})
  const allCats=['كل المنتجات',...categories]
  const catColor=(cat:string)=>CAT_COLORS[categories.indexOf(cat)%CAT_COLORS.length]

  const displayed=products
    .filter(p=>!search||(p.name?.toLowerCase().includes(search.toLowerCase())))
    .filter(p=>activeCat==='كل المنتجات'||(p.category?.trim()||OTHER)===activeCat)

  const lowCount=products.filter(p=>p.qty<=p.reorder_point&&p.qty>0).length
  const outCount=products.filter(p=>p.qty===0).length

  if(loading) return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:960,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.4s ease infinite}`}</style>
      <div style={{height:28,width:160,background:C.border2,borderRadius:8,marginBottom:16}} className="sk"/>
      <div style={{display:'flex',gap:8,marginBottom:14}}>{[1,2,3,4,5].map(i=><div key={i} className="sk" style={{height:34,width:70,borderRadius:99,background:C.border}}/>)}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {Array(9).fill(0).map((_,i)=><div key={i} className="sk" style={{height:90,borderRadius:12,background:C.border}}/>)}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:960,margin:'0 auto',opacity:visible?1:0,transition:'opacity .3s'}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fu{animation:fadeUp .3s ease both}
        .chip{padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;border:1.5px solid;transition:all .15s;font-family:inherit;display:inline-flex;align-items:center;gap:4px}
        .chip:active{transform:scale(.95)}
        .pcard{border-radius:9px;padding:7px 10px;cursor:pointer;border:1px solid;background:white;transition:all .15s;text-align:right;font-family:inherit;width:100%;display:flex;align-items:center;gap:8px}
        .pcard:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.08)}
        .pcard:active{transform:scale(.98)}
        .qbtn{width:44px;height:44px;border-radius:11px;border:1.5px solid #e5e7eb;background:#f9fafb;color:#111827;font-size:20px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:inherit}
        .qbtn:active{background:#f0fdf4;border-color:#16a34a;color:#16a34a}
        .hrow{transition:background .1s;cursor:default}
        .hrow:hover{background:#f9fafb}

        /* Grid */
        .prod-grid{display:grid;gap:8px;grid-template-columns:1fr}
        @media(min-width:480px){.prod-grid{grid-template-columns:repeat(2,1fr)}}
        @media(min-width:768px){.prod-grid{grid-template-columns:repeat(3,1fr);gap:6px}}
        @media(min-width:1024px){.prod-grid{grid-template-columns:repeat(5,1fr);gap:6px}}
        @media(min-width:960px){
          .page-layout{display:grid;grid-template-columns:1fr 280px;gap:16px;align-items:start}
          .hist-mob-btn{display:none!important}
          .hist-panel{display:block!important}
        }
        @media(max-width:959px){
          .hist-panel{display:none!important}
        }
      `}</style>

      {/* Header */}
      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>الصرف</h1>
          <p style={{fontSize:11,color:C.text3,margin:'3px 0 0'}}>
            {products.length} صنف
            {outCount>0&&<span style={{color:C.danger,fontWeight:700}}> · {outCount} نفد</span>}
            {lowCount>0&&<span style={{color:C.warning,fontWeight:700}}> · {lowCount} ناقص</span>}
          </p>
        </div>
        <button className="hist-mob-btn" onClick={()=>setShowHistory(true)}
          style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'white',border:`1.5px solid ${C.border2}`,borderRadius:10,fontSize:12,fontWeight:700,color:C.text2,cursor:'pointer',fontFamily:'inherit'}}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          السجل ({history.length})
        </button>
      </div>

      <div className="page-layout">
        {/* Left — Products */}
        <div>
          {/* Search */}
          <div className="fu" style={{position:'relative',marginBottom:10,animationDelay:'.04s'}}>
            <svg style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="14" height="14" fill="none" stroke={C.text4} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>{setSearch(e.target.value);setActiveCat('كل المنتجات')}}
              style={{width:'100%',padding:'10px 36px 10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:10,fontSize:13,background:'white',color:C.text,fontFamily:'inherit',outline:'none',transition:'border .15s'}}
              onFocus={e=>e.target.style.borderColor=C.primary}
              onBlur={e=>e.target.style.borderColor=C.border2}
              placeholder="ابحث عن منتج..."/>
          </div>

          {/* Category chips */}
          <div className="fu" style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:12,scrollbarWidth:'none',animationDelay:'.06s'}}>
            {allCats.map(cat=>{
              const active=activeCat===cat
              const color=cat==='كل المنتجات'?C.primary:catColor(cat)
              return (
                <button key={cat} className="chip" onClick={()=>setActiveCat(cat)}
                  style={{background:active?color:'white',color:active?'white':C.text3,borderColor:active?color:C.border2,flexShrink:0}}>
                  {cat==='كل المنتجات'?'الكل':cat}
                  {cat!=='كل المنتجات'&&<span style={{opacity:.6,fontSize:10}}>({catMap[cat]})</span>}
                </button>
              )
            })}
          </div>

          {/* Products */}
          {displayed.length===0 ? (
            <div className="fu" style={{background:'white',borderRadius:14,padding:'48px 24px',textAlign:'center',border:`1px solid ${C.border}`}}>
              <div style={{fontSize:40,marginBottom:10}}>📦</div>
              <div style={{fontSize:14,fontWeight:700,color:C.text2}}>{search?'لا توجد نتائج':'لا يوجد منتجات'}</div>
            </div>
          ) : (
            <div className="prod-grid fu" style={{animationDelay:'.08s'}}>
              {displayed.map(p=>{
                const isOut=p.qty===0
                const isLow=!isOut&&p.qty<=p.reorder_point
                const sc=isOut?C.danger:isLow?C.warning:C.primary
                const sb2=isOut?C.dangerL:isLow?C.warningL:C.primaryL
                const sbb=isOut?C.dangerB:isLow?C.warningB:C.primaryB
                const isSel=selected?.id===p.id
                const pct=Math.min((p.qty/Math.max(p.reorder_point*2,p.qty,1))*100,100)
                return (
                  <button key={p.id} className="pcard"
                    onClick={()=>{if(isOut)return;setSelected(p);setQty('1')}}
                    style={{
                      borderColor:isSel?C.primary:isOut?C.dangerB:isLow?C.warningB:C.border2,
                      background:isSel?C.primaryL:isOut?'#fff5f5':isLow?'#fffdf0':'white',
                      opacity:isOut?.55:1,
                      cursor:isOut?'not-allowed':'pointer',
                      boxShadow:isSel?`0 0 0 2px ${C.primary}40`:'none',
                    }}>
                    {/* Qty circle */}
                    <div style={{width:30,height:30,borderRadius:7,background:sb2,border:`1px solid ${sbb}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:12,fontWeight:900,color:sc}}>{p.qty}</span>
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0,textAlign:'right'}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                      <div style={{fontSize:9,color:C.text4,marginTop:1}}>{p.unit} · حد {p.reorder_point}</div>
                      <div style={{height:2,background:C.border,borderRadius:99,overflow:'hidden',marginTop:4}}>
                        <div style={{height:'100%',width:pct+'%',background:sc,borderRadius:99}}/>
                      </div>
                    </div>
                    {/* Status */}
                    <div style={{flexShrink:0}}>
                      <span style={{fontSize:8,fontWeight:700,color:sc,background:sb2,padding:'2px 6px',borderRadius:99,border:`1px solid ${sbb}`,display:'block',whiteSpace:'nowrap'}}>
                        {isOut?'نفد':isLow?'ناقص':'كافٍ'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — History Desktop */}
        <div className="hist-panel">
          <div style={{background:'white',borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden',position:'sticky',top:16}}>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:700,color:C.text}}>آخر الصرف</span>
              <button onClick={()=>orgRef.current&&loadHistory(orgRef.current)}
                style={{padding:'4px 8px',background:C.bg,border:`1px solid ${C.border2}`,borderRadius:7,fontSize:12,cursor:'pointer',color:C.text3,fontFamily:'inherit'}}>↺</button>
            </div>
            <div style={{maxHeight:500,overflowY:'auto'}}>
              {history.length===0 ? (
                <div style={{padding:'28px',textAlign:'center',color:C.text4,fontSize:12}}>لا توجد عمليات بعد</div>
              ) : history.map((h,i)=>(
                <div key={h.id} className="hrow" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:i<history.length-1?`1px solid ${C.border}`:'none'}}>
                  <div style={{width:28,height:28,borderRadius:8,background:C.dangerL,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="11" height="11" fill="none" stroke={C.danger} strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(h.products as any)?.name}</div>
                    <div style={{fontSize:10,color:C.text4,marginTop:1}}>{new Date(h.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  <span style={{fontSize:12,fontWeight:800,color:C.danger,flexShrink:0}}>{Math.abs(h.qty_change)} <span style={{fontSize:10,color:C.text4,fontWeight:400}}>{(h.products as any)?.unit}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History Mobile Sheet */}
      {showHistory && (
        <div style={{position:'fixed',inset:0,zIndex:900,display:'flex',alignItems:'flex-end'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}} onClick={()=>setShowHistory(false)}/>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'72vh',display:'flex',flexDirection:'column',position:'relative',animation:'slideUp .3s ease',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div style={{width:36,height:4,borderRadius:99,background:C.border2,position:'absolute',top:8,left:'50%',transform:'translateX(-50%)'}}/>
              <span style={{fontSize:14,fontWeight:700,color:C.text}}>آخر الصرف</span>
              <button onClick={()=>setShowHistory(false)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:C.text3}}>✕</button>
            </div>
            <div style={{overflowY:'auto',flex:1,padding:'0 4px'}}>
              {history.map((h,i)=>(
                <div key={h.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:i<history.length-1?`1px solid ${C.border}`:'none'}}>
                  <div style={{width:32,height:32,borderRadius:9,background:C.dangerL,border:`1px solid ${C.dangerB}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="13" height="13" fill="none" stroke={C.danger} strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(h.products as any)?.name}</div>
                    <div style={{fontSize:11,color:C.text4,marginTop:2}}>{new Date(h.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  <span style={{fontSize:14,fontWeight:800,color:C.danger}}>{Math.abs(h.qty_change)} <span style={{fontSize:11,color:C.text4,fontWeight:400}}>{(h.products as any)?.unit}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dispense Sheet */}
      {selected && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(6px)'}} onClick={()=>{setSelected(null);setQty('')}}/>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,position:'relative',animation:'slideUp .25s ease',paddingBottom:'env(safe-area-inset-bottom)',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
            <div style={{width:36,height:4,borderRadius:99,background:C.border2,margin:'10px auto'}}/>
            <div style={{padding:'8px 20px 0'}}>
              {/* Product */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div>
                  <div style={{fontSize:17,fontWeight:800,color:C.text,marginBottom:3}}>{selected.name}</div>
                  <div style={{fontSize:12,color:C.text3}}>متاح: <b style={{color:C.primary,fontSize:15}}>{selected.qty}</b> {selected.unit}</div>
                </div>
                <button onClick={()=>{setSelected(null);setQty('')}}
                  style={{width:30,height:30,borderRadius:'50%',background:C.bg,border:`1.5px solid ${C.border2}`,cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',color:C.text3}}>✕</button>
              </div>

              {/* Progress bar */}
              <div style={{marginBottom:18}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:C.text4,marginBottom:4}}>
                  <span>المخزون</span>
                  {qty&&Number(qty)>0&&<span style={{color:selected.qty-Number(qty)<0?C.danger:C.primary,fontWeight:700}}>بعد الصرف: {selected.qty-Number(qty)} {selected.unit}</span>}
                </div>
                <div style={{height:6,background:C.border,borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:Math.min((selected.qty/Math.max(selected.reorder_point*2,selected.qty,1))*100,100)+'%',background:selected.qty<=selected.reorder_point?C.warning:C.primary,borderRadius:99}}/>
                </div>
              </div>

              {/* Qty */}
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'center',marginBottom:10}}>
                  <button className="qbtn" onClick={()=>setQty(q=>String(Math.max(1,Number(q)-1)))}>−</button>
                  <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} inputMode="numeric"
                    style={{width:90,padding:'8px',border:`2px solid ${C.border}`,borderRadius:12,fontSize:30,fontWeight:900,textAlign:'center',outline:'none',color:C.text,background:C.bg,fontFamily:'inherit'}}/>
                  <button className="qbtn" onClick={()=>setQty(q=>String(Number(q)+1))}>+</button>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                  {[1,5,10,20].map(v=>(
                    <button key={v} onClick={()=>setQty(String(v))}
                      style={{padding:'6px 14px',borderRadius:99,border:`1.5px solid ${Number(qty)===v?C.primary:C.border2}`,background:Number(qty)===v?C.primaryL:'white',color:Number(qty)===v?C.primary:C.text3,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {Number(qty)>selected.qty&&(
                <div style={{background:C.dangerL,border:`1px solid ${C.dangerB}`,borderRadius:10,padding:'9px 14px',marginBottom:10,fontSize:12,fontWeight:700,color:C.danger}}>
                  ⚠️ الكمية تتجاوز المتاح ({selected.qty} {selected.unit})
                </div>
              )}
            </div>

            <div style={{padding:'8px 20px 16px'}}>
              <button disabled={saving||!qty||Number(qty)<=0||Number(qty)>selected.qty} onClick={handleDispense}
                style={{width:'100%',padding:'15px',fontSize:15,fontWeight:800,background:saving||!qty||Number(qty)<=0||Number(qty)>selected.qty?C.text4:C.danger,color:'white',border:'none',borderRadius:12,cursor:'pointer',fontFamily:'inherit',opacity:saving||!qty||Number(qty)<=0||Number(qty)>selected.qty?.6:1,boxShadow:saving?'none':`0 6px 16px ${C.danger}30`,transition:'all .2s'}}>
                {saving?'⏳ جاري الحفظ...':`✓ صرف ${qty||0} ${selected.unit} من ${selected.name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
