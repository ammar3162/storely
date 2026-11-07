'use client'
import { StorelyButton, StorelyCard, StorelyPageHeader, StorelyMetricStrip, StorelyEmptyState, StorelyStatusBadge, StorelyFormField } from '@/components/ui'
import { Bell, CheckCircle2, LoaderCircle, Package, Pencil, Plus, Receipt, Star, Trash2, Truck, UserRound, Bike, Camera, ChartNoAxesCombined, ClipboardList, MessagesSquare, Flame, Store } from 'lucide-react'
import { storelyTokens as uiTokens } from '@/components/ui/design-tokens'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { confirmDialog } from '@/components/ConfirmDialog'

type Tab = 'products' | 'orders' | 'chats' | 'reps' | 'reports' | 'activity' | 'account'

const NAV_ICONS = { products:<Package size={18}/>, orders:<ClipboardList size={18}/>, chats:<MessagesSquare size={18}/>, reps:<Bike size={18}/>, reports:<ChartNoAxesCombined size={18}/>, activity:<Bell size={18}/>, account:<UserRound size={18}/> }

const TAB_PATHS: Record<Tab, string> = {
  products: '/supplier-portal/dashboard',
  orders: '/supplier-portal/dashboard/orders',
  chats: '/supplier-portal/dashboard/chats',
  reps: '/supplier-portal/dashboard/reps',
  reports: '/supplier-portal/dashboard/reports',
  activity: '/supplier-portal/dashboard/activity',
  account: '/supplier-portal/dashboard/account',
}

