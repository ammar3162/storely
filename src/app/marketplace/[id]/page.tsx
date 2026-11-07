'use client'
import { StorelyButton, StorelyCard, StorelyPageHeader } from '@/components/ui'
import { CheckCircle2, CircleCheck, ClipboardList, FilePenLine, Link2, LoaderCircle, MapPin, Package, Search, Star, Truck, Wallet } from 'lucide-react'
import { storelyTokens as uiTokens } from '@/components/ui/design-tokens'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { confirmDialog } from '@/components/ConfirmDialog'

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
    const orgIdNow = await getOrgId()
    const j = await api.get('/api/marketplace', { view: 'supplier', id: supplierId, org_id: orgIdNow, branch_id: typeof window !== 'undefined' ? sessionStorage.getItem('s_branch_id') : null })
    if (!j.success || j.not_found) { setNotFound(true); setLoading(false); return }
    setSupplier(j.supplier)
    setItems(j.items || [])
    if (j.review_count > 0) { setAvgRating(j.avg_rating); setReviewCount(j.review_count) }
    if (orgIdNow && j.my_requests) {
      setOrgId(orgIdNow)
      setOrgName(j.org_name || '')
      setMyRequests(j.my_requests || [])
      setMyReviewedIds(j.my_reviewed_ids || [])
      setChatMessages(j.messages || [])
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
    const r = await api.post('/api/marketplace', { action: 'review', org_id: orgId, supplier_id: supplierId, quote_request_id: reqId, rating: reviewRating, comment: reviewComment.trim() || null })
    setReviewSaving(false)
    if (r.success) {
      setReviewingId(null); setReviewRating(5); setReviewComment('')
      load()
    }
  }

  async function acceptOffer(reqId: string) {
    if (!(await confirmDialog({ title: 'قبول العرض', message: 'تأكيد قبول العرض؟ سيتم إضافة المورد تلقائياً لقائمة موردينك', type: 'success' }))) return
    // الخادم يضيف المورد لموردي المنشأة (باسمه ورقمه من ملفه بالسوق) ويقبل الطلب
    const activeBranch = typeof window !== 'undefined' ? sessionStorage.getItem('s_branch_id') : null
    const r = await api.post('/api/marketplace', { action: 'accept', org_id: orgId, supplier_id: supplierId, request_id: reqId, branch_id: activeBranch })
    if (!r.success) alert(r.error || 'حدث خطأ')
    load()
  }

  async function sendChatMessage() {
    if (!chatInput.trim()) return
    if (!orgId) { alert('لازم تسجّل دخول بحسابك بستوريلي أول عشان تراسل المورد'); router.push('/login'); return }
    setChatSending(true)
    const activeBranch = typeof window !== 'undefined' ? sessionStorage.getItem('s_branch_id') : null
    const r = await api.post('/api/marketplace', { action: 'chat', org_id: orgId, supplier_id: supplierId, message: chatInput.trim(), branch_id: activeBranch })
    const data = r.message
    if (data) setChatMessages(prev => prev.some((m:any)=>m.id===data.id) ? prev : [...prev, data])
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
    setSubmitting(true)
    // الخادم يقرأ أسماء ووحدات الأصناف من كتالوج المورد — نرسل المعرّفات والكميات فقط
    const activeBranch = typeof window !== 'undefined' ? sessionStorage.getItem('s_branch_id') : null
    const r = await api.post('/api/marketplace', { action: 'quote', org_id: orgId, supplier_id: supplierId, branch_id: activeBranch,
      items: chosenIds.map(id => ({ id, qty: Number(selected[id])||1 })) })
    setSubmitting(false)
    if (r.success) {
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
    <div className="min-h-screen flex items-center justify-center text-[var(--storely-navy)]" style={{background:uiTokens.color.background}}>
      <LoaderCircle size={28} className="animate-spin" />

    </div>
  )

  if (notFound || !supplier) return (
    <div className="min-h-screen flex flex-col items-center justify-center !p-5 text-[var(--storely-navy)]" style={{background:uiTokens.color.background, direction:'rtl'}}>
      <div className="text-2xl !mb-3"><Search size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
      <div className="text-base font-semibold" style={{color:uiTokens.color.text}}>هذا المورد غير موجود</div>
      <StorelyButton onClick={()=>router.push('/marketplace')} className="!mt-4" variant="primary">← رجوع للموردين</StorelyButton>
    </div>
  )

  return (
    <div className="min-h-screen text-[var(--storely-navy)]" style={{background:uiTokens.color.background, direction:'rtl'}}>

      {/* Header */}
      <div className="!py-8 !px-5" style={{background:uiTokens.color.surface}}>
        <div className="max-w-6xl !my-0 !mx-auto">
          <StorelyButton onClick={()=>router.push('/marketplace')} className="!mb-5" variant="secondary">← رجوع للموردين</StorelyButton>
          <div className="flex items-center gap-4">
            <div className="rounded-[var(--radius)] flex items-center justify-center text-[28px]" style={{width:64, height:64, background:uiTokens.color.surface}}><Truck size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <StorelyPageHeader title={<> {supplier.business_name} </>} className="!mb-2" />
                {reviewCount > 0 && (
                  <span className="text-sm font-semibold !py-1 !px-2 rounded-[var(--radius)]" style={{color:uiTokens.color.warning, background:uiTokens.color.surface}}>

                    <Star size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> {avgRating?.toFixed(1)} ({reviewCount})
                  </span>
                )}
                {reviewCount >= 3 && (
                  <span className="text-xs font-semibold !py-1 !px-2 rounded-[var(--radius)]" style={{color:uiTokens.color.navy, background:uiTokens.color.surface}}>

                    <CheckCircle2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> موثّق عبر Storely
                  </span>
                )}
              </div>
              {supplier.location && <p className="text-sm !mt-1 !mx-0 !mb-0" style={{color:uiTokens.color.textMuted}}><MapPin size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> {supplier.location}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl !my-0 !mx-auto !py-6 !px-5">
        <div className="flex justify-between items-center !mb-4 flex-wrap gap-4">
          <h2 className="text-base font-semibold !m-0" style={{color:uiTokens.color.text}}>الأصناف المتوفرة ({items.length})</h2>
          {supplier.phone && (
            <a  href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="!py-2 !px-4 rounded-[var(--radius-sm)] text-sm font-semibold" style={{background:uiTokens.color.navy, color:uiTokens.color.onPrimary, textDecoration:'none'}}>

              <CircleCheck size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> تواصل مع المورد
            </a>
          )}
        </div>

        {items.length === 0 ? (
          <StorelyCard className="min-w-0 text-center !p-8 rounded-[var(--radius)]" style={{background:uiTokens.color.surface}}>
            <div className="text-2xl !mb-2"><Package size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
            <div className="text-sm" style={{color:uiTokens.color.textMuted}}>ما فيه أصناف متوفرة حالياً</div>
          </StorelyCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((it:any)=>(
              <StorelyCard key={it.id} className="min-w-0 rounded-[var(--radius)]" style={{background:uiTokens.color.surface, overflow:'hidden', border:`1px solid ${uiTokens.color.border}`, boxShadow:uiTokens.shadow.surface}}>
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} className="w-full object-cover" style={{height:140}}/>
                ) : (
                  <div className="w-full flex items-center justify-center text-2xl" style={{height:140, background:uiTokens.color.background}}><Package size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
                )}
                <div className="!py-3 !px-3">
                  <div className="text-sm font-semibold" style={{color:uiTokens.color.text}}>{it.name}</div>
                  <div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted}}>{it.unit}</div>
                  {(() => {
                    const includesVat = it.price_includes_vat !== false
                    const finalPrice = includesVat ? Number(it.price) : Number(it.price) * 1.15
                    const basePrice = includesVat ? Number(it.price) / 1.15 : Number(it.price)
                    const vatAmount = finalPrice - basePrice
                    return (
                      <>
                        <div className="text-base font-semibold !mt-2" style={{color:uiTokens.color.navy}}>{finalPrice.toFixed(2)} ر.س</div>
                        <div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted}}>
                          الأساسي {basePrice.toFixed(2)} + ضريبة {vatAmount.toFixed(2)} ر.س
                        </div>
                      </>
                    )
                  })()}
                  <div className="flex items-center gap-2 !mt-2 !pt-2" style={{borderTop:`1px solid ${uiTokens.color.border}`}}>
                    <label className="flex items-center gap-2 text-xs" style={{color:uiTokens.color.textMuted, cursor:'pointer'}}>
                      <input type="checkbox" checked={selected[it.id]!==undefined} onChange={()=>toggleSelect(it.id)}/>
                      طلب تسعير
                    </label>
                    {selected[it.id]!==undefined && (
                      <input type="number" min="1" value={selected[it.id]} onChange={e=>setQty(it.id, e.target.value)} className="rounded-[var(--radius-sm)] text-xs !mr-auto storely-input min-w-0" style={{width:50, border:`1px solid ${uiTokens.color.border}`}}/>
                    )}
                  </div>
                </div>
              </StorelyCard>
            ))}
          </div>
        )}

        {Object.keys(selected).length > 0 && (
          <div className="sticky !mt-5 rounded-[var(--radius)] !py-3 !px-4 flex justify-between items-center flex-wrap gap-4" style={{bottom:16, background:uiTokens.color.surface, boxShadow:uiTokens.shadow.surface}}>
            <span className="text-sm font-semibold" style={{color:uiTokens.color.navy}}>{Object.keys(selected).length} صنف محدّد للتسعير</span>
            <StorelyButton onClick={submitQuoteRequest} disabled={submitting} variant="primary">
              {submitting?'⏳ جاري الإرسال...':'📩 إرسال طلب التسعير'}
            </StorelyButton>
          </div>
        )}

        {orgId && (
          <StorelyCard className="min-w-0 !mt-8 rounded-[var(--radius)]" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`, overflow:'hidden'}}>
            <div className="!py-3 !px-4 text-base font-semibold" style={{borderBottom:`1px solid ${uiTokens.color.border}`, color:uiTokens.color.text}}><CircleCheck size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> تواصل مع المورد</div>
            <div className="overflow-y-auto !p-4 flex flex-col gap-2" style={{maxHeight:280, background:uiTokens.color.background}}>
              {chatMessages.length===0 ? (
                <div className="text-center text-sm !p-5" style={{color:uiTokens.color.textMuted}}>ما فيه رسائل بعد — ابدأ المحادثة</div>
              ) : chatMessages.map((m:any)=>(
                <div key={m.id} style={{alignSelf:m.sender_type==='customer'?'flex-end':'flex-start', maxWidth:'75%'}}>
                  <div className="!py-3 !px-4 rounded-[var(--radius)] text-sm break-words leading-7" style={{background:m.sender_type==='customer'?uiTokens.color.navy:uiTokens.color.surface, color:m.sender_type==='customer'?uiTokens.color.surface:uiTokens.color.text, border:m.sender_type==='customer'?'none':`1px solid ${uiTokens.color.border}`}}>
                    {m.message}
                  </div>
                  <div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted, textAlign:m.sender_type==='customer'?'left' as const:'right' as const}}>
                    {new Date(m.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 !p-3" style={{borderTop:`1px solid ${uiTokens.color.border}`}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') sendChatMessage()}} placeholder="اكتب رسالتك..." className="min-w-0 flex-1 rounded-[var(--radius-sm)] text-sm storely-input" style={{border:`1px solid ${uiTokens.color.border}`}}/>
              <StorelyButton onClick={sendChatMessage} disabled={chatSending} variant="primary">
                {chatSending?'...':'إرسال'}
              </StorelyButton>
            </div>
          </StorelyCard>
        )}

        {myRequests.length > 0 && (
          <div className="!mt-8">
            <h2 className="text-base font-semibold !mb-3" style={{color:uiTokens.color.text}}><ClipboardList size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> طلبات التسعير السابقة</h2>
            <div className="flex flex-col gap-3">
              {myRequests.map((r:any, idx:number)=>{
                const STAGES = ['pending','quoted','accepted','confirmed','fulfilled']
                const stageIdx = STAGES.indexOf(r.status)
                const orderNo = `#${String(myRequests.length - idx).padStart(3,'0')}`
                return (
                <StorelyCard key={r.id} className="min-w-0 rounded-[var(--radius)]" style={{background:uiTokens.color.surface, overflow:'hidden', border:`1px solid ${uiTokens.color.border}`, boxShadow:uiTokens.shadow.surface}}>
                  <div className="!py-3 !px-4 flex justify-between items-center flex-wrap gap-4" style={{background:uiTokens.color.background, borderBottom:`1px solid ${uiTokens.color.border}`}}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold" style={{color:uiTokens.color.text}}>{orderNo}</span>
                      <span className="text-xs" style={{color:uiTokens.color.textMuted}}>{new Date(r.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn'})}</span>
                    </div>
                    <span className="text-xs font-semibold !py-1 !px-3 rounded-[var(--radius)]" style={{background:r.status==='fulfilled'?uiTokens.color.infoBg:r.status==='confirmed'?uiTokens.color.infoBg:r.status==='accepted'?uiTokens.color.successBg:r.status==='quoted'?uiTokens.color.warningBg:uiTokens.color.background, color:r.status==='fulfilled'?uiTokens.color.info:r.status==='confirmed'?uiTokens.color.info:r.status==='accepted'?uiTokens.color.success:r.status==='quoted'?uiTokens.color.warning:uiTokens.color.textMuted}}>
                      {r.status==='fulfilled'?'📦 تم التنفيذ':r.status==='confirmed'?'🚚 جاري التوريد':r.status==='accepted'?'✅ مقبول':r.status==='quoted'?'💰 تم التسعير':'⏳ بانتظار الرد'}
                    </span>
                  </div>

                  <div className="flex items-center !pt-3 !px-4 !pb-1">
                    {STAGES.map((stg,i)=>(
                      <div key={stg} className="flex items-center" style={{flex:i<STAGES.length-1?1:0}}>
                        <div className="rounded-full shrink-0" style={{width:9, height:9, background:i<=stageIdx?uiTokens.color.navy:uiTokens.color.background}}/>
                        {i<STAGES.length-1 && <div className="min-w-0 flex-1" style={{height:2, background:i<stageIdx?uiTokens.color.navy:uiTokens.color.background}}/>}
                      </div>
                    ))}
                  </div>

                  <div className="!pt-2 !px-4 !pb-4">
                    <div className="flex flex-col gap-2 !mb-2 !mt-1">
                      {(r.items||[]).map((i:any,ii:number)=>(
                        <div key={ii} className="flex justify-between text-sm flex-wrap gap-4" style={{color:uiTokens.color.text}}>
                          <span>• {i.name}</span>
                          <span style={{color:uiTokens.color.textMuted}}>{i.qty} {i.unit||''}</span>
                        </div>
                      ))}
                    </div>

                    {(r.status==='quoted'||r.status==='accepted'||r.status==='confirmed'||r.status==='fulfilled') && (
                      <div className="rounded-[var(--radius-sm)] !py-2 !px-3 !mb-2 flex justify-between items-center flex-wrap gap-4" style={{background:uiTokens.color.surface}}>
                        <span className="text-sm font-semibold" style={{color:uiTokens.color.navy}}><Wallet size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> السعر المقترح</span>
                        <span className="text-base font-semibold" style={{color:uiTokens.color.navy}}>{r.quoted_price} ر.س</span>
                      </div>
                    )}
                    {r.quoted_note && (r.status==='quoted'||r.status==='accepted'||r.status==='confirmed'||r.status==='fulfilled') && (
                      <div className="text-xs !mb-2 !pr-0" style={{color:uiTokens.color.textMuted}}><FilePenLine size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> {r.quoted_note}</div>
                    )}
                    {(r.status==='confirmed'||r.status==='fulfilled') && r.rep_name && (
                      <div className="rounded-[var(--radius-sm)] !py-2 !px-3 !mb-2" style={{background:uiTokens.color.infoBg}}>
                        <div className="flex justify-between text-sm flex-wrap gap-4" style={{marginBottom:r.delivery_date?4:0}}>
                          <span className="font-semibold" style={{color:uiTokens.color.info}}><Truck size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> المندوب</span>
                          <span style={{color:uiTokens.color.info}}>{r.rep_name} — {r.rep_phone}</span>
                        </div>
                        {r.delivery_date && (
                          <div className="flex justify-between text-sm flex-wrap gap-4">
                            <span className="font-semibold" style={{color:uiTokens.color.info}}><CircleCheck size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> موعد التوريد</span>
                            <span style={{color:uiTokens.color.info}}>{r.delivery_date}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {r.status==='quoted' && (
                      <StorelyButton onClick={()=>acceptOffer(r.id)} className="w-full" variant="primary">

                        <CheckCircle2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> قبول العرض
                      </StorelyButton>
                    )}
                    {(r.status==='accepted'||r.status==='confirmed'||r.status==='fulfilled') && (
                      <StorelyButton onClick={()=>router.push(`/suppliers?ms=${supplierId}`)} className="w-full !mt-2" variant="secondary">

                        <Link2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> اعتماد المورد وربط منتج (توريد تلقائي عند نقص المخزون)
                      </StorelyButton>
                    )}
                    {r.status==='fulfilled' && !myReviewedIds.includes(r.id) && (
                      reviewingId===r.id ? (
                        <div className="rounded-[var(--radius-sm)] !p-3 !mt-1" style={{background:uiTokens.color.warningBg}}>
                          <div className="flex gap-2 !mb-2 justify-center">
                            {[1,2,3,4,5].map(n=>(
                              <StorelyButton key={n} onClick={()=>setReviewRating(n)} variant="secondary"><Star size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></StorelyButton>
                            ))}
                          </div>
                          <input value={reviewComment} onChange={e=>setReviewComment(e.target.value)} placeholder="تعليق (اختياري)" className="w-full rounded-[var(--radius-sm)] text-sm !mb-2 storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.warningBorder}`}}/>
                          <div className="flex flex-wrap gap-3">
                            <StorelyButton onClick={()=>submitReview(r.id)} disabled={reviewSaving} className="min-w-0 flex-1" variant="primary">
                              {reviewSaving?'...':'إرسال التقييم'}
                            </StorelyButton>
                            <StorelyButton onClick={()=>setReviewingId(null)} variant="secondary">
                              إلغاء
                            </StorelyButton>
                          </div>
                        </div>
                      ) : (
                        <StorelyButton onClick={()=>setReviewingId(r.id)} className="w-full" variant="secondary">

                          <Star size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> قيّم المورد
                        </StorelyButton>
                      )
                    )}
                  </div>
                </StorelyCard>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
