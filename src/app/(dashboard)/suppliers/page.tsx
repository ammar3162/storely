'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { colors, font, pageTitle, pageSub, card, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
export const dynamic = 'force-dynamic'

const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']

const NOTIFY_OPTS = [
  { id:'instant', icon:'⚡', label:'فوري',    desc:'عند كل صرف مباشرة' },
  { id:'daily',   icon:'📅', label:'يومي',    desc:'مرة يومياً' },
  { id:'weekly',  icon:'📆', label:'أسبوعي',  desc:'مرة أسبوعياً' },
]

function UpgradeBlock() {
  const router = useRouter()
  return (
    <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{textAlign:'center',maxWidth:400}}>
        <div style={{fontSize:64,marginBottom:16}}>🔒</div>
        <h2 style={{fontSize:22,fontWeight:900,color:'#0f172a',marginBottom:8}}>هذه الميزة غير متاحة في باقتك</h2>
        <p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:24}}>
          إدارة الموردين متاحة في الباقة المتوسطة وما فوق.
        </p>
        <button onClick={()=>router.push('/settings')}
          style={{padding:'14px 32px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
          ترقية الباقة ←
        </button>
      </div>
    </div>
  )
}

function NotifyBadge({ mode, time, day }: { mode:string; time:string; day:number }) {
  const opt = NOTIFY_OPTS.find(o=>o.id===mode)
  if (mode==='instant') return <span style={{fontSize:11,background:'#fef3c7',color:'#92400e',border:'1px solid #fcd34d',borderRadius:20,padding:'2px 8px',fontWeight:700}}>⚡ فوري</span>
  if (mode==='daily') return <span style={{fontSize:11,background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',borderRadius:20,padding:'2px 8px',fontWeight:700}}>📅 يومي {time}</span>
  return <span style={{fontSize:11,background:'#f5f3ff',color:'#6d28d9',border:'1px solid #ddd6fe',borderRadius:20,padding:'2px 8px',fontWeight:700}}>📆 {DAYS[day]} {time}</span>
}

function SupplierCard({ s, products, orgId, onRefresh }: any) {
  const [open, setOpen]           = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mode, setMode]           = useState(s.notify_mode || 'daily')
  const [time, setTime]           = useState(s.notify_time || '08:00')
  const [day, setDay]             = useState(String(s.notify_day ?? 0))
  const [saving, setSaving]       = useState(false)
  const [sending, setSending]     = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [reorderPoint, setReorderPoint]       = useState('')
  const [orderQty, setOrderQty]               = useState('')
  const [supplierNotes, setSupplierNotes]     = useState('')
  const sb = createClient()

  const linked   = products.filter((p:any) => p.supplier_id === s.id)
  const unlinked = products.filter((p:any) => p.supplier_id !== s.id && (!productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase())))

  async function saveSettings() {
    setSaving(true)
    await (sb as any).from('suppliers').update({
      notify_mode: mode,
      notify_time: time,
      notify_day: Number(day),
    }).eq('id', s.id)
    setSaving(false)
    setSettingsOpen(false)
    toast('✅ تم حفظ إعدادات المورد')
    onRefresh()
  }

  async function sendNow() {
    setSending(true)
    const res = await fetch('/api/notify-supplier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, supplier_id: s.id, manual: true })
    })
    const data = await res.json()
    setSending(false)
    if (data.sent > 0) toast(`✅ تم إرسال طلب توريد للمورد ${s.name}`)
    else toast('لا توجد منتجات تحتاج طلب توريد الآن', 'warning')
  }

  async function linkProduct() {
    if (!selectedProduct || !reorderPoint) { toast('اختر منتج وأدخل الحد الأدنى', 'warning'); return }
    await (sb as any).from('products').update({
      supplier_id: s.id,
      supplier_reorder_point: Number(reorderPoint),
      supplier_order_qty: Number(orderQty) || Number(reorderPoint),
      supplier_notes: supplierNotes.trim() || null,
    }).eq('id', selectedProduct)
    toast('✅ تم ربط المنتج')
    setSelectedProduct(''); setReorderPoint(''); setOrderQty(''); setSupplierNotes('')
    onRefresh()
  }

  async function unlinkProduct(pid: string) {
    await (sb as any).from('products').update({ supplier_id: null, supplier_reorder_point: null, supplier_order_qty: 0, supplier_notes: null }).eq('id', pid)
    toast('تم فك الارتباط')
    onRefresh()
  }

  async function deleteSupplier() {
    if (!confirm(`حذف المورد "${s.name}"؟`)) return
    await (sb as any).from('products').update({ supplier_id: null, supplier_reorder_point: null, supplier_order_qty: 0 }).eq('supplier_id', s.id)
    await (sb as any).from('suppliers').delete().eq('id', s.id)
    toast('تم الحذف')
    onRefresh()
  }

  return (
    <div style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:16, overflow:'hidden', transition:'box-shadow .2s' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer', flex:1 }} onClick={()=>setOpen(o=>!o)}>
          <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#0f172a,#1e293b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'white', flexShrink:0 }}>
            {s.name[0]}
          </div>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>{s.name}</div>
              {linked.length>0 && <span style={{fontSize:11,fontWeight:700,background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:20,padding:'2px 8px'}}>{linked.length} منتج مرتبط</span>}
              {linked.length===0 && <span style={{fontSize:11,fontWeight:700,background:'#fef3c7',color:'#92400e',border:'1px solid #fcd34d',borderRadius:20,padding:'2px 8px'}}>⚠️ لا منتجات مرتبطة</span>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3, flexWrap:'wrap' as const }}>
              <span style={{ fontSize:12, color:'#64748b' }}>{s.phone}</span>
              <span style={{ fontSize:12, color:'#94a3b8' }}>·</span>
              <span style={{ fontSize:12, color:'#64748b' }}>{linked.length} منتج</span>
              <NotifyBadge mode={s.notify_mode||'daily'} time={s.notify_time||'08:00'} day={s.notify_day??0} />
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          <button onClick={sendNow} disabled={sending}
            style={{ background:'#f0fdf4', color:'#16a34a', border:'1.5px solid #bbf7d0', borderRadius:9, padding:'7px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            {sending ? '...' : '📤'}
          </button>
          <button onClick={()=>setSettingsOpen(o=>!o)}
            style={{ background: settingsOpen?'#0f172a':'#f8fafc', color:settingsOpen?'white':'#475569', border:'1.5px solid #e2e8f0', borderRadius:9, padding:'7px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            ⚙️
          </button>
          <button onClick={deleteSupplier}
            style={{ background:'#fef2f2', color:'#ef4444', border:'1.5px solid #fecaca', borderRadius:9, padding:'7px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            🗑️
          </button>
          <span style={{ color:'#94a3b8', fontSize:16, transform:open?'rotate(180deg)':'none', transition:'transform .2s', cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>⌄</span>
        </div>
      </div>

      {/* إعدادات الإشعارات */}
      {settingsOpen && (
        <div style={{ borderTop:'1.5px solid #f1f5f9', padding:'18px 20px', background:'#fafafa' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14 }}>🔔 إعدادات الإشعار لهذا المورد</div>
          
          {/* اختيار النوع */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
            {NOTIFY_OPTS.map(opt=>(
              <div key={opt.id} onClick={()=>setMode(opt.id)}
                style={{ border:`2px solid ${mode===opt.id?'#0f172a':'#e2e8f0'}`, background:mode===opt.id?'#0f172a':'white', borderRadius:10, padding:'12px', cursor:'pointer', textAlign:'center' as const, transition:'all .15s' }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{opt.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:mode===opt.id?'white':'#0f172a' }}>{opt.label}</div>
                <div style={{ fontSize:10, color:mode===opt.id?'rgba(255,255,255,.6)':'#94a3b8', marginTop:2 }}>{opt.desc}</div>
              </div>
            ))}
          </div>

          {/* الوقت */}
          {mode !== 'instant' && (
            <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' as const }}>
              {mode === 'weekly' && (
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:5, fontWeight:600 }}>اليوم</label>
                  <select value={day} onChange={e=>setDay(e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, fontFamily:'inherit', background:'white', color:'#0f172a', outline:'none' }}>
                    {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}
              <div style={{ flex:1 }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:5, fontWeight:600 }}>الوقت</label>
                <input type="time" value={time} onChange={e=>setTime(e.target.value)}
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, fontFamily:'inherit', background:'white', color:'#0f172a', outline:'none' }} />
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={saveSettings} disabled={saving}
              style={{ ...btnPrimary, padding:'10px 20px', fontSize:13 }}>
              {saving ? 'جاري الحفظ...' : '💾 حفظ'}
            </button>
            <button onClick={()=>setSettingsOpen(false)}
              style={{ ...btnSecondary, padding:'10px 20px', fontSize:13 }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* المنتجات */}
      {open && (
        <div style={{ borderTop:'1.5px solid #f1f5f9', padding:'16px 20px' }}>
          
          {/* المنتجات المرتبطة */}
          {linked.length > 0 && (
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', marginBottom:10, textTransform:'uppercase' as const, letterSpacing:'.06em' }}>المنتجات المرتبطة</div>
              <div style={{ display:'flex', flexDirection:'column' as const, gap:8 }}>
                {linked.length===0 && <div style={{textAlign:'center',padding:'20px',color:'#94a3b8',fontSize:13}}>لا توجد منتجات مرتبطة — أضف منتجاً من الأسفل</div>}
              {linked.map((p:any)=>(
                  <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:'#f8fafc', borderRadius:10, border:'1px solid #f1f5f9' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{p.name}</span>
                        {p.qty <= p.supplier_reorder_point && (
                          <span style={{ fontSize:10, background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', borderRadius:20, padding:'1px 7px', fontWeight:700 }}>⚠️ ناقص</span>
                        )}
                      </div>
                      {p.supplier_notes && <div style={{ fontSize:11, color:'#16a34a', marginTop:3 }}>📝 {p.supplier_notes}</div>}
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>
                        المتاح: <b style={{color:'#0f172a'}}>{p.qty} {p.unit}</b> · يُطلب عند: <b style={{color:'#0f172a'}}>{p.supplier_reorder_point}</b> · كمية الطلب: <b style={{color:'#16a34a'}}>{p.supplier_order_qty}</b>
                      </div>
                    </div>
                    <button onClick={()=>unlinkProduct(p.id)}
                      style={{ background:'none', border:'1.5px solid #e2e8f0', color:'#94a3b8', borderRadius:8, padding:'5px 10px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginRight:8 }}>
                      فك
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ربط منتج جديد */}
          {unlinked.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', marginBottom:10, textTransform:'uppercase' as const, letterSpacing:'.06em' }}>ربط منتج جديد</div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:8, marginBottom:8 }}>
                <div>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>المنتج</label>
                  <div style={{border:'1.5px solid #e2e8f0',borderRadius:10,overflow:'hidden',background:'white'}}>
                    <input
                      value={productSearch}
                      onChange={e=>setProductSearch(e.target.value)}
                      placeholder="🔍 ابحث..."
                      style={{width:'100%',padding:'8px 12px',border:'none',borderBottom:'1px solid #f1f5f9',fontSize:12,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f8fafc'}}
                    />
                    <select value={selectedProduct} onChange={e=>setSelectedProduct(e.target.value)}
                      size={5}
                      style={{width:'100%',border:'none',fontSize:13,fontFamily:'inherit',background:'white',color:'#0f172a',outline:'none',padding:'4px 0'}}>
                      <option value="">— اختر —</option>
                      {unlinked.filter((p:any)=>!productSearch||p.name.includes(productSearch)).map((p:any)=>(
                        <option key={p.id} value={p.id}>{p.name} ({p.qty} {p.unit})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>يُطلب عند</label>
                  <input type="number" value={reorderPoint} onChange={e=>setReorderPoint(e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }} placeholder="5" />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>كمية الطلب</label>
                  <input type="number" value={orderQty} onChange={e=>setOrderQty(e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }} placeholder="20" />
                </div>
              </div>
              <input value={supplierNotes} onChange={e=>setSupplierNotes(e.target.value)}
                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', marginBottom:8, boxSizing:'border-box' as const }} 
                placeholder="📝 ملاحظات لهذا المنتج — مثال: يرجى التوريد مبرداً (اختياري)" />
              <button onClick={linkProduct} disabled={!selectedProduct}
                style={{ ...btnPrimary, padding:'10px 20px', fontSize:13, opacity:!selectedProduct?.5:1, cursor:!selectedProduct?'not-allowed':'pointer' }}>
                ربط المنتج
              </button>
            </div>
          )}

          {unlinked.length === 0 && linked.length === 0 && (
            <div style={{ textAlign:'center', padding:'24px', color:'#94a3b8', fontSize:13 }}>لا توجد منتجات متاحة للربط</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SuppliersPage() {
  const [maxSuppliers, setMaxSuppliers] = useState<number>(999)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts]   = useState<any[]>([])
  const [orgId, setOrgId]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newPhone, setNewPhone]   = useState('')
  const [supCountry, setSupCountry] = useState(()=>sessionStorage.getItem('s_country_code')||'+966')
  const [newNotes, setNewNotes]   = useState('')
  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return
    setOrgId(profile.org_id)
    const { data: orgLimits } = await (sb as any).from('organizations').select('max_suppliers').eq('id', profile.org_id).single()
    setMaxSuppliers((orgLimits as any)?.max_suppliers || 999)
    await Promise.all([loadSuppliers(profile.org_id), loadProducts(profile.org_id)])
    setLoading(false)
  }

  async function loadSuppliers(oid: string) {
    const { data } = await (sb as any).from('suppliers').select('*').eq('org_id', oid).order('created_at', { ascending: false })
    setSuppliers(data || [])
  }

  async function loadProducts(oid: string) {
    const { data } = await (sb as any).from('products').select('id,name,unit,qty,supplier_id,supplier_reorder_point,supplier_order_qty,supplier_notes').eq('org_id', oid).eq('is_active', true).order('name')
    setProducts(data || [])
  }

  async function addSupplier() {
    if (suppliers.length >= maxSuppliers) { toast(`باقتك تسمح بـ ${maxSuppliers} موردين فقط`, 'warning'); return }
    if (!newName.trim() || !newPhone.trim()) { toast('أدخل اسم المورد ورقمه', 'warning'); return }
    const phoneRules2: Record<string,number> = {'+966':9,'+971':9,'+965':8,'+973':8,'+974':8,'+968':8,'+20':10,'+962':9,'+1':10,'+44':10,'+91':10,'+92':10}
    const reqLen2 = phoneRules2[supCountry] || 9
    const cleanedPhone2 = newPhone.trim().replace(/^0+/,'')
    if(cleanedPhone2.length !== reqLen2){toast(`رقم الجوال يجب أن يكون ${reqLen2} أرقام`,'warning');return}
    const res = await fetch('/api/add-supplier', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, name: newName.trim(), phone: supCountry + newPhone.trim().replace(/^0+/,''), notes: newNotes.trim() })
    })
    const resData = await res.json()
    console.log('ADD SUPPLIER RESPONSE:', res.status, resData)
    const error = !res.ok ? {message: resData.error} : null
    if (error) { toast('خطأ: ' + error.message, 'error'); return }
    toast('✅ تم إضافة المورد')
    setNewName(''); setNewPhone(''); setNewNotes(''); setShowAdd(false)
    loadSuppliers(orgId)
  }

  const refresh = () => { loadSuppliers(orgId); loadProducts(orgId) }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:colors.text3, fontFamily:font.family }}>جاري التحميل...</div>

  const unlinkedProducts = products.filter((p:any)=>!p.supplier_id)

  return (
    <div style={{ fontFamily:font.family, direction:'rtl', maxWidth:900, margin:'0 auto' }}>
      <style>{`@media(max-width:640px){.add-grid{grid-template-columns:1fr!important}}`}</style>
      
      <div style={{ marginBottom:22, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={pageTitle}>الموردين</h1>
          <p style={pageSub}>اربط منتجاتك بموردين وحدد توقيت الإشعار لكل مورد</p>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{ ...btnPrimary, padding:'10px 18px', fontSize:font.sm }}>+ مورد جديد</button>
      </div>

      {/* إضافة مورد */}
      {showAdd && (
        <div style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:16, padding:20, marginBottom:18 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:14 }}>إضافة مورد جديد</div>
          <div className="add-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} style={inp()} placeholder="اسم المورد *" />
            <div style={{display:'flex',gap:8}}>
              <select value={supCountry} onChange={e=>setSupCountry(e.target.value)}
                style={{padding:'10px 8px',border:'1px solid #e2e8f0',borderRadius:8,fontFamily:'inherit',fontSize:12,background:'white',cursor:'pointer'}}>
                {[['+966','🇸🇦'],['+971','🇦🇪'],['+965','🇰🇼'],['+973','🇧🇭'],['+974','🇶🇦'],['+968','🇴🇲'],['+20','🇪🇬'],['+962','🇯🇴'],['+1','🇺🇸'],['+44','🇬🇧'],['+91','🇮🇳'],['+92','🇵🇰']].map(([code,flag])=>(
                <option key={code} value={code}>{flag} {code}</option>
              ))}
              </select>
              <input value={newPhone} onChange={e=>setNewPhone(e.target.value)} style={{...inp(),flex:1,direction:'ltr'}} placeholder={supCountry==='+966'?'5xxxxxxxx':supCountry==='+20'?'1xxxxxxxxx':'xxxxxxxxxx'} />
            </div>
          </div>
          <input value={newNotes} onChange={e=>setNewNotes(e.target.value)} style={{...inp(), width:'100%', marginBottom:14, boxSizing:'border-box' as const}} placeholder="ملاحظات عامة للمورد (اختياري)" />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={addSupplier} style={{ ...btnPrimary, padding:'10px 20px', fontSize:13 }}>حفظ المورد</button>
            <button onClick={()=>setShowAdd(false)} style={{ ...btnSecondary, padding:'10px 20px', fontSize:13 }}>إلغاء</button>
          </div>
        </div>
      )}

      {/* بنر المنتجات غير المرتبطة */}
      {unlinkedProducts.length>0 && (
        <div style={{background:'#fffbeb',border:'1.5px solid #fcd34d',borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:'#92400e'}}>{unlinkedProducts.length} منتج بدون مورد مرتبط</div>
            <div style={{fontSize:11,color:'#b45309',marginTop:2}}>اربط هذه المنتجات بموردين لتفعيل الطلبات التلقائية</div>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {unlinkedProducts.slice(0,3).map((p:any)=>(
              <span key={p.id} style={{fontSize:10,background:'#fef3c7',color:'#92400e',padding:'2px 6px',borderRadius:4,border:'1px solid #fcd34d'}}>{p.name}</span>
            ))}
            {unlinkedProducts.length>3 && <span style={{fontSize:10,color:'#92400e'}}>+{unlinkedProducts.length-3} أخرى</span>}
          </div>
        </div>
      )}

      {/* قائمة الموردين */}
      {suppliers.length === 0 ? (
        <div style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:16, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🚚</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#475569', marginBottom:6 }}>لا يوجد موردين بعد</div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>أضف أول مورد وابدأ بتتبع طلبات التوريد تلقائياً</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column' as const, gap:12 }}>
          {suppliers.map(s => (
            <SupplierCard key={s.id} s={s} products={products} orgId={orgId} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  )
}