export default function SupplierDashboardShared() {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const activeTab: Tab = (Object.entries(TAB_PATHS).find(([,p])=>p===pathname)?.[0] as Tab) || 'products'
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [accountLocation, setAccountLocation] = useState('')

  const [items, setItems] = useState<any[]>([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [priceIncludesVat, setPriceIncludesVat] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [imageFile, setImageFile] = useState<File|null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [existingImageUrl, setExistingImageUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  const [quoteRequests, setQuoteRequests] = useState<any[]>([])
  const [respondingId, setRespondingId] = useState<string|null>(null)
  const [respondPrice, setRespondPrice] = useState('')
  const [respondNote, setRespondNote] = useState('')
  const [respondSaving, setRespondSaving] = useState(false)

  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [openChatOrgId, setOpenChatOrgId] = useState<string|null>(null)
  const [chatReply, setChatReply] = useState('')
  const [chatSending, setChatSending] = useState(false)

  const [reps, setReps] = useState<any[]>([])
  const [repName, setRepName] = useState('')
  const [repPhone, setRepPhone] = useState('')
  const [repSaving, setRepSaving] = useState(false)

  const sb = createClient()

  useEffect(()=>{ init() },[])

  useEffect(()=>{
    if (!profile?.id) return
    const channel = sb.channel(`supplier-updates-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests', filter: `supplier_id=eq.${profile.id}` }, () => {
        refresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `supplier_id=eq.${profile.id}` }, () => {
        refresh()
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  },[profile?.id])

  // كل بيانات لوحة المورد من /api/supplier-portal (الهوية من الجلسة)
  async function refresh() {
    const j = await api.get('/api/supplier-portal')
    if (!j.success) return null
    setItems(j.items || [])
    setQuoteRequests(j.quote_requests || [])
    setChatMessages(j.messages || [])
    setMyGivenReviewIds(j.given_review_ids || [])
    setReps(j.reps || [])
    return j
  }

  async function init() {
    const j = await refresh()
    if (!j) { window.location.href = '/supplier-portal'; return }
    setProfile(j.profile)
    setLoading(false)
  }

  const act = (action: string, data: Record<string, unknown> = {}) => api.post('/api/supplier-portal', { action, ...data })

  async function addRep() {
    if (!repName.trim() || !repPhone.trim()) return
    setRepSaving(true)
    await act('rep_add', { name: repName.trim(), phone: repPhone.trim() })
    setRepName(''); setRepPhone(''); setRepSaving(false)
    refresh()
  }

  async function deleteRep(id: string) {
    if (!(await confirmDialog({ title: 'حذف المندوب', message: 'حذف هذا المندوب؟' }))) return
    await act('rep_delete', { id })
    refresh()
  }

  async function sendChatReply(orgId: string) {
    if (!chatReply.trim()) return
    setChatSending(true)
    const r = await act('chat_reply', { org_id: orgId, message: chatReply.trim() })
    const data = r.message
    if (data) setChatMessages(prev => prev.some((m:any)=>m.id===data.id) ? prev : [...prev, data])
    setChatReply('')
    setChatSending(false)
  }

  const [myGivenReviewIds, setMyGivenReviewIds] = useState<string[]>([])
  const [ratingCustomerId, setRatingCustomerId] = useState<string|null>(null)
  const [customerRating, setCustomerRating] = useState(5)
  const [ratingSaving, setRatingSaving] = useState(false)

  async function submitCustomerRating(reqId: string) {
    setRatingSaving(true)
    const r = await act('org_review', { quote_request_id: reqId, rating: customerRating })
    setRatingSaving(false)
    if (r.success) {
      setRatingCustomerId(null); setCustomerRating(5)
      refresh()
    }
  }

  async function markFulfilled(reqId: string) {
    await act('quote_fulfill', { id: reqId })
    refresh()
  }

  async function togglePaymentStatus(reqId: string, current: string) {
    const newStatus = current==='paid' ? 'unpaid' : 'paid'
    await act('quote_payment', { id: reqId, payment_status: newStatus })
    refresh()
  }

  const [approvingId, setApprovingId] = useState<string|null>(null)
  const [selectedRepId, setSelectedRepId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [approveSaving, setApproveSaving] = useState(false)

  function startApprove(reqId: string) {
    setApprovingId(reqId); setSelectedRepId(''); setDeliveryDate('')
  }

  async function approveDelivery(req: any) {
    if (!selectedRepId || !deliveryDate) return
    const rep = reps.find((r:any)=>r.id===selectedRepId)
    if (!rep) return
    setApproveSaving(true)
    await fetch('/api/supplier-approve-delivery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote_request_id: req.id, rep_name: rep.name, rep_phone: rep.phone,
        delivery_date: deliveryDate, supplier_business_name: profile.business_name, org_id: req.org_id,
      }),
    })
    setApproveSaving(false)
    setApprovingId(null)
    refresh()
  }

  function startRespond(reqId: string) {
    setRespondingId(reqId); setRespondPrice(''); setRespondNote('')
  }

  async function submitResponse(reqId: string) {
    if (!respondPrice) return
    setRespondSaving(true)
    await act('quote_respond', { id: reqId, price: Number(respondPrice), note: respondNote.trim() || null })
    setRespondSaving(false)
    setRespondingId(null)
    refresh()
  }

  function resetForm() {
    setName(''); setUnit(''); setPrice(''); setEditingId(null); setPriceIncludesVat(true)
    setImageFile(null); setImagePreview(''); setExistingImageUrl('')
  }

  function startEdit(item: any) {
    setEditingId(item.id); setName(item.name); setUnit(item.unit||''); setPrice(String(item.price||''))
    setPriceIncludesVat(item.price_includes_vat !== false)
    setExistingImageUrl(item.image_url||''); setImageFile(null); setImagePreview('')
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function saveItem() {
    if (!name.trim() || !price) return
    setSaving(true)

    let imageUrl = existingImageUrl || null
    if (imageFile) {
      setUploading(true)
      const ext = imageFile.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`
      const { error: upErr } = await sb.storage.from('supplier-items').upload(path, imageFile, { upsert: true })
      if (!upErr) {
        const { data: pub } = sb.storage.from('supplier-items').getPublicUrl(path)
        imageUrl = pub.publicUrl
      }
      setUploading(false)
    }

    await act('item_save', { id: editingId || undefined, name: name.trim(), unit: unit.trim()||null, price: Number(price), price_includes_vat: priceIncludesVat, image_url: imageUrl })
    setSaving(false)
    resetForm()
    refresh()
  }

  async function toggleAvailable(item: any) {
    await act('item_toggle', { id: item.id })
    refresh()
  }

  async function deleteItem(id: string) {
    if (!(await confirmDialog({ title: 'حذف الصنف', message: 'حذف هذا الصنف نهائياً؟' }))) return
    await act('item_delete', { id })
    refresh()
  }

  async function toggleVisibility() {
    const newValue = !profile.is_visible
    await act('visibility', { is_visible: newValue })
    setProfile((prev:any) => ({ ...prev, is_visible: newValue }))
  }

  useEffect(()=>{
    if (profile) { setAccountName(profile.business_name || ''); setAccountLocation(profile.location || '') }
  },[profile])

  async function saveAccountInfo() {
    if (!accountName.trim()) return
    setAccountSaving(true)
    await act('account', { business_name: accountName.trim(), location: accountLocation.trim() || null })
    setProfile((prev:any) => ({ ...prev, business_name: accountName.trim(), location: accountLocation.trim() || null }))
    setAccountSaving(false)
  }

  async function logout() {
    await sb.auth.signOut()
    window.location.href = '/supplier-portal'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-[var(--storely-navy)]" style={{background:uiTokens.color.background}}>
      <LoaderCircle size={28} className="animate-spin" />

    </div>
  )

  const pendingOrdersCount = quoteRequests.filter((r:any)=>r.status==='pending').length
  const openChatsCount = Array.from(new Set(chatMessages.map((m:any)=>m.org_id))).length

  const NAV_ITEMS: {id:Tab; label:string; icon:string; badge?:number}[] = [
    { id:'products', label:'المنتجات', icon:'📦' },
    { id:'orders', label:'الطلبات', icon:'📋', badge: pendingOrdersCount || undefined },
    { id:'chats', label:'المحادثات', icon:'💬', badge: openChatsCount || undefined },
    { id:'reps', label:'المناديب', icon:'🚴' },
    { id:'reports', label:'التقارير', icon:'📊' },
    { id:'activity', label:'الإشعارات', icon:'🔔' },
    { id:'account', label:'معلومات الحساب', icon:'👤' },
  ]

  const activityFeed = [
    ...quoteRequests.map((r:any)=>({
      type:'order', at: r.created_at, org: r.org_name || 'عميل',
      text: `طلب تسعير جديد من ${r.org_name || 'عميل'} (${(r.items||[]).length} صنف)`,
    })),
    ...chatMessages.filter((m:any)=>m.sender_type==='customer').map((m:any)=>({
      type:'chat', at: m.created_at, org: m.org_name || 'عميل',
      text: `رسالة جديدة من ${m.org_name || 'عميل'}: "${m.message.slice(0,40)}${m.message.length>40?'...':''}"`,
    })),
  ].sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime())

  const fulfilledRequests = quoteRequests.filter((r:any)=>r.status==='fulfilled')
  const totalRevenue = fulfilledRequests.reduce((sum:number,r:any)=>sum + (Number(r.quoted_price)||0), 0)
  const totalOrders = quoteRequests.length
  const fulfilledCount = fulfilledRequests.length

  const itemFreq: Record<string, number> = {}
  quoteRequests.forEach((r:any)=>{
    (r.items||[]).forEach((it:any)=>{ itemFreq[it.name] = (itemFreq[it.name]||0) + (Number(it.qty)||1) })
  })
  const topItems = Object.entries(itemFreq).sort((a,b)=>b[1]-a[1]).slice(0,5)

  const customerAgg: Record<string, {count:number; total:number}> = {}
  quoteRequests.forEach((r:any)=>{
    const key = r.org_name || 'عميل'
    if (!customerAgg[key]) customerAgg[key] = { count:0, total:0 }
    customerAgg[key].count += 1
    if (r.status==='fulfilled') customerAgg[key].total += Number(r.quoted_price)||0
  })
  const topCustomers = Object.entries(customerAgg).sort((a,b)=>b[1].count-a[1].count).slice(0,5)

  const repAgg: Record<string, number> = {}
  quoteRequests.forEach((r:any)=>{
    if ((r.status==='confirmed'||r.status==='fulfilled') && r.rep_name) repAgg[r.rep_name] = (repAgg[r.rep_name]||0) + 1
  })
  const repStats = Object.entries(repAgg).sort((a,b)=>b[1]-a[1])

  const unpaidInvoices = fulfilledRequests.filter((r:any)=>r.payment_status!=='paid')
  const paidInvoices = fulfilledRequests.filter((r:any)=>r.payment_status==='paid')
  const unpaidTotal = unpaidInvoices.reduce((sum:number,r:any)=>sum+(Number(r.quoted_price)||0),0)
  const paidTotal = paidInvoices.reduce((sum:number,r:any)=>sum+(Number(r.quoted_price)||0),0)

  return (
    <div className="min-h-screen text-[var(--storely-navy)]" style={{direction:'rtl', background:uiTokens.color.background}}>
      {/* Header */}
      <div className="!p-5 sm:!px-8 flex justify-between items-center flex-wrap gap-5" style={{background:uiTokens.color.surface, borderBottom:`1px solid ${uiTokens.color.border}`}}>
        <StorelyPageHeader title={profile?.business_name} description={profile?.location || '—'} className="!mb-0 min-w-0 flex-1" />
        <div className="flex flex-wrap items-center gap-3">
          <StorelyButton onClick={toggleVisibility} className="flex flex-wrap items-center gap-3" style={{borderColor:profile?.is_visible!==false?uiTokens.color.successBorder:uiTokens.color.dangerBorder, background:uiTokens.color.surface, color:profile?.is_visible!==false?uiTokens.color.success:uiTokens.color.danger}} variant="secondary">
            <span className="rounded-full" style={{width:8, height:8, background:profile?.is_visible!==false?uiTokens.color.success:uiTokens.color.danger}}/>
            {profile?.is_visible!==false?'ظاهر للعملاء':'مخفي عن العملاء'}
          </StorelyButton>
          <StorelyButton onClick={logout} variant="secondary">خروج</StorelyButton>
        </div>
      </div>

      <div className="grid min-w-0 max-w-7xl grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] !mx-auto !p-4 sm:!p-6 gap-6 items-start">
        {/* Sidebar */}
        <div className="storely-card min-w-0 !p-3 lg:sticky lg:top-6">
          <div className="grid min-w-0 grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
            {NAV_ITEMS.map(item=>(
              <StorelyButton key={item.id} onClick={()=>router.push(TAB_PATHS[item.id])} className="!justify-between !px-3 text-start !whitespace-normal" variant={activeTab===item.id?'primary':'secondary'} aria-current={activeTab===item.id?'page':undefined}>
                <span className="flex flex-wrap items-center gap-3"><span className="inline-flex shrink-0">{NAV_ICONS[item.id]}</span>{item.label}</span>
                {item.badge && (
                  <span className="text-xs font-semibold rounded-[var(--radius)] !py-0 !px-2 text-center" style={{background:activeTab===item.id?uiTokens.color.surface:uiTokens.color.danger, color:activeTab===item.id?uiTokens.color.navy:uiTokens.color.surface, minWidth:20}}>
                    {item.badge}
                  </span>
                )}
              </StorelyButton>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 !space-y-6">

          {activeTab==='products' && (
            <>
              <StorelyCard className="min-w-0 !p-5 sm:!p-6 !mb-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}>{editingId?"تعديل صنف":"إضافة صنف جديد"}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-4 !mb-5">
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الصنف" className="rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                  <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="الوحدة (كيلو، قطعة...)" className="rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                  <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="السعر" className="rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                </div>
                <div className="flex flex-wrap items-center gap-4 !mb-5 rounded-[var(--radius-sm)] !py-2 !px-2" style={{background:uiTokens.color.background}}>
                  <span className="text-sm font-semibold" style={{color:uiTokens.color.textMuted}}>هل السعر شامل الضريبة؟</span>
                  <div className="storely-actions !ms-auto">
                    <StorelyButton onClick={()=>setPriceIncludesVat(true)} variant={priceIncludesVat?'primary':'secondary'}>نعم</StorelyButton>
                    <StorelyButton onClick={()=>setPriceIncludesVat(false)} variant={!priceIncludesVat?'primary':'secondary'}>لا</StorelyButton>
                  </div>
                </div>
                {price && !priceIncludesVat && (
                  <div className="storely-notice !mb-5" style={{color:uiTokens.color.info, background:uiTokens.color.infoBg}}>
                    السعر النهائي اللي بيشوفه العميل (بعد إضافة 15% ضريبة): <b>{(Number(price)*1.15).toFixed(2)} ر.س</b>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4 !mb-5">
                  {(imagePreview || existingImageUrl) && (
                    <img src={imagePreview || existingImageUrl} alt="" className="rounded-[var(--radius-sm)] object-cover" style={{width:48, height:48, border:`1px solid ${uiTokens.color.border}`}}/>
                  )}
                  <label className="text-sm font-semibold !py-2 !px-3 rounded-[var(--radius-sm)]" style={{color:uiTokens.color.textMuted, border:`1px dashed ${uiTokens.color.border}`, cursor:'pointer'}}>

                    <Camera size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> {imagePreview||existingImageUrl?'تغيير الصورة':'إضافة صورة (اختياري)'}
                    <input type="file" accept="image/*" onChange={onPickImage} className="hidden"/>
                  </label>
                </div>
                <div className="storely-actions">
                  <StorelyButton onClick={saveItem} disabled={saving} variant="primary">
                    {saving?(uploading?"جاري رفع الصورة...":"جاري الحفظ..."):editingId?'حفظ التعديل':'إضافة'}
                  </StorelyButton>
                  {editingId && <StorelyButton onClick={resetForm} variant="secondary">إلغاء</StorelyButton>}
                </div>
              </StorelyCard>

              <StorelyCard className="min-w-0 !p-5 sm:!p-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}>أصنافي ({items.length})</h2>
                {items.length===0 ? (
                  <StorelyEmptyState className="!border-0 !p-5" title="ما فيه أصناف مضافة بعد" />
                ) : (
                  <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {items.map((item:any)=>(
                      <StorelyCard key={item.id} className="min-w-0 rounded-[var(--radius)]" style={{border:`1px solid ${uiTokens.color.border}`, overflow:'hidden', opacity:item.is_available?1:.55, background:uiTokens.color.surface}}>
                        <div className="w-full flex items-center justify-center" style={{height:144, background:uiTokens.color.background, overflow:'hidden'}}>
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full object-cover" style={{height:'100%'}}/>
                          ) : (
                            <span className="text-[28px]"><Package size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></span>
                          )}
                        </div>
                        <div className="!p-4">
                          <div className="text-sm font-semibold whitespace-normal break-words" style={{color:uiTokens.color.text}}>{item.name}</div>
                          <div className="text-xs !mt-2" style={{color:uiTokens.color.textMuted}}>{item.unit}</div>
                          <div className="text-base font-semibold !mt-1" style={{color:uiTokens.color.navy}}>{item.price} ر.س</div>
                          <div className="flex justify-between items-center !mt-2 !pt-2 flex-wrap gap-4" style={{borderTop:`1px solid ${uiTokens.color.border}`}}>
                            <StorelyButton onClick={()=>toggleAvailable(item)} aria-label="toggle availability" className="relative !w-12 !h-10 !p-0" style={{background:item.is_available?uiTokens.color.navy:uiTokens.color.textMuted}} variant="secondary">
                              <span className="absolute rounded-full" style={{top:11, left:item.is_available?28:4, width:16, height:16, background:uiTokens.color.surface, boxShadow:uiTokens.shadow.surface}}/>
                            </StorelyButton>
                            <div className="storely-actions">
                              <StorelyButton onClick={()=>startEdit(item)} className="!size-10 !p-0" aria-label="تعديل" variant="secondary"><Pencil size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></StorelyButton>
                              <StorelyButton onClick={()=>deleteItem(item.id)} className="!size-10 !p-0" aria-label="حذف" variant="danger"><Trash2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></StorelyButton>
                            </div>
                          </div>
                        </div>
                      </StorelyCard>
                    ))}
                  </div>
                )}
              </StorelyCard>
            </>
          )}

          {activeTab==='orders' && (
            <StorelyCard className="min-w-0 !p-5 sm:!p-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
              <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}>طلبات التسعير الواردة ({quoteRequests.length})</h2>
              {quoteRequests.length===0 ? (
                <StorelyEmptyState className="!border-0 !p-5" title="ما فيه طلبات تسعير بعد" />
              ) : (
                <div className="flex flex-col gap-4">
                  {quoteRequests.map((r:any)=>(
                    <div key={r.id} className="!p-5 rounded-[var(--radius-sm)] border border-[var(--storely-border)] !space-y-4" style={{background:uiTokens.color.background}}>
                      <div className="flex justify-between items-center !mb-1 flex-wrap gap-4">
                        <span className="text-sm font-semibold" style={{color:uiTokens.color.text}}>{r.org_name || 'عميل'}</span>
                        <StorelyStatusBadge status={r.status==='fulfilled'?'success':r.status==='quoted'||r.status==='pending'?'warning':'info'}>
                          {r.status==='fulfilled'?"منفَّذ":r.status==='confirmed'?"جدولة توريد":r.status==='accepted'?"العميل وافق — بانتظار موافقتك":r.status==='quoted'?"تم الرد":"بانتظار ردك"}
                        </StorelyStatusBadge>
                      </div>
                      <div className="text-sm !mb-2" style={{color:uiTokens.color.textMuted}}>
                        {(r.items||[]).map((i:any)=>`${i.name} (${i.qty} ${i.unit||''})`).join('، ')}
                      </div>
                      {r.status==='accepted' ? (
                        approvingId===r.id ? (
                          <div className="flex flex-col gap-4">
                            <select value={selectedRepId} onChange={e=>setSelectedRepId(e.target.value)} className="rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}>
                              <option value="">اختر المندوب...</option>
                              {reps.map((rep:any)=>(<option key={rep.id} value={rep.id}>{rep.name} — {rep.phone}</option>))}
                            </select>
                            <input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} className="rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                            <div className="storely-actions">
                              <StorelyButton onClick={()=>approveDelivery(r)} disabled={approveSaving || !selectedRepId || !deliveryDate} variant="primary">
                                {approveSaving?'...':"تأكيد الموافقة"}
                              </StorelyButton>
                              <StorelyButton onClick={()=>setApprovingId(null)} variant="secondary">
                                إلغاء
                              </StorelyButton>
                            </div>
                            {reps.length===0 && <div className="storely-notice" style={{color:uiTokens.color.danger,borderColor:uiTokens.color.dangerBorder}}>{'ما فيه مناديب مضافين — روح تبويب "المناديب" وأضف واحد أول'}</div>}
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm font-semibold !mb-2" style={{color:uiTokens.color.navy}}>سعرك المرسل: {r.quoted_price} ر.س — العميل وافق عليه</div>
                            <StorelyButton onClick={()=>startApprove(r.id)} variant="secondary">

                              <Truck size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> الموافقة على التوريد
                            </StorelyButton>
                          </div>
                        )
                      ) : r.status==='confirmed' ? (
                        <div>
                          <div className="text-sm font-semibold !mb-2" style={{color:uiTokens.color.info}}>
                            المندوب: {r.rep_name} ({r.rep_phone}) — موعد التوريد: {r.delivery_date}
                          </div>
                          <StorelyButton onClick={()=>markFulfilled(r.id)} variant="secondary">

                            <Package size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> تأكيد التنفيذ (تم التوريد)
                          </StorelyButton>
                        </div>
                      ) : r.status==='fulfilled' ? (
                        <div>
                          <div className="text-sm font-semibold" style={{color:uiTokens.color.info}}>
                            سعرك المرسل: {r.quoted_price}  ر.س — تم التنفيذ <CheckCircle2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" />
                            {r.rep_name && <div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted}}>المندوب: {r.rep_name} ({r.rep_phone})</div>}
                          </div>
                          {!myGivenReviewIds.includes(r.id) && (
                            ratingCustomerId===r.id ? (
                              <div className="rounded-[var(--radius-sm)] !p-3 !mt-2" style={{background:uiTokens.color.warningBg}}>
                                <div className="flex gap-2 !mb-2 justify-center">
                                  {[1,2,3,4,5].map(n=>(
                                    <StorelyButton key={n} onClick={()=>setCustomerRating(n)} className="!size-10 !p-0" aria-label={String(n)} style={{color:uiTokens.color.navy,opacity:n<=customerRating?1:.35}} variant="secondary"><Star size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></StorelyButton>
                                  ))}
                                </div>
                                <div className="storely-actions">
                                  <StorelyButton onClick={()=>submitCustomerRating(r.id)} disabled={ratingSaving} className="min-w-0 flex-1" variant="primary">
                                    {ratingSaving?'...':'إرسال التقييم'}
                                  </StorelyButton>
                                  <StorelyButton onClick={()=>setRatingCustomerId(null)} variant="secondary">
                                    إلغاء
                                  </StorelyButton>
                                </div>
                              </div>
                            ) : (
                              <StorelyButton onClick={()=>setRatingCustomerId(r.id)} className="w-full !mt-2" variant="secondary">

                                <Star size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> قيّم العميل
                              </StorelyButton>
                            )
                          )}
                        </div>
                      ) : r.status==='quoted' ? (
                        <div className="text-sm font-semibold" style={{color:uiTokens.color.navy}}>سعرك المرسل: {r.quoted_price} ر.س</div>
                      ) : respondingId===r.id ? (
                        <div className="grid grid-cols-1 sm:grid-cols-[112px_minmax(0,1fr)_auto_auto] gap-3 items-center">
                          <input type="number" value={respondPrice} onChange={e=>setRespondPrice(e.target.value)} placeholder="السعر" className="rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{width:112, border:`1px solid ${uiTokens.color.border}`}}/>
                          <input value={respondNote} onChange={e=>setRespondNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="min-w-0 flex-1 rounded-[var(--radius-sm)] text-sm storely-input" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                          <StorelyButton onClick={()=>submitResponse(r.id)} disabled={respondSaving} variant="primary">
                            {respondSaving?'...':'إرسال'}
                          </StorelyButton>
                          <StorelyButton onClick={()=>setRespondingId(null)} variant="secondary">
                            إلغاء
                          </StorelyButton>
                        </div>
                      ) : (
                        <StorelyButton onClick={()=>startRespond(r.id)} variant="secondary">

                          <MessagesSquare size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> الرد بسعر
                        </StorelyButton>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </StorelyCard>
          )}

          {activeTab==='chats' && (
            <StorelyCard className="min-w-0 !p-5 sm:!p-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
              <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}><MessagesSquare size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> المحادثات</h2>
              {(() => {
                const orgIds = Array.from(new Set(chatMessages.map((m:any)=>m.org_id)))
                if (orgIds.length===0) return <StorelyEmptyState className="!border-0 !p-5" title="ما فيه محادثات بعد" />
                return (
                  <div className="flex flex-col gap-4">
                    {orgIds.map((oid:any) => {
                      const orgMsgs = chatMessages.filter((m:any)=>m.org_id===oid)
                      const orgName = orgMsgs[orgMsgs.length-1]?.org_name || 'عميل'
                      const isOpen = openChatOrgId===oid
                      return (
                        <div key={oid} className="rounded-[var(--radius)]" style={{border:`1px solid ${uiTokens.color.border}`, overflow:'hidden'}}>
                          <StorelyButton onClick={()=>setOpenChatOrgId(isOpen?null:oid)} className="w-full flex justify-between items-center flex-wrap gap-4" variant="secondary">
                            <span className="text-sm font-semibold" style={{color:uiTokens.color.text}}>{orgName}</span>
                            <span className="text-xs" style={{color:uiTokens.color.textMuted}}>{orgMsgs.length} رسالة {isOpen?'▲':'▼'}</span>
                          </StorelyButton>
                          {isOpen && (
                            <div>
                              <div className="overflow-y-auto !p-3 flex flex-col gap-2" style={{maxHeight:240}}>
                                {orgMsgs.map((m:any)=>(
                                  <div key={m.id} style={{alignSelf:m.sender_type==='supplier'?'flex-end':'flex-start', maxWidth:'75%'}}>
                                    <div className="!py-3 !px-4 rounded-[var(--radius)] text-sm leading-7 break-words" style={{background:m.sender_type==='supplier'?uiTokens.color.navy:uiTokens.color.background, color:m.sender_type==='supplier'?uiTokens.color.surface:uiTokens.color.text}}>
                                      {m.message}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-3 !p-4" style={{borderTop:`1px solid ${uiTokens.color.border}`}}>
                                <input value={chatReply} onChange={e=>setChatReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') sendChatReply(oid)}} placeholder="اكتب ردك..." className="min-w-0 flex-1 rounded-[var(--radius-sm)] text-sm storely-input" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                                <StorelyButton onClick={()=>sendChatReply(oid)} disabled={chatSending} variant="primary">
                                  {chatSending?'...':'إرسال'}
                                </StorelyButton>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </StorelyCard>
          )}

          {activeTab==='reps' && (
            <>
              <StorelyCard className="min-w-0 !p-5 sm:!p-6 !mb-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}><Plus size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> إضافة مندوب توصيل</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 !mb-5">
                  <input value={repName} onChange={e=>setRepName(e.target.value)} placeholder="اسم المندوب" className="rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                  <input dir="ltr" value={repPhone} onChange={e=>setRepPhone(e.target.value)} placeholder="رقم جواله" className="rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                </div>
                <StorelyButton onClick={addRep} disabled={repSaving} variant="primary">
                  {repSaving?"جاري الإضافة...":'إضافة مندوب'}
                </StorelyButton>
              </StorelyCard>

              <StorelyCard className="min-w-0 !p-5 sm:!p-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}>مناديبي ({reps.length})</h2>
                {reps.length===0 ? (
                  <StorelyEmptyState className="!border-0 !p-5" title="ما فيه مناديب مضافين بعد" />
                ) : (
                  <div className="flex flex-col gap-4">
                    {reps.map((rep:any)=>(
                      <div key={rep.id} className="flex justify-between items-center !py-2 !px-3 rounded-[var(--radius-sm)] flex-wrap gap-4" style={{background:uiTokens.color.background}}>
                        <div>
                          <span className="text-sm font-semibold" style={{color:uiTokens.color.text}}>{rep.name}</span>
                          <span className="text-sm !mr-2" style={{color:uiTokens.color.textMuted}}><bdi dir="ltr">{rep.phone}</bdi></span>
                        </div>
                        <StorelyButton onClick={()=>deleteRep(rep.id)} aria-label="حذف" className="!size-10 !p-0" variant="danger"><Trash2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></StorelyButton>
                      </div>
                    ))}
                  </div>
                )}
              </StorelyCard>
            </>
          )}

          {activeTab==='reports' && (
            <>
              <StorelyMetricStrip className="!mb-6" metrics={[
                {label:'إجمالي المبيعات (منفَّذ)',value:<>{totalRevenue.toFixed(0)} ر.س</>},
                {label:'إجمالي الطلبات',value:totalOrders},
                {label:'طلبات منفَّذة',value:fulfilledCount},
              ]} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 !mb-6">
                <StorelyCard className="min-w-0 !p-5 sm:!p-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                  <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}><Flame size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> أكثر الأصناف طلباً</h2>
                  {topItems.length===0 ? <StorelyEmptyState className="!border-0 !p-5" title="ما فيه بيانات بعد" /> : (
                    <div className="flex flex-col gap-4">
                      {topItems.map(([name,qty])=>(
                        <div key={name} className="flex justify-between text-sm flex-wrap gap-4">
                          <span className="font-semibold" style={{color:uiTokens.color.text}}>{name}</span>
                          <span style={{color:uiTokens.color.textMuted}}>{qty} وحدة</span>
                        </div>
                      ))}
                    </div>
                  )}
                </StorelyCard>
                <StorelyCard className="min-w-0 !p-5 sm:!p-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                  <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}><Store size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> أكثر العملاء طلباً</h2>
                  {topCustomers.length===0 ? <StorelyEmptyState className="!border-0 !p-5" title="ما فيه بيانات بعد" /> : (
                    <div className="flex flex-col gap-4">
                      {topCustomers.map(([name,agg])=>(
                        <div key={name} className="flex justify-between text-sm flex-wrap gap-4">
                          <span className="font-semibold" style={{color:uiTokens.color.text}}>{name}</span>
                          <span style={{color:uiTokens.color.textMuted}}>{agg.count} طلب — {agg.total.toFixed(0)} ر.س</span>
                        </div>
                      ))}
                    </div>
                  )}
                </StorelyCard>
              </div>

              <StorelyCard className="min-w-0 !p-5 sm:!p-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}><Truck size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> تقرير التوصيل حسب المندوب</h2>
                {repStats.length===0 ? <StorelyEmptyState className="!border-0 !p-5" title="ما فيه توريدات مسندة بعد" /> : (
                  <div className="flex flex-col gap-4">
                    {repStats.map(([name,count])=>(
                      <div key={name} className="flex justify-between items-center !py-2 !px-3 rounded-[var(--radius-sm)] text-sm flex-wrap gap-4" style={{background:uiTokens.color.background}}>
                        <span className="font-semibold" style={{color:uiTokens.color.text}}>{name}</span>
                        <span className="font-semibold" style={{color:uiTokens.color.navy}}>{count} توريد</span>
                      </div>
                    ))}
                  </div>
                )}
              </StorelyCard>

              <StorelyCard className="min-w-0 rounded-[var(--radius)] !p-5 !mt-4" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}><Receipt size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> الفواتير</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 !mb-6">
                  <div className="rounded-[var(--radius-sm)] !p-3" style={{background:uiTokens.color.dangerBg}}>
                    <div className="text-xs !mb-1" style={{color:uiTokens.color.textMuted}}>فواتير آجلة (لسا ما تسدّدت)</div>
                    <div className="text-lg font-semibold" style={{color:uiTokens.color.danger}}>{unpaidTotal.toFixed(0)} ر.س</div>
                    <div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted}}>{unpaidInvoices.length} فاتورة</div>
                  </div>
                  <div className="rounded-[var(--radius-sm)] !p-3" style={{background:uiTokens.color.surface}}>
                    <div className="text-xs !mb-1" style={{color:uiTokens.color.navy}}>فواتير مسدَّدة</div>
                    <div className="text-lg font-semibold" style={{color:uiTokens.color.navy}}>{paidTotal.toFixed(0)} ر.س</div>
                    <div className="text-xs !mt-0" style={{color:uiTokens.color.navy}}>{paidInvoices.length} فاتورة</div>
                  </div>
                </div>

                {fulfilledRequests.length===0 ? (
                  <StorelyEmptyState className="!border-0 !p-5" title="ما فيه فواتير بعد — تظهر هنا بعد تأكيد التنفيذ لأي طلب" />
                ) : (
                  <div className="flex flex-col gap-4">
                    {fulfilledRequests.map((r:any)=>(
                      <div key={r.id} className="flex justify-between items-center !py-2 !px-3 rounded-[var(--radius-sm)] flex-wrap gap-4" style={{background:uiTokens.color.background}}>
                        <div>
                          <div className="text-sm font-semibold" style={{color:uiTokens.color.text}}>{r.org_name || 'عميل'}</div>
                          <div className="text-xs" style={{color:uiTokens.color.textMuted}}>{r.delivery_date || new Date(r.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn'})}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-semibold" style={{color:uiTokens.color.text}}>{r.quoted_price} ر.س</span>
                          <StorelyButton onClick={()=>togglePaymentStatus(r.id, r.payment_status)} style={{background:r.payment_status==='paid'?uiTokens.color.successBg:uiTokens.color.dangerBg, color:r.payment_status==='paid'?uiTokens.color.success:uiTokens.color.danger}} variant="danger">
                            {r.payment_status==='paid'?"مسدَّدة":"آجلة"}
                          </StorelyButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </StorelyCard>
            </>
          )}

          {activeTab==='activity' && (
            <StorelyCard className="min-w-0 !p-5 sm:!p-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
              <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}><Bell size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> سجل الأحداث</h2>
              {activityFeed.length===0 ? (
                <StorelyEmptyState className="!border-0 !p-5" title="ما فيه أحداث بعد" />
              ) : (
                <div className="flex flex-col gap-4">
                  {activityFeed.map((ev:any,i:number)=>(
                    <div key={i} className="flex gap-2 items-start !py-2 !px-3 rounded-[var(--radius-sm)]" style={{background:uiTokens.color.background}}>
                      <span className="text-base">{ev.type==='order'?<ClipboardList size={18}/>:<MessagesSquare size={18}/>}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm" style={{color:uiTokens.color.text}}>{ev.text}</div>
                        <div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted}}>{new Date(ev.at).toLocaleString('ar-SA', {numberingSystem:'latn'})}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </StorelyCard>
          )}

          {activeTab==='account' && (
            <StorelyCard className="min-w-0 !p-5 sm:!p-6" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
              <h2 className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}><UserRound size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> معلومات الحساب</h2>
              <div className="flex flex-col gap-5 max-w-2xl">
                <StorelyFormField label="اسم المنشأة" htmlFor="supplier-account-name"><input id="supplier-account-name" value={accountName} onChange={e=>setAccountName(e.target.value)} className="w-full rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/></StorelyFormField>
                <StorelyFormField label="الموقع / المدينة" htmlFor="supplier-account-location"><input id="supplier-account-location" value={accountLocation} onChange={e=>setAccountLocation(e.target.value)} placeholder="مثال: صبيا" className="w-full rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/></StorelyFormField>
                <StorelyFormField label="رقم الجوال" htmlFor="supplier-account-phone" helperText="رقم الجوال مرتبط بحساب الدخول، للتواصل مع الدعم لتغييره"><input id="supplier-account-phone" dir="ltr" value={profile?.phone || ''} disabled className="w-full rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`, background:uiTokens.color.background, color:uiTokens.color.textMuted}}/></StorelyFormField>
                <StorelyButton onClick={saveAccountInfo} disabled={accountSaving} style={{alignSelf:'flex-start' as const}} variant="primary">
                  {accountSaving?"جاري الحفظ...":'حفظ التعديلات'}
                </StorelyButton>
              </div>
            </StorelyCard>
          )}

        </div>
      </div>
    </div>
  )
}
