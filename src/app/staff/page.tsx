'use client'
import { useState, useEffect, lazy, Suspense } from 'react'
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))
import { createClient } from '@/lib/supabase/client'

export default function StaffPage() {
  const [authed, setAuthed]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [history, setHistory]   = useState<any[]>([])
  const [productId, setProductId] = useState('')
  const [qty, setQty]           = useState('')
  const [reason, setReason]     = useState('استهلاك يومي')
  const [note, setNote]         = useState('')
  const [success, setSuccess]   = useState('')
  const [showScan, setShowScan] = useState(false)
  const [email, setEmail]       = useState('')
  const [pass, setPass]         = useState('')
  const [loginErr, setLoginErr] = useState('')
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) { setAuthed(true); loadData() }
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginErr('')
    setLoading(true)
    const { error } = await sb.auth.signInWithPassword({ email, password: pass })
    if (error) { setLoginErr('البريد أو كلمة المرور غلط'); setLoading(false); return }
    setAuthed(true)
    loadData()
    setLoading(false)
  }

  async function loadData() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id,status').eq('id', user.id).single()
    if (!profile || profile.status !== 'active') {
      await sb.auth.signOut()
      setAuthed(false)
      setLoginErr('حسابك غير مفعّل — تواصل مع المسؤول')
      return
    }
    const { data: prods } = await sb.from('products').select('*').eq('org_id', profile.org_id).order('name')
    setProducts(prods || [])
    const { data: hist } = await sb.from('stock_movements')
      .select('*, products(name,unit)').eq('type','out')
      .order('created_at',{ascending:false}).limit(10)
    setHistory(hist || [])
  }

  async function handleDispense(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || !qty) return
    setLoading(true)
    const qtyNum  = Number(qty)
    const product = products.find(p => p.id === productId)
    if (!product) { setLoading(false); return }
    if (product.qty < qtyNum) { alert('الكمية أكبر من المتاح!'); setLoading(false); return }
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('stock_movements').insert({
      product_id: productId, profile_id: user!.id,
      type: 'out', qty_change: -qtyNum,
      note: reason + (note ? ' — ' + note : ''),
    })
    setSuccess('✅ تم صرف ' + qtyNum + ' ' + product.unit + ' من ' + product.name)
    setProductId(''); setQty(''); setNote(''); setReason('استهلاك يومي')
    fetch('/api/send-pending-notifications', { method: 'POST' }).catch(() => {})
    setLoading(false)
    loadData()
    setTimeout(() => setSuccess(''), 4000)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0',
    borderRadius: 9, fontSize: 14, outline: 'none', background: 'white',
    color: '#1e293b', fontFamily: 'inherit', transition: 'border 0.15s',
  }

  const selected = products.find(p => p.id === productId) ?? null

  if (!authed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#1a4731,#0d2818)',direction:'rtl',fontFamily:"'Segoe UI',system-ui,sans-serif",padding:20}}>
      <div style={{background:'white',borderRadius:20,padding:'40px',width:'100%',maxWidth:400,boxShadow:'0 25px 60px rgba(0,0,0,0.3)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:64,height:64,background:'#e8f7ee',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 14px'}}>📤</div>
          <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:4}}>صفحة الصرف</h1>
          <p style={{fontSize:12,color:'#94a3b8'}}>سجّل دخول للمتابعة</p>
        </div>
        {loginErr && <div style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:9,padding:'10px 14px',marginBottom:16,fontSize:13,fontWeight:600,color:'#dc2626'}}>{loginErr}</div>}
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>البريد الإلكتروني</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={inp} placeholder="example@email.com"/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>كلمة المرور</label>
            <input type="password" required value={pass} onChange={e=>setPass(e.target.value)} style={inp} placeholder="••••••••"/>
          </div>
          <button type="submit" disabled={loading} style={{width:'100%',padding:'13px',background:'#1a4731',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f0f2f5',direction:'rtl',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`input:focus,select:focus,textarea:focus{border-color:#1a4731!important}`}</style>

      <div style={{background:'linear-gradient(160deg,#1a4731,#0d2818)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,background:'#2d7a4f',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>📤</div>
          <div style={{fontSize:14,fontWeight:800,color:'white'}}>صفحة الصرف</div>
        </div>
        <button onClick={async()=>{await sb.auth.signOut();setAuthed(false)}}
          style={{padding:'6px 14px',background:'rgba(255,255,255,0.1)',color:'white',border:'1px solid rgba(255,255,255,0.2)',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          خروج
        </button>
      </div>

      <div style={{padding:20,maxWidth:700,margin:'0 auto'}}>
        {success && <div style={{background:'#ecfdf5',border:'1.5px solid #10b981',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:700,color:'#059669'}}>{success}</div>}

        <div style={{background:'white',borderRadius:12,padding:20,border:'1px solid #e8ecf0',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:16}}>تسجيل صرف جديد</div>
          <form onSubmit={handleDispense}>
            {showScan && (
              <Suspense fallback={null}>
                <BarcodeScanner
                  onScan={code => {
                    setShowScan(false)
                    const found = products.find((p:any) => p.sku === code)
                    if (found) setProductId(found.id)
                    else alert('المنتج غير موجود — تأكد من تسجيل الباركود')
                  }}
                  onClose={() => setShowScan(false)}
                />
              </Suspense>
            )}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>المنتج</label>
              <div style={{display:'flex',gap:8,marginBottom:8}}>
                <button type="button" onClick={()=>setShowScan(true)}
                  style={{width:'100%',padding:'11px',background:'#f0fdf4',color:'#166534',border:'1.5px solid #86efac',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  📷 مسح باركود المنتج
                </button>
              </div>
              <select value={productId} onChange={e=>setProductId(e.target.value)} style={inp} required>
                <option value="">— اختر المنتج —</option>
                {products.map(p=>(
                  <option key={p.id} value={p.id}>{p.name} (متاح: {p.qty} {p.unit})</option>
                ))}
              </select>
            </div>

            {selected && (
              <div style={{background:selected.qty<=selected.reorder_point?'#fff5f5':'#f0fdf4',border:'1.5px solid '+(selected.qty<=selected.reorder_point?'#fca5a5':'#86efac'),borderRadius:9,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:selected.qty<=selected.reorder_point?'#ef4444':'#10b981',flexShrink:0}}/>
                <div style={{fontSize:13,fontWeight:700,color:selected.qty<=selected.reorder_point?'#ef4444':'#10b981'}}>
                  المتاح: {selected.qty} {selected.unit}
                  {selected.qty<=selected.reorder_point && ' — وصل للحد الأدنى'}
                </div>
              </div>
            )}

            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>الكمية</label>
              <input type="number" min="1" required value={qty} onChange={e=>setQty(e.target.value)} style={inp} placeholder="0"/>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:8}}>سبب الصرف</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {['استهلاك يومي','طلب فرع','تلف','هدية','أخرى'].map(r=>(
                  <button key={r} type="button" onClick={()=>setReason(r)}
                    style={{padding:'9px',borderRadius:8,border:'1.5px solid '+(reason===r?'#ef4444':'#e2e8f0'),background:reason===r?'#fef2f2':'white',color:reason===r?'#ef4444':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>ملاحظات (اختياري)</label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} style={{...inp,minHeight:60,resize:'none'}} placeholder="أي تفاصيل إضافية..."/>
            </div>

            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'13px',background:loading?'#94a3b8':'#ef4444',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {loading?'جاري الحفظ...':'تسجيل الصرف ←'}
            </button>
          </form>
        </div>

        <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>آخر عمليات الصرف</div>
          </div>
          <div style={{maxHeight:400,overflowY:'auto'}}>
            {history.length===0 ? (
              <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:13}}>لا توجد عمليات بعد</div>
            ) : history.map((h,i)=>(
              <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderBottom:i<history.length-1?'1px solid #f8fafc':'none'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'#0f172a'}}>{(h.products as any)?.name}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{h.note} · {new Date(h.created_at).toLocaleDateString('ar-SA')}</div>
                </div>
                <span style={{background:'#fef2f2',color:'#ef4444',padding:'4px 12px',borderRadius:20,fontWeight:700,fontSize:13,border:'1px solid #fecaca'}}>
                  {h.qty_change} {(h.products as any)?.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
