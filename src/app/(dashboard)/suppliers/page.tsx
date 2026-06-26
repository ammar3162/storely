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
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts]   = useState<any[]>([])
  const [orgId, setOrgId]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newPhone, setNewPhone]   = useState('')
  const [expanded, setExpanded]   = useState<string|null>(null)
  const sb = createClient()

  useEffect(()=>{ 
    const p = sessionStorage.getItem('s_plan') || 'basic'
    setPlan(p)
  },[])
  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return
    setOrgId(profile.org_id)
    await Promise.all([loadSuppliers(profile.org_id), loadProducts(profile.org_id)])
    setLoading(false)
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
    if (!newName.trim() || !newPhone.trim()) { toast('أدخل اسم المورد ورقم جواله', 'warning'); return }
    const { error } = await (sb.from('suppliers' as any) as any).insert({ org_id: orgId, name: newName.trim(), phone: newPhone.trim() })
    if (error) { toast('خطأ: ' + error.message, 'error'); return }
    toast('✅ تم إضافة المورد')
    setNewName(''); setNewPhone(''); setShowAdd(false)
    loadSuppliers(orgId)
  }

  async function deleteSupplier(id: string) {
    if (!confirm('حذف هذا المورد؟ سيتم فك ارتباطه بالمنتجات.')) return
    await (sb.from('products') as any).update({ supplier_id: null, supplier_reorder_point: null, supplier_order_qty: 0 }).eq('supplier_id', id)
    await (sb.from('suppliers' as any) as any).delete().eq('id', id)
    toast('تم الحذف')
    loadSuppliers(orgId); loadProducts(orgId)
  }

  async function linkProduct(productId: string, supplierId: string, reorderPoint: string, orderQty: string) {
    if (!reorderPoint || Number(reorderPoint) < 0) { toast('أدخل حد أدنى صحيح', 'warning'); return }
    const { error } = await (sb.from('products') as any).update({
      supplier_id: supplierId,
      supplier_reorder_point: Number(reorderPoint),
      supplier_order_qty: Number(orderQty) || Number(reorderPoint),
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

      {showAdd && (
        <div style={{ ...card, padding: 20, marginBottom: 18 }}>
          <div style={{ fontSize: font.md, fontWeight: 700, color: colors.text, marginBottom: 14 }}>إضافة مورد جديد</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} style={inp()} placeholder="اسم المورد" />
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} style={inp()} placeholder="رقم جوال المورد (05xxxxxxxx)" />
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
        </div>
        <button
          disabled={!selectedProduct}
          onClick={() => { onLink(selectedProduct, supplierId, reorderPoint, orderQty); setSelectedProduct(''); setReorderPoint(''); setOrderQty('') }}
          style={{ ...btnPrimary, padding: '11px 16px', fontSize: font.sm, opacity: !selectedProduct ? 0.5 : 1, cursor: !selectedProduct ? 'not-allowed' : 'pointer' }}>
          ربط
        </button>
      </div>
    </div>
  )
}
