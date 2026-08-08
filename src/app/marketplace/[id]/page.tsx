'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SupplierStorefrontPage() {
  const params = useParams()
  const router = useRouter()
  const supplierId = params.id as string

  const [supplier, setSupplier] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [orgId, setOrgId] = useState<string|null>(null)
  const [orgName, setOrgName] = useState('')
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [avgRating, setAvgRating] = useState<number|null>(null)
  const [reviewCount, setReviewCount] = useState(0)
  const [myReviewedIds, setMyReviewedIds] = useState<string[]>([])
  const [reviewingId, setReviewingId] = useState<string|null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)

  useEffect(()=>{ load() },[supplierId])

  useEffect(()=>{
    if (!orgId || !supplierId) return
    const sb = createClient()
    const channel = sb.channel(`customer-supplier-${supplierId}-${orgId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `supplier_id=eq.${supplierId}` }, (payload:any) => {
        if (payload.new.org_id === orgId) setChatMessages(prev => [...prev, payload.new])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quote_requests', filter: `supplier_id=eq.${supplierId}` }, (payload:any) => {
        if (payload.new.org_id === orgId) setMyRequests(prev => prev.map((r:any) => r.id === payload.new.id ? payload.new : r))
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  },[orgId, supplierId])

  async function load() {
    setLoading(true)
    const sb = createClient()
    const { data: s } = await (sb as any).from('supplier_profiles')
      .select('id,business_name,phone,location,status')
      .eq('id', supplierId).eq('status','active').maybeSingle()
    if (!s) { setNotFound(true); setLoading(false); return }
    setSupplier(s)

    const { data: it } = await (sb as any).from('supplier_catalog_items')
      .select('id,name,unit,price,image_url,price_includes_vat')
      .eq('supplier_id', supplierId).eq('is_available', true)
      .order('created_at', { ascending: false })
    setItems(it || [])

    const { data: reviews } = await (sb as any).from('supplier_reviews').select('rating,quote_request_id').eq('supplier_id', supplierId)
    if (reviews && reviews.length > 0) {
      setAvgRating(reviews.reduce((s:number,r:any)=>s+r.rating,0) / reviews.length)
      setReviewCount(reviews.length)
    }

    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const { data: p } = await sb.from('profiles').select('org_id,organizations(name)').eq('id', user.id).maybeSingle()
      if (p?.org_id) {
        setOrgId(p.org_id)
        setOrgName((p.organizations as any)?.name || '')
        const { data: reqs } = await (sb as any).from('quote_requests')
          .select('id,items,status,quoted_price,quoted_note,created_at,delivery_date,rep_name,rep_phone')
          .eq('supplier_id', supplierId).eq('org_id', p.org_id)
          .order('created_at', { ascending: false })
        setMyRequests(reqs || [])

        const { data: myReviews } = await (sb as any).from('supplier_reviews').select('quote_request_id').eq('org_id', p.org_id).eq('supplier_id', supplierId)
        setMyReviewedIds((myReviews||[]).map((r:any)=>r.quote_request_id))

        const { data: msgs } = await (sb as any).from('chat_messages')
          .select('id,sender_type,message,created_at')
          .eq('supplier_id', supplierId).eq('org_id', p.org_id)
          .order('created_at', { ascending: true })
        setChatMessages(msgs || [])
      }
    }
    setLoading(false)
  }

  function toggleSelect(itemId: string) {
    setSelected(prev => {
      const next = { ...prev }
      if (next[itemId] !== undefined) delete next[itemId]
      else next[itemId] = '1'
      return next
    })
  }

  function setQty(itemId: string, qty: string) {
    setSelected(prev => ({ ...prev, [itemId]: qty }))
  }

  async function submitReview(reqId: string) {
    if (!orgId) return
    setReviewSaving(true)
    const { error } = await (createClient() as any).from('supplier_reviews').insert({
      supplier_id: supplierId, org_id: orgId, org_name: orgName,
      quote_request_id: reqId, rating: reviewRating, comment: reviewComment.trim() || null,
    })
    setReviewSaving(false)
    if (!error) {
      setReviewingId(null); setReviewRating(5); setReviewComment('')
      load()
    }
  }

  async function acceptOffer(reqId: string, supplierName: string, supplierPhone: string) {
    if (!confirm('تأكيد قبول العرض؟ سيتم إضافة المورد تلقائياً لقائمة موردينك')) return
    const sb = createClient()
    const activeBranch = typeof window !== 'undefined' ? sessionStorage.getItem('s_branch_id') : null
    const { data: existingSupplier } = await (sb as any).from('suppliers').select('id').eq('org_id', orgId).eq('name', supplierName).maybeSingle()
    if (!existingSupplier) {
      await (sb as any).from('suppliers').insert({ org_id: orgId, branch_id: activeBranch || null, name: supplierName, phone: supplierPhone || null, marketplace_supplier_id: supplierId })
    } else {
      await (sb as any).from('suppliers').update({ marketplace_supplier_id: supplierId, branch_id: activeBranch || null }).eq('id', existingSupplier.id)
    }
    await (sb as any).from('quote_requests').update({ status: 'accepted' }).eq('id', reqId)
    load()
  }

  async function sendChatMessage() {
    if (!chatInput.trim()) return
    if (!orgId) { alert('لازم تسجّل دخول بحسابك بستوريلي أول عشان تراسل المورد'); router.push('/login'); return }
    const sb = createClient()
    setChatSending(true)
    const { data } = await (sb as any).from('chat_messages').insert({
      supplier_id: supplierId, org_id: orgId, org_name: orgName, sender_type: 'customer', message: chatInput.trim(),
    }).select().single()
    if (data) setChatMessages(prev => [...prev, data])
    setChatInput('')
    setChatSending(false)
  }

  async function submitQuoteRequest() {
    const chosenIds = Object.keys(selected)
    if (chosenIds.length === 0) return
    if (!orgId) {
      alert('لازم تسجّل دخول بحسابك بستوريلي أول عشان تطلب تسعير')
      router.push('/login')
      return
    }
    const sb = createClient()
    setSubmitting(true)
    const requestItems = chosenIds.map(id => {
      const it = items.find((x:any)=>x.id===id)
      return { name: it?.name, unit: it?.unit, qty: Number(selected[id])||1 }
    })
    const { error } = await (sb as any).from('quote_requests').insert({
      supplier_id: supplierId, org_id: orgId, org_name: orgName, items: requestItems,
    })
    setSubmitting(false)
    if (!error) {
      setSelected({})
      alert('✅ تم إرسال طلب التسعير للمورد')
      load()
    } else {
      alert('حدث خطأ أثناء إرسال الطلب')
    }
  }

  function getWhatsAppLink() {
    const phone = (supplier?.phone||'').replace(/^0/,'966').replace(/[^0-9]/g,'')
    const msg = encodeURIComponent(`مرحباً، أنا عميل Storely وأود الاستفسار عن أصنافكم 🙌`)
    return `https://wa.me/${phone}?text=${msg}`
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f4f8'}}>
      <div style={{width:36,height:36,border:'3px solid #bbf7d0',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound || !supplier) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',background:'#f0f4f8',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:20}}>
      <div style={{fontSize:48,marginBottom:12}}>🔍</div>
      <div style={{fontSize:16,fontWeight:700,color:'#0f172a'}}>هذا المورد غير موجود</div>
      <button onClick={()=>router.push('/marketplace')} style={{marginTop:16,padding:'10px 20px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>← رجوع للموردين</button>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f0f4f8',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700;800&display=swap');*{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0d2818,#1a4731)',padding:'32px 20px'}}>
        <div style={{maxWidth:800,margin:'0 auto'}}>
          <button onClick={()=>router.push('/marketplace')} style={{background:'rgba(255,255,255,.1)',border:'none',color:'white',borderRadius:10,padding:'8px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,marginBottom:20}}>← رجوع للموردين</button>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{width:64,height:64,borderRadius:16,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30}}>🚚</div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' as const}}>
                <h1 style={{fontSize:22,fontWeight:900,color:'white',margin:0}}>{supplier.business_name}</h1>
                {reviewCount > 0 && (
                  <span style={{fontSize:12,fontWeight:700,color:'#facc15',background:'rgba(255,255,255,.15)',padding:'3px 10px',borderRadius:20}}>
                    ⭐ {avgRating?.toFixed(1)} ({reviewCount})
                  </span>
                )}
                {reviewCount >= 3 && (
                  <span style={{fontSize:11,fontWeight:700,color:'#16a34a',background:'white',padding:'3px 10px',borderRadius:20}}>
                    ✅ موثّق عبر Storely
                  </span>
                )}
              </div>
              {supplier.location && <p style={{fontSize:13,color:'rgba(255,255,255,.7)',margin:'6px 0 0'}}>📍 {supplier.location}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:800,margin:'0 auto',padding:'24px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>الأصناف المتوفرة ({items.length})</h2>
          {supplier.phone && (
            <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer"
              style={{padding:'10px 18px',background:'#16a34a',color:'white',borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>
              📲 تواصل مع المورد
            </a>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{textAlign:'center' as const,padding:60,background:'white',borderRadius:16}}>
            <div style={{fontSize:44,marginBottom:10}}>📦</div>
            <div style={{fontSize:14,color:'#64748b'}}>ما فيه أصناف متوفرة حالياً</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
            {items.map((it:any)=>(
              <div key={it.id} style={{background:'white',borderRadius:14,overflow:'hidden',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} style={{width:'100%',height:140,objectFit:'cover'}}/>
                ) : (
                  <div style={{width:'100%',height:140,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36}}>📦</div>
                )}
                <div style={{padding:'12px 14px'}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{it.name}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{it.unit}</div>
                  {(() => {
                    const includesVat = it.price_includes_vat !== false
                    const finalPrice = includesVat ? Number(it.price) : Number(it.price) * 1.15
                    const basePrice = includesVat ? Number(it.price) / 1.15 : Number(it.price)
                    const vatAmount = finalPrice - basePrice
                    return (
                      <>
                        <div style={{fontSize:16,fontWeight:900,color:'#16a34a',marginTop:8}}>{finalPrice.toFixed(2)} ر.س</div>
                        <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>
                          الأساسي {basePrice.toFixed(2)} + ضريبة {vatAmount.toFixed(2)} ر.س
                        </div>
                      </>
                    )
                  })()}
                  <div style={{display:'flex',alignItems:'center',gap:6,marginTop:10,paddingTop:10,borderTop:'1px solid #f1f5f9'}}>
                    <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#475569',cursor:'pointer'}}>
                      <input type="checkbox" checked={selected[it.id]!==undefined} onChange={()=>toggleSelect(it.id)}/>
                      طلب تسعير
                    </label>
                    {selected[it.id]!==undefined && (
                      <input type="number" min="1" value={selected[it.id]} onChange={e=>setQty(it.id, e.target.value)}
                        style={{width:50,padding:'4px 6px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:11,marginRight:'auto'}}/>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {Object.keys(selected).length > 0 && (
          <div style={{position:'sticky' as const,bottom:16,marginTop:20,background:'#0d2818',borderRadius:14,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>
            <span style={{color:'white',fontSize:13,fontWeight:700}}>{Object.keys(selected).length} صنف محدّد للتسعير</span>
            <button onClick={submitQuoteRequest} disabled={submitting}
              style={{padding:'10px 20px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>
              {submitting?'⏳ جاري الإرسال...':'📩 إرسال طلب التسعير'}
            </button>
          </div>
        )}

        {orgId && (
          <div style={{marginTop:32,background:'white',borderRadius:16,border:'1px solid #f1f5f9',overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontSize:15,fontWeight:800,color:'#0f172a'}}>💬 تواصل مع المورد</div>
            <div style={{maxHeight:280,overflowY:'auto' as const,padding:16,display:'flex',flexDirection:'column' as const,gap:8,background:'#f8fafc'}}>
              {chatMessages.length===0 ? (
                <div style={{textAlign:'center' as const,color:'#94a3b8',fontSize:12,padding:20}}>ما فيه رسائل بعد — ابدأ المحادثة</div>
              ) : chatMessages.map((m:any)=>(
                <div key={m.id} style={{alignSelf:m.sender_type==='customer'?'flex-end':'flex-start',maxWidth:'75%'}}>
                  <div style={{padding:'8px 12px',borderRadius:12,fontSize:13,background:m.sender_type==='customer'?'#16a34a':'white',color:m.sender_type==='customer'?'white':'#0f172a',border:m.sender_type==='customer'?'none':'1px solid #e2e8f0'}}>
                    {m.message}
                  </div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2,textAlign:m.sender_type==='customer'?'left' as const:'right' as const}}>
                    {new Date(m.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8,padding:12,borderTop:'1px solid #f1f5f9'}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') sendChatMessage()}}
                placeholder="اكتب رسالتك..." style={{flex:1,padding:'10px 14px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:13,fontFamily:'inherit'}}/>
              <button onClick={sendChatMessage} disabled={chatSending}
                style={{padding:'10px 20px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                {chatSending?'...':'إرسال'}
              </button>
            </div>
          </div>
        )}

        {myRequests.length > 0 && (
          <div style={{marginTop:32}}>
            <h2 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:14}}>📋 طلبات التسعير السابقة</h2>
            <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
              {myRequests.map((r:any, idx:number)=>{
                const STAGES = ['pending','quoted','accepted','confirmed','fulfilled']
                const stageIdx = STAGES.indexOf(r.status)
                const orderNo = `#${String(myRequests.length - idx).padStart(3,'0')}`
                return (
                <div key={r.id} style={{background:'white',borderRadius:14,overflow:'hidden',border:'1px solid #eef2f7',boxShadow:'0 1px 4px rgba(15,23,42,.04)'}}>
                  <div style={{padding:'12px 16px',background:'#f8fafc',borderBottom:'1px solid #eef2f7',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{orderNo}</span>
                      <span style={{fontSize:11,color:'#94a3b8'}}>{new Date(r.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,
                      background:r.status==='fulfilled'?'#dbeafe':r.status==='confirmed'?'#e0f2fe':r.status==='accepted'?'#dcfce7':r.status==='quoted'?'#fef3c7':'#f1f5f9',
                      color:r.status==='fulfilled'?'#1d4ed8':r.status==='confirmed'?'#0369a1':r.status==='accepted'?'#16a34a':r.status==='quoted'?'#92400e':'#64748b'}}>
                      {r.status==='fulfilled'?'📦 تم التنفيذ':r.status==='confirmed'?'🚚 جاري التوريد':r.status==='accepted'?'✅ مقبول':r.status==='quoted'?'💰 تم التسعير':'⏳ بانتظار الرد'}
                    </span>
                  </div>

                  <div style={{display:'flex',alignItems:'center',padding:'14px 16px 4px'}}>
                    {STAGES.map((stg,i)=>(
                      <div key={stg} style={{display:'flex',alignItems:'center',flex:i<STAGES.length-1?1:0}}>
                        <div style={{width:9,height:9,borderRadius:'50%',flexShrink:0,background:i<=stageIdx?'#16a34a':'#e2e8f0'}}/>
                        {i<STAGES.length-1 && <div style={{flex:1,height:2,background:i<stageIdx?'#16a34a':'#e2e8f0'}}/>}
                      </div>
                    ))}
                  </div>

                  <div style={{padding:'8px 16px 16px'}}>
                    <div style={{display:'flex',flexDirection:'column' as const,gap:4,marginBottom:10,marginTop:6}}>
                      {(r.items||[]).map((i:any,ii:number)=>(
                        <div key={ii} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#334155'}}>
                          <span>• {i.name}</span>
                          <span style={{color:'#94a3b8'}}>{i.qty} {i.unit||''}</span>
                        </div>
                      ))}
                    </div>

                    {(r.status==='quoted'||r.status==='accepted'||r.status==='confirmed'||r.status==='fulfilled') && (
                      <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:12,color:'#15803d',fontWeight:700}}>💰 السعر المقترح</span>
                        <span style={{fontSize:16,fontWeight:900,color:'#16a34a'}}>{r.quoted_price} ر.س</span>
                      </div>
                    )}
                    {r.quoted_note && (r.status==='quoted'||r.status==='accepted'||r.status==='confirmed'||r.status==='fulfilled') && (
                      <div style={{fontSize:11,color:'#64748b',marginBottom:8,paddingRight:2}}>📝 {r.quoted_note}</div>
                    )}
                    {(r.status==='confirmed'||r.status==='fulfilled') && r.rep_name && (
                      <div style={{background:'#eff6ff',borderRadius:10,padding:'10px 14px',marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:r.delivery_date?4:0}}>
                          <span style={{color:'#1d4ed8',fontWeight:700}}>🚚 المندوب</span>
                          <span style={{color:'#1e3a8a'}}>{r.rep_name} — {r.rep_phone}</span>
                        </div>
                        {r.delivery_date && (
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                            <span style={{color:'#1d4ed8',fontWeight:700}}>📅 موعد التوريد</span>
                            <span style={{color:'#1e3a8a'}}>{r.delivery_date}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {r.status==='quoted' && (
                      <button onClick={()=>acceptOffer(r.id, supplier.business_name, supplier.phone)}
                        style={{width:'100%',padding:'10px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                        ✅ قبول العرض
                      </button>
                    )}
                    {(r.status==='accepted'||r.status==='confirmed'||r.status==='fulfilled') && (
                      <button onClick={()=>router.push(`/suppliers?ms=${supplierId}`)}
                        style={{width:'100%',padding:'10px',background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',marginTop:8}}>
                        🔗 اعتماد المورد وربط منتج (توريد تلقائي عند نقص المخزون)
                      </button>
                    )}
                    {r.status==='fulfilled' && !myReviewedIds.includes(r.id) && (
                      reviewingId===r.id ? (
                        <div style={{background:'#fffbeb',borderRadius:10,padding:'12px',marginTop:4}}>
                          <div style={{display:'flex',gap:4,marginBottom:8,justifyContent:'center'}}>
                            {[1,2,3,4,5].map(n=>(
                              <button key={n} onClick={()=>setReviewRating(n)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',padding:0,opacity:n<=reviewRating?1:.3}}>⭐</button>
                            ))}
                          </div>
                          <input value={reviewComment} onChange={e=>setReviewComment(e.target.value)} placeholder="تعليق (اختياري)"
                            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #fde68a',fontSize:12,marginBottom:8,boxSizing:'border-box' as const}}/>
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>submitReview(r.id)} disabled={reviewSaving}
                              style={{flex:1,padding:'8px',background:'#16a34a',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                              {reviewSaving?'...':'إرسال التقييم'}
                            </button>
                            <button onClick={()=>setReviewingId(null)}
                              style={{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,cursor:'pointer',color:'#64748b'}}>
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={()=>setReviewingId(r.id)}
                          style={{width:'100%',padding:'10px',background:'white',color:'#b45309',border:'1px solid #fde68a',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                          ⭐ قيّم المورد
                        </button>
                      )
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
