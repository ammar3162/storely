'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { toast } from '@/components/toast'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))
const REASONS = ['استهلاك يومي','طلب فرع','تلف','أخرى']

export default function StaffDispensePage() {
  const [products, setProducts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [productId, setProductId] = useState('')
  const [qty, setQty]             = useState('')
  const [reason, setReason]       = useState('استهلاك يومي')
  const [note, setNote]           = useState('')
  const [showScan, setShowScan]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [userName, setUserName]   = useState('')
  const orgIdRef     = useRef<string|null>(null)
  const profileIdRef = useRef<string|null>(null)
  const router = useRouter()
  const sb = createClient()

  useEffect(()=>{ init() },[])

  async function init() {
    setLoading(true)
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await sb.from('profiles').select('id,org_id,full_name,status').eq('id', user.id).single()
    if (!profile?.org_id) { router.push('/login'); return }
    if (profile.status === 'pending') { router.push('/pending'); return }
    orgIdRef.current = profile.org_id
    profileIdRef.current = profile.id
    setUserName(profile.full_name||'')
    await loadProducts(profile.org_id)
    setLoading(false)
  }

  async function loadProducts(oid: string) {
    const { data } = await sb.from('products').select('id,name,sku,unit,qty,reorder_point').eq('org_id',oid).eq('is_active',true).order('name')
    if(data) setProducts(data)
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
    setProductId(''); setQty(''); setNote(''); setReason('استهلاك يومي')
    setSaving(false)
    await loadProducts(oid)
  }

  const selected  = products.find(p=>p.id===productId)??null
  const isLow     = selected ? selected.qty<=selected.reorder_point : false
  const remaining = selected&&qty ? selected.qty-Number(qty) : null

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc',fontFamily:'system-ui'}}>
      <div style={{fontSize:14,color:'#64748b',fontWeight:600}}>جاري التحميل...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:'system-ui',direction:'rtl',padding:'16px'}}>
      <style>{`
        input:focus,select:focus,textarea:focus{border-color:#2d7a4f!important;outline:none;box-shadow:0 0 0 3px rgba(45,122,79,.15)!important}
        .rbtn{padding:10px 4px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid #e2e8f0;background:white;color:#64748b;font-family:system-ui;text-align:center;transition:all .15s}
        .rbtn.on{border-color:#ef4444;background:#fef2f2;color:#ef4444}
      `}</style>

      {/* Header */}
      <div style={{background:'#2d7a4f',borderRadius:16,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:'white'}}>🏪 Storely</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.7)',marginTop:2}}>صفحة الصرف</div>
        </div>
        <div style={{textAlign:'left'}}>
          <div style={{fontSize:12,color:'rgba(255,255,255,.8)',fontWeight:600}}>{userName}</div>
          <button onClick={()=>sb.auth.signOut().then(()=>router.push('/login'))}
            style={{fontSize:11,color:'rgba(255,255,255,.6)',background:'none',border:'none',cursor:'pointer',fontFamily:'system-ui',marginTop:2}}>
            تسجيل خروج
          </button>
        </div>
      </div>

      {/* Form */}
      <div style={{background:'white',borderRadius:16,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,.08)',marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:18,paddingBottom:12,borderBottom:'1px solid #f1f5f9'}}>بيانات الصرف</div>

        {showScan && (
          <Suspense fallback={null}>
            <BarcodeScanner onScan={code => { setShowScan(false); const found = products.find(p => p.sku === code); if (found) setProductId(found.id); else toast('المنتج غير موجود', 'warning') }} onClose={() => setShowScan(false)} />
          </Suspense>
        )}

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>المنتج</label>
          <button type="button" onClick={()=>setShowScan(true)}
            style={{width:'100%',padding:'10px',background:'#f0fdf4',color:'#2d7a4f',border:'1.5px solid #bbf7d0',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',marginBottom:8}}>
            📷 مسح باركود
          </button>
          <select value={productId} onChange={e=>setProductId(e.target.value)}
            style={{width:'100%',padding:'11px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'system-ui',background:'white',color:'#1e293b'}}>
            <option value="">— اختر المنتج —</option>
            {products.map(p=>(<option key={p.id} value={p.id}>{p.name} (متاح: {p.qty} {p.unit})</option>))}
          </select>
        </div>

        {selected && (
          <div style={{background:isLow?'#fef2f2':'#f0fdf4',border:`1.5px solid ${isLow?'#fecaca':'#bbf7d0'}`,borderRadius:10,padding:'10px 14px',marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:isLow?'#ef4444':'#2d7a4f'}}>المتاح: {selected.qty} {selected.unit}</div>
            {isLow && <div style={{fontSize:11,color:'#ef4444',marginTop:2}}>⚠️ وصل للحد الأدنى</div>}
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>الكمية</label>
          <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}
            style={{width:'100%',padding:'11px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'system-ui',boxSizing:'border-box' as const}}
            placeholder="0" inputMode="numeric"/>
          {remaining!==null && (
            <div style={{marginTop:6,fontSize:12,color:remaining<0?'#ef4444':'#64748b',fontWeight:remaining<0?700:400,padding:'6px 10px',background:remaining<0?'#fef2f2':'#f8fafc',borderRadius:8,border:`1px solid ${remaining<0?'#fecaca':'#e2e8f0'}`}}>
              {remaining<0 ? '⚠️ الكمية تتجاوز المتاح!' : 'المتبقي بعد الصرف: '+remaining+' '+selected?.unit}
            </div>
          )}
        </div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>سبب الصرف</label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
            {REASONS.map(r=>(<button key={r} type="button" className={'rbtn'+(reason===r?' on':'')} onClick={()=>setReason(r)}>{r}</button>))}
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>ملاحظات (اختياري)</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            style={{width:'100%',padding:'11px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'system-ui',minHeight:72,resize:'none' as const,boxSizing:'border-box' as const}}
            placeholder="أي تفاصيل إضافية..."/>
        </div>

        <button type="button" disabled={saving||!productId||!qty||remaining!==null&&remaining<0}
          onClick={()=>{ if(!productId||!qty) return; setShowConfirm(true) }}
          style={{width:'100%',padding:'14px',background:saving||!productId||!qty?'#94a3b8':'#ef4444',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:saving||!productId||!qty?'not-allowed':'pointer',fontFamily:'system-ui'}}>
          {saving ? 'جاري الحفظ...' : '← تسجيل الصرف'}
        </button>
      </div>

      {showConfirm && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.45)'}} onClick={()=>setShowConfirm(false)}/>
          <div style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:320,position:'relative',direction:'rtl',fontFamily:'system-ui'}}>
            <div style={{fontSize:32,textAlign:'center',marginBottom:12}}>⚠️</div>
            <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',textAlign:'center',marginBottom:8}}>تأكيد الصرف</h3>
            <p style={{fontSize:14,color:'#64748b',textAlign:'center',marginBottom:20,lineHeight:1.6}}>هل تريد صرف <b>{qty}</b> {selected?.unit} من <b>{selected?.name}</b>؟</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowConfirm(false)} style={{flex:1,padding:'11px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>إلغاء</button>
              <button onClick={async()=>{ setShowConfirm(false); await handleDispense() }} style={{flex:2,padding:'11px',background:'#2d7a4f',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'system-ui'}}>تسجيل الصرف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
