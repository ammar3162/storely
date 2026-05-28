'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
const UNITS = ['كيلو','لتر','علبة','كرتون','أسطوانة','قطعة','كيس','زجاجة','باكيت','درزن']
const CATEGORIES = ['ألبان','قهوة','مشروبات','أدوات','مواد أساسية','إضافات','تنظيف','أخرى']
export default function InventoryPage() {
  const [products, setProducts]       = useState<any[]>([])
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)
  const [showAdd, setShowAdd]         = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState<'all'|'low'|'ok'>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [newProduct, setNewProduct]   = useState({
    name:'', unit:'كيلو', qty:'', reorder_point:'', cost_price:'', category:'قهوة'
  })
  const supabase = createClient()
  useEffect(() => { loadProducts() }, [])
  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
    setLoading(false)
  }
  async function addProduct(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
    await supabase.from('products').insert({
      org_id: profile?.org_id, name: newProduct.name, unit: newProduct.unit,
      qty: Number(newProduct.qty), reorder_point: Number(newProduct.reorder_point),
      cost_price: Number(newProduct.cost_price), category: newProduct.category
    })
    setNewProduct({ name:'', unit:'كيلو', qty:'', reorder_point:'', cost_price:'', category:'قهوة' })
    setShowAdd(false)
    setSaveSuccess('✅ تم إضافة الصنف بنجاح')
    setTimeout(() => setSaveSuccess(''), 3000)
    loadProducts()
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('products').update({
      name: editProduct.name, unit: editProduct.unit,
      qty: Number(editProduct.qty), reorder_point: Number(editProduct.reorder_point),
      cost_price: Number(editProduct.cost_price), category: editProduct.category
    }).eq('id', editProduct.id)
    setEditProduct(null)
    setSaveSuccess('✅ تم حفظ التعديلات')
    setTimeout(() => setSaveSuccess(''), 3000)
    loadProducts()
  }
  async function deleteProduct(id: string) {
    if (!confirm('هل تريد حذف هذا الصنف؟')) return
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }
  const lowStock   = products.filter(p => p.qty <= p.reorder_point)
  const totalValue = products.reduce((s, p) => s + (p.qty * p.cost_price), 0)
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const filtered = products.filter(p => {
    const matchSearch   = p.name.includes(search)
    const matchStatus   = filterStatus === 'all' ? true : filterStatus === 'low' ? p.qty <= p.reorder_point : p.qty > p.reorder_point
    const matchCategory = filterCategory ? p.category === filterCategory : true
    return matchSearch && matchStatus && matchCategory
  })
  const inp: React.CSSProperties = {
    width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0',
    borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500
  }
  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>
      <style>{`
        .prod-row:hover { background: #f8faff !important; }
        .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:900,color:'#0f172a',marginBottom:4,letterSpacing:'-0.5px'}}>
            📦 إدارة المخزون
          </h1>
          <p style={{fontSize:13,color:'#64748b',fontWeight:500}}>
            {products.length} صنف مسجل — آخر تحديث: {new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}
          </p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={loadProducts} style={{
            padding:'10px 18px',background:'white',color:'#475569',
            border:'1.5px solid #e2e8f0',borderRadius:12,fontSize:13,fontWeight:600,
            cursor:'pointer',fontFamily:'system-ui',display:'flex',alignItems:'center',gap:6
          }}>🔄 تحديث</button>
          <button onClick={() => setShowAdd(true)} style={{
            padding:'11px 22px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,
            cursor:'pointer',fontFamily:'system-ui',
            boxShadow:'0 4px 14px rgba(99,102,241,0.4)',
            display:'flex',alignItems:'center',gap:8
          }}>＋ إضافة صنف</button>
        </div>
      </div>
      {/* Success Toast */}
      {saveSuccess && (
        <div style={{
          background:'#ecfdf5',border:'1.5px solid #10b981',borderRadius:12,
          padding:'13px 18px',marginBottom:20,fontSize:14,fontWeight:700,color:'#059669',
          animation:'fadeIn 0.3s ease',display:'flex',alignItems:'center',gap:10
        }}>{saveSuccess}</div>
      )}
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:24}}>
        {[
          { label:'قيمة المخزون الكلية', value: totalValue.toLocaleString('ar-SA',{maximumFractionDigits:0})+' ﷼', icon:'💰', color:'#6366f1', bg:'linear-gradient(135deg,#eef2ff,#e0e7ff)', border:'#c7d2fe', sub:`${products.length} صنف` },
          { label:'أصناف متوفرة',        value: products.length - lowStock.length, icon:'✅', color:'#16a34a', bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'#bbf7d0', sub:'في حالة جيدة' },
          { label:'تحتاج طلب عاجل',      value: lowStock.length, icon:'⚠️', color:'#dc2626', bg:'linear-gradient(135deg,#fef2f2,#fee2e2)', border:'#fecaca', sub:'وصلت للحد الأدنى' },
          { label:'عدد الفئات',           value: categories.length, icon:'🏷️', color:'#0891b2', bg:'linear-gradient(135deg,#ecfeff,#cffafe)', border:'#a5f3fc', sub:'فئة مختلفة' },
        ].map((s,i) => (
          <div key={i} className="stat-card" style={{
            background:s.bg,border:`1.5px solid ${s.border}`,
            borderRadius:18,padding:'20px 22px',
            boxShadow:'0 2px 8px rgba(0,0,0,0.05)',
            transition:'transform 0.2s,box-shadow 0.2s',cursor:'default'
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{width:42,height:42,borderRadius:12,background:'rgba(255,255,255,0.7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{s.icon}</div>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.label}</div>
            <div style={{fontSize:28,fontWeight:900,color:s.color,marginBottom:2}}>{s.value}</div>
            <div style={{fontSize:12,color:'#94a3b8'}}>{s.sub}</div>
          </div>
        ))}
      </div>
      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{
          background:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'2px solid #fcd34d',
          borderRadius:14,padding:'14px 20px',marginBottom:20,
          display:'flex',alignItems:'center',gap:14
        }}>
          <span style={{fontSize:24}}>🔔</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,color:'#92400e',fontSize:14,marginBottom:4}}>
              {lowStock.length} صنف وصل للحد الأدنى
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {lowStock.map(p => (
                <span key={p.id} style={{background:'rgba(245,158,11,0.15)',color:'#b45309',padding:'2px 10px',borderRadius:50,fontSize:12,fontWeight:600}}>
                  {p.name} ({p.qty} {p.unit})
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setFilterStatus('low')} style={{
            padding:'8px 16px',background:'#f59e0b',color:'white',border:'none',
            borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',flexShrink:0
          }}>عرض الناقصة</button>
        </div>
      )}
      {/* Toolbar */}
      <div style={{background:'white',borderRadius:14,padding:'14px 18px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{flex:1,minWidth:200,position:'relative'}}>
          <span style={{position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',fontSize:15}}>🔍</span>
          <input type="text" placeholder="ابحث عن صنف..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{...inp,paddingRight:38,borderRadius:50}} />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          style={{...inp,width:'auto',minWidth:140}}>
          <option value="">كل الفئات</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{display:'flex',background:'#f1f5f9',borderRadius:10,padding:3,gap:3}}>
          {[
            {key:'all',label:`الكل (${products.length})`},
            {key:'low',label:`⚠️ ناقص (${lowStock.length})`},
            {key:'ok', label:`✅ متوفر (${products.length-lowStock.length})`}
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilterStatus(tab.key as any)} style={{
              padding:'7px 12px',border:'none',borderRadius:8,cursor:'pointer',
              background:filterStatus===tab.key?'white':'transparent',
              color:filterStatus===tab.key?'#6366f1':'#64748b',
              fontWeight:filterStatus===tab.key?700:500,fontSize:12,
              boxShadow:filterStatus===tab.key?'0 1px 4px rgba(0,0,0,0.1)':'none',
              fontFamily:'system-ui',transition:'all 0.2s',whiteSpace:'nowrap'
            }}>{tab.label}</button>
          ))}
        </div>
      </div>
      {/* Table */}
      <div style={{background:'white',borderRadius:16,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',overflow:'hidden'}}>
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:36,marginBottom:12}}>⏳</div>
            <div style={{fontSize:14,fontWeight:600}}>جاري التحميل...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:40,marginBottom:12}}>📭</div>
            <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:6}}>لا توجد نتائج</div>
            <div style={{fontSize:13}}>جرب تغيير الفلتر أو البحث</div>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                {['#','الصنف','الفئة','الوحدة','الكمية','الحد الأدنى','التكلفة','المستوى','الحالة',''].map((h,i) => (
                  <th key={i} style={{
                    padding:'13px 14px',color:'#475569',fontSize:11,fontWeight:700,
                    textAlign:i<=1?'right':'center',textTransform:'uppercase',letterSpacing:'0.05em'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,idx) => {
                const isLow  = p.qty <= p.reorder_point
                const ratio  = p.reorder_point > 0 ? Math.min((p.qty/p.reorder_point)*100,100) : 100
                const barClr = ratio < 50 ? '#ef4444' : ratio < 80 ? '#f59e0b' : '#10b981'
                return (
                  <tr key={p.id} className="prod-row" style={{
                    borderBottom:'1px solid #f1f5f9',
                    background:isLow?'#fff5f5':idx%2===0?'white':'#fafafa',
                    transition:'background 0.15s'
                  }}>
                    <td style={{padding:'14px',textAlign:'center',color:'#94a3b8',fontSize:12,fontWeight:600,width:40}}>{idx+1}</td>
                    <td style={{padding:'14px 16px',textAlign:'right'}}>
                      <div style={{fontWeight:700,fontSize:15,color:'#0f172a'}}>{p.name}</div>
                    </td>
                    <td style={{padding:'14px',textAlign:'center'}}>
                      <span style={{background:'#f1f5f9',color:'#475569',padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:600}}>
                        {p.category||'—'}
                      </span>
                    </td>
                    <td style={{padding:'14px',textAlign:'center',color:'#64748b',fontWeight:600,fontSize:13}}>{p.unit}</td>
                    <td style={{padding:'14px',textAlign:'center'}}>
                      <span style={{
                        background:isLow?'#fee2e2':'#dcfce7',
                        color:isLow?'#dc2626':'#16a34a',
                        padding:'5px 14px',borderRadius:50,fontWeight:900,fontSize:15
                      }}>{p.qty}</span>
                    </td>
                    <td style={{padding:'14px',textAlign:'center',fontWeight:700,color:'#f59e0b',fontSize:14}}>{p.reorder_point}</td>
                    <td style={{padding:'14px',textAlign:'center',fontWeight:700,color:'#0f172a',fontSize:13}}>{Number(p.cost_price).toFixed(2)} ﷼</td>
                    <td style={{padding:'14px',textAlign:'center'}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                        <div style={{width:70,height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${ratio}%`,background:barClr,borderRadius:99,transition:'width 1s'}} />
                        </div>
                        <span style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>{Math.round(ratio)}%</span>
                      </div>
                    </td>
                    <td style={{padding:'14px',textAlign:'center'}}>
                      <span style={{
                        display:'inline-flex',alignItems:'center',gap:5,
                        background:isLow?'#fee2e2':'#dcfce7',
                        color:isLow?'#dc2626':'#16a34a',
                        padding:'5px 12px',borderRadius:50,fontSize:11,fontWeight:800
                      }}>{isLow?'⚠️ اطلب الآن':'✅ متوفر'}</span>
                    </td>
                    <td style={{padding:'14px',textAlign:'center'}}>
                      <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                        <button className="action-btn" onClick={() => setEditProduct({...p})} style={{
                          padding:'7px 14px',background:'#eff6ff',color:'#2563eb',
                          border:'1.5px solid #bfdbfe',borderRadius:8,fontSize:12,
                          fontWeight:700,cursor:'pointer',fontFamily:'system-ui',transition:'all 0.2s'
                        }}>✏️</button>
                        <button className="action-btn" onClick={() => deleteProduct(p.id)} style={{
                          padding:'7px 14px',background:'#fff5f5',color:'#ef4444',
                          border:'1.5px solid #fecaca',borderRadius:8,fontSize:12,
                          fontWeight:700,cursor:'pointer',fontFamily:'system-ui',transition:'all 0.2s'
                        }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{background:'#f8fafc',borderTop:'2px solid #e2e8f0'}}>
                <td colSpan={6} style={{padding:'13px 16px',fontWeight:700,fontSize:13,color:'#475569',textAlign:'right'}}>
                  إجمالي ({filtered.length} صنف)
                </td>
                <td style={{padding:'13px',textAlign:'center'}}>
                  <span style={{background:'#6366f1',color:'white',padding:'5px 14px',borderRadius:50,fontWeight:800,fontSize:13}}>
                    {filtered.reduce((s,p)=>s+(p.qty*p.cost_price),0).toLocaleString('ar-SA',{maximumFractionDigits:0})} ﷼
                  </span>
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      {/* Add Modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.65)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:'white',borderRadius:22,padding:32,width:'100%',maxWidth:580,boxShadow:'0 25px 60px rgba(0,0,0,0.25)',animation:'fadeIn 0.25s ease',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <div>
                <h3 style={{fontWeight:900,fontSize:18,color:'#0f172a',margin:0}}>➕ إضافة صنف جديد</h3>
                <p style={{fontSize:12,color:'#94a3b8',marginTop:4}}>أدخل بيانات الصنف بدقة</p>
              </div>
              <button onClick={() => setShowAdd(false)} style={{background:'#f1f5f9',border:'none',borderRadius:10,width:34,height:34,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b'}}>✕</button>
            </div>
            <form onSubmit={addProduct}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم الصنف *</label>
                  <input type="text" placeholder="مثال: حليب فريش السعودية" required value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct,name:e.target.value})} style={inp} />
                </div>
                {[
                  {label:'الكمية الحالية', key:'qty', type:'number', placeholder:'0'},
                  {label:'الحد الأدنى للطلب ⚠️', key:'reorder_point', type:'number', placeholder:'0'},
                  {label:'سعر التكلفة (ريال)', key:'cost_price', type:'number', placeholder:'0.00'},
                ].map(f => (
                  <div key={f.key}>
                    <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} min="0" step={f.key==='cost_price'?'0.01':undefined}
                      value={(newProduct as any)[f.key]}
                      onChange={e => setNewProduct({...newProduct,[f.key]:e.target.value})}
                      style={f.key==='reorder_point'?{...inp,border:'2px solid #fcd34d',background:'#fffbeb'}:inp} />
                  </div>
                ))}
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>الوحدة</label>
                  <select value={newProduct.unit} onChange={e => setNewProduct({...newProduct,unit:e.target.value})} style={inp}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>الفئة</label>
                  <select value={newProduct.category} onChange={e => setNewProduct({...newProduct,category:e.target.value})} style={inp}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button type="submit" style={{flex:1,padding:'13px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>✅ إضافة الصنف</button>
                <button type="button" onClick={() => setShowAdd(false)} style={{padding:'13px 20px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'system-ui'}}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editProduct && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.65)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:'white',borderRadius:22,padding:32,width:'100%',maxWidth:580,boxShadow:'0 25px 60px rgba(0,0,0,0.25)',animation:'fadeIn 0.25s ease',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <div>
                <h3 style={{fontWeight:900,fontSize:18,color:'#0f172a',margin:0}}>✏️ تعديل الصنف</h3>
                <p style={{fontSize:12,color:'#94a3b8',marginTop:4}}>{editProduct.name}</p>
              </div>
              <button onClick={() => setEditProduct(null)} style={{background:'#f1f5f9',border:'none',borderRadius:10,width:34,height:34,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b'}}>✕</button>
            </div>
            <form onSubmit={saveEdit}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم الصنف</label>
                  <input type="text" required value={editProduct.name}
                    onChange={e => setEditProduct({...editProduct,name:e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>الكمية الحالية</label>
                  <input type="number" min="0" value={editProduct.qty}
                    onChange={e => setEditProduct({...editProduct,qty:e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#f59e0b',display:'block',marginBottom:6}}>⚠️ الحد الأدنى للطلب</label>
                  <input type="number" min="0" value={editProduct.reorder_point}
                    onChange={e => setEditProduct({...editProduct,reorder_point:e.target.value})}
                    style={{...inp,border:'2px solid #fcd34d',background:'#fffbeb'}} />
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>سعر التكلفة (ريال)</label>
                  <input type="number" min="0" step="0.01" value={editProduct.cost_price}
                    onChange={e => setEditProduct({...editProduct,cost_price:e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>الوحدة</label>
                  <select value={editProduct.unit||''} onChange={e => setEditProduct({...editProduct,unit:e.target.value})} style={inp}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>الفئة</label>
                  <select value={editProduct.category||''} onChange={e => setEditProduct({...editProduct,category:e.target.value})} style={inp}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button type="submit" style={{flex:1,padding:'13px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>💾 حفظ التعديلات</button>
                <button type="button" onClick={() => setEditProduct(null)} style={{padding:'13px 20px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'system-ui'}}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}export const dynamic = 'force-dynamic'
