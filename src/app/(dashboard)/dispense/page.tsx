'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { toast } from '@/components/toast'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font, card, btnPrimary, btnDanger, btnSecondary, inp, tag, pageTitle, pageSub } from '@/lib/ds'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

const REASONS = [
  {label:'استهلاك يومي', icon:'📆'},
  {label:'طلب فرع',      icon:'🏪'},
  {label:'تلف',          icon:'⚠️'},
  {label:'أخرى',         icon:'📝'},
]

const lbl: React.CSSProperties = { fontSize: font.xs, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }

export default function DispensePage() {
  const [products, setProducts]       = useState<any[]>([])
  const [history, setHistory]         = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [productId, setProductId]     = useState('')
  const [qty, setQty]                 = useState('')
  const [reason, setReason]           = useState('استهلاك يومي')
  const [note, setNote]               = useState('')
  const [showScan, setShowScan]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [search, setSearch]           = useState('')
  const [showDrop, setShowDrop]       = useState(false)
  const [visible, setVisible]         = useState(false)
  const orgIdRef     = useRef<string|null>(null)
  const profileIdRef = useRef<string|null>(null)
  const sb = createClient()

  useEffect(()=>{
    let a=0; const c=setInterval(()=>{a++;const b=sessionStorage.getItem('s_branch_id'),o=sessionStorage.getItem('s_org_id');if((b&&o)||a>20){clearInterval(c);init()}},100); return()=>clearInterval(c)
  },[])

  async function init() {
    setLoading(true)
    const cachedOrg     = sessionStorage.getItem('s_org_id')
    const cachedProfile = sessionStorage.getItem('s_profile_id')
    if (cachedOrg && cachedProfile) {
      orgIdRef.current = cachedOrg; profileIdRef.current = cachedProfile
      await Promise.all([loadProducts(cachedOrg), loadHistory(cachedOrg)])
      setLoading(false); setTimeout(()=>setVisible(true),50); return
    }
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('id,org_id').eq('id', user.id).single()
    if (!profile?.org_id) return
    sessionStorage.setItem('s_org_id', profile.org_id)
    sessionStorage.setItem('s_profile_id', profile.id)
    orgIdRef.current = profile.org_id; profileIdRef.current = profile.id
    await Promise.all([loadProducts(profile.org_id), loadHistory(profile.org_id)])
    setLoading(false); setTimeout(()=>setVisible(true),50)
  }

  async function loadProducts(oid: string) {
    const branchId = sessionStorage.getItem('s_branch_id')
    let pq = sb.from('products').select('id,name,sku,unit,qty,reorder_point').eq('org_id',oid).eq('is_active',true)
    if (branchId) pq = pq.eq('branch_id', branchId)
    const{data}=await pq.order('name')
    if(data) setProducts(data)
  }

  async function loadHistory(oid: string) {
    const branchId2 = sessionStorage.getItem('s_branch_id')
    let mq = sb.from('stock_movements').select('id,qty_change,note,created_at,products!inner(name,unit,org_id,branch_id)').eq('type','out').eq('products.org_id', oid)
    if (branchId2) mq = mq.eq('products.branch_id', branchId2)
    const { data } = await mq.order('created_at',{ascending:false}).limit(15)
    setHistory(data||[])
  }

  async function handleDispense() {
    const oid = orgIdRef.current; const pid = profileIdRef.current
    if (!productId||!qty||!oid||!pid) return
    setSaving(true)
    const qtyNum = Number(qty)
    const product = products.find(p=>p.id===productId)
    if (!product) { setSaving(false); return }
    if (product.qty < qtyNum) { toast('الكمية المطلوبة أكبر من المتاح!', 'warning'); setSaving(false); return }
    const { error } = await sb.from('stock_movements').insert({ product_id: productId, profile_id: pid, type: 'out', qty_change: -qtyNum, note: reason+(note?' — '+note:'') })
    if (error) { toast('خطأ في تسجيل الصرف', 'error'); setSaving(false); return }
    toast('تم صرف '+qtyNum+' '+product.unit+' من '+product.name, 'success')
    fetch('/api/send-pending-notifications', { method:'POST' }).catch(()=>{})
    fetch('/api/notify-supplier', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ org_id: oid }) }).catch(()=>{})
    setProductId(''); setQty(''); setNote(''); setReason('استهلاك يومي'); setSearch(''); setShowDrop(false)
    setSaving(false); loadProducts(oid); loadHistory(oid)
  }

  const selected  = products.find(p=>p.id===productId)??null
  const isLow     = selected ? selected.qty<=selected.reorder_point : false
  const isOut     = selected ? selected.qty===0 : false
  const qtyNum    = Number(qty)||0
  const remaining = selected&&qty ? selected.qty-qtyNum : null
  const stockPct  = selected ? Math.min((selected.qty / Math.max(selected.reorder_point*2, selected.qty, 1))*100, 100) : 0
  const afterPct  = selected&&qty ? Math.min(((selected.qty-qtyNum) / Math.max(selected.reorder_point*2, selected.qty, 1))*100, 100) : stockPct

  const filtered = products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.sku?.includes(search))

  if (loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}`}</style>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {[1,2].map(i=>(<div key={i} style={{...card,padding:20}}>{[80,60,100,60,40].map((w,j)=>(<div key={j} className="sk" style={{height:12,width:w+'%',background:colors.border,borderRadius:6,marginBottom:14}}/>))}</div>))}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1100,margin:'0 auto',opacity:visible?1:0,transition:'opacity .4s ease'}}>
      <style>{`
        .dg{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes dropIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        .su{animation:slideUp .4s ease both}
        input:focus,select:focus,textarea:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px ${colors.primaryLight}!important}
        .reason-btn{padding:10px 6px;border-radius:${radius.md};font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;border:1.5px solid ${colors.border};background:${colors.surface};color:${colors.text3};font-family:${font.family};text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px}
        .reason-btn:hover{border-color:${colors.danger};transform:translateY(-1px)}
        .reason-btn.on{border-color:${colors.danger};background:${colors.dangerLight};color:${colors.danger};box-shadow:0 4px 12px ${colors.danger}22}
        .prod-row{padding:11px 14px;cursor:pointer;font-size:13px;font-weight:600;color:${colors.text};border-bottom:1px solid ${colors.border};display:flex;justify-content:space-between;align-items:center;transition:background .12s}
        .prod-row:hover{background:${colors.primaryLight}}
        .hist-row{transition:background .12s}
        .hist-row:hover{background:${colors.bg}}
        @media(max-width:768px){.dg{grid-template-columns:1fr}.rg{grid-template-columns:repeat(2,1fr)!important}}
      `}</style>

      <div style={{marginBottom:22}} className="su">
        <h1 style={{...pageTitle}}>تسجيل الصرف</h1>
        <p style={{...pageSub}}>خصم كمية من المخزون وتسجيل السبب</p>
      </div>

      <div className="dg">
        {/* Form */}
        <div style={{...card,padding:22}} className="su">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${colors.border}`}}>
            <div style={{width:38,height:38,borderRadius:10,background:colors.dangerLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,border:`1px solid ${colors.dangerBorder}`}}>📤</div>
            <div>
              <div style={{fontSize:font.md,fontWeight:800,color:colors.text}}>بيانات الصرف</div>
              <div style={{fontSize:font.xs,color:colors.text4,marginTop:1}}>{products.length} صنف متاح</div>
            </div>
          </div>

          {showScan && (
            <Suspense fallback={null}>
              <BarcodeScanner onScan={code => { setShowScan(false); const found = products.find(p => p.sku === code); if (found) { setProductId(found.id); setSearch(found.name) } else toast('المنتج غير موجود في المخزون', 'warning') }} onClose={() => setShowScan(false)} />
            </Suspense>
          )}

          {/* Product search */}
          <div style={{marginBottom:16,position:'relative'}}>
            <label style={lbl}>المنتج</label>
            <button type="button" onClick={()=>setShowScan(true)} style={{width:'100%',padding:'10px',background:colors.primaryLight,color:colors.primary,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:radius.md,fontSize:font.sm,fontWeight:700,cursor:'pointer',fontFamily:font.family,display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8,transition:'all .2s'}}>
              📷 مسح باركود
            </button>
            <div style={{position:'relative'}}>
              <svg style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="15" height="15" fill="none" stroke={colors.text4} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e=>{setSearch(e.target.value);setShowDrop(true);if(!e.target.value){setProductId('')}}} onFocus={()=>setShowDrop(true)}
                style={{...inp(),paddingRight:36}} placeholder="ابحث عن منتج بالاسم أو الباركود..." autoComplete="off"/>
            </div>
            {showDrop && search && (
              <div style={{position:'absolute',top:'100%',right:0,left:0,zIndex:100,border:`1.5px solid ${colors.border}`,borderRadius:radius.md,marginTop:4,maxHeight:220,overflowY:'auto',background:colors.surface,boxShadow:shadow.lg,animation:'dropIn .15s ease'}}>
                {filtered.length===0 ? (
                  <div style={{padding:'16px 14px',fontSize:13,color:colors.text4,textAlign:'center'}}>لا توجد نتائج</div>
                ) : filtered.map(p=>{
                  const isLow=p.qty<=p.reorder_point
                  return (
                    <div key={p.id} className="prod-row" onClick={()=>{ setProductId(p.id); setSearch(p.name); setShowDrop(false) }}>
                      <div>
                        <div style={{fontWeight:700,color:colors.text}}>{p.name}</div>
                        {p.sku&&<div style={{fontSize:10,color:colors.text4,marginTop:1}}>#{p.sku}</div>}
                      </div>
                      <span style={{...tag(isLow?colors.warning:colors.primary,isLow?colors.warningLight:colors.primaryLight,isLow?colors.warningBorder:colors.primaryBorder),fontSize:11,flexShrink:0}}>
                        {p.qty} {p.unit}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected product card */}
          {selected && (
            <div style={{
              background: isOut?colors.dangerLight:isLow?colors.warningLight:colors.primaryLight,
              border: `1.5px solid ${isOut?colors.dangerBorder:isLow?colors.warningBorder:colors.primaryBorder}`,
              borderRadius:radius.md, padding:'14px 16px', marginBottom:16,
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{fontSize:font.base,fontWeight:800,color:colors.text}}>{selected.name}</div>
                  <div style={{fontSize:font.xs,color:colors.text3,marginTop:2}}>الحد الأدنى: {selected.reorder_point} {selected.unit}</div>
                </div>
                <div style={{textAlign:'left' as const}}>
                  <div style={{fontSize:22,fontWeight:900,color:isOut?colors.danger:isLow?colors.warning:colors.primary}}>{selected.qty}</div>
                  <div style={{fontSize:10,color:colors.text4}}>{selected.unit} متاح</div>
                </div>
              </div>
              {/* Stock bar */}
              <div style={{marginBottom:6}}>
                <div style={{fontSize:10,color:colors.text4,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
                  <span>المخزون الحالي</span>
                  {qty&&<span style={{color:remaining!==null&&remaining<0?colors.danger:colors.text3}}>بعد الصرف: {remaining} {selected.unit}</span>}
                </div>
                <div style={{height:8,background:colors.border,borderRadius:99,overflow:'hidden',position:'relative'}}>
                  <div style={{height:'100%',width:stockPct+'%',background:isOut?colors.danger:isLow?colors.warning:colors.primary,borderRadius:99,transition:'width .4s'}}/>
                  {qty&&qtyNum>0&&(
                    <div style={{position:'absolute',top:0,left:`${Math.max(afterPct,0)}%`,height:'100%',width:`${Math.min(stockPct-afterPct,100)}%`,background:colors.danger+'66',borderRadius:99}}/>
                  )}
                </div>
              </div>
              {isOut&&<div style={{fontSize:11,color:colors.danger,fontWeight:700,marginTop:4}}>⚠️ هذا المنتج نفد من المخزون</div>}
              {isLow&&!isOut&&<div style={{fontSize:11,color:colors.warning,fontWeight:700,marginTop:4}}>⚠️ وصل للحد الأدنى</div>}
            </div>
          )}

          {/* Qty */}
          <div style={{marginBottom:16}}>
            <label style={lbl}>الكمية المراد صرفها</label>
            <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}
              style={{...inp(),fontSize:22,fontWeight:800,textAlign:'center'}} placeholder="0" inputMode="numeric"/>
            {remaining!==null&&remaining<0&&(
              <div style={{marginTop:8,fontSize:font.sm,color:colors.danger,fontWeight:700,padding:'8px 12px',background:colors.dangerLight,borderRadius:radius.sm,border:`1px solid ${colors.dangerBorder}`,display:'flex',alignItems:'center',gap:6}}>
                ⚠️ الكمية تتجاوز المتاح! ({selected?.qty} {selected?.unit} فقط)
              </div>
            )}
          </div>

          {/* Reason */}
          <div style={{marginBottom:16}}>
            <label style={lbl}>سبب الصرف</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}} className="rg">
              {REASONS.map(r=>(
                <button key={r.label} type="button" className={`reason-btn${reason===r.label?' on':''}`} onClick={()=>setReason(r.label)}>
                  <span style={{fontSize:18}}>{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{marginBottom:22}}>
            <label style={lbl}>ملاحظات (اختياري)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} style={{...inp(),minHeight:72,resize:'none' as const}} placeholder="أي تفاصيل إضافية..."/>
          </div>

          <button type="button" disabled={saving||!productId||!qty||Number(qty)<=0||(remaining!==null&&remaining<0)}
            onClick={()=>{ if(!productId||!qty||Number(qty)<=0) return; setShowConfirm(true) }}
            style={{
              ...btnPrimary, width:'100%', padding:'14px', fontSize:font.base,
              background: saving||!productId||!qty||Number(qty)<=0||(remaining!==null&&remaining<0) ? colors.text4 : colors.danger,
              opacity: saving||!productId||!qty||Number(qty)<=0||(remaining!==null&&remaining<0) ? 0.6 : 1,
              cursor: saving||!productId||!qty||Number(qty)<=0||(remaining!==null&&remaining<0) ? 'not-allowed' : 'pointer',
              boxShadow: saving||!productId||!qty ? 'none' : `0 6px 20px ${colors.danger}33`,
            }}>
            {saving ? '⏳ جاري الحفظ...' : '← تسجيل الصرف'}
          </button>
        </div>

        {/* History */}
        <div style={{...card,animationDelay:'.1s'}} className="su">
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${colors.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:font.md,fontWeight:800,color:colors.text}}>آخر عمليات الصرف</div>
              <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>{history.length} عملية</div>
            </div>
            <button onClick={()=>orgIdRef.current&&loadHistory(orgIdRef.current)} style={{...btnSecondary,padding:'7px 12px',fontSize:font.xs,display:'flex',alignItems:'center',gap:6}}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
              تحديث
            </button>
          </div>
          <div style={{maxHeight:560,overflowY:'auto'}}>
            {history.length===0 ? (
              <div style={{padding:'56px 20px',textAlign:'center'}}>
                <div style={{fontSize:44,marginBottom:12}}>📭</div>
                <div style={{fontSize:font.base,fontWeight:700,color:colors.text2,marginBottom:4}}>لا توجد عمليات بعد</div>
                <div style={{fontSize:font.sm,color:colors.text4}}>سجّل أول عملية صرف من الجانب الآخر</div>
              </div>
            ) : history.map((h,i)=>{
              const prodName = (h.products as any)?.name
              const prodUnit = (h.products as any)?.unit
              const date = new Date(h.created_at)
              return (
                <div key={h.id} className="hist-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:i<history.length-1?`1px solid ${colors.border}`:'none',gap:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
                    <div style={{width:38,height:38,borderRadius:10,background:colors.dangerLight,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${colors.dangerBorder}`}}>
                      <svg width={15} height={15} fill="none" stroke={colors.danger} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{prodName}</div>
                      <div style={{fontSize:font.xs,color:colors.text4,marginTop:2,display:'flex',gap:8}}>
                        <span>{h.note||'—'}</span>
                        <span>· {date.toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign:'left' as const,flexShrink:0}}>
                    <span style={{fontSize:font.base,fontWeight:900,color:colors.danger}}>▼ {Math.abs(h.qty_change)}</span>
                    <span style={{fontSize:font.xs,color:colors.text4,marginRight:4}}>{prodUnit}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(6px)'}} onClick={()=>setShowConfirm(false)}/>
          <div style={{...card,padding:28,width:'100%',maxWidth:360,position:'relative',boxShadow:shadow.lg,direction:'rtl',fontFamily:font.family}}>
            <div style={{width:56,height:56,borderRadius:radius.lg,background:colors.dangerLight,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',border:`1.5px solid ${colors.dangerBorder}`,fontSize:26}}>📤</div>
            <h3 style={{fontSize:font.md,fontWeight:900,color:colors.text,textAlign:'center',marginBottom:8}}>تأكيد الصرف</h3>
            <div style={{background:colors.bg,borderRadius:radius.md,padding:'14px',marginBottom:20,textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:900,color:colors.danger}}>{qty} {selected?.unit}</div>
              <div style={{fontSize:font.sm,color:colors.text3,marginTop:4}}>من <b style={{color:colors.text}}>{selected?.name}</b></div>
              <div style={{fontSize:font.xs,color:colors.text4,marginTop:6}}>📋 {reason}</div>
              {remaining!==null&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:4}}>المتبقي بعد الصرف: <b>{remaining} {selected?.unit}</b></div>}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowConfirm(false)} style={{...btnSecondary,flex:1,padding:'12px',fontSize:font.sm}}>إلغاء</button>
              <button onClick={async()=>{ setShowConfirm(false); await handleDispense() }}
                style={{flex:2,padding:'12px',background:colors.danger,color:'white',border:'none',borderRadius:radius.md,fontSize:font.base,fontWeight:700,cursor:'pointer',fontFamily:font.family,boxShadow:`0 4px 14px ${colors.danger}33`}}>
                ✓ تسجيل الصرف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
