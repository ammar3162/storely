'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Tab = 'products' | 'orders' | 'chats' | 'reps' | 'reports'

export default function SupplierDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('products')

  const [items, setItems] = useState<any[]>([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
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

  async function init() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { window.location.href = '/supplier-portal'; return }
    const { data: p } = await sb.from('supplier_profiles' as any).select('*').eq('id', user.id).single()
    if (!p) { window.location.href = '/supplier-portal'; return }
    setProfile(p)
    await loadItems(user.id)
    await loadQuoteRequests(user.id)
    await loadChatMessages(user.id)
    await loadReps(user.id)
    setLoading(false)
  }

  async function loadReps(supplierId: string) {
    const { data } = await sb.from('supplier_reps' as any)
      .select('id,name,phone').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setReps(data || [])
  }

  async function addRep() {
    if (!repName.trim() || !repPhone.trim()) return
    setRepSaving(true)
    await sb.from('supplier_reps' as any).insert({ supplier_id: profile.id, name: repName.trim(), phone: repPhone.trim() })
    setRepName(''); setRepPhone(''); setRepSaving(false)
    loadReps(profile.id)
  }

  async function deleteRep(id: string) {
    if (!confirm('حذف هذا المندوب؟')) return
    await sb.from('supplier_reps' as any).delete().eq('id', id)
    loadReps(profile.id)
  }

  async function loadChatMessages(supplierId: string) {
    const { data } = await sb.from('chat_messages' as any)
      .select('id,org_id,org_name,sender_type,message,created_at')
      .eq('supplier_id', supplierId).order('created_at', { ascending: true })
    setChatMessages(data || [])
  }

  async function sendChatReply(orgId: string) {
    if (!chatReply.trim()) return
    setChatSending(true)
    const { data } = await sb.from('chat_messages' as any).insert({
      supplier_id: profile.id, org_id: orgId,
      org_name: chatMessages.find((m:any)=>m.org_id===orgId)?.org_name || 'عميل',
      sender_type: 'supplier', message: chatReply.trim(),
    }).select().single()
    if (data) setChatMessages(prev => [...prev, data])
    setChatReply('')
    setChatSending(false)
  }

  async function loadQuoteRequests(supplierId: string) {
    const { data } = await sb.from('quote_requests' as any)
      .select('id,org_id,org_name,items,status,quoted_price,quoted_note,created_at,delivery_date,rep_name,rep_phone')
      .eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setQuoteRequests(data || [])
  }

  async function markFulfilled(reqId: string) {
    await sb.from('quote_requests' as any).update({ status: 'fulfilled' }).eq('id', reqId)
    loadQuoteRequests(profile.id)
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
    await sb.from('quote_requests' as any).update({
      status: 'confirmed', delivery_date: deliveryDate, rep_name: rep.name, rep_phone: rep.phone,
    }).eq('id', req.id)
    if (req.org_id) {
      await sb.from('notifications' as any).insert({
        org_id: req.org_id,
        title: 'مورد وافق على التوريد',
        message: `${profile.business_name} وافق على توريد طلبك — المندوب: ${rep.name} (${rep.phone}) — موعد التوريد: ${deliveryDate}`,
        type: 'supplier_order',
      })
    }
    setApproveSaving(false)
    setApprovingId(null)
    loadQuoteRequests(profile.id)
  }

  function startRespond(reqId: string) {
    setRespondingId(reqId); setRespondPrice(''); setRespondNote('')
  }

  async function submitResponse(reqId: string) {
    if (!respondPrice) return
    setRespondSaving(true)
    await sb.from('quote_requests' as any).update({
      status: 'quoted', quoted_price: Number(respondPrice), quoted_note: respondNote.trim() || null,
      responded_at: new Date().toISOString(),
    }).eq('id', reqId)
    setRespondSaving(false)
    setRespondingId(null)
    loadQuoteRequests(profile.id)
  }

  async function loadItems(supplierId: string) {
    const { data } = await sb.from('supplier_catalog_items' as any).select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setItems(data || [])
  }

  function resetForm() {
    setName(''); setUnit(''); setPrice(''); setEditingId(null)
    setImageFile(null); setImagePreview(''); setExistingImageUrl('')
  }

  function startEdit(item: any) {
    setEditingId(item.id); setName(item.name); setUnit(item.unit||''); setPrice(String(item.price||''))
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

    if (editingId) {
      await sb.from('supplier_catalog_items' as any).update({ name: name.trim(), unit: unit.trim()||null, price: Number(price), image_url: imageUrl, updated_at: new Date().toISOString() }).eq('id', editingId)
    } else {
      await sb.from('supplier_catalog_items' as any).insert({ supplier_id: profile.id, name: name.trim(), unit: unit.trim()||null, price: Number(price), image_url: imageUrl })
    }
    setSaving(false)
    resetForm()
    loadItems(profile.id)
  }

  async function toggleAvailable(item: any) {
    await sb.from('supplier_catalog_items' as any).update({ is_available: !item.is_available }).eq('id', item.id)
    loadItems(profile.id)
  }

  async function deleteItem(id: string) {
    if (!confirm('حذف هذا الصنف نهائياً؟')) return
    await sb.from('supplier_catalog_items' as any).delete().eq('id', id)
    loadItems(profile.id)
  }

  async function toggleVisibility() {
    const newValue = !profile.is_visible
    await sb.from('supplier_profiles' as any).update({ is_visible: newValue }).eq('id', profile.id)
    setProfile((prev:any) => ({ ...prev, is_visible: newValue }))
  }

  async function logout() {
    await sb.auth.signOut()
    window.location.href = '/supplier-portal'
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4'}}>
      <div style={{width:36,height:36,border:'3px solid #bbf7d0',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
  ]

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

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',minHeight:'100vh',background:'#f5f5f4'}}>
      {/* Header */}
      <div style={{background:'white',borderBottom:'1px solid #ebebea',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:'#1c1c1a'}}>{profile?.business_name}</div>
          <div style={{fontSize:12,color:'#888780'}}>{profile?.location || '—'}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={toggleVisibility}
            style={{padding:'8px 16px',borderRadius:8,border:'1px solid',borderColor:profile?.is_visible!==false?'#bbf7d0':'#fecaca',background:profile?.is_visible!==false?'#f0fdf4':'#fef2f2',fontSize:12,fontWeight:700,cursor:'pointer',color:profile?.is_visible!==false?'#16a34a':'#dc2626',display:'flex',alignItems:'center',gap:6}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:profile?.is_visible!==false?'#16a34a':'#dc2626'}}/>
            {profile?.is_visible!==false?'ظاهر للعملاء':'مخفي عن العملاء'}
          </button>
          <button onClick={logout} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #e5e5e3',background:'white',fontSize:12,fontWeight:700,cursor:'pointer',color:'#5f5e5a'}}>خروج</button>
        </div>
      </div>

      <div style={{display:'flex',maxWidth:900,margin:'0 auto',alignItems:'flex-start'}}>
        {/* Sidebar */}
        <div style={{width:180,flexShrink:0,padding:'20px 12px',position:'sticky' as const,top:0}}>
          <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
            {NAV_ITEMS.map(item=>(
              <button key={item.id} onClick={()=>setActiveTab(item.id)}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderRadius:10,border:'none',
                  background:activeTab===item.id?'#16a34a':'transparent',color:activeTab===item.id?'white':'#5f5e5a',
                  fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',textAlign:'right' as const}}>
                <span style={{display:'flex',alignItems:'center',gap:8}}><span>{item.icon}</span>{item.label}</span>
                {item.badge && (
                  <span style={{background:activeTab===item.id?'rgba(255,255,255,.25)':'#dc2626',color:'white',fontSize:10,fontWeight:800,borderRadius:20,padding:'1px 7px',minWidth:18,textAlign:'center' as const}}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,padding:'20px 20px 20px 0',minWidth:0}}>

          {activeTab==='products' && (
            <>
              <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea',marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:12}}>{editingId?'✏️ تعديل صنف':'➕ إضافة صنف جديد'}</div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:8,marginBottom:10}}>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الصنف"
                    style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e5e3',fontSize:13}}/>
                  <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="الوحدة (كيلو، قطعة...)"
                    style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e5e3',fontSize:13}}/>
                  <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="السعر"
                    style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e5e3',fontSize:13}}/>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  {(imagePreview || existingImageUrl) && (
                    <img src={imagePreview || existingImageUrl} alt="" style={{width:48,height:48,borderRadius:8,objectFit:'cover',border:'1px solid #e5e5e3'}}/>
                  )}
                  <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',padding:'8px 12px',borderRadius:8,border:'1px dashed #cbd5e1',cursor:'pointer'}}>
                    📷 {imagePreview||existingImageUrl?'تغيير الصورة':'إضافة صورة (اختياري)'}
                    <input type="file" accept="image/*" onChange={onPickImage} style={{display:'none'}}/>
                  </label>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={saveItem} disabled={saving} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#16a34a',color:'white',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                    {saving?(uploading?'⏳ جاري رفع الصورة...':'⏳ جاري الحفظ...'):editingId?'حفظ التعديل':'إضافة'}
                  </button>
                  {editingId && <button onClick={resetForm} style={{padding:'10px 20px',borderRadius:8,border:'1px solid #e5e5e3',background:'white',fontWeight:700,fontSize:13,cursor:'pointer',color:'#5f5e5a'}}>إلغاء</button>}
                </div>
              </div>

              <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea'}}>
                <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:14}}>أصنافي ({items.length})</div>
                {items.length===0 ? (
                  <div style={{fontSize:13,color:'#888780',textAlign:'center' as const,padding:20}}>ما فيه أصناف مضافة بعد</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                    {items.map((item:any)=>(
                      <div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#f5f5f4',borderRadius:10,opacity:item.is_available?1:.5}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          {item.image_url && <img src={item.image_url} alt="" style={{width:36,height:36,borderRadius:6,objectFit:'cover'}}/>}
                          <div>
                            <span style={{fontSize:13,fontWeight:700,color:'#1c1c1a'}}>{item.name}</span>
                            <span style={{fontSize:11,color:'#888780',marginRight:8}}>{item.unit}</span>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:13,fontWeight:800,color:'#16a34a'}}>{item.price} ر.س</span>
                          <button onClick={()=>toggleAvailable(item)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #e5e5e3',background:'white',fontSize:10,cursor:'pointer',color:item.is_available?'#16a34a':'#888780'}}>
                            {item.is_available?'✅ متوفر':'⏸ غير متوفر'}
                          </button>
                          <button onClick={()=>startEdit(item)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #e5e5e3',background:'white',fontSize:10,cursor:'pointer',color:'#3b82f6'}}>✏️</button>
                          <button onClick={()=>deleteItem(item.id)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #e5e5e3',background:'white',fontSize:10,cursor:'pointer',color:'#dc2626'}}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab==='orders' && (
            <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea'}}>
              <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:14}}>طلبات التسعير الواردة ({quoteRequests.length})</div>
              {quoteRequests.length===0 ? (
                <div style={{fontSize:13,color:'#888780',textAlign:'center' as const,padding:20}}>ما فيه طلبات تسعير بعد</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
                  {quoteRequests.map((r:any)=>(
                    <div key={r.id} style={{padding:'12px 14px',background:'#f5f5f4',borderRadius:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                        <span style={{fontSize:13,fontWeight:700,color:'#1c1c1a'}}>{r.org_name || 'عميل'}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,
                          background:r.status==='fulfilled'?'#dbeafe':r.status==='confirmed'?'#e0f2fe':r.status==='accepted'?'#dcfce7':r.status==='quoted'?'#fef3c7':'#f1f5f9',
                          color:r.status==='fulfilled'?'#1d4ed8':r.status==='confirmed'?'#0369a1':r.status==='accepted'?'#16a34a':r.status==='quoted'?'#92400e':'#64748b'}}>
                          {r.status==='fulfilled'?'📦 منفَّذ':r.status==='confirmed'?'🚚 جدولة توريد':r.status==='accepted'?'✅ العميل وافق — بانتظار موافقتك':r.status==='quoted'?'💬 تم الرد':'⏳ بانتظار ردك'}
                        </span>
                      </div>
                      <div style={{fontSize:12,color:'#5f5e5a',marginBottom:8}}>
                        {(r.items||[]).map((i:any)=>`${i.name} (${i.qty} ${i.unit||''})`).join('، ')}
                      </div>
                      {r.status==='accepted' ? (
                        approvingId===r.id ? (
                          <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                            <select value={selectedRepId} onChange={e=>setSelectedRepId(e.target.value)}
                              style={{padding:'7px 10px',borderRadius:6,border:'1px solid #e5e5e3',fontSize:12,fontFamily:'inherit'}}>
                              <option value="">اختر المندوب...</option>
                              {reps.map((rep:any)=>(<option key={rep.id} value={rep.id}>{rep.name} — {rep.phone}</option>))}
                            </select>
                            <input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)}
                              style={{padding:'7px 10px',borderRadius:6,border:'1px solid #e5e5e3',fontSize:12,fontFamily:'inherit'}}/>
                            <div style={{display:'flex',gap:6}}>
                              <button onClick={()=>approveDelivery(r)} disabled={approveSaving || !selectedRepId || !deliveryDate}
                                style={{padding:'7px 14px',borderRadius:6,border:'none',background:'#16a34a',color:'white',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                                {approveSaving?'...':'✅ تأكيد الموافقة'}
                              </button>
                              <button onClick={()=>setApprovingId(null)}
                                style={{padding:'7px 10px',borderRadius:6,border:'1px solid #e5e5e3',background:'white',fontSize:11,cursor:'pointer',color:'#5f5e5a'}}>
                                إلغاء
                              </button>
                            </div>
                            {reps.length===0 && <div style={{fontSize:10,color:'#dc2626'}}>ما فيه مناديب مضافين — روح تبويب "المناديب" وأضف واحد أول</div>}
                          </div>
                        ) : (
                          <div>
                            <div style={{fontSize:12,color:'#16a34a',fontWeight:700,marginBottom:8}}>سعرك المرسل: {r.quoted_price} ر.س — العميل وافق عليه</div>
                            <button onClick={()=>startApprove(r.id)}
                              style={{padding:'7px 14px',borderRadius:6,border:'none',background:'#2563eb',color:'white',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                              🚚 الموافقة على التوريد
                            </button>
                          </div>
                        )
                      ) : r.status==='confirmed' ? (
                        <div>
                          <div style={{fontSize:12,color:'#0369a1',fontWeight:700,marginBottom:8}}>
                            المندوب: {r.rep_name} ({r.rep_phone}) — موعد التوريد: {r.delivery_date}
                          </div>
                          <button onClick={()=>markFulfilled(r.id)}
                            style={{padding:'7px 14px',borderRadius:6,border:'none',background:'#2563eb',color:'white',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                            📦 تأكيد التنفيذ (تم التوريد)
                          </button>
                        </div>
                      ) : r.status==='fulfilled' ? (
                        <div style={{fontSize:12,color:'#1d4ed8',fontWeight:700}}>
                          سعرك المرسل: {r.quoted_price} ر.س — تم التنفيذ ✅
                          {r.rep_name && <div style={{fontSize:11,color:'#64748b',marginTop:2}}>المندوب: {r.rep_name} ({r.rep_phone})</div>}
                        </div>
                      ) : r.status==='quoted' ? (
                        <div style={{fontSize:12,color:'#16a34a',fontWeight:700}}>سعرك المرسل: {r.quoted_price} ر.س</div>
                      ) : respondingId===r.id ? (
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <input type="number" value={respondPrice} onChange={e=>setRespondPrice(e.target.value)} placeholder="السعر"
                            style={{width:90,padding:'7px 10px',borderRadius:6,border:'1px solid #e5e5e3',fontSize:12}}/>
                          <input value={respondNote} onChange={e=>setRespondNote(e.target.value)} placeholder="ملاحظة (اختياري)"
                            style={{flex:1,padding:'7px 10px',borderRadius:6,border:'1px solid #e5e5e3',fontSize:12}}/>
                          <button onClick={()=>submitResponse(r.id)} disabled={respondSaving}
                            style={{padding:'7px 14px',borderRadius:6,border:'none',background:'#16a34a',color:'white',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                            {respondSaving?'...':'إرسال'}
                          </button>
                          <button onClick={()=>setRespondingId(null)}
                            style={{padding:'7px 10px',borderRadius:6,border:'1px solid #e5e5e3',background:'white',fontSize:11,cursor:'pointer',color:'#5f5e5a'}}>
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button onClick={()=>startRespond(r.id)}
                          style={{padding:'7px 14px',borderRadius:6,border:'1px solid #16a34a',background:'white',color:'#16a34a',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                          💬 الرد بسعر
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab==='chats' && (
            <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea'}}>
              <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:14}}>💬 المحادثات</div>
              {(() => {
                const orgIds = Array.from(new Set(chatMessages.map((m:any)=>m.org_id)))
                if (orgIds.length===0) return <div style={{fontSize:13,color:'#888780',textAlign:'center' as const,padding:20}}>ما فيه محادثات بعد</div>
                return (
                  <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                    {orgIds.map((oid:any) => {
                      const orgMsgs = chatMessages.filter((m:any)=>m.org_id===oid)
                      const orgName = orgMsgs[orgMsgs.length-1]?.org_name || 'عميل'
                      const isOpen = openChatOrgId===oid
                      return (
                        <div key={oid} style={{border:'1px solid #e5e5e3',borderRadius:12,overflow:'hidden'}}>
                          <button onClick={()=>setOpenChatOrgId(isOpen?null:oid)}
                            style={{width:'100%',padding:'12px 14px',background:'#f5f5f4',border:'none',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',fontFamily:'inherit'}}>
                            <span style={{fontSize:13,fontWeight:700,color:'#1c1c1a'}}>{orgName}</span>
                            <span style={{fontSize:11,color:'#888780'}}>{orgMsgs.length} رسالة {isOpen?'▲':'▼'}</span>
                          </button>
                          {isOpen && (
                            <div>
                              <div style={{maxHeight:240,overflowY:'auto' as const,padding:14,display:'flex',flexDirection:'column' as const,gap:8}}>
                                {orgMsgs.map((m:any)=>(
                                  <div key={m.id} style={{alignSelf:m.sender_type==='supplier'?'flex-end':'flex-start',maxWidth:'75%'}}>
                                    <div style={{padding:'8px 12px',borderRadius:12,fontSize:13,background:m.sender_type==='supplier'?'#16a34a':'#f1f5f9',color:m.sender_type==='supplier'?'white':'#1c1c1a'}}>
                                      {m.message}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div style={{display:'flex',gap:6,padding:10,borderTop:'1px solid #f1f5f9'}}>
                                <input value={chatReply} onChange={e=>setChatReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') sendChatReply(oid)}}
                                  placeholder="اكتب ردك..." style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid #e5e5e3',fontSize:12,fontFamily:'inherit'}}/>
                                <button onClick={()=>sendChatReply(oid)} disabled={chatSending}
                                  style={{padding:'8px 16px',background:'#16a34a',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                                  {chatSending?'...':'إرسال'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          {activeTab==='reps' && (
            <>
              <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea',marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:12}}>➕ إضافة مندوب توصيل</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                  <input value={repName} onChange={e=>setRepName(e.target.value)} placeholder="اسم المندوب"
                    style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e5e3',fontSize:13}}/>
                  <input value={repPhone} onChange={e=>setRepPhone(e.target.value)} placeholder="رقم جواله"
                    style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e5e3',fontSize:13}}/>
                </div>
                <button onClick={addRep} disabled={repSaving} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#16a34a',color:'white',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                  {repSaving?'⏳ جاري الإضافة...':'إضافة مندوب'}
                </button>
              </div>

              <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea'}}>
                <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:14}}>مناديبي ({reps.length})</div>
                {reps.length===0 ? (
                  <div style={{fontSize:13,color:'#888780',textAlign:'center' as const,padding:20}}>ما فيه مناديب مضافين بعد</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                    {reps.map((rep:any)=>(
                      <div key={rep.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#f5f5f4',borderRadius:10}}>
                        <div>
                          <span style={{fontSize:13,fontWeight:700,color:'#1c1c1a'}}>{rep.name}</span>
                          <span style={{fontSize:12,color:'#888780',marginRight:10}}>{rep.phone}</span>
                        </div>
                        <button onClick={()=>deleteRep(rep.id)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #e5e5e3',background:'white',fontSize:10,cursor:'pointer',color:'#dc2626'}}>🗑️</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab==='reports' && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
                <div style={{background:'white',borderRadius:16,padding:18,border:'1px solid #ebebea'}}>
                  <div style={{fontSize:11,color:'#888780',marginBottom:6}}>إجمالي المبيعات (منفَّذ)</div>
                  <div style={{fontSize:22,fontWeight:900,color:'#16a34a'}}>{totalRevenue.toFixed(0)} ر.س</div>
                </div>
                <div style={{background:'white',borderRadius:16,padding:18,border:'1px solid #ebebea'}}>
                  <div style={{fontSize:11,color:'#888780',marginBottom:6}}>إجمالي الطلبات</div>
                  <div style={{fontSize:22,fontWeight:900,color:'#1c1c1a'}}>{totalOrders}</div>
                </div>
                <div style={{background:'white',borderRadius:16,padding:18,border:'1px solid #ebebea'}}>
                  <div style={{fontSize:11,color:'#888780',marginBottom:6}}>طلبات منفَّذة</div>
                  <div style={{fontSize:22,fontWeight:900,color:'#2563eb'}}>{fulfilledCount}</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea'}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#1c1c1a',marginBottom:12}}>🔥 أكثر الأصناف طلباً</div>
                  {topItems.length===0 ? <div style={{fontSize:12,color:'#888780'}}>ما فيه بيانات بعد</div> : (
                    <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                      {topItems.map(([name,qty])=>(
                        <div key={name} style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                          <span style={{color:'#1c1c1a',fontWeight:700}}>{name}</span>
                          <span style={{color:'#888780'}}>{qty} وحدة</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea'}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#1c1c1a',marginBottom:12}}>🏪 أكثر العملاء طلباً</div>
                  {topCustomers.length===0 ? <div style={{fontSize:12,color:'#888780'}}>ما فيه بيانات بعد</div> : (
                    <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                      {topCustomers.map(([name,agg])=>(
                        <div key={name} style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                          <span style={{color:'#1c1c1a',fontWeight:700}}>{name}</span>
                          <span style={{color:'#888780'}}>{agg.count} طلب — {agg.total.toFixed(0)} ر.س</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea'}}>
                <div style={{fontSize:14,fontWeight:800,color:'#1c1c1a',marginBottom:12}}>🚚 تقرير التوصيل حسب المندوب</div>
                {repStats.length===0 ? <div style={{fontSize:12,color:'#888780'}}>ما فيه توريدات مسندة بعد</div> : (
                  <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                    {repStats.map(([name,count])=>(
                      <div key={name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#f5f5f4',borderRadius:8,fontSize:12}}>
                        <span style={{color:'#1c1c1a',fontWeight:700}}>{name}</span>
                        <span style={{color:'#16a34a',fontWeight:700}}>{count} توريد</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
