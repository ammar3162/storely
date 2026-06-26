'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { colors, font, pageTitle, pageSub, card, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
export const dynamic = 'force-dynamic'

function UpgradeBlock() {
  const router = useRouter()
  return (
    <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{textAlign:'center',maxWidth:400}}>
        <div style={{fontSize:64,marginBottom:16}}>🔒</div>
        <h2 style={{fontSize:22,fontWeight:900,color:'#0f172a',marginBottom:8}}>هذه الميزة غير متاحة في باقتك</h2>
        <p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:24}}>
          إدارة الموردين متاحة في الباقة المتوسطة وما فوق.<br/>ترقّ الآن واستفد من جميع المميزات.
        </p>
        <button onClick={()=>router.push('/settings')}
          style={{padding:'14px 32px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 6px 20px rgba(22,163,74,.3)'}}>
          ترقية الباقة ←
        </button>
      </div>
    </div>
  )
}

export default function SuppliersPage() {
  const [plan, setPlan]           = useState<string>('')
  const [maxSuppliers, setMaxSuppliers] = useState<number>(999)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts]   = useState<any[]>([])
  const [orgId, setOrgId]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newPhone, setNewPhone]   = useState('')
  const [newNotes, setNewNotes]   = useState('')
  const [expanded, setExpanded]   = useState<string|null>(null)
  const [notifyMode, setNotifyMode] = useState<'instant'|'daily'|'weekly'>('daily')
  const [notifyTime, setNotifyTime] = useState('08:00')
  const [notifyDay, setNotifyDay]   = useState('0')
  const [savingNotify, setSavingNotify] = useState(false)
  const sb = createClient()

  useEffect(()=>{ 
    const p = sessionStorage.getItem('s_plan') || 'basic'
    setPlan(p)
    async function loadLimits(){
      const{data:{user}}=await sb.auth.getUser(); if(!user) return
      const{data:profile2}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
      if(profile2?.org_id){
        const{data:orgLimits}=await (sb as any).from('organizations').select('max_suppliers').eq('id',profile2.org_id).single()
        setMaxSuppliers((orgLimits as any)?.max_suppliers||3)
      }
    }
    loadLimits()
  },[])
  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return
    setOrgId(profile.org_id)
    const { data: orgData } = await (sb as any).from('organizations').select('supplier_notify_mode,supplier_notify_time,supplier_notify_day').eq('id', profile.org_id).single()
    if (orgData) {
      if (orgData.supplier_notify_mode) setNotifyMode(orgData.supplier_notify_mode)
      if (orgData.supplier_notify_time) setNotifyTime(orgData.supplier_notify_time)
      if (orgData.supplier_notify_day !== null && orgData.supplier_notify_day !== undefined) setNotifyDay(String(orgData.supplier_notify_day))
    }
    await Promise.all([loadSuppliers(profile.org_id), loadProducts(profile.org_id)])
    setLoading(false)
  }

  async function saveNotifySettings() {
    setSavingNotify(true)
    await (sb as any).from('organizations').update({
      supplier_notify_mode: notifyMode,
      supplier_notify_time: notifyTime,
      supplier_notify_day: Number(notifyDay),
    }).eq('id', orgId)
    setSavingNotify(false)
    toast('✅ تم حفظ إعدادات الإشعارات')
  }

  async function sendNow() {
    setSavingNotify(true)
    const res = await fetch('/api/notify-supplier', { method: 'GET' })
    const data = await res.json()
    setSavingNotify(false)
    if (data.sent > 0) toast(`✅ تم إرسال ${data.sent} طلب توريد`)
    else toast('لا توجد منتجات تحتاج طلب توريد الآن', 'warning')
  }

  async function loadSuppliers(oid: string) {
    const { data } = await (sb.from('suppliers' as any) as any).select('*').eq('org_id', oid).order('created_at', { ascending: false })
    setSuppliers(data || [])
  }

  async function loadProducts(oid: string) {
    const { data } = await (sb.from('products') as any).select('id,name,unit,qty,supplier_id,supplier_reorder_point,supplier_order_qty').eq('org_id', oid).eq('is_active', true).order('name')
    setProducts(data || [])
  }

  async function addSupplier() {
    if(suppliers.length>=maxSuppliers){alert(`باقتك تسمح بـ ${maxSuppliers} موردين فقط — يرجى الترقية`);return}
    if (!newName.trim() || !newPhone.trim()) { toast('أدخل اسم المورد ورقم جواله', 'warning'); return }
    const { error } = await (sb.from('suppliers' as any) as any).insert({ org_id: orgId, name: newName.trim(), phone: newPhone.trim(), notes: newNotes.trim() })
    if (error) { toast('خطأ: ' + error.message, 'error'); return }
    toast('✅ تم إضافة المورد')
    setNewName(''); setNewPhone(''); setNewNotes(''); setShowAdd(false)
    loadSuppliers(orgId)
  }

  async function deleteSupplier(id: string) {
    if (!confirm('حذف هذا المورد؟ سيتم فك ارتباطه بالمنتجات.')) return
    await (sb.from('products') as any).update({ supplier_id: null, supplier_reorder_point: null, supplier_order_qty: 0 }).eq('supplier_id', id)
    await (sb.from('suppliers' as any) as any).delete().eq('id', id)
    toast('تم الحذف')
    loadSuppliers(orgId); loadProducts(orgId)
  }

  async function linkProduct(productId: string, supplierId: string, reorderPoint: string, orderQty: string, notes: string) {
    if (!reorderPoint || Number(reorderPoint) < 0) { toast('أدخل حد أدنى صحيح', 'warning'); return }
    const { error } = await (sb.from('products') as any).update({
      supplier_id: supplierId,
      supplier_reorder_point: Number(reorderPoint),
      supplier_order_qty: Number(orderQty) || Number(reorderPoint),
      supplier_notes: notes.trim() || null,
    }).eq('id', productId)
    if (error) { toast('خطأ: ' + error.message, 'error'); return }
    toast('✅ تم ربط المنتج بالمورد')
    loadProducts(orgId)
  }

  async function unlinkProduct(productId: string) {
    await (sb.from('products') as any).update({ supplier_id: null, supplier_reorder_point: null, supplier_order_qty: 0 }).eq('id', productId)
    toast('تم فك الارتباط')
    loadProducts(orgId)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: colors.text3, fontFamily: font.family }}>جاري التحميل...</div>

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={pageTitle}>الموردين</h1>
          <p style={pageSub}>اربط منتجاتك بموردين، وعند وصول المخزون للحد الأدنى سيُرسل طلب توريد تلقائي عبر واتساب</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ ...btnPrimary, padding: '10px 18px', fontSize: font.sm }}>+ مورد جديد</button>
      </div>

      {/* إعدادات الإشعارات */}
      <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>🔔 إعدادات إشعارات الموردين</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>متى يُرسل طلب التوريد تلقائياً للمورد؟</div>
          </div>
          <button onClick={sendNow} disabled={savingNotify}
            style={{ background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
            {savingNotify ? '...' : '📤 إرسال الآن'}
          </button>
        </div>

        {/* اختيار النوع */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {([
            { id: 'instant', icon: '⚡', title: 'فوري', desc: 'عند كل عملية صرف' },
            { id: 'daily',   icon: '📅', title: 'يومي', desc: 'مرة يومياً في وقت محدد' },
            { id: 'weekly',  icon: '📆', title: 'أسبوعي', desc: 'مرة أسبوعياً في يوم محدد' },
          ] as const).map(opt => (
            <div key={opt.id} onClick={() => setNotifyMode(opt.id)}
              style={{ border: `2px solid ${notifyMode === opt.id ? '#16a34a' : '#e2e8f0'}`, background: notifyMode === opt.id ? '#f0fdf4' : 'white', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all .2s' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: notifyMode === opt.id ? '#16a34a' : '#0f172a' }}>{opt.title}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{opt.desc}</div>
            </div>
          ))}
        </div>

        {/* الوقت */}
        {notifyMode !== 'instant' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' as const }}>
            {notifyMode === 'weekly' && (
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>اليوم</label>
                <select value={notifyDay} onChange={e => setNotifyDay(e.target.value)} style={{ ...inp(), minWidth: 130 }}>
                  {['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map((d,i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>الوقت</label>
              <input type="time" value={notifyTime} onChange={e => setNotifyTime(e.target.value)}
                style={{ ...inp(), minWidth: 120 }} />
            </div>
          </div>
        )}

        <button onClick={saveNotifySettings} disabled={savingNotify}
          style={{ ...btnPrimary, padding: '10px 24px', fontSize: 13 }}>
          {savingNotify ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
        </button>
      </div>

      {showAdd && (
        <div style={{ ...card, padding: 20, marginBottom: 18 }}>
          <div style={{ fontSize: font.md, fontWeight: 700, color: colors.text, marginBottom: 14 }}>إضافة مورد جديد</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} style={inp()} placeholder="اسم المورد" />
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} style={inp()} placeholder="رقم جوال المورد (05xxxxxxxx)" />
            <input value={newNotes} onChange={e => setNewNotes(e.target.value)} style={inp()} placeholder="ملاحظات للمورد (اختياري) — مثال: يرجى التوريد صباحاً" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addSupplier} style={{ ...btnPrimary, padding: '10px 20px', fontSize: font.sm }}>حفظ</button>
            <button onClick={() => setShowAdd(false)} style={{ ...btnSecondary, padding: '10px 20px', fontSize: font.sm }}>إلغاء</button>
          </div>
        </div>
      )}

      {suppliers.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🚚</div>
          <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.text2 }}>لا يوجد موردين بعد، أضف أول مورد لك</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {suppliers.map(s => {
            const linkedProducts = products.filter(p => p.supplier_id === s.id)
            const isOpen = expanded === s.id
            return (
              <div key={s.id} style={card}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : s.id)}>
                  <div>
                    <div style={{ fontSize: font.md, fontWeight: 700, color: colors.text }}>{s.name}</div>
                    <div style={{ fontSize: font.xs, color: colors.text3, marginTop: 2 }}>{s.phone} · {linkedProducts.length} منتج مرتبط</div>
                    {s.notes && <div style={{ fontSize: font.xs, color: colors.text3, marginTop: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 8px', display: 'inline-block' }}>📝 {s.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={(e) => { e.stopPropagation(); deleteSupplier(s.id) }} style={{ background: colors.dangerLight, color: colors.danger, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: font.xs, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>حذف</button>
                    <span style={{ color: colors.text3, fontSize: 18, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: `1px solid ${colors.border}`, padding: 18 }}>
                    <SupplierProductLinker
                      supplierId={s.id}
                      products={products}
                      onLink={linkProduct}
                      onUnlink={unlinkProduct}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SupplierProductLinker({ supplierId, products, onLink, onUnlink }: any) {
  const [selectedProduct, setSelectedProduct] = useState('')
  const [reorderPoint, setReorderPoint]       = useState('')
  const [orderQty, setOrderQty]               = useState('')
  const [supplierNotes, setSupplierNotes]     = useState('')

  const linked   = products.filter((p: any) => p.supplier_id === supplierId)
  const unlinked = products.filter((p: any) => p.supplier_id !== supplierId)

  return (
    <div>
      {linked.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: font.xs, fontWeight: 700, color: colors.text3, marginBottom: 8, textTransform: 'uppercase' }}>المنتجات المرتبطة</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {linked.map((p: any) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: colors.bg, borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: font.sm, fontWeight: 700, color: colors.text }}>{p.name}</div>
                  {p.supplier_notes && <div style={{ fontSize: font.xs, color: '#16a34a', marginTop: 2 }}>📝 {p.supplier_notes}</div>}
                  <div style={{ fontSize: font.xs, color: colors.text3, marginTop: 2 }}>
                    المتاح: {p.qty} {p.unit} · يُطلب عند: {p.supplier_reorder_point} · كمية الطلب: {p.supplier_order_qty}
                  </div>
                </div>
                <button onClick={() => onUnlink(p.id)} style={{ background: 'none', border: `1.5px solid ${colors.border2}`, color: colors.text3, borderRadius: 8, padding: '5px 10px', fontSize: font.xs, fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}>فك الارتباط</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: font.xs, fontWeight: 700, color: colors.text3, marginBottom: 8, textTransform: 'uppercase' }}>ربط منتج جديد بهذا المورد</div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: font.xs, color: colors.text3, display: 'block', marginBottom: 5 }}>المنتج</label>
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} style={inp()}>
            <option value="">— اختر —</option>
            {unlinked.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: font.xs, color: colors.text3, display: 'block', marginBottom: 5 }}>يُطلب عند</label>
          <input type="number" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} style={inp()} placeholder="مثال: 5" />
        </div>
        <div>
          <label style={{ fontSize: font.xs, color: colors.text3, display: 'block', marginBottom: 5 }}>كمية الطلب</label>
          <input type="number" value={orderQty} onChange={e => setOrderQty(e.target.value)} style={inp()} placeholder="مثال: 20" />
          <input value={supplierNotes} onChange={e => setSupplierNotes(e.target.value)} style={inp()} placeholder="ملاحظات للمورد (اختياري) — مثال: يرجى التوريد صباحاً" />
        </div>
        <button
          disabled={!selectedProduct}
          onClick={() => { onLink(selectedProduct, supplierId, reorderPoint, orderQty, supplierNotes); setSelectedProduct(''); setReorderPoint(''); setOrderQty(''); setSupplierNotes('') }}
          style={{ ...btnPrimary, padding: '11px 16px', fontSize: font.sm, opacity: !selectedProduct ? 0.5 : 1, cursor: !selectedProduct ? 'not-allowed' : 'pointer' }}>
          ربط
        </button>
      </div>
    </div>
  )
}
