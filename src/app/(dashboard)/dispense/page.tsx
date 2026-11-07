'use client'
export const dynamic = 'force-dynamic'
import { StorelyPageHeader } from '@/components/ui/page-header'
import { StorelyButton } from '@/components/ui/button'
import { StorelyCard } from '@/components/ui/card'
import { StorelyStatusBadge } from '@/components/ui/status-badge'
import { StorelyEmptyState } from '@/components/ui/empty-state'
import { storelyTokens as T } from '@/components/ui/design-tokens'
import { Package } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { toast } from '@/components/toast'
import { cache } from '@/lib/cache'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'

// Aliases retain the existing presentation expressions and inherit central tokens.
const C = {
  primary:T.color.navy, primaryD:T.color.navy, primaryL:T.color.infoBg, primaryB:T.color.infoBorder,
  danger:T.color.danger, dangerL:T.color.dangerBg, dangerB:T.color.dangerBorder,
  warning:T.color.warning, warningL:T.color.warningBg, warningB:T.color.warningBorder,
  text:T.color.text, text2:T.color.text, text3:T.color.textMuted, text4:T.color.textSubtle,
  bg:T.color.background, surface:T.color.surface, border:T.color.border, border2:T.color.infoBorder,
}
const CAT_COLORS = [T.color.navy]
const OTHER = 'أخرى'

