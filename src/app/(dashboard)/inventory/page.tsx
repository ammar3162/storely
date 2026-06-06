'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, lazy, Suspense } from 'react'
import dynamic_import from 'next/dynamic'
const BarcodeScanner = dynamic_import(() => import('@/components/BarcodeScanner'), { ssr: false })
import { createClient } from '@/lib/supabase/client'

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [showScan, setShowScan]  = useState(false)
  const [scanTarget, setScanTarget] = useState<'sku'|'search'>('sku')
  const [editItem, setEditItem] = useState<any>(null)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({ name:'', sku:'', unit:'قطعة', qty:0, reorder_point:5, category:'' })
  const supabase = createClient()

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('غير مسجل دخول'); setSaving(false); return }

    const { data: profile } = await supabase
      .from('profiles').select('org_id').eq('id', user.id).single()

    if (!profile?.org_id) { alert('لا يوجد org_id للمستخدم: ' + user.email); setSaving(false); return }

    const orgId = profile.org_id

    if (editItem) {
      const { error } = await supabase.from('products').update({
        name: form.name, sku: form.sku||null, unit: form.unit,
        reorder_point: Number(form.reorder_point), category: form.category,
      }).eq('id', editItem.id)
      if (error) alert('خطأ تعديل: ' + error.message)
    } else {
      const { error } = await supabase.from('products').insert({
        name: form.name, sku: form.sku||null, unit: form.unit,
        qty: Number(form.qty), reorder_point: Number(form.reorder_point),
        category: form.category, org_id: orgId,
      })
      if (error) alert('خطأ إضافة: ' + error.message)
    }

    setSaving(false); setShowAdd(false); setEditItem(null)
    setForm({ name:'', sku:'', unit:'قطعة', qty:0, reorder_point:5, category:'' })
    loadProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذا المنتج؟')) return
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  function openEdit(p: any) {
    setEditItem(p)
    setForm({ name:p.name, sku:p.sku||'', unit:p.unit, qty:p.qty, reorder_point:p.reorder_point, category:p.category||'' })
    setShowAdd(true)
  }

  const filtered   = products.filter(p => p.name?.includes(search) || p.category?.includes(search) || p.sku?.includes(search))
  const lowStock   = products.filter(p => p.qty <= p.reorder_point).length
  const totalItems = products.length

  const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', border:'2px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box', background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500 }

  async function handleScan(code: string) {
    setShowScan(false)
    // ابحث عن المنتج في قاعدة البيانات
    const { data: existing } = await supabase
      .from('products').select('*').eq('sku', code).maybeSingle()
    if (existing) {
      // المنتج موجود — اعرضه للتعديل
      setEditItem(existing)
      setForm({
        name: existing.name,
        sku: existing.sku || '',
        unit: existing.unit,
        qty: existing.qty,
        reorder_point: existing.reorder_point,
        category: existing.category || '',
      })
      setShowAdd(true)
    } else {
      // منتج جديد — اعبئ الباركود فقط
      setForm(f => ({...f, sku: code}))
      setShowAdd(true)
    }
  }


  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>
      {showScan && <BarcodeScanner onScan={handleScan} onClose={()=>setShowScan(false)}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',marginBottom:4}}>المخزون</h1>
          <p style={{fontSize:13,color:'#64748b'}}>{totalItems} صنف — {lowStock > 0 ? lowStock + ' ناقص' : 'المخزون سليم'}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditItem(null); setForm({ name:'', sku:'', unit:'قطعة', qty:0, reorder_point:5, category:'' }) }}
          style={{padding:'11px 20px',background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>
          + إضافة منتج
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:24}}>
        {[
          { label:'إجمالي الأصناف', value:totalItems, color:'#667eea', bg:'#eef2ff', border:'#c7d2fe' },
          { label:'مخزون ناقص', value:lowStock, color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
          { label:'مخزون كافي', value:totalItems-lowStock, color:'#10b981', bg:'#f0fdf4', border:'#bbf7d0' },
          { label:'إجمالي الكميات', value:products.reduce((s,p)=>s+p.qty,0), color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,border:'1.5px solid '+s.border,borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:6,textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{background:'white',borderRadius:12,padding:'12px 16px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <input type="text" placeholder="ابحث بالاسم أو الفئة..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,border:'1.5px solid #e2e8f0'}} />
      </div>

      <div style={{background:'white',borderRadius:16,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',overflow:'hidden'}}>
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8',fontSize:14,fontWeight:600}}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:40,marginBottom:12}}>📭</div>
            <div style={{fontSize:15,fontWeight:700,color:'#475569'}}>لا توجد منتجات</div>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:650}}>
              <thead>
                <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                  {['المنتج','الفئة','الكمية','الحد الأدنى','الحالة',''].map((h,i) => (
                    <th key={i} style={{padding:'13px 14px',color:'#475569',fontSize:11,fontWeight:700,textAlign:'right',textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p,i) => {
                  const isLow = p.qty <= p.reorder_point
                  return (
                    <tr key={p.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa'}}>
                      <td style={{padding:'13px 14px'}}>
                        <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{p.name}</div>
                        {p.sku && <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{p.sku}</div>}
                      </td>
                      <td style={{padding:'13px 14px'}}>
                        {p.category ? <span style={{background:'#f1f5f9',color:'#475569',padding:'3px 10px',borderRadius:50,fontSize:12,fontWeight:600}}>{p.category}</span> : <span style={{color:'#cbd5e1'}}>—</span>}
                      </td>
                      <td style={{padding:'13px 14px'}}>
                        <span style={{fontWeight:900,fontSize:16,color:isLow?'#ef4444':'#0f172a'}}>{p.qty}</span>
                        <span style={{fontSize:11,color:'#94a3b8',marginRight:4}}>{p.unit}</span>
                      </td>
                      <td style={{padding:'13px 14px',color:'#64748b',fontSize:13}}>{p.reorder_point} {p.unit}</td>
                      <td style={{padding:'13px 14px'}}>
                        <span style={{background:isLow?'#fef2f2':'#f0fdf4',color:isLow?'#ef4444':'#10b981',padding:'4px 12px',borderRadius:50,fontSize:12,fontWeight:700,border:'1px solid '+(isLow?'#fecaca':'#bbf7d0')}}>
                          {isLow ? 'ناقص' : 'كافي'}
                        </span>
                      </td>
                      <td style={{padding:'13px 14px'}}>
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={() => openEdit(p)} style={{padding:'6px 12px',background:'#eef2ff',color:'#667eea',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>تعديل</button>
                          <button onClick={() => handleDelete(p.id)} style={{padding:'6px 12px',background:'#fef2f2',color:'#ef4444',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>حذف</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
          <div style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:480,boxShadow:'0 25px 60px rgba(0,0,0,0.25)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:800,color:'#0f172a',margin:0}}>{editItem ? 'تعديل المنتج' : 'منتج جديد'}</h2>
              <button onClick={() => { setShowAdd(false); setEditItem(null) }} style={{background:'#f1f5f9',border:'none',borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:16}}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم المنتج *</label>
                  <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp} placeholder="مثال: قهوة عربية"/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>باركود المنتج (اختياري)</label>
                  <div style={{display:'flex',gap:8}}>
                    <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} style={{...inp,flex:1}} placeholder="امسح الباركود أو اتركه فارغاً"/>
                    <button type="button" onClick={()=>setShowScan(true)} style={{padding:'10px 14px',background:'#1a4731',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:18,flexShrink:0}}>📷</button>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الفئة (اختياري)</label>
                  <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp}>
                    <option value="">— اختر الفئة —</option>
                    <option value="مشروبات">مشروبات</option>
                    <option value="قهوة وشاي">قهوة وشاي</option>
                    <option value="مواد غذائية">مواد غذائية</option>
                    <option value="ألبان وبيض">ألبان وبيض</option>
                    <option value="ورقيات">ورقيات</option>
                    <option value="تغليف">تغليف</option>
                    <option value="نظافة">نظافة</option>
                    <option value="توابل وبهارات">توابل وبهارات</option>
                    <option value="مواد جافة">مواد جافة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>وحدة القياس</label>
                  <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={inp}>
                    <option value="قطعة">قطعة</option>
                    <option value="كيلو">كيلو</option>
                    <option value="كيس">كيس</option>
                    <option value="كرتون">كرتون</option>
                    <option value="لتر">لتر</option>
                    <option value="علبة">علبة</option>
                    <option value="باكيت">باكيت</option>
                    <option value="درزن">درزن</option>
                    <option value="رول">رول</option>
                    <option value="غرام">غرام</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>{editItem ? 'الكمية الحالية' : 'الكمية الابتدائية'}</label>
                  <input type="number" min="0" value={form.qty} onChange={e=>setForm({...form,qty:Number(e.target.value)})} style={{...inp,fontSize:16,fontWeight:700}} placeholder="0"/>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>الحد الأدنى للتنبيه</label>
                  <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:Number(e.target.value)})} style={inp}/>
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button type="submit" disabled={saving} style={{flex:1,padding:'13px',background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'system-ui'}}>
                  {saving ? 'جاري الحفظ...' : editItem ? 'حفظ التعديلات' : 'إضافة'}
                </button>
                <button type="button" onClick={() => { setShowAdd(false); setEditItem(null) }} style={{padding:'13px 20px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'system-ui'}}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
// barcode
