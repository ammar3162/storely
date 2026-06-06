'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic_import from 'next/dynamic'
const BarcodeScanner = dynamic_import(() => import('@/components/BarcodeScanner'), { ssr: false })

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [addQty, setAddQty]     = useState(0)
  const [form, setForm] = useState({
    name:'', sku:'', unit:'قطعة', qty:0, reorder_point:5, category:''
  })
  const supabase = createClient()

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile) return
    const { data } = await supabase.from('products')
      .select('*').eq('org_id', profile.org_id).eq('is_active', true).order('name')
    setProducts(data || [])
    setLoading(false)
  }

  async function handleScan(code: string) {
    setShowScan(false)
    await new Promise(r => setTimeout(r, 300)) // انتظر إغلاق الكاميرا
    const { data: existing } = await supabase.from('products').select('*').eq('sku', code).maybeSingle()
    if (existing) {
      setEditItem(existing)
      setForm({ name:existing.name, sku:existing.sku||'', unit:existing.unit, qty:existing.qty, reorder_point:existing.reorder_point, category:existing.category||'' })
      setAddQty(0)
    } else {
      setEditItem(null)
      setForm({ name:'', sku:code, unit:'قطعة', qty:0, reorder_point:5, category:'' })
      setAddQty(0)
    }
    setShowAdd(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) { setSaving(false); return }

    if (editItem) {
      const newQty = editItem.qty + addQty
      await supabase.from('products').update({
        name:form.name, sku:form.sku||null, unit:form.unit,
        reorder_point:Number(form.reorder_point), category:form.category||null,
      }).eq('id', editItem.id)
      if (addQty > 0) {
        await supabase.from('stock_movements').insert({
          product_id:editItem.id, profile_id:user.id,
          type:'in', qty_change:addQty, note:'إضافة مخزون'
        })
      }
    } else {
      if (Number(form.qty) === 0) { alert('يرجى إدخال كمية أكبر من صفر'); setSaving(false); return }
      const { data: newProduct } = await supabase.from('products').insert({
        org_id:profile.org_id, name:form.name, sku:form.sku||null,
        unit:form.unit, qty:Number(form.qty),
        reorder_point:Number(form.reorder_point), category:form.category||null,
        is_active:true,
      }).select().single()
      if (newProduct && Number(form.qty) > 0) {
        await supabase.from('stock_movements').insert({
          product_id:newProduct.id, profile_id:user.id,
          type:'in', qty_change:Number(form.qty), note:'إضافة أولية'
        })
      }
    }

    setShowAdd(false)
    setEditItem(null)
    setAddQty(0)
    setForm({ name:'', sku:'', unit:'قطعة', qty:0, reorder_point:5, category:'' })
    setSaving(false)
    loadProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذا المنتج؟')) return
    await supabase.from('products').update({ is_active:false }).eq('id', id)
    loadProducts()
  }

  function openEdit(p: any) {
    setEditItem(p)
    setAddQty(0)
    setForm({ name:p.name, sku:p.sku||'', unit:p.unit, qty:p.qty, reorder_point:p.reorder_point, category:p.category||'' })
    setShowAdd(true)
  }

  const filtered = products.filter(p => p.name?.includes(search) || p.category?.includes(search) || p.sku?.includes(search))
  const lowCount = products.filter(p => p.qty <= p.reorder_point).length

  const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', boxSizing:'border-box' as const, background:'white', color:'#1e293b', fontFamily:'inherit' }

  return (
    <div style={{direction:'rtl',fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:1100,margin:'0 auto'}}>
      {showScan && <BarcodeScanner onScan={handleScan} onClose={()=>{setShowScan(false)}}/>}

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto' as const}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>{editItem ? 'تعديل المنتج' : 'إضافة منتج جديد'}</div>
              <button onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>

                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>اسم المنتج *</label>
                  <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp} placeholder="مثال: قهوة عربية"/>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'end'}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>باركود (اختياري)</label>
                    <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} style={inp} placeholder="امسح أو اكتب"/>
                  </div>
                  <button type="button" onClick={()=>{setShowAdd(false);setShowScan(true)}}
                    style={{padding:'11px 14px',background:'#1a4731',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontSize:18,marginBottom:0}}>📷</button>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الفئة (اختياري)</label>
                    <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp}>
                      <option value="">— اختر —</option>
                      <option>مشروبات</option><option>قهوة وشاي</option><option>مواد غذائية</option>
                      <option>ألبان وبيض</option><option>ورقيات</option><option>تغليف</option>
                      <option>نظافة</option><option>توابل وبهارات</option><option>مواد جافة</option><option>أخرى</option>
                    </select>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>وحدة القياس</label>
                    <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={inp}>
                      <option>قطعة</option><option>كيلو</option><option>كيس</option>
                      <option>كرتون</option><option>لتر</option><option>علبة</option>
                      <option>باكيت</option><option>درزن</option><option>رول</option><option>غرام</option><option>أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الحد الأدنى للتنبيه</label>
                    <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:Number(e.target.value)})} style={inp}/>
                  </div>
                </div>

                {editItem ? (
                  <div style={{background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:10,padding:'14px 16px'}}>
                    <div style={{fontSize:12,color:'#64748b',marginBottom:8}}>الكمية الحالية: <span style={{fontWeight:800,color:'#1a4731',fontSize:16}}>{editItem.qty} {form.unit}</span></div>
                    <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>أضف كمية جديدة</label>
                    <input type="number" min="0" value={addQty===0?'':String(addQty)} onChange={e=>{ const v=e.target.value.replace(/[^0-9]/g,''); setAddQty(v===''?0:Number(v)) }} inputMode="numeric" style={{...inp,fontSize:18,fontWeight:800,textAlign:'center' as const}} placeholder="0"/>
                    {addQty > 0 && <div style={{fontSize:12,color:'#166534',marginTop:6,fontWeight:600}}>✓ الكمية بعد الإضافة: {editItem.qty + addQty} {form.unit}</div>}
                  </div>
                ) : (
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الكمية الابتدائية *</label>
                    <input type="number" min="1" required value={form.qty||''} onChange={e=>setForm({...form,qty:Number(e.target.value)})} style={{...inp,fontSize:18,fontWeight:800,textAlign:'center' as const}} placeholder="0"/>
                  </div>
                )}

              </div>
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <button type="button" onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{flex:1,padding:'12px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                <button type="submit" disabled={saving} style={{flex:2,padding:'12px',background:saving?'#94a3b8':'#1a4731',color:'white',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
                  {saving ? 'جاري الحفظ...' : editItem ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap' as const,gap:12}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:3}}>المخزون</h1>
          <p style={{fontSize:12,color:'#64748b'}}>{products.length} صنف {lowCount>0?`— ${lowCount} ناقصة`:'— كل شيء كافي'}</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setShowScan(true)} style={{padding:'10px 16px',background:'#f0fdf4',color:'#166534',border:'1.5px solid #86efac',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
            📷 مسح باركود
          </button>
          <button onClick={()=>{setEditItem(null);setAddQty(0);setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''});setShowAdd(true)}}
            style={{padding:'10px 16px',background:'#1a4731',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            + إضافة منتج
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'إجمالي الأصناف', value:products.length,  color:'#1e40af', bg:'#dbeafe'},
          {label:'مخزون ناقص',     value:lowCount,          color:'#991b1b', bg:'#fee2e2'},
          {label:'مخزون كافي',     value:products.length-lowCount, color:'#166534', bg:'#dcfce7'},
          {label:'إجمالي الكميات', value:products.reduce((s,p)=>s+p.qty,0), color:'#92400e', bg:'#fef3c7'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:10,padding:'14px 16px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9'}}>
          <input type="text" placeholder="ابحث بالاسم أو الفئة..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{...inp,border:'1.5px solid #e2e8f0'}} />
        </div>
        {loading ? (
          <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}>جاري التحميل...</div>
        ) : filtered.length===0 ? (
          <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:32,marginBottom:8}}>📦</div>
            <div style={{fontSize:14,fontWeight:600,color:'#475569'}}>لا توجد منتجات</div>
          </div>
        ) : (
          <div style={{overflowX:'auto' as const}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:500}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['المنتج','الفئة','الكمية','الحد الأدنى','الحالة',''].map((h,i) => (
                    <th key={i} style={{padding:'10px 14px',color:'#94a3b8',fontSize:10,fontWeight:700,textAlign:'right' as const,borderBottom:'1px solid #e8ecf0',textTransform:'uppercase' as const,letterSpacing:'0.04em'}}>{h}</th>
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
                          <button onClick={()=>openEdit(p)} style={{padding:'6px 12px',background:'#eef2ff',color:'#667eea',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>تعديل</button>
                          <button onClick={()=>handleDelete(p.id)} style={{padding:'6px 12px',background:'#fef2f2',color:'#ef4444',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>حذف</button>
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
    </div>
  )
}
