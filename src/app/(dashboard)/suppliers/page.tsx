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

function EscalationChain({ productId, allSuppliers, primarySupplierId, refreshKey }: any) {
  const [chain, setChain] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [pickSupplier, setPickSupplier] = useState('')
  const sb = createClient()

  useEffect(()=>{ load() },[productId, refreshKey])

  async function load() {
    setLoading(true)
    const { data } = await (sb as any).from('product_suppliers').select('id,supplier_id,priority,suppliers(name)').eq('product_id', productId).gt('priority', 1).order('priority')
    setChain(data || [])
    setLoading(false)
  }

  async function addBackup() {
    if (!pickSupplier) return
    const nextPriority = chain.length ? Math.max(...chain.map((c:any)=>c.priority)) + 1 : 2
    await (sb as any).from('product_suppliers').insert({ product_id: productId, supplier_id: pickSupplier, priority: nextPriority })
    setPickSupplier(''); setAdding(false)
    load()
  }

  async function removeBackup(id: string) {
    await (sb as any).from('product_suppliers').delete().eq('id', id)
    load()
  }

  const usedIds = new Set([primarySupplierId, ...chain.map((c:any)=>c.supplier_id)])
  const available = (allSuppliers||[]).filter((s:any)=>!usedIds.has(s.id))

  if (loading) return null

  return (
    <div style={{ marginTop:8, paddingTop:8, borderTop:'1px dashed #e2e8f0' }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:'.05em' }}>🔄 سلسلة التصعيد (لو المورد الأساسي "غير متوفر")</div>
      {chain.length===0 && !adding && (
        <div style={{ fontSize:11, color:'#94a3b8', marginBottom:6 }}>ما فيه موردين بديلين — يُرسل إشعار يدوي فقط عند عدم التوفر</div>
      )}
      {chain.map((c:any,i:number)=>(
        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
          <span style={{ fontSize:10, background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:20, padding:'1px 7px', fontWeight:700 }}>#{i+2}</span>
          <span style={{ fontSize:12, color:'#0f172a', flex:1 }}>{(c.suppliers as any)?.name || 'مورد'}</span>
          <button onClick={()=>removeBackup(c.id)} style={{ background:'none', border:'none', color:'#ef4444', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>حذف</button>
        </div>
      ))}
      {adding ? (
        <div style={{ display:'flex', gap:6, marginTop:6 }}>
          <select value={pickSupplier} onChange={e=>setPickSupplier(e.target.value)}
            style={{ flex:1, padding:'6px 8px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:12, fontFamily:'inherit', background:'white', color:'#0f172a' }}>
            <option value="">— اختر مورد —</option>
            {available.map((sup:any)=><option key={sup.id} value={sup.id}>{sup.name}</option>)}
          </select>
          <button onClick={addBackup} disabled={!pickSupplier} style={{ padding:'6px 12px', background:'#16a34a', color:'white', border:'none', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>إضافة</button>
          <button onClick={()=>setAdding(false)} style={{ padding:'6px 10px', background:'none', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'#64748b' }}>إلغاء</button>
        </div>
      ) : (
        <button onClick={()=>setAdding(true)} disabled={!available.length}
          style={{ background:'none', border:'1.5px dashed #cbd5e1', color:'#64748b', borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:available.length?'pointer':'not-allowed', fontFamily:'inherit' }}>
          + إضافة مورد بديل
        </button>
      )}
    </div>
  )
}

function SupplierCard({ s, products, orgId, onRefresh, allSuppliers, rating }: any) {
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
  const [chainRefreshKey, setChainRefreshKey] = useState(0)
  const [editingPhone, setEditingPhone] = useState(false)
  const [editPhoneVal, setEditPhoneVal] = useState(s.phone || '')
  const [savingPhone, setSavingPhone]   = useState(false)
  const sb = createClient()

  async function savePhone() {
    if (!editPhoneVal.trim()) { toast('أدخل رقم صحيح', 'warning'); return }
    setSavingPhone(true)
    await (sb as any).from('suppliers').update({ phone: editPhoneVal.trim() }).eq('id', s.id)
    setSavingPhone(false)
    setEditingPhone(false)
    toast('✅ تم تحديث رقم المورد')
    onRefresh()
  }

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
    // مزامنة الأولوية 1 بجدول سلسلة التصعيد
    await (sb as any).from('product_suppliers').upsert({
      product_id: selectedProduct,
      supplier_id: s.id,
      priority: 1,
      reorder_point: Number(reorderPoint),
      order_qty: Number(orderQty) || Number(reorderPoint),
      notes: supplierNotes.trim() || null,
    }, { onConflict: 'product_id,priority' })
    toast('✅ تم ربط المنتج')
    setSelectedProduct(''); setReorderPoint(''); setOrderQty(''); setSupplierNotes('')
    onRefresh()
  }

  async function unlinkProduct(pid: string) {
    await (sb as any).from('products').update({ supplier_id: null, supplier_reorder_point: null, supplier_order_qty: 0, supplier_notes: null }).eq('id', pid)
    await (sb as any).from('product_suppliers').delete().eq('product_id', pid)
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
              {rating?.hasData && rating?.stars!=null && (
                <span title={`${rating.details.confirmedOrders}/${rating.details.totalOrders} طلب مؤكد · ${rating.details.dealCount} تعامل`} style={{fontSize:11,fontWeight:700,color:'#b45309',display:'flex',alignItems:'center',gap:2}}>
                  {'⭐'.repeat(Math.round(rating.stars))}<span style={{color:'#92400e',marginRight:2}}>{rating.stars}</span>
                </span>
              )}
              {linked.length>0 && <span style={{fontSize:11,fontWeight:700,background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:20,padding:'2px 8px'}}>{linked.length} منتج مرتبط</span>}
              {linked.length===0 && <span style={{fontSize:11,fontWeight:700,background:'#fef3c7',color:'#92400e',border:'1px solid #fcd34d',borderRadius:20,padding:'2px 8px'}}>⚠️ لا منتجات مرتبطة</span>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3, flexWrap:'wrap' as const }}>
              {editingPhone ? (
                <span onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',gap:4}}>
                  <input value={editPhoneVal} onChange={e=>setEditPhoneVal(e.target.value)} dir="ltr" autoFocus
                    style={{fontSize:11,padding:'3px 6px',border:'1.5px solid #16a34a',borderRadius:5,width:110,fontFamily:'inherit'}}/>
                  <button onClick={savePhone} disabled={savingPhone} style={{fontSize:10,fontWeight:700,color:'white',background:'#16a34a',border:'none',borderRadius:5,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>{savingPhone?'...':'حفظ'}</button>
                  <button onClick={()=>{setEditingPhone(false);setEditPhoneVal(s.phone||'')}} style={{fontSize:10,fontWeight:700,color:'#64748b',background:'#f1f5f9',border:'none',borderRadius:5,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                </span>
              ) : (
                <span onClick={e=>{e.stopPropagation();setEditingPhone(true)}} style={{ fontSize:12, color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                  {s.phone} <span style={{fontSize:10,opacity:.5}}>✏️</span>
                </span>
              )}
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
                      <EscalationChain productId={p.id} allSuppliers={allSuppliers} primarySupplierId={s.id} refreshKey={chainRefreshKey} />
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
  const [newConsent, setNewConsent] = useState(false)
  const [priceComparisons, setPriceComparisons] = useState<any[]>([])
  const [showPriceComparison, setShowPriceComparison] = useState(false)
  const [supplierRatings, setSupplierRatings] = useState<Record<string,any>>({})
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
    fetch('/api/supplier-price-comparison',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:profile.org_id})}).then(r=>r.json()).then(d=>{ if(d.success) setPriceComparisons(d.comparisons||[]) }).catch(()=>{})
    fetch('/api/supplier-rating',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:profile.org_id})}).then(r=>r.json()).then(d=>{
      if(d.success){ const map:Record<string,any>={}; d.ratings.forEach((r:any)=>{ map[r.id]=r }); setSupplierRatings(map) }
    }).catch(()=>{})
    setLoading(false)
  }

  async function loadSuppliers(oid: string) {
    const bid = sessionStorage.getItem('s_branch_id')
    let q = (sb as any).from('suppliers').select('*').eq('org_id', oid)
    if (bid) q = q.eq('branch_id', bid)
    const { data } = await q.order('created_at', { ascending: false })
    setSuppliers(data || [])
  }

  async function loadProducts(oid: string) {
    const bid = sessionStorage.getItem('s_branch_id')
    let q = (sb as any).from('products').select('id,name,unit,qty,supplier_id,supplier_reorder_point,supplier_order_qty,supplier_notes,backup_supplier_id').eq('org_id', oid).eq('is_active', true)
    if (bid) q = q.eq('branch_id', bid)
    const { data } = await q.order('name')
    setProducts(data || [])
  }

  async function addSupplier() {
    if (suppliers.length >= maxSuppliers) { toast(`باقتك تسمح بـ ${maxSuppliers} موردين فقط`, 'warning'); return }
    if (!newName.trim() || !newPhone.trim()) { toast('أدخل اسم المورد ورقمه', 'warning'); return }
    if (!newConsent) { toast('يرجى تأكيد إقرار موافقة المورد على استلام رسائل واتساب', 'warning'); return }
    const phoneRules2: Record<string,number> = {'+966':9,'+971':9,'+965':8,'+973':8,'+974':8,'+968':8,'+20':10,'+962':9,'+1':10,'+44':10,'+91':10,'+92':10}
    const reqLen2 = phoneRules2[supCountry] || 9
    const cleanedPhone2 = newPhone.trim().replace(/^0+/,'')
    if(cleanedPhone2.length !== reqLen2){toast(`رقم الجوال يجب أن يكون ${reqLen2} أرقام`,'warning');return}
    const res = await fetch('/api/add-supplier', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, branch_id: sessionStorage.getItem('s_branch_id') || null, name: newName.trim(), phone: supCountry + newPhone.trim().replace(/^0+/,''), notes: newNotes.trim(), whatsapp_consent: true })
    })
    const resData = await res.json()
    console.log('ADD SUPPLIER RESPONSE:', res.status, resData)
    const error = !res.ok ? {message: resData.error} : null
    if (error) { toast('خطأ: ' + error.message, 'error'); return }
    toast('✅ تم إضافة المورد')
    setNewName(''); setNewPhone(''); setNewNotes(''); setNewConsent(false); setShowAdd(false)
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
        <div style={{display:'flex',gap:8}}>
          {priceComparisons.length>0&&(
            <button onClick={()=>setShowPriceComparison(true)} style={{ ...btnSecondary, padding:'10px 18px', fontSize:font.sm, display:'flex', alignItems:'center', gap:6 }}>
              📊 مقارنة الأسعار
              <span style={{background:'#dc2626',color:'white',fontSize:10,fontWeight:800,padding:'1px 6px',borderRadius:99}}>{priceComparisons.length}</span>
            </button>
          )}
          <button onClick={()=>setShowAdd(true)} style={{ ...btnPrimary, padding:'10px 18px', fontSize:font.sm }}>+ مورد جديد</button>
        </div>
      </div>

      {/* نافذة مقارنة الأسعار */}
      {showPriceComparison && (
        <div style={{position:'fixed',inset:0,zIndex:3000,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={()=>setShowPriceComparison(false)}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:560,maxHeight:'80vh',overflowY:'auto' as const,padding:20}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>📊 مقارنة أسعار الموردين</div>
              <button onClick={()=>setShowPriceComparison(false)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'}}>✕</button>
            </div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:16}}>بناءً على آخر 6 أشهر من سجل مشترياتك</div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
              {priceComparisons.map((c,i)=>(
                <div key={i} style={{border:'1px solid #e2e8f0',borderRadius:12,padding:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{c.name}</span>
                    {c.savingsPct>0&&(
                      <span style={{fontSize:10,fontWeight:800,color:'#16a34a',background:'#f0fdf4',padding:'2px 8px',borderRadius:99,border:'1px solid #bbf7d0'}}>
                        وفّر حتى {c.savingsPct}%
                      </span>
                    )}
                  </div>
                  <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                    {c.suppliers.map((s:any,si:number)=>(
                      <div key={si} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',background:si===0?'#f0fdf4':'#f8fafc',borderRadius:8,border:si===0?'1px solid #bbf7d0':'1px solid #e2e8f0'}}>
                        <span style={{fontSize:12,fontWeight:600,color:'#334155'}}>{si===0&&'🟢 '}{s.supplier}</span>
                        <span style={{fontSize:12,fontWeight:800,color:si===0?'#16a34a':'#64748b'}}>{s.unitPrice} ر.س / {s.unit||'وحدة'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
          <label style={{display:'flex',alignItems:'flex-start',gap:8,padding:'10px 12px',background:'#f0fdf4',borderRadius:10,border:'1px solid #bbf7d0',cursor:'pointer',marginBottom:14}}>
            <input type="checkbox" checked={newConsent} onChange={e=>setNewConsent(e.target.checked)} style={{marginTop:2,width:16,height:16,flexShrink:0,cursor:'pointer'}}/>
            <span style={{fontSize:11,color:'#166534',lineHeight:1.6}}>أقر بأن هذا المورد وافق على استلام رسائل واتساب مني بخصوص طلبات التوريد</span>
          </label>
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
            <SupplierCard key={s.id} s={s} products={products} orgId={orgId} onRefresh={refresh} allSuppliers={suppliers} rating={supplierRatings[s.id]} />
          ))}
        </div>
      )}
    </div>
  )
}
