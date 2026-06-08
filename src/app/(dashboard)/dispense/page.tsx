'use client'
import { toast } from '@/components/toast'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))
import { createClient } from '@/lib/supabase/client'

const REASONS = ['استهلاك يومي','طلب فرع','تلف','هدية','أخرى']

export default function DispensePage() {
  const [products, setProducts] = useState<any[]>([])
  const [history, setHistory]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty]           = useState('')
  const [reason, setReason]     = useState('استهلاك يومي')
  const [note, setNote]         = useState('')
  const [showScan, setShowScan] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // refs للقيم الحرجة — متاحة فوراً بدون انتظار re-render
  const orgIdRef     = useRef<string|null>(null)
  const profileIdRef = useRef<string|null>(null)

  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const cachedOrg     = sessionStorage.getItem('s_org_id')
    const cachedProfile = sessionStorage.getItem('s_profile_id')

    if (cachedOrg && cachedProfile) {
      orgIdRef.current     = cachedOrg
      profileIdRef.current = cachedProfile
      await Promise.all([loadProducts(cachedOrg), loadHistory(cachedOrg)])
      setLoading(false)
      return
    }

    const { data:{ user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('id,org_id').eq('id', user.id).single()
    if (!profile?.org_id) return

    sessionStorage.setItem('s_org_id', profile.org_id)
    sessionStorage.setItem('s_profile_id', profile.id)
    orgIdRef.current     = profile.org_id
    profileIdRef.current = profile.id

    await Promise.all([loadProducts(profile.org_id), loadHistory(profile.org_id)])
    setLoading(false)
  }

  async function loadProducts(oid: string) {
    const { data } = await sb.from('products')
      .select('id,name,sku,unit,qty,reorder_point')
      .eq('org_id', oid).eq('is_active', true).order('name')
    setProducts(data||[])
  }

  async function loadHistory(oid: string) {
    const { data } = await sb.from('stock_movements')
      .select('id,qty_change,note,created_at,products!inner(name,unit,org_id)')
      .eq('type','out').eq('products.org_id', oid)
      .order('created_at',{ascending:false}).limit(10)
    setHistory(data||[])
  }

  async function handleDispense() {
    const oid = orgIdRef.current
    const pid = profileIdRef.current
    if (!productId||!qty||!oid||!pid) return
    setSaving(true)

    const qtyNum  = Number(qty)
    const product = products.find(p=>p.id===productId)
    if (!product) { setSaving(false); return }
    if (product.qty < qtyNum) {
      toast('الكمية المطلوبة أكبر من المتاح!', 'warning')
      setSaving(false)
      return
    }

    const { error } = await sb.from('stock_movements').insert({
      product_id: productId,
      profile_id: pid,
      type: 'out',
      qty_change: -qtyNum,
      note: reason+(note?' — '+note:''),
    })

    if (error) {
      toast('خطأ في تسجيل الصرف', 'error')
      setSaving(false)
      return
    }

    setSuccess('تم صرف '+qtyNum+' '+product.unit+' من '+product.name+' ✅')
    fetch('/api/send-pending-notifications', { method:'POST' }).catch(()=>{})
    setProductId('')
    setQty('')
    setNote('')
    setReason('استهلاك يومي')
    setSaving(false)
    loadProducts(oid)
    loadHistory(oid)
    setTimeout(()=>setSuccess(''), 4000)
  }

  const selected  = products.find(p=>p.id===productId)??null
  const isLow     = selected ? selected.qty<=selected.reorder_point : false
  const remaining = selected&&qty ? selected.qty-Number(qty) : null

  const inp: React.CSSProperties = {
    width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0',
    borderRadius:9, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'inherit', transition:'border 0.15s',
  }

  if (loading) return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}.sk{animation:pulse 1.5s infinite}`}</style>
      <div style={{marginBottom:20}}>
        <div className="sk" style={{height:24,width:140,background:'#e2e8f0',borderRadius:6,marginBottom:8}}/>
        <div className="sk" style={{height:14,width:200,background:'#f1f5f9',borderRadius:6}}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {[1,2].map(i=>(
          <div key={i} style={{background:'white',borderRadius:12,padding:20,border:'1px solid #e8ecf0'}}>
            {[80,60,100,60,40].map((w,j)=>(
              <div key={j} className="sk" style={{height:14,width:w+'%',background:'#f1f5f9',borderRadius:6,marginBottom:14}}/>
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`
        .d-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
        .r-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        @media(max-width:768px){.d-grid{grid-template-columns:1fr}.r-grid{grid-template-columns:repeat(3,1fr)}}
        input:focus,select:focus,textarea:focus{border-color:#1a4731!important;box-shadow:0 0 0 3px rgba(26,71,49,0.08)!important}
        .r-btn{padding:10px 6px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;border:1.5px solid #e2e8f0;background:white;color:#64748b;font-family:inherit;text-align:center}
        .r-btn.active{border-color:#ef4444;background:#fef2f2;color:#ef4444}
        .r-btn:hover{border-color:#fca5a5;background:#fff5f5}
      `}</style>

      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:3}}>تسجيل الصرف</h1>
        <p style={{fontSize:12,color:'#64748b'}}>خصم كمية من المخزون وتسجيل السبب</p>
      </div>

      {success && (
        <div style={{background:'#ecfdf5',border:'1.5px solid #10b981',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:700,color:'#059669'}}>
          {success}
        </div>
      )}

      <div className="d-grid">
        {/* Form */}
        <div style={{background:'white',borderRadius:12,padding:20,border:'1px solid #e8ecf0',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:16}}>بيانات الصرف</div>

          {showScan && (
            <Suspense fallback={null}>
              <BarcodeScanner
                onScan={code => {
                  setShowScan(false)
                  const found = products.find(p => p.sku === code)
                  if (found) setProductId(found.id)
                  else toast('المنتج غير موجود في المخزون', 'warning')
                }}
                onClose={() => setShowScan(false)}
              />
            </Suspense>
          )}

          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>المنتج</label>
            <button type="button" onClick={()=>setShowScan(true)}
              style={{width:'100%',padding:'11px',background:'#f0fdf4',color:'#166534',border:'1.5px solid #86efac',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8}}>
              📷 مسح باركود المنتج
            </button>
            <select value={productId} onChange={e=>setProductId(e.target.value)} style={inp}>
              <option value="">— اختر المنتج —</option>
              {products.map(p=>(
                <option key={p.id} value={p.id}>{p.name} (متاح: {p.qty} {p.unit})</option>
              ))}
            </select>
          </div>

          {selected && (
            <div style={{background:isLow?'#fff5f5':'#f0fdf4',border:'1.5px solid '+(isLow?'#fca5a5':'#86efac'),borderRadius:9,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:isLow?'#ef4444':'#10b981',flexShrink:0}}/>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:isLow?'#ef4444':'#10b981'}}>المتاح: {selected.qty} {selected.unit}</div>
                {isLow && <div style={{fontSize:11,color:'#f87171',marginTop:1}}>⚠️ وصل للحد الأدنى</div>}
              </div>
            </div>
          )}

          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>الكمية</label>
            <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} style={inp} placeholder="0" inputMode="numeric"/>
            {remaining!==null && (
              <div style={{marginTop:6,fontSize:12,color:remaining<0?'#ef4444':'#64748b',fontWeight:remaining<0?700:400,padding:'6px 10px',background:remaining<0?'#fef2f2':'#f8fafc',borderRadius:7}}>
                {remaining<0 ? '⚠️ الكمية تتجاوز المتاح!' : 'المتبقي بعد الصرف: '+remaining+' '+selected?.unit}
              </div>
            )}
          </div>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:8}}>سبب الصرف</label>
            <div className="r-grid">
              {REASONS.map(r=>(
                <button key={r} type="button" className={'r-btn'+(reason===r?' active':'')} onClick={()=>setReason(r)}>{r}</button>
              ))}
            </div>
          </div>

          <div style={{marginBottom:18}}>
            <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>ملاحظات (اختياري)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} style={{...inp,minHeight:72,resize:'none'}} placeholder="أي تفاصيل إضافية..."/>
          </div>

          <button
            type="button"
            disabled={saving || !productId || !qty}
            onClick={()=>{ if(!productId||!qty) return; setShowConfirm(true) }}
            style={{width:'100%',padding:'13px',background:(saving||!productId||!qty)?'#94a3b8':'#ef4444',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:(saving||!productId||!qty)?'not-allowed':'pointer',fontFamily:'inherit',transition:'background 0.15s',boxShadow:'0 2px 8px rgba(239,68,68,0.25)'}}>
            {saving ? '⏳ جاري الحفظ...' : 'تسجيل الصرف ←'}
          </button>
        </div>

        {/* History */}
        <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>آخر عمليات الصرف</div>
            <button onClick={()=>orgIdRef.current&&loadHistory(orgIdRef.current)}
              style={{width:30,height:30,borderRadius:7,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b'}}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
            </button>
          </div>
          <div style={{maxHeight:520,overflowY:'auto'}}>
            {history.length===0 ? (
              <div style={{padding:'48px 20px',textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:36,marginBottom:10}}>📭</div>
                <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>لا توجد عمليات بعد</div>
              </div>
            ) : history.map((h,i)=>(
              <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 18px',borderBottom:i<history.length-1?'1px solid #f8fafc':'none',gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{(h.products as any)?.name}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                    <span style={{background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600}}>{h.note||'—'}</span>
                    <span style={{color:'#94a3b8',fontSize:10}}>{new Date(h.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
                <span style={{background:'#fef2f2',color:'#ef4444',padding:'5px 12px',borderRadius:20,fontWeight:800,fontSize:13,border:'1px solid #fecaca',flexShrink:0}}>
                  {Math.abs(h.qty_change)} {(h.products as any)?.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(4px)'}} onClick={()=>setShowConfirm(false)}/>
          <div style={{background:'white',borderRadius:16,padding:28,width:'100%',maxWidth:340,position:'relative',boxShadow:'0 24px 64px rgba(0,0,0,.3)',direction:'rtl',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif"}}>
            <div style={{width:48,height:48,borderRadius:13,background:'#fffbeb',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',border:'1.5px solid #fde68a',fontSize:22}}>⚠️</div>
            <h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',textAlign:'center',marginBottom:8}}>تأكيد الصرف</h3>
            <p style={{fontSize:13,color:'#64748b',textAlign:'center',marginBottom:20,lineHeight:1.6}}>
              هل تريد صرف <b>{qty}</b> {selected?.unit} من <b>{selected?.name}</b>؟
            </p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowConfirm(false)} style={{flex:1,padding:'11px',background:'#f8fafc',color:'#64748b',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
              <button onClick={async()=>{ setShowConfirm(false); await handleDispense() }} style={{flex:2,padding:'11px',background:'#f59e0b',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>تسجيل الصرف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