export default function DispensePage() {
  const [products, setProducts]   = useState<any[]>([])
  const [history, setHistory]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [activeCat, setActiveCat] = useState('كل المنتجات')
  const [selected, setSelected]   = useState<any>(null)
  const [qty, setQty]             = useState('')
  const [wasteMode, setWasteMode] = useState(false)
  const [wasteReason, setWasteReason] = useState('')
  const [search, setSearch]       = useState('')
  const [visible, setVisible]     = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const orgRef  = useRef<string|null>(null)
  const profRef = useRef<string|null>(null)

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
    const me=await getMe();if(!me)return
    sessionStorage.setItem('s_profile_id',me.user_id)
    orgRef.current=me.org_id;profRef.current=me.user_id
    await Promise.all([loadProducts(me.org_id),loadHistory(me.org_id)])
    setLoading(false);setTimeout(()=>setVisible(true),50)
  }

  async function loadProducts(oid:string) {
    const bid=sessionStorage.getItem('s_branch_id')
    const j=await api.get('/api/products',{org_id:oid,branch_id:bid,sort:'qty'})
    if(j.success) setProducts(j.products||[])
  }

  async function loadHistory(oid:string) {
    const bid=sessionStorage.getItem('s_branch_id')
    const j=await api.get('/api/stock-movements',{org_id:oid,branch_id:bid,limit:30})
    setHistory(j.movements||[])
  }

  async function handleDispense() {
    const oid=orgRef.current,pid=profRef.current
    if(!selected||!qty||!oid||!pid)return
    setSaving(true)
    const qn=Number(qty)
    if(selected.qty<qn){toast('الكمية أكبر من المتاح!','warning');setSaving(false);return}
    const r=await api.post('/api/stock-movements',{org_id:oid,product_id:selected.id,type:'out',qty:qn})
    if(!r.success){toast(r.error||'خطأ','error');setSaving(false);return}
    cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:')
    toast(`✅ تم صرف ${qn} ${selected.unit} من ${selected.name}`)
    fetch('/api/notify-low-stock-instant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid,product_id:selected.id,new_qty:selected.qty-qn,reorder_point:(selected.supplier_reorder_point ?? selected.reorder_point)})}).catch(()=>{})
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
    const r=await api.post('/api/stock-movements',{org_id:oid,product_id:selected.id,type:'waste',qty:qn,waste_reason:wasteReason})
    if(!r.success){toast(r.error||'خطأ','error');setSaving(false);return}
    cache.invalidate('inventory:');cache.invalidate('dashboard:');cache.invalidate('products:')
    fetch('/api/notify-waste',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid,branch_id:sessionStorage.getItem('s_branch_id')||null,staff_name:sessionStorage.getItem('s_full_name')||'المالك',product_name:selected.name,qty:qn,unit:selected.unit,waste_reason:wasteReason})}).catch(()=>{})
    toast(`🗑️ تم تسجيل هدر ${qn} ${selected.unit} من ${selected.name}`)
    setSelected(null);setQty('');setWasteMode(false);setWasteReason('')
    setSaving(false);loadProducts(oid);loadHistory(oid)
  }

  const WASTE_REASONS = ['تالف','منتهي الصلاحية','كسر','سرقة/فقدان','خطأ تحضير','أخرى']

  const catMap: Record<string,number>={}
  products.forEach(p=>{const c=p.category?.trim()||OTHER;catMap[c]=(catMap[c]||0)+1})
  const categories=Object.keys(catMap).sort((a,b)=>{if(a===OTHER)return 1;if(b===OTHER)return -1;return catMap[b]-catMap[a]})
  const allCats=['كل المنتجات',...categories]
  const catColor=(cat:string)=>CAT_COLORS[categories.indexOf(cat)%CAT_COLORS.length]

  const displayed=products
    .filter(p=>!search||(p.name?.toLowerCase().includes(search.toLowerCase())))
    .filter(p=>activeCat==='كل المنتجات'||(p.category?.trim()||OTHER)===activeCat)

  const outCount=products.filter(p=>p.qty===0).length
  const lowCount=products.filter(p=>p.qty>0&&p.qty<=p.reorder_point).length

  if(loading) return (
    <div className="dp-loading">
      <style>{`
        @keyframes dispenseSkeleton{0%,100%{opacity:1}50%{opacity:.4}}
        .dp-loading{font-family:${T.typography.family};direction:rtl;max-width:1200px;margin:auto;padding:${T.spacing[6]}px;background:${C.bg};border-radius:${T.radius.panel}}
        .dp-loading .sk{animation:dispenseSkeleton 1.4s ease infinite;background:${C.border};border-radius:${T.radius.control}}
        .dp-loading-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:${T.spacing[4]}px}
        .dp-loading-grid .sk{height:148px}
        @media(prefers-reduced-motion:reduce){.dp-loading .sk{animation:none}}
      `}</style>
      <div className="sk" style={{height:24,width:120,marginBottom:T.spacing[6]}}/>
      <div className="dp-loading-grid">
        {Array(12).fill(0).map((_,i)=><div key={i} className="sk"/>)}
      </div>
    </div>
  )

  return (
    <div className="dispense-page" style={{opacity:visible?1:0,transition:'opacity .3s'}}>
      <style>{`
        @keyframes dispenseSlideUp{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
        .dispense-page{font-family:${T.typography.family};direction:rtl;line-height:${T.typography.lineHeight};max-width:1200px;margin:0 auto;padding:${T.spacing[6]}px;background:${C.bg};border-radius:${T.radius.panel};color:${C.text};min-width:0}
        .dispense-page *{box-sizing:border-box}
        .dispense-page>header{margin-bottom:${T.spacing[6]}px;gap:${T.spacing[4]}px}
        .dispense-page>header h1{font-size:${T.typography.title}px;line-height:1.6}
        .dispense-page>header p{font-size:${T.typography.supporting}px;line-height:${T.typography.lineHeight}}
        .dispense-page .dp-workspace{background:${C.surface};border-color:${C.border};border-radius:${T.radius.card};overflow:visible}
        .dp-toolbar{padding:${T.spacing[6]}px;border-bottom:1px solid ${C.border}}
        .dp-search{position:relative;margin-bottom:${T.spacing[4]}px}
        .dp-search>svg{width:16px;height:16px;inset-inline-start:${T.spacing[3]}px!important}
        .dispense-page input{font-family:inherit;color:${C.text};background:${C.surface};border:1px solid ${C.border2};border-radius:${T.radius.control};font-size:${T.typography.body}px;line-height:${T.typography.lineHeight};height:44px;min-width:0}
        .dispense-page input:focus-visible,.dispense-page button:focus-visible{outline:2px solid ${C.primary};outline-offset:2px;box-shadow:${T.shadow.focus}}
        .dp-search-input{width:100%;padding:${T.spacing[2]}px ${T.spacing[8]}px ${T.spacing[2]}px ${T.spacing[3]}px}
        .dp-categories{display:flex;flex-wrap:wrap;gap:${T.spacing[2]}px}
        .dispense-page .chip{height:auto;min-height:36px;padding:${T.spacing[2]}px ${T.spacing[3]}px;border:1px solid;border-radius:${T.radius.control};font-size:${T.typography.supporting}px;line-height:1.5;font-weight:600;font-family:inherit;white-space:normal;gap:${T.spacing[1]}px;text-align:start}
        .dispense-page .chip span{font-size:inherit!important;margin:0!important}
        .dispense-page .dp-button{min-height:40px;height:auto;padding:${T.spacing[2]}px ${T.spacing[4]}px;gap:${T.spacing[2]}px;border-radius:${T.radius.control};border:1px solid ${C.border2};background:${C.surface};color:${C.primary};font-family:inherit;font-size:${T.typography.body}px;font-weight:600;line-height:1.6;white-space:normal;box-shadow:none;cursor:pointer}
        .dispense-page .dp-button:hover:not(:disabled){background:${C.primaryL};border-color:${C.primaryB}}
        .dispense-page .dp-button svg{width:16px;height:16px;flex-shrink:0}
        .dispense-page .dp-button[aria-pressed=true]{background:${C.primaryL};border-color:${C.primary};color:${C.primary}}
        .dispense-page .dp-button:disabled{opacity:.5;cursor:not-allowed}
        .dispense-page .pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:${T.spacing[4]}px;padding:${T.spacing[6]}px}
        .dispense-page .pcard{display:flex;flex-direction:column;align-items:flex-start;gap:${T.spacing[2]}px;min-height:148px;min-width:0;padding:${T.spacing[4]}px;background:${C.surface};border:1px solid ${C.border};border-radius:${T.radius.card};font-family:inherit;text-align:start;cursor:pointer;transition:border-color .15s,background .15s}
        .dispense-page .pcard:hover{border-color:${C.primaryB};background:${C.bg}}
        .dispense-page .pcard.selected{border-color:${C.primary};background:${C.primaryL}}
        .dispense-page .pcard.out{cursor:not-allowed;background:${C.bg}}
        .dp-product-qty{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.4}
        .dp-product-name{font-size:${T.typography.body}px;font-weight:600;line-height:${T.typography.lineHeight};overflow-wrap:anywhere;flex:1;color:${C.text}}
        .dp-product-unit{font-size:${T.typography.supporting}px;color:${C.text3}}
        .dp-empty{margin:${T.spacing[6]}px;border-color:${C.border};border-radius:${T.radius.card}}
        .dp-empty>div:first-child{background:${C.bg};border-color:${C.border}}
        .dp-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:${T.spacing[6]}px}
        .dp-backdrop{position:absolute;inset:0;background:${T.color.backdrop}}
        .dp-sheet{position:relative;width:100%;max-height:calc(100dvh - 48px);background:${C.surface};border:1px solid ${C.border};border-radius:${T.radius.panel};box-shadow:${T.shadow.panel};display:flex;flex-direction:column;min-height:0;overflow-y:auto;overscroll-behavior:contain;animation:dispenseSlideUp .2s ease;direction:rtl;font-family:${T.typography.family}}
        .dp-selection-sheet{max-width:480px;padding-bottom:env(safe-area-inset-bottom)}
        .dp-history-sheet{max-width:720px}
        .dp-sheet-handle{width:32px;height:4px;border-radius:${T.radius.control};background:${C.border2};margin:${T.spacing[3]}px auto 0;flex-shrink:0}
        .dp-sheet-header,.dp-selection-header{display:flex;justify-content:space-between;align-items:flex-start;gap:${T.spacing[4]}px}
        .dp-sheet-header{padding:${T.spacing[5]}px ${T.spacing[6]}px;border-bottom:1px solid ${C.border};flex-shrink:0}
        .dp-sheet-header>.dp-sheet-handle{display:none}
        .dp-sheet-header>span{font-size:${T.typography.section}px;font-weight:600}
        .dp-selection-header{margin-bottom:${T.spacing[6]}px}
        .dp-selection-header>div{min-width:0;overflow-wrap:anywhere}
        .dp-selection-header>div>div:first-child{font-size:${T.typography.section}px!important;font-weight:600!important}
        .dp-selection-header>div>div+div{font-size:${T.typography.supporting}px!important;line-height:1.8;margin-top:${T.spacing[1]}px!important}
        .dispense-page .dp-close{width:36px;height:36px;min-height:36px;padding:0;flex-shrink:0}
        .dp-sheet-body{padding:${T.spacing[6]}px ${T.spacing[6]}px 0}
        .dp-modes{display:flex;gap:${T.spacing[2]}px;margin-bottom:${T.spacing[6]}px;padding-bottom:${T.spacing[4]}px;border-bottom:1px solid ${C.border}}
        .dp-mode{flex:1}
        .dp-field-group{margin-bottom:${T.spacing[6]}px}
        .dp-reasons{display:flex;flex-wrap:wrap;gap:${T.spacing[2]}px;margin-top:${T.spacing[2]}px}
        .dispense-page .dp-reason,.dispense-page .dp-preset{min-height:36px;padding:${T.spacing[2]}px ${T.spacing[3]}px;font-size:${T.typography.supporting}px}
        .dp-stock-track{height:4px;background:${C.border};border-radius:${T.radius.control};overflow:hidden;margin-bottom:${T.spacing[6]}px}
        .dp-stock-level{height:100%;border-radius:inherit}
        .dp-quantity-controls{display:flex;align-items:center;justify-content:center;gap:${T.spacing[3]}px;margin-bottom:${T.spacing[3]}px;direction:ltr}
        .dispense-page .qbtn{width:44px;height:44px;min-height:44px;padding:0;font-size:22px}
        .dispense-page .dp-quantity-input{width:100px;text-align:center;font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;padding:${T.spacing[1]}px}
        .dp-quantity-presets{display:flex;justify-content:center;flex-wrap:wrap;gap:${T.spacing[2]}px}
        .dp-warning{background:${C.dangerL};border:1px solid ${C.dangerB};border-radius:${T.radius.control};padding:${T.spacing[3]}px ${T.spacing[4]}px;margin-bottom:${T.spacing[4]}px;font-size:${T.typography.body}px;color:${C.danger}}
        .dp-sheet-footer{position:sticky;bottom:0;flex-shrink:0;background:${C.surface};padding:${T.spacing[4]}px ${T.spacing[6]}px ${T.spacing[6]}px;border-top:1px solid ${C.border}}
        .dispense-page .dp-submit{width:100%;min-height:44px;background:${C.primary};color:${C.surface};border-color:${C.primary}}
        .dispense-page .dp-submit:hover:not(:disabled){background:${C.primaryD};border-color:${C.primaryD}}
        .dp-field-label{font-size:${T.typography.body}px;font-weight:600;color:${C.text3};margin-bottom:${T.spacing[2]}px}
        .dp-history-empty{padding:${T.spacing[8]}px;text-align:center;color:${C.text3};font-size:${T.typography.body}px}
        .dp-history-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid;border-radius:${T.radius.control};font-size:${T.typography.body}px}
        .dp-history-list{overflow-y:auto;min-height:0;flex:1}
        .dp-history-row{display:flex;align-items:flex-start;gap:${T.spacing[3]}px;padding:${T.spacing[4]}px ${T.spacing[6]}px;border-bottom:1px solid ${C.border}}
        .dp-history-row:last-child{border-bottom:0}
        .dp-history-row>div:nth-child(2)>div:first-child{font-size:${T.typography.body}px!important;white-space:normal!important;overflow-wrap:anywhere;line-height:${T.typography.lineHeight}}
        .dp-history-row>div:nth-child(2)>div+div{font-size:${T.typography.supporting}px!important;margin-top:${T.spacing[1]}px!important;line-height:1.8}
        @media(max-width:640px){
          .dispense-page{padding:${T.spacing[4]}px}
          .dp-toolbar{padding:${T.spacing[4]}px}
          .dispense-page .pgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:${T.spacing[3]}px;padding:${T.spacing[4]}px}
          .dispense-page .pcard{padding:${T.spacing[3]}px}
          .dp-overlay{padding:0;align-items:flex-end}
          .dp-sheet{max-height:90dvh;border-bottom:0;border-end-start-radius:0;border-end-end-radius:0}
          .dp-sheet-body{padding:${T.spacing[5]}px ${T.spacing[5]}px 0}
          .dp-sheet-header,.dp-history-row{padding:${T.spacing[4]}px ${T.spacing[5]}px}
          .dp-sheet-footer{padding:${T.spacing[4]}px ${T.spacing[5]}px calc(${T.spacing[5]}px + env(safe-area-inset-bottom))}
          .dp-history-row{flex-wrap:wrap}
          .dp-history-row>span:last-child{margin-inline-start:auto}
          .dp-modes{gap:${T.spacing[2]}px}
          .dispense-page .dp-mode{padding-inline:${T.spacing[2]}px;font-size:${T.typography.supporting}px}
        }
        @media(prefers-reduced-motion:reduce){.dispense-page,.dispense-page *{animation:none!important;transition:none!important}}
      `}</style>

      {/* Header */}
      <StorelyPageHeader
        title="الصرف"
        description={<>
            {products.length} صنف
            {outCount>0&&<span style={{color:C.danger,fontWeight:700}}> · {outCount} نفد</span>}
            {lowCount>0&&<span style={{color:C.warning,fontWeight:700}}> · {lowCount} ناقص</span>}
          </>}
        actions={<StorelyButton className="dp-button" onClick={()=>setShowHistory(true)}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          السجل ({history.length})
        </StorelyButton>}
      />

      <StorelyCard className="dp-workspace">
        <div className="dp-toolbar">
        {/* Search */}
        <div className="dp-search">
          <svg style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="13" height="13" fill="none" stroke={C.text4} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="dp-search-input" value={search} onChange={e=>{setSearch(e.target.value);setActiveCat('كل المنتجات')}}

            placeholder="ابحث..."/>
        </div>

        {/* Category chips */}
        <div className="dp-categories">
          {allCats.map(cat=>{
            const active=activeCat===cat
            const color=cat==='كل المنتجات'?C.primary:catColor(cat)
            return (
              <StorelyButton key={cat} className="chip" onClick={()=>setActiveCat(cat)}
                style={{background:active?color:C.surface,color:active?C.surface:C.text3,borderColor:active?color:C.border2}}>
                {cat==='كل المنتجات'?'الكل':cat}
                {cat!=='كل المنتجات'&&<span style={{opacity:.6,fontSize:T.typography.supporting,marginRight:T.spacing[1]}}>({catMap[cat]})</span>}
              </StorelyButton>
            )
          })}
        </div>

        </div>

        {/* Products Grid */}
        {displayed.length===0 ? (
          <StorelyEmptyState className="dp-empty" icon={<Package size={20}/>} title={search?'لا توجد نتائج':'لا يوجد منتجات'}/>
        ) : (
          <div className="pgrid">
            {displayed.map(p=>{
              const isOut=p.qty===0
              const isLow=!isOut&&p.qty<=p.reorder_point
              const sc=isOut?C.danger:isLow?C.warning:C.primary
              const isSel=selected?.id===p.id
              return (
                <button key={p.id}
                  className={`pcard${isSel?' selected':''}${isOut?' out':''}`}
                  onClick={()=>{if(isOut)return;setSelected(p);setQty('1')}}>
                  {/* Qty */}
                  <div className="dp-product-qty" style={{color:sc}}>{p.qty}</div>
                  {/* Name */}
                  <div className="dp-product-name">{p.name}</div>
                  {/* Unit */}
                  <div className="dp-product-unit">{p.unit}</div>
                  {/* Status */}
                  <StorelyStatusBadge status={isOut?'danger':isLow?'warning':'success'} >
                    {isOut?'نفد':isLow?'ناقص':'كافٍ'}
                  </StorelyStatusBadge>
                </button>
              )
            })}
          </div>
        )}

      </StorelyCard>

      {/* History Sheet */}
      {showHistory && (
        <div className="dp-overlay" style={{zIndex:900}}>
          <div className="dp-backdrop" onClick={()=>setShowHistory(false)}/>
          <div className="dp-sheet dp-history-sheet">
            <div className="dp-sheet-header">
              <div className="dp-sheet-handle" />
              <span>آخر الصرف</span>
              <StorelyButton className="dp-button dp-close" onClick={()=>setShowHistory(false)}>✕</StorelyButton>
            </div>
            <div className="dp-history-list">
              {history.length===0?(
                <div className="dp-history-empty">لا توجد عمليات بعد</div>
              ):history.map((h,i)=>{
                const isWaste=h.type==='waste'
                const badgeColor=isWaste?C.warning:C.danger
                const badgeBg=isWaste?C.warningL:C.dangerL
                const badgeBorder=isWaste?C.warningB:C.dangerB
                return (
                <div className="dp-history-row" key={h.id} style={{borderBottom:i<history.length-1?`1px solid ${C.border}`:'none'}}>
                  <div className="dp-history-icon" style={{background:badgeBg,borderColor:badgeBorder}}>
                    {isWaste?'🗑️':<svg width="12" height="12" fill="none" stroke={C.danger} strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:T.typography.body,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {(h.products as any)?.name}
                      {isWaste&&<span style={{fontSize:T.typography.supporting,fontWeight:700,color:C.warning,background:C.warningL,padding:'1px 6px',borderRadius:T.radius.control,marginRight:T.spacing[2],border:`1px solid ${C.warningB}`}}>هدر{h.waste_reason?` · ${h.waste_reason}`:''}</span>}
                    </div>
                    <div style={{fontSize:T.typography.supporting,color:C.text4,marginTop:T.spacing[1]}}>{new Date(h.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  <span style={{fontSize:T.typography.body,fontWeight:800,color:badgeColor,flexShrink:0}}>{Math.abs(h.qty_change)} <span style={{fontSize:T.typography.supporting,color:C.text4,fontWeight:400}}>{(h.products as any)?.unit}</span></span>
                </div>
              )})}
            </div>
          </div>
        </div>
      )}

      {/* Dispense Sheet */}
      {selected && (
        <div className="dp-overlay" style={{zIndex:1000}}>
          <div className="dp-backdrop" onClick={()=>{setSelected(null);setQty('')}}/>
          <div className="dp-sheet dp-selection-sheet">
            <div className="dp-sheet-handle" />
            <div className="dp-sheet-body">
              <div className="dp-selection-header">
                <div>
                  <div style={{fontSize:T.typography.section,fontWeight:800,color:C.text}}>{selected.name}</div>
                  <div style={{fontSize:T.typography.supporting,color:C.text3,marginTop:T.spacing[1]}}>متاح: <b style={{color:C.primary,fontSize:T.typography.body}}>{selected.qty}</b> {selected.unit}</div>
                </div>
                <StorelyButton className="dp-button dp-close" onClick={()=>{setSelected(null);setQty('');setWasteMode(false);setWasteReason('')}}>✕</StorelyButton>
              </div>

              <div className="dp-modes">
                <StorelyButton className="dp-button dp-mode" aria-pressed={!wasteMode} onClick={()=>{setWasteMode(false);setWasteReason('')}}>
                  📤 صرف عادي
                </StorelyButton>
                <StorelyButton className="dp-button dp-mode" aria-pressed={wasteMode} onClick={()=>setWasteMode(true)}>
                  🗑️ تسجيل هدر
                </StorelyButton>
              </div>

              {wasteMode && (
                <div className="dp-field-group">
                  <div className="dp-field-label">سبب الهدر *</div>
                  <div className="dp-reasons">
                    {WASTE_REASONS.map(r=>(
                      <StorelyButton className="dp-button dp-reason" aria-pressed={wasteReason===r} key={r} onClick={()=>setWasteReason(r)}>
                        {r}
                      </StorelyButton>
                    ))}
                  </div>
                </div>
              )}

              <div className="dp-stock-track">
                <div className="dp-stock-level" style={{width:Math.min((selected.qty/Math.max(selected.reorder_point*2,selected.qty,1))*100,100)+'%',background:selected.qty<=selected.reorder_point?C.warning:C.primary}}/>
              </div>

              <div className="dp-field-group">
                <div className="dp-quantity-controls">
                  <StorelyButton className="qbtn dp-button" onClick={()=>setQty(q=>String(Math.max(1,Number(q)-1)))}>−</StorelyButton>
                  <input className="dp-quantity-input" type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} inputMode="numeric"
                    />
                  <StorelyButton className="qbtn dp-button" onClick={()=>setQty(q=>String(Number(q)+1))}>+</StorelyButton>
                </div>
                <div className="dp-quantity-presets">
                  {[1,5,10,20].map(v=>(
                    <StorelyButton className="dp-button dp-preset" aria-pressed={Number(qty)===v} key={v} onClick={()=>setQty(String(v))}>
                      {v}
                    </StorelyButton>
                  ))}
                </div>
              </div>

              {Number(qty)>selected.qty&&(
                <div className="dp-warning">
                  ⚠️ الكمية تتجاوز المتاح
                </div>
              )}
            </div>

            <div className="dp-sheet-footer">
              {wasteMode ? (
                <StorelyButton className="dp-button dp-submit" variant="primary" disabled={saving||!qty||Number(qty)<=0||Number(qty)>selected.qty||!wasteReason} onClick={handleWaste}>
                  {saving?'⏳ جاري الحفظ...':`🗑️ تسجيل هدر ${qty||0} ${selected.unit}`}
                </StorelyButton>
              ) : (
                <StorelyButton className="dp-button dp-submit" variant="primary" disabled={saving||!qty||Number(qty)<=0||Number(qty)>selected.qty} onClick={handleDispense}>
                  {saving?'⏳ جاري الحفظ...':`✓ صرف ${qty||0} ${selected.unit} من ${selected.name}`}
                </StorelyButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
