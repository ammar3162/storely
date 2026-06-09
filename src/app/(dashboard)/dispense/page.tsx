'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { toast } from '@/components/toast'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font, card, btnPrimary, btnDanger, btnSecondary, inp, tag, pageTitle, pageSub } from '@/lib/ds'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

const REASONS = ['استهلاك يومي','طلب فرع','تلف','أخرى']
const lbl: React.CSSProperties = { fontSize: font.xs, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }

export default function DispensePage() {
  const [products, setProducts]   = useState<any[]>([])
  const [history, setHistory]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [productId, setProductId] = useState('')
  const [qty, setQty]             = useState('')
  const [reason, setReason]       = useState('استهلاك يومي')
  const [note, setNote]           = useState('')
  const [showScan, setShowScan]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const orgIdRef     = useRef<string|null>(null)
  const profileIdRef = useRef<string|null>(null)
  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const cachedOrg     = sessionStorage.getItem('s_org_id')
    const cachedProfile = sessionStorage.getItem('s_profile_id')
    if (cachedOrg && cachedProfile) {
      orgIdRef.current = cachedOrg; profileIdRef.current = cachedProfile
      await Promise.all([loadProducts(cachedOrg), loadHistory(cachedOrg)])
      setLoading(false); return
    }
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('id,org_id').eq('id', user.id).single()
    if (!profile?.org_id) return
    sessionStorage.setItem('s_org_id', profile.org_id)
    sessionStorage.setItem('s_profile_id', profile.id)
    orgIdRef.current = profile.org_id; profileIdRef.current = profile.id
    await Promise.all([loadProducts(profile.org_id), loadHistory(profile.org_id)])
    setLoading(false)
  }

  async function loadProducts(oid: string) {
    const bid=sessionStorage.getItem('s_branch_id')
    let dq=sb.from('products').select('id,name,sku,unit,qty,reorder_point').eq('org_id',oid).eq('is_active',true).order('name')
    if(bid) dq=(dq as any).eq('branch_id',bid)
    const{data}=await dq
    setProducts(data||[])
  }

  async function loadHistory(oid: string) {
    const { data } = await sb.from('stock_movements').select('id,qty_change,note,created_at,products!inner(name,unit,org_id)').eq('type','out').eq('products.org_id', oid).order('created_at',{ascending:false}).limit(12)
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
    setProductId(''); setQty(''); setNote(''); setReason('استهلاك يومي')
    setSaving(false); loadProducts(oid); loadHistory(oid)
  }

  const selected  = products.find(p=>p.id===productId)??null
  const isLow     = selected ? selected.qty<=selected.reorder_point : false
  const remaining = selected&&qty ? selected.qty-Number(qty) : null

  if (loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.4}}.sk{animation:sk 1.4s infinite}`}</style>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {[1,2].map(i=>(<div key={i} style={{...card,padding:20}}>{[80,60,100,60,40].map((w,j)=>(<div key={j} className="sk" style={{height:12,width:w+'%',background:colors.border,borderRadius:6,marginBottom:14}}/>))}</div>))}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`
        .dg{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
        .rg{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
        @media(max-width:768px){.dg{grid-template-columns:1fr}.rg{grid-template-columns:repeat(3,1fr)}}
        input:focus,select:focus,textarea:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px ${colors.primaryLight}!important}
        .rbtn{padding:9px 4px;border-radius:${radius.md};font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;border:1.5px solid ${colors.border2};background:${colors.surface};color:${colors.text3};font-family:${font.family};text-align:center}
        .rbtn.on{border-color:${colors.danger};background:${colors.dangerLight};color:${colors.danger}}
        .rbtn:hover:not(.on){background:${colors.bg}}
        .hrow:hover{background:${colors.bg}}
      `}</style>

      <div style={{marginBottom:22}}>
        <h1 style={{...pageTitle}}>تسجيل الصرف</h1>
        <p style={{...pageSub}}>خصم كمية من المخزون وتسجيل السبب</p>
      </div>

      <div className="dg">
        <div style={{...card,padding:22}}>
          <div style={{fontSize:font.md,fontWeight:700,color:colors.text,marginBottom:18,paddingBottom:12,borderBottom:`1px solid ${colors.border}`}}>بيانات الصرف</div>

          {showScan && (
            <Suspense fallback={null}>
              <BarcodeScanner onScan={code => { setShowScan(false); const found = products.find(p => p.sku === code); if (found) setProductId(found.id); else toast('المنتج غير موجود في المخزون', 'warning') }} onClose={() => setShowScan(false)} />
            </Suspense>
          )}

          <div style={{marginBottom:14}}>
            <label style={lbl}>المنتج</label>
            <button type="button" onClick={()=>setShowScan(true)} style={{width:'100%',padding:'10px',background:colors.primaryLight,color:colors.primary,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:radius.md,fontSize:font.sm,fontWeight:700,cursor:'pointer',fontFamily:font.family,display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8}}>📷 مسح باركود المنتج</button>
            <select value={productId} onChange={e=>setProductId(e.target.value)} style={inp()}>
              <option value="">— اختر المنتج —</option>
              {products.map(p=>(<option key={p.id} value={p.id}>{p.name} (متاح: {p.qty} {p.unit})</option>))}
            </select>
          </div>

          {selected && (
            <div style={{background:isLow?colors.dangerLight:colors.primaryLight,border:`1.5px solid ${isLow?colors.dangerBorder:colors.primaryBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:isLow?colors.danger:colors.primary,flexShrink:0}}/>
              <div>
                <div style={{fontSize:font.sm,fontWeight:700,color:isLow?colors.danger:colors.primary}}>المتاح: {selected.qty} {selected.unit}</div>
                {isLow && <div style={{fontSize:11,color:colors.danger,marginTop:1}}>وصل للحد الأدنى</div>}
              </div>
            </div>
          )}

          <div style={{marginBottom:14}}>
            <label style={lbl}>الكمية</label>
            <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} style={inp()} placeholder="0" inputMode="numeric"/>
            {remaining!==null && (<div style={{marginTop:6,fontSize:font.sm,color:remaining<0?colors.danger:colors.text3,fontWeight:remaining<0?700:400,padding:'6px 10px',background:remaining<0?colors.dangerLight:colors.bg,borderRadius:radius.sm,border:`1px solid ${remaining<0?colors.dangerBorder:colors.border}`}}>{remaining<0 ? 'الكمية تتجاوز المتاح!' : 'المتبقي بعد الصرف: '+remaining+' '+selected?.unit}</div>)}
          </div>

          <div style={{marginBottom:14}}>
            <label style={lbl}>سبب الصرف</label>
            <div className="rg">{REASONS.map(r=>(<button key={r} type="button" className={'rbtn'+(reason===r?' on':'')} onClick={()=>setReason(r)}>{r}</button>))}</div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={lbl}>ملاحظات (اختياري)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} style={inp({minHeight:72,resize:'none'})} placeholder="أي تفاصيل إضافية..."/>
          </div>

          <button type="button" disabled={saving||!productId||!qty} onClick={()=>{ if(!productId||!qty) return; setShowConfirm(true) }}
            style={{...btnDanger,width:'100%',padding:'13px',fontSize:font.base,opacity:(saving||!productId||!qty)?0.5:1,cursor:(saving||!productId||!qty)?'not-allowed':'pointer'}}>
            {saving ? 'جاري الحفظ...' : '← تسجيل الصرف'}
          </button>
        </div>

        <div style={{...card}}>
          <div style={{padding:'14px 18px',borderBottom:`1px solid ${colors.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:font.md,fontWeight:700,color:colors.text}}>آخر عمليات الصرف</div>
            <button onClick={()=>orgIdRef.current&&loadHistory(orgIdRef.current)} style={{...btnSecondary,padding:'6px 10px',fontSize:font.xs}}>تحديث</button>
          </div>
          <div style={{maxHeight:520,overflowY:'auto'}}>
            {history.length===0 ? (
              <div style={{padding:'48px 20px',textAlign:'center'}}><div style={{fontSize:36,marginBottom:10}}>📭</div><div style={{fontSize:font.sm,fontWeight:600,color:colors.text2}}>لا توجد عمليات بعد</div></div>
            ) : history.map((h,i)=>(
              <div key={h.id} className="hrow" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 18px',borderBottom:i<history.length-1?`1px solid ${colors.border}`:'none',gap:10,transition:'background .15s'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{(h.products as any)?.name}</div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <span style={{...tag(colors.text3,colors.bg,colors.border2)}}>{h.note||'—'}</span>
                    <span style={{fontSize:10,color:colors.text4}}>{new Date(h.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
                <span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder),fontSize:font.sm,padding:'4px 12px'}}>{Math.abs(h.qty_change)} {(h.products as any)?.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}} onClick={()=>setShowConfirm(false)}/>
          <div style={{...card,padding:28,width:'100%',maxWidth:340,position:'relative',boxShadow:shadow.lg,direction:'rtl',fontFamily:font.family}}>
            <div style={{width:48,height:48,borderRadius:radius.md,background:colors.warningLight,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',border:`1.5px solid ${colors.warningBorder}`,fontSize:22}}>⚠️</div>
            <h3 style={{fontSize:font.md,fontWeight:800,color:colors.text,textAlign:'center',marginBottom:8}}>تأكيد الصرف</h3>
            <p style={{fontSize:font.sm,color:colors.text3,textAlign:'center',marginBottom:20,lineHeight:1.6}}>هل تريد صرف <b>{qty}</b> {selected?.unit} من <b>{selected?.name}</b>؟</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowConfirm(false)} style={{...btnSecondary,flex:1,padding:'11px',fontSize:font.sm}}>إلغاء</button>
              <button onClick={async()=>{ setShowConfirm(false); await handleDispense() }} style={{...btnPrimary,flex:2,padding:'11px',fontSize:font.sm}}>تسجيل الصرف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
