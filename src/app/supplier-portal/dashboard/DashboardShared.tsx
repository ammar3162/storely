'use client'
import { useState, useEffect } from 'react'
import NumberInput from '@/components/NumberInput'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { confirmDialog } from '@/components/ConfirmDialog'
import { Package, ClipboardList, MessageCircle, Bike, BarChart3, Bell, UserRound, LogOut, Pencil, Trash2, ImagePlus, Plus, Eye, EyeOff } from 'lucide-react'

type Tab = 'products' | 'orders' | 'chats' | 'reps' | 'reports' | 'activity' | 'account'

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
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f4f7f7'}}>
      <div style={{width:34,height:34,border:'3px solid #ccebe7',borderTopColor:'#0f766e',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const pendingOrdersCount = quoteRequests.filter((r:any)=>r.status==='pending').length
  const acceptedCount = quoteRequests.filter((r:any)=>r.status==='accepted').length
  const openChatsCount = Array.from(new Set(chatMessages.map((m:any)=>m.org_id))).length

  const NAV_ITEMS: {id:Tab; label:string; Icon:any; badge?:number}[] = [
    { id:'products', label:'الأصناف والأسعار', Icon:Package },
    { id:'orders', label:'الطلبات', Icon:ClipboardList, badge: (pendingOrdersCount+acceptedCount) || undefined },
    { id:'chats', label:'المحادثات', Icon:MessageCircle, badge: openChatsCount || undefined },
    { id:'reps', label:'المناديب', Icon:Bike },
    { id:'reports', label:'التقارير والفواتير', Icon:BarChart3 },
    { id:'activity', label:'الإشعارات', Icon:Bell },
    { id:'account', label:'بيانات المنشأة', Icon:UserRound },
  ]
  const PAGE_HINT: Record<Tab,string> = {
    products:'الأصناف اللي يشوفها العملاء ويطلبونها منك',
    orders:'طلبات التسعير والتوريد من عملاء ستورلي',
    chats:'رسائل العملاء لك',
    reps:'مناديب التوصيل اللي تسند لهم الطلبات',
    reports:'مبيعاتك وفواتيرك الآجلة والمسددة',
    activity:'آخر ما صار في حسابك',
    account:'اسم منشأتك وموقعها',
  }
  const activeNav = NAV_ITEMS.find(n=>n.id===activeTab)!

  const activityFeed = [
    ...quoteRequests.map((r:any)=>({
      type:'order', at: r.created_at, org: r.org_name || 'عميل',
      text: `طلب تسعير جديد من ${r.org_name || 'عميل'} (${(r.items||[]).length} صنف)`,
    })),
    ...chatMessages.filter((m:any)=>m.sender_type==='customer').map((m:any)=>({
      type:'chat', at: m.created_at, org: m.org_name || 'عميل',
      text: `رسالة من ${m.org_name || 'عميل'}: "${m.message.slice(0,40)}${m.message.length>40?'...':''}"`,
    })),
  ].sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime())

  const fulfilledRequests = quoteRequests.filter((r:any)=>r.status==='fulfilled')
  const totalRevenue = fulfilledRequests.reduce((sum:number,r:any)=>sum + (Number(r.quoted_price)||0), 0)
  const totalOrders = quoteRequests.length
  const fulfilledCount = fulfilledRequests.length

  const itemFreq: Record<string, number> = {}
  quoteRequests.forEach((r:any)=>{ (r.items||[]).forEach((it:any)=>{ itemFreq[it.name] = (itemFreq[it.name]||0) + (Number(it.qty)||1) }) })
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
  quoteRequests.forEach((r:any)=>{ if ((r.status==='confirmed'||r.status==='fulfilled') && r.rep_name) repAgg[r.rep_name] = (repAgg[r.rep_name]||0) + 1 })
  const repStats = Object.entries(repAgg).sort((a,b)=>b[1]-a[1])
  const unpaidInvoices = fulfilledRequests.filter((r:any)=>r.payment_status!=='paid')
  const paidInvoices = fulfilledRequests.filter((r:any)=>r.payment_status==='paid')
  const unpaidTotal = unpaidInvoices.reduce((sum:number,r:any)=>sum+(Number(r.quoted_price)||0),0)
  const paidTotal = paidInvoices.reduce((sum:number,r:any)=>sum+(Number(r.quoted_price)||0),0)
  const money = (n:any) => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2})

  const STATUS: Record<string,{label:string;tone:string}> = {
    pending:{label:'بانتظار سعرك',tone:'amber'}, quoted:{label:'أرسلت السعر',tone:'slate'},
    accepted:{label:'العميل وافق — أكّد التوريد',tone:'teal'}, confirmed:{label:'مجدول للتوريد',tone:'blue'},
    fulfilled:{label:'تم التوريد',tone:'green'},
  }
  const visible = profile?.is_visible!==false

  return (
    <div className="sd" dir="rtl">
      <style>{SD_CSS}</style>
      <aside className="sd-side">
        <div className="sd-brand">
          <img src="/storely-logo.png" alt="Storely"/>
          <div><b>{profile?.business_name}</b><span>{profile?.location || 'بوابة الموردين'}</span></div>
        </div>
        <nav className="sd-nav" aria-label="أقسام بوابة المورد">
          {NAV_ITEMS.map(({id,label,Icon,badge})=>(
            <button key={id} onClick={()=>router.push(TAB_PATHS[id])} className={activeTab===id?'on':''} aria-current={activeTab===id?'page':undefined}>
              <Icon size={18} strokeWidth={2}/><span>{label}</span>{badge && <em>{badge}</em>}
            </button>
          ))}
        </nav>
        <button className="sd-out" onClick={logout}><LogOut size={16}/> تسجيل الخروج</button>
      </aside>

      <main className="sd-main">
        <header className="sd-top">
          <div><h1>{activeNav.label}</h1><p>{PAGE_HINT[activeTab]}</p></div>
          <button onClick={toggleVisibility} className={'sd-vis '+(visible?'on':'off')} title="هل يظهر حسابك للعملاء في قائمة الموردين؟">
            {visible?<Eye size={16}/>:<EyeOff size={16}/>}{visible?'حسابك ظاهر للعملاء':'حسابك مخفي عن العملاء'}
          </button>
        </header>

        {(pendingOrdersCount>0 || acceptedCount>0) && activeTab!=='orders' && (
          <button className="sd-todo" onClick={()=>router.push(TAB_PATHS.orders)}>
            <ClipboardList size={18}/>
            <span>{pendingOrdersCount>0 && `${pendingOrdersCount} طلب ينتظر سعرك`}{pendingOrdersCount>0 && acceptedCount>0 && '، '}{acceptedCount>0 && `${acceptedCount} طلب وافق عليه العميل وينتظر تأكيد التوريد`}</span>
            <b>افتح الطلبات</b>
          </button>
        )}

        {activeTab==='products' && (
          <div className="sd-grid-products">
            <section className="sd-panel">
              <h2>{editingId?'تعديل الصنف':'صنف جديد'}</h2>
              <div className="sd-form">
                <label>اسم الصنف<input className="sd-in" value={name} onChange={e=>setName(e.target.value)} placeholder="مثال: حليب طازج"/></label>
                <div className="sd-row2">
                  <label>الوحدة<input className="sd-in" value={unit} onChange={e=>setUnit(e.target.value)} placeholder="لتر، كيلو، كرتون"/></label>
                  <label>السعر (ر.س)<NumberInput className="sd-in" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/></label>
                </div>
                <div className="sd-seg" role="group" aria-label="هل السعر شامل الضريبة؟">
                  <span>السعر شامل الضريبة؟</span>
                  <button type="button" className={priceIncludesVat?'on':''} onClick={()=>setPriceIncludesVat(true)}>نعم</button>
                  <button type="button" className={!priceIncludesVat?'on':''} onClick={()=>setPriceIncludesVat(false)}>لا</button>
                </div>
                {price && !priceIncludesVat && <div className="sd-note">العميل يشوف السعر بعد الضريبة: <b>{(Number(price)*1.15).toFixed(2)} ر.س</b></div>}
                <label className="sd-img">
                  {(imagePreview || existingImageUrl) ? <img src={imagePreview || existingImageUrl} alt=""/> : <ImagePlus size={20}/>}
                  <span>{imagePreview||existingImageUrl?'تغيير الصورة':'صورة الصنف (اختياري)'}</span>
                  <input type="file" accept="image/*" onChange={onPickImage} hidden/>
                </label>
                <div className="sd-actions">
                  <button className="sd-btn" onClick={saveItem} disabled={saving || !name.trim() || !price}>{saving?(uploading?'جاري رفع الصورة…':'جاري الحفظ…'):editingId?'حفظ التعديل':<><Plus size={16}/> أضف الصنف</>}</button>
                  {editingId && <button className="sd-btn ghost" onClick={resetForm}>إلغاء</button>}
                </div>
              </div>
            </section>

            <section className="sd-panel">
              <h2>أصنافك <small>{items.length}</small></h2>
              {items.length===0 ? (
                <div className="sd-empty"><Package size={28}/><b>ما أضفت أصناف للحين</b><span>أضف أصنافك وأسعارك، والعملاء يطلبون منك مباشرة.</span></div>
              ) : (
                <div className="sd-list">
                  {items.map((item:any)=>(
                    <div key={item.id} className={'sd-item'+(item.is_available?'':' off')}>
                      <div className="sd-thumb">{item.image_url ? <img src={item.image_url} alt=""/> : <Package size={20}/>}</div>
                      <div className="sd-item-main"><b>{item.name}</b><span>{item.unit || '—'}</span></div>
                      <div className="sd-price">{money(item.price)} <small>ر.س</small></div>
                      <button onClick={()=>toggleAvailable(item)} className={'sd-switch'+(item.is_available?' on':'')} role="switch" aria-checked={!!item.is_available} title={item.is_available?'متوفر — اضغط لإيقافه':'غير متوفر — اضغط لتفعيله'}><i/></button>
                      <div className="sd-icons">
                        <button onClick={()=>startEdit(item)} aria-label="تعديل"><Pencil size={15}/></button>
                        <button onClick={()=>deleteItem(item.id)} aria-label="حذف" className="danger"><Trash2 size={15}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab==='orders' && (
          <section className="sd-panel">
            <h2>الطلبات الواردة <small>{quoteRequests.length}</small></h2>
            {quoteRequests.length===0 ? (
              <div className="sd-empty"><ClipboardList size={28}/><b>ما وصلتك طلبات للحين</b><span>لما يطلب منك عميل، يوصلك الطلب هنا وعلى واتساب.</span></div>
            ) : (
              <div className="sd-orders">
                {quoteRequests.map((r:any)=>{ const st = STATUS[r.status] || {label:r.status,tone:'slate'}; return (
                  <article key={r.id} className={'sd-order t-'+st.tone}>
                    <div className="sd-order-head">
                      <b>{r.org_name || 'عميل'}</b>
                      <span className={'sd-badge t-'+st.tone}>{st.label}</span>
                    </div>
                    <ul className="sd-order-items">{(r.items||[]).map((i:any,k:number)=><li key={k}>{i.name}<span>{i.qty} {i.unit||''}</span></li>)}</ul>
                    {r.status==='accepted' ? (
                      approvingId===r.id ? (
                        <div className="sd-inline">
                          <select className="sd-in" value={selectedRepId} onChange={e=>setSelectedRepId(e.target.value)}>
                            <option value="">اختر المندوب</option>
                            {reps.map((rep:any)=>(<option key={rep.id} value={rep.id}>{rep.name} — {rep.phone}</option>))}
                          </select>
                          <input className="sd-in" type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)}/>
                          <button className="sd-btn" onClick={()=>approveDelivery(r)} disabled={approveSaving || !selectedRepId || !deliveryDate}>{approveSaving?'…':'تأكيد التوريد'}</button>
                          <button className="sd-btn ghost" onClick={()=>setApprovingId(null)}>إلغاء</button>
                          {reps.length===0 && <div className="sd-warn">أضف مندوب أول من «المناديب»</div>}
                        </div>
                      ) : (
                        <div className="sd-order-foot"><span>سعرك: <b>{money(r.quoted_price)} ر.س</b> — العميل وافق</span><button className="sd-btn" onClick={()=>startApprove(r.id)}>أكّد التوريد</button></div>
                      )
                    ) : r.status==='confirmed' ? (
                      <div className="sd-order-foot"><span>المندوب {r.rep_name} ({r.rep_phone}) · موعد التوريد {r.delivery_date}</span><button className="sd-btn" onClick={()=>markFulfilled(r.id)}>تم التوريد</button></div>
                    ) : r.status==='fulfilled' ? (
                      <div className="sd-order-foot">
                        <span>سعرك: <b>{money(r.quoted_price)} ر.س</b>{r.rep_name && ` · المندوب ${r.rep_name}`}</span>
                        {!myGivenReviewIds.includes(r.id) && (ratingCustomerId===r.id ? (
                          <span className="sd-rate">
                            {[1,2,3,4,5].map(n=>(<button key={n} onClick={()=>setCustomerRating(n)} aria-label={`${n} نجوم`} style={{opacity:n<=customerRating?1:.3}}>⭐</button>))}
                            <button className="sd-btn" onClick={()=>submitCustomerRating(r.id)} disabled={ratingSaving}>{ratingSaving?'…':'أرسل التقييم'}</button>
                            <button className="sd-btn ghost" onClick={()=>setRatingCustomerId(null)}>إلغاء</button>
                          </span>
                        ) : <button className="sd-btn ghost" onClick={()=>setRatingCustomerId(r.id)}>قيّم العميل</button>)}
                      </div>
                    ) : r.status==='quoted' ? (
                      <div className="sd-order-foot"><span>سعرك المرسل: <b>{money(r.quoted_price)} ر.س</b> — بانتظار رد العميل</span></div>
                    ) : respondingId===r.id ? (
                      <div className="sd-inline">
                        <NumberInput className="sd-in" value={respondPrice} onChange={e=>setRespondPrice(e.target.value)} placeholder="السعر الإجمالي" style={{maxWidth:150}}/>
                        <input className="sd-in" value={respondNote} onChange={e=>setRespondNote(e.target.value)} placeholder="ملاحظة للعميل (اختياري)"/>
                        <button className="sd-btn" onClick={()=>submitResponse(r.id)} disabled={respondSaving || !respondPrice}>{respondSaving?'…':'أرسل السعر'}</button>
                        <button className="sd-btn ghost" onClick={()=>setRespondingId(null)}>إلغاء</button>
                      </div>
                    ) : (
                      <div className="sd-order-foot"><span>العميل ينتظر سعرك</span><button className="sd-btn" onClick={()=>startRespond(r.id)}>أرسل سعرك</button></div>
                    )}
                  </article>
                )})}
              </div>
            )}
          </section>
        )}

        {activeTab==='chats' && (
          <section className="sd-panel">
            <h2>المحادثات</h2>
            {(() => {
              const orgIds = Array.from(new Set(chatMessages.map((m:any)=>m.org_id)))
              if (orgIds.length===0) return <div className="sd-empty"><MessageCircle size={28}/><b>ما فيه محادثات</b><span>رسائل العملاء لك تطلع هنا.</span></div>
              return (
                <div className="sd-list">
                  {orgIds.map((oid:any) => {
                    const orgMsgs = chatMessages.filter((m:any)=>m.org_id===oid)
                    const orgName = orgMsgs[orgMsgs.length-1]?.org_name || 'عميل'
                    const isOpen = openChatOrgId===oid
                    return (
                      <div key={oid} className="sd-chat">
                        <button className="sd-chat-head" onClick={()=>setOpenChatOrgId(isOpen?null:oid)} aria-expanded={isOpen}>
                          <b>{orgName}</b><span>{orgMsgs.length} رسالة</span>
                        </button>
                        {isOpen && (<>
                          <div className="sd-chat-body">
                            {orgMsgs.map((m:any)=>(<div key={m.id} className={'sd-msg '+(m.sender_type==='supplier'?'me':'them')}>{m.message}</div>))}
                          </div>
                          <div className="sd-inline" style={{padding:10,borderTop:'1px solid var(--line)'}}>
                            <input className="sd-in" value={chatReply} onChange={e=>setChatReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') sendChatReply(oid)}} placeholder="اكتب ردك…"/>
                            <button className="sd-btn" onClick={()=>sendChatReply(oid)} disabled={chatSending || !chatReply.trim()}>{chatSending?'…':'إرسال'}</button>
                          </div>
                        </>)}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </section>
        )}

        {activeTab==='reps' && (
          <div className="sd-grid-products">
            <section className="sd-panel">
              <h2>مندوب جديد</h2>
              <div className="sd-form">
                <label>اسم المندوب<input className="sd-in" value={repName} onChange={e=>setRepName(e.target.value)} placeholder="الاسم"/></label>
                <label>رقم الجوال<input className="sd-in" value={repPhone} onChange={e=>setRepPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr"/></label>
                <div className="sd-actions"><button className="sd-btn" onClick={addRep} disabled={repSaving || !repName.trim() || !repPhone.trim()}>{repSaving?'جاري الإضافة…':<><Plus size={16}/> أضف المندوب</>}</button></div>
              </div>
            </section>
            <section className="sd-panel">
              <h2>مناديبك <small>{reps.length}</small></h2>
              {reps.length===0 ? <div className="sd-empty"><Bike size={28}/><b>ما فيه مناديب</b><span>أضف مندوب عشان تسند له الطلبات وقت التوريد.</span></div> : (
                <div className="sd-list">
                  {reps.map((rep:any)=>(
                    <div key={rep.id} className="sd-item">
                      <div className="sd-thumb"><Bike size={18}/></div>
                      <div className="sd-item-main"><b>{rep.name}</b><span dir="ltr" style={{textAlign:'right'}}>{rep.phone}</span></div>
                      <div className="sd-icons"><button onClick={()=>deleteRep(rep.id)} aria-label="حذف" className="danger"><Trash2 size={15}/></button></div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab==='reports' && (<>
          <div className="sd-figs">
            <div><span>مبيعات منفّذة</span><b>{money(totalRevenue)} <small>ر.س</small></b></div>
            <div><span>كل الطلبات</span><b>{totalOrders}</b></div>
            <div><span>طلبات منفّذة</span><b>{fulfilledCount}</b></div>
            <div className="warn"><span>آجل لك عند العملاء</span><b>{money(unpaidTotal)} <small>ر.س</small></b></div>
          </div>
          <div className="sd-grid-2">
            <section className="sd-panel"><h2>أكثر الأصناف طلباً</h2>
              {topItems.length===0 ? <div className="sd-muted">ما فيه بيانات للحين</div> : <ul className="sd-rank">{topItems.map(([n,q])=>(<li key={n}><span>{n}</span><b>{q} وحدة</b></li>))}</ul>}
            </section>
            <section className="sd-panel"><h2>أكثر العملاء طلباً</h2>
              {topCustomers.length===0 ? <div className="sd-muted">ما فيه بيانات للحين</div> : <ul className="sd-rank">{topCustomers.map(([n,a])=>(<li key={n}><span>{n}</span><b>{a.count} طلب · {money(a.total)} ر.س</b></li>))}</ul>}
            </section>
          </div>
          <section className="sd-panel"><h2>التوريد حسب المندوب</h2>
            {repStats.length===0 ? <div className="sd-muted">ما فيه توريدات مسندة للحين</div> : <ul className="sd-rank">{repStats.map(([n,c])=>(<li key={n}><span>{n}</span><b>{c} توريد</b></li>))}</ul>}
          </section>
          <section className="sd-panel">
            <h2>الفواتير <small>آجلة {unpaidInvoices.length} · مسددة {paidInvoices.length} ({money(paidTotal)} ر.س)</small></h2>
            {fulfilledRequests.length===0 ? <div className="sd-muted">الفواتير تطلع هنا بعد ما تأكد توريد أي طلب.</div> : (
              <div className="sd-list">
                {fulfilledRequests.map((r:any)=>(
                  <div key={r.id} className="sd-item">
                    <div className="sd-item-main"><b>{r.org_name || 'عميل'}</b><span>{r.delivery_date || new Date(r.created_at).toLocaleDateString('ar-SA',{numberingSystem:'latn'})}</span></div>
                    <div className="sd-price">{money(r.quoted_price)} <small>ر.س</small></div>
                    <button onClick={()=>togglePaymentStatus(r.id, r.payment_status)} className={'sd-badge '+(r.payment_status==='paid'?'t-green':'t-amber')} title="اضغط لتغيير حالة السداد">{r.payment_status==='paid'?'مسددة':'آجلة'}</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>)}

        {activeTab==='activity' && (
          <section className="sd-panel">
            <h2>آخر الأحداث</h2>
            {activityFeed.length===0 ? <div className="sd-empty"><Bell size={28}/><b>ما فيه أحداث</b><span>الطلبات والرسائل الجديدة تطلع هنا.</span></div> : (
              <ol className="sd-feed">
                {activityFeed.map((ev:any,i:number)=>(
                  <li key={i}>{ev.type==='order'?<ClipboardList size={16}/>:<MessageCircle size={16}/>}<div><span>{ev.text}</span><time>{new Date(ev.at).toLocaleString('ar-SA',{numberingSystem:'latn'})}</time></div></li>
                ))}
              </ol>
            )}
          </section>
        )}

        {activeTab==='account' && (
          <section className="sd-panel" style={{maxWidth:560}}>
            <h2>بيانات المنشأة</h2>
            <div className="sd-form">
              <label>اسم المنشأة<input className="sd-in" value={accountName} onChange={e=>setAccountName(e.target.value)}/></label>
              <label>المدينة<input className="sd-in" value={accountLocation} onChange={e=>setAccountLocation(e.target.value)} placeholder="مثال: الرياض"/></label>
              <label>رقم الجوال<input className="sd-in" value={profile?.phone || ''} disabled dir="ltr"/><small>لتغيير الرقم تواصل مع الدعم</small></label>
              <label>الإيميل<input className="sd-in" value={profile?.email || ''} disabled dir="ltr"/></label>
              <div className="sd-actions"><button className="sd-btn" onClick={saveAccountInfo} disabled={accountSaving || !accountName.trim()}>{accountSaving?'جاري الحفظ…':'حفظ التعديلات'}</button></div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

// تصميم بوابة المورد: قائمة كحلية ثابتة، محتوى فاتح، وحدة ألوان ستورلي
const SD_CSS = `
.sd{--ink:#13294b;--teal:#0f766e;--teal2:#029FA2;--line:#e2ebea;--muted:#62728a;--bg:#f4f7f7;--mint:#e8f5f2;
  display:flex;min-height:100vh;background:var(--bg);font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:var(--ink)}
.sd *{box-sizing:border-box}
.sd-side{width:248px;flex-shrink:0;background:var(--ink);color:#d6e2ec;display:flex;flex-direction:column;padding:20px 14px;position:sticky;top:0;height:100vh}
.sd-brand{display:flex;gap:10px;align-items:center;padding:4px 6px 20px;border-bottom:1px solid rgba(255,255,255,.1);margin-bottom:14px}
.sd-brand img{width:40px;height:40px;border-radius:10px;background:#fff}
.sd-brand b{display:block;color:#fff;font-size:15px;line-height:1.3}.sd-brand span{font-size:12px;color:#94a8bf}
.sd-nav{display:flex;flex-direction:column;gap:3px}
.sd-nav button{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:10px;border:none;background:none;color:inherit;font:inherit;font-size:14.5px;font-weight:600;cursor:pointer;text-align:right}
.sd-nav button:hover{background:rgba(255,255,255,.06)}
.sd-nav button.on{background:#fff;color:var(--ink)}
.sd-nav button span{flex:1}
.sd-nav em{font-style:normal;background:#f59e0b;color:#13294b;font-size:12px;font-weight:800;border-radius:99px;padding:1px 8px}
.sd-out{margin-top:auto;display:flex;align-items:center;gap:8px;padding:10px 12px;border:none;background:none;color:#94a8bf;font:inherit;font-size:13.5px;cursor:pointer;border-radius:10px}
.sd-out:hover{color:#fff;background:rgba(255,255,255,.06)}
.sd-main{flex:1;min-width:0;padding:26px 32px 48px;max-width:1180px}
.sd-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.sd-top h1{font-size:25px;font-weight:700;margin:0}.sd-top p{margin:4px 0 0;color:var(--muted);font-size:14px}
.sd-vis{display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:10px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;border:1px solid}
.sd-vis.on{background:var(--mint);border-color:#b7e3dc;color:var(--teal)}.sd-vis.off{background:#fef2f2;border-color:#fecaca;color:#b91c1c}
.sd-todo{width:100%;display:flex;align-items:center;gap:10px;background:#fff8eb;border:1px solid #fde4b0;color:#92400e;border-radius:12px;padding:12px 16px;margin-bottom:18px;font:inherit;font-size:14.5px;cursor:pointer;text-align:right}
.sd-todo span{flex:1}.sd-todo b{color:var(--teal)}
.sd-panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 22px;margin-bottom:16px}
.sd-panel h2{font-size:17px;font-weight:700;margin:0 0 16px;display:flex;align-items:center;gap:8px}
.sd-panel h2 small{font-size:13px;color:var(--muted);font-weight:600}
.sd-grid-products{display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:16px;align-items:start}
.sd-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.sd-form{display:grid;gap:12px}.sd-form label{display:grid;gap:6px;font-size:13px;font-weight:700;color:#334155}.sd-form label small{font-weight:500;color:var(--muted)}
.sd-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sd-in{width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;font:inherit;font-size:14.5px;color:var(--ink);background:#fff;outline:none}
.sd-in:focus{border-color:var(--teal2);box-shadow:0 0 0 3px rgba(2,159,162,.12)}.sd-in:disabled{background:#f6f8f8;color:var(--muted)}
.sd-seg{display:flex;align-items:center;gap:6px;background:#f6f8f8;border-radius:10px;padding:6px 6px 6px 10px;font-size:13.5px;font-weight:600}
.sd-seg span{flex:1;padding-right:6px}
.sd-seg button{border:none;background:none;font:inherit;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;color:var(--muted)}
.sd-seg button.on{background:#fff;color:var(--teal);box-shadow:0 1px 3px rgba(19,41,75,.12)}
.sd-note{font-size:13px;background:var(--mint);color:var(--teal);border-radius:10px;padding:9px 12px}
.sd-img{display:flex!important;grid-auto-flow:column;align-items:center;gap:10px!important;border:1.5px dashed #cdd9d8;border-radius:12px;padding:10px 12px;cursor:pointer;color:var(--muted);font-weight:600!important}
.sd-img img{width:42px;height:42px;border-radius:8px;object-fit:cover}
.sd-actions{display:flex;gap:8px}
.sd-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 18px;border-radius:10px;border:none;background:var(--teal);color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap}
.sd-btn:disabled{opacity:.5;cursor:not-allowed}.sd-btn.ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line)}
.sd-empty{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:34px 10px;color:var(--muted)}
.sd-empty b{color:var(--ink);font-size:15.5px}.sd-empty span{font-size:13.5px;max-width:320px;line-height:1.7}
.sd-list{display:flex;flex-direction:column}
.sd-item{display:flex;align-items:center;gap:14px;padding:12px 4px;border-bottom:1px solid var(--line)}
.sd-item:last-child{border-bottom:none}.sd-item.off{opacity:.55}
.sd-thumb{width:46px;height:46px;border-radius:10px;background:var(--mint);color:var(--teal);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
.sd-thumb img{width:100%;height:100%;object-fit:cover}
.sd-item-main{flex:1;min-width:0;display:flex;flex-direction:column}.sd-item-main b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sd-item-main span{font-size:12.5px;color:var(--muted)}
.sd-price{font-weight:700;font-size:15.5px;font-variant-numeric:tabular-nums;white-space:nowrap}.sd-price small{font-size:12px;color:var(--muted);font-weight:600}
.sd-switch{width:42px;height:24px;border-radius:99px;border:none;background:#d5dddd;position:relative;cursor:pointer;flex-shrink:0;padding:0}
.sd-switch i{position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:right .15s}
.sd-switch.on{background:var(--teal2)}.sd-switch.on i{right:21px}
.sd-icons{display:flex;gap:4px}.sd-icons button{width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer}
.sd-icons button:hover{color:var(--ink)}.sd-icons button.danger:hover{color:#dc2626;border-color:#fecaca}
.sd-orders{display:grid;gap:12px}
.sd-order{border:1px solid var(--line);border-right:4px solid #cbd5e1;border-radius:12px;padding:14px 16px}
.sd-order.t-amber{border-right-color:#f59e0b}.sd-order.t-teal{border-right-color:var(--teal2)}.sd-order.t-blue{border-right-color:#3b82f6}.sd-order.t-green{border-right-color:#16a34a}
.sd-order-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.sd-order-head b{font-size:15.5px}
.sd-badge{font:inherit;font-size:12.5px;font-weight:700;padding:4px 10px;border-radius:99px;border:none;white-space:nowrap}
.sd-badge.t-amber{background:#fff4dc;color:#92400e}.sd-badge.t-slate{background:#eef2f6;color:#475569}.sd-badge.t-teal{background:var(--mint);color:var(--teal)}.sd-badge.t-blue{background:#e6efff;color:#1d4ed8}.sd-badge.t-green{background:#e3f6e9;color:#15803d}
button.sd-badge{cursor:pointer}
.sd-order-items{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.sd-order-items li{background:#f6f8f8;border-radius:8px;padding:5px 10px;font-size:13.5px;display:flex;gap:6px}.sd-order-items li span{color:var(--muted)}
.sd-order-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:14px;color:#334155}
.sd-inline{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.sd-inline .sd-in{flex:1;min-width:150px}
.sd-warn{width:100%;font-size:12.5px;color:#b45309}
.sd-rate{display:flex;align-items:center;gap:4px}.sd-rate>button:not(.sd-btn){background:none;border:none;font-size:20px;cursor:pointer;padding:0}
.sd-chat{border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:8px}
.sd-chat-head{width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:none;background:#f6f8f8;font:inherit;cursor:pointer}
.sd-chat-head span{font-size:12.5px;color:var(--muted)}
.sd-chat-body{max-height:280px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}
.sd-msg{max-width:75%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.6}
.sd-msg.me{align-self:flex-end;background:var(--teal);color:#fff}.sd-msg.them{align-self:flex-start;background:#eef2f6}
.sd-figs{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.sd-figs>div{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.sd-figs span{font-size:12.5px;color:var(--muted);font-weight:600}.sd-figs b{display:block;font-size:22px;margin-top:4px;font-variant-numeric:tabular-nums}
.sd-figs b small{font-size:12px;color:var(--muted)}.sd-figs .warn b{color:#b45309}
.sd-rank{list-style:none;margin:0;padding:0}.sd-rank li{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px}
.sd-rank li:last-child{border-bottom:none}.sd-rank b{font-weight:600;color:var(--muted);white-space:nowrap}
.sd-muted{font-size:13.5px;color:var(--muted)}
.sd-feed{list-style:none;margin:0;padding:0}.sd-feed li{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);color:var(--teal)}
.sd-feed li div{display:flex;flex-direction:column;color:var(--ink);font-size:14px}.sd-feed time{font-size:12px;color:var(--muted)}
.sd button:focus-visible,.sd a:focus-visible{outline:3px solid var(--teal2);outline-offset:2px}
@media(max-width:900px){
  .sd{flex-direction:column}
  .sd-side{width:auto;height:auto;position:sticky;top:0;z-index:20;padding:10px 12px;flex-direction:row;align-items:center;gap:10px;overflow-x:auto}
  .sd-brand{border:none;margin:0;padding:0}.sd-brand div{display:none}
  .sd-nav{flex-direction:row;gap:4px}.sd-nav button{padding:8px 10px;font-size:13px;white-space:nowrap}
  .sd-out{margin:0;padding:8px}.sd-out{font-size:0}.sd-out svg{width:18px;height:18px}
  .sd-main{padding:18px 16px 40px}
  .sd-grid-products,.sd-grid-2{grid-template-columns:1fr}.sd-figs{grid-template-columns:1fr 1fr}
}
@media(max-width:520px){.sd-row2{grid-template-columns:1fr}.sd-item{gap:10px}.sd-price{font-size:14px}}
`
