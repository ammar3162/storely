'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const UNITS = ['كيلو','لتر','علبة','كرتون','أسطوانة','قطعة','كيس','زجاجة','باكيت','درزن']
const CATEGORIES = ['ألبان','قهوة','مشروبات','أدوات','مواد أساسية','إضافات','تنظيف','أخرى']

export default function InventoryPage() {
  const [products, setProducts]         = useState<any[]>([])
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(true)
  const [showAdd, setShowAdd]           = useState(false)
  const [editProduct, setEditProduct]   = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState<'all'|'low'|'ok'>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [saveSuccess, setSaveSuccess]   = useState('')
  const [viewMode, setViewMode]         = useState<'table'|'cards'>('table')
  const [newProduct, setNewProduct]     = useState({
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
  const filtered   = products.filter(p => {
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

  const Modal = ({ title, sub, onClose, onSubmit, data, setData }: any) => (
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.65)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(6px)'}}>
      <div style={{background:'white',borderRadius:20,padding:24,width:'100%',maxWidth:540,boxShadow:'0 25px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <h3 style={{fontWeight:900,fontSize:17,color:'#0f172a',margin:0}}>{title}</h3>
            <p style={{fontSize:12,color:'#94a3b8',marginTop:3,margin:0}}>{sub}</p>
          </div>
          <button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:10,width:34,height:34,cursor:'pointer',fontSize:16,color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>اسم الصنف *</label>
              <input type="text" placeholder="مثال: حليب فريش" required value={data.name}
                onChange={e => setData({...data,name:e.target.value})} style={inp} />
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>الكمية الحالية</label>
              <input type="number" placeholder="0" min="0" value={data.qty}
                onChange={e => setData({...data,qty:e.target.value})} style={inp} />
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#f59e0b',display:'block',marginBottom:5}}>⚠️ الحد الأدنى</label>
              <input type="number" placeholder="0" min="0" value={data.reorder_point}
                onChange={e => setData({...data,reorder_point:e.target.value})}
                style={{...inp,border:'2px solid #fcd34d',background:'#fffbeb'}} />
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>سعر التكلفة (ريال)</label>
              <input type="number" placeholder="0.00" min="0" step="0.01" value={data.cost_price}
                onChange={e => setData({...data,cost_price:e.target.value})} style={inp} />
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>الوحدة</label>
              <select value={data.unit} onChange={e => setData({...data,unit:e.target.value})} style={inp}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>الفئة</label>
              <select value={data.category} onChange={e => setData({...data,category:e.target.value})} style={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button type="submit" style={{flex:1,padding:'13px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',boxShadow:'0 4px 12px rgba(99,102,241,0.3)'}}>
              💾 حفظ
            </button>
            <button type="button" onClick={onClose} style={{padding:'13px 20px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'system-ui'}}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>
      <style>{`
        @media(max-width:768px){
          .stats-grid{grid-template-columns:1fr 1fr !important}
          .toolbar{flex-direction:column !important}
          .toolbar > *{width:100% !important}
          .hide-mobile{display:none !important}
          .header-row{flex-direction:column !important;align-items:flex-start !important}
          .header-btns{width:100% !important;justify-content:space-between !important}
        }
        @media(max-width:480px){
          .stats-grid{grid-template-columns:1fr 1fr !important}
          .tab-group{overflow-x:auto !important}
        }
        .prod-row:hover{background:#f8faff !important}
        .action-btn:hover{opacity:0.85;transform:translateY(-1px)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div className="header-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,gap:12,flexWrap:'wrap'}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:900,color:'#0f172a',marginBottom:4,letterSpacing:'-0.5px'}}>📦 إدارة المخزون</h1>
          <p style={{fontSize:13,color:'#64748b',margin:0}}>{products.length} صنف • آخر تحديث {new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</p>
        </div>
        <div className="header-btns" style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {/* View Toggle */}
          <div style={{display:'flex',background:'#f1f5f9',borderRadius:10,padding:3,gap:3}}>
            <button onClick={() => setViewMode('table')} style={{padding:'7px 12px',borderRadius:8,border:'none',cursor:'pointer',background:viewMode==='table'?'white':'transparent',color:viewMode==='table'?'#6366f1':'#64748b',fontWeight:700,fontSize:12,fontFamily:'system-ui',boxShadow:viewMode==='table'?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>جدول</button>
            <button onClick={() => setViewMode('cards')} style={{padding:'7px 12px',borderRadius:8,border:'none',cursor:'pointer',background:viewMode==='cards'?'white':'transparent',color:viewMode==='cards'?'#6366f1':'#64748b',fontWeight:700,fontSize:12,fontFamily:'system-ui',boxShadow:viewMode==='cards'?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>بطاقات</button>
          </div>
          <button onClick={loadProducts} style={{padding:'10px 16px',background:'white',color:'#475569',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'system-ui',display:'flex',alignItems:'center',gap:6}}>🔄 تحديث</button>
          <button onClick={() => setShowAdd(true)} style={{padding:'11px 20px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',boxShadow:'0 4px 14px rgba(99,102,241,0.35)',display:'flex',alignItems:'center',gap:8}}>＋ إضافة صنف</button>
        </div>
      </div>

      {saveSuccess && (
        <div style={{background:'#ecfdf5',border:'1.5px solid #10b981',borderRadius:12,padding:'13px 18px',marginBottom:20,fontSize:14,fontWeight:700,color:'#059669',animation:'fadeIn 0.3s ease',display:'flex',alignItems:'center',gap:10}}>
          {saveSuccess}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          { label:'قيمة المخزون', value:totalValue.toLocaleString('ar-SA',{maximumFractionDigits:0})+' ﷼', icon:'💰', color:'#6366f1', bg:'linear-gradient(135deg,#eef2ff,#e0e7ff)', border:'#c7d2fe', sub:`${products.length} صنف` },
          { label:'أصناف متوفرة', value:products.length-lowStock.length, icon:'✅', color:'#16a34a', bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'#bbf7d0', sub:'في حالة جيدة' },
          { label:'تحتاج طلب',    value:lowStock.length, icon:'⚠️', color:'#dc2626', bg:'linear-gradient(135deg,#fef2f2,#fee2e2)', border:'#fecaca', sub:'وصلت للحد الأدنى' },
          { label:'عدد الفئات',   value:categories.length, icon:'🏷️', color:'#0891b2', bg:'linear-gradient(135deg,#ecfeff,#cffafe)', border:'#a5f3fc', sub:'فئة مختلفة' },
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:16,padding:'16px 18px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
            <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
            <div style={{fontSize:24,fontWeight:900,color:s.color,marginBottom:2}}>{s.value}</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{background:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'2px solid #fcd34d',borderRadius:14,padding:'14px 18px',marginBottom:18,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <span style={{fontSize:22}}>🔔</span>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontWeight:800,color:'#92400e',fontSize:14,marginBottom:4}}>{lowStock.length} صنف وصل للحد الأدنى</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {lowStock.map(p => (
                <span key={p.id} style={{background:'rgba(245,158,11,0.15)',color:'#b45309',padding:'2px 10px',borderRadius:50,fontSize:11,fontWeight:600}}>
                  {p.name} ({p.qty} {p.unit})
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setFilterStatus('low')} style={{padding:'8px 14px',background:'#f59e0b',color:'white',border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',flexShrink:0}}>
            عرض الناقصة
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar" style={{background:'white',borderRadius:14,padding:'14px 18px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{flex:1,minWidth:180,position:'relative'}}>
          <span style={{position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}>🔍</span>
          <input type="text" placeholder="ابحث عن صنف..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{...inp,paddingRight:38,borderRadius:50}} />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          style={{...inp,width:'auto',minWidth:130}}>
          <option value="">كل الفئات</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="tab-group" style={{display:'flex',background:'#f1f5f9',borderRadius:10,padding:3,gap:3}}>
          {[
            {key:'all',label:`الكل (${products.length})`},
            {key:'low',label:`⚠️ ناقص (${lowStock.length})`},
            {key:'ok', label:`✅ متوفر (${products.length-lowStock.length})`}
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilterStatus(tab.key as any)} style={{
              padding:'7px 10px',border:'none',borderRadius:8,cursor:'pointer',
              background:filterStatus===tab.key?'white':'transparent',
              color:filterStatus===tab.key?'#6366f1':'#64748b',
              fontWeight:filterStatus===tab.key?700:500,fontSize:12,
              boxShadow:filterStatus===tab.key?'0 1px 4px rgba(0,0,0,0.1)':'none',
              fontFamily:'system-ui',whiteSpace:'nowrap' as const
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{background:'white',borderRadius:16,padding:60,textAlign:'center',color:'#94a3b8',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <div style={{fontSize:40,marginBottom:12}}>⏳</div>
          <div style={{fontSize:14,fontWeight:600}}>جاري التحميل...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{background:'white',borderRadius:16,padding:60,textAlign:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <div style={{fontSize:48,marginBottom:12}}>📭</div>
          <div style={{fontSize:16,fontWeight:800,color:'#475569',marginBottom:6}}>لا توجد نتائج</div>
          <div style={{fontSize:13,color:'#94a3b8'}}>جرب تغيير الفلتر أو البحث</div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
          {filtered.map((p,idx) => {
            const isLow = p.qty <= p.reorder_point
            const ratio = p.reorder_point > 0 ? Math.min((p.qty/p.reorder_point)*100,100) : 100
            const barClr = ratio < 50 ? '#ef4444' : ratio < 80 ? '#f59e0b' : '#10b981'
            return (
              <div key={p.id} style={{background:'white',borderRadius:16,padding:18,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:`1.5px solid ${isLow?'#fecaca':'#f1f5f9'}`,position:'relative'}}>
                {isLow && (
                  <div style={{position:'absolute',top:12,left:12,background:'#fef2f2',color:'#ef4444',padding:'2px 8px',borderRadius:50,fontSize:10,fontWeight:700}}>⚠️ اطلب الآن</div>
                )}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:4}}>{p.name}</div>
                  <span style={{background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:50,fontSize:11,fontWeight:600}}>{p.category}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                  <div style={{textAlign:'center',background:isLow?'#fef2f2':'#f0fdf4',borderRadius:10,padding:'10px'}}>
                    <div style={{fontSize:22,fontWeight:900,color:isLow?'#ef4444':'#16a34a'}}>{p.qty}</div>
                    <div style={{fontSize:11,color:'#64748b',fontWeight:600}}>{p.unit}</div>
                  </div>
                  <div style={{textAlign:'center',background:'#f8fafc',borderRadius:10,padding:'10px'}}>
                    <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>{Number(p.cost_price).toFixed(2)}</div>
                    <div style={{fontSize:11,color:'#64748b',fontWeight:600}}>ريال/وحدة</div>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:11,color:'#94a3b8'}}>
                    <span>مستوى المخزون</span>
                    <span>{Math.round(ratio)}%</span>
                  </div>
                  <div style={{height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${ratio}%`,background:barClr,borderRadius:99,transition:'width 0.5s'}} />
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => setEditProduct({...p})} style={{flex:1,padding:'8px',background:'#eff6ff',color:'#2563eb',border:'1.5px solid #bfdbfe',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>✏️ تعديل</button>
                  <button onClick={() => deleteProduct(p.id)} style={{padding:'8px 12px',background:'#fff5f5',color:'#ef4444',border:'1.5px solid #fecaca',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div style={{background:'white',borderRadius:16,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f8fafc,#f1f5f9)',borderBottom:'2px solid #e2e8f0'}}>
                  {['#','الصنف','الفئة','الوحدة','الكمية','الحد الأدنى','التكلفة','المستوى','الحالة',''].map((h,i) => (
                    <th key={i} style={{padding:'13px 12px',color:'#475569',fontSize:11,fontWeight:700,textAlign:i<=1?'right':'center',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap' as const}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p,idx) => {
                  const isLow  = p.qty <= p.reorder_point
                  const ratio  = p.reorder_point > 0 ? Math.min((p.qty/p.reorder_point)*100,100) : 100
                  const barClr = ratio < 50 ? '#ef4444' : ratio < 80 ? '#f59e0b' : '#10b981'
                  return (
                    <tr key={p.id} className="prod-row" style={{borderBottom:'1px solid #f1f5f9',background:isLow?'#fff8f8':idx%2===0?'white':'#fafafa',transition:'background 0.15s'}}>
                      <td style={{padding:'13px 12px',textAlign:'center',color:'#94a3b8',fontSize:12,fontWeight:600}}>{idx+1}</td>
                      <td style={{padding:'13px 14px',textAlign:'right'}}>
                        <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{p.name}</div>
                      </td>
                      <td style={{padding:'13px 12px',textAlign:'center'}}>
                        <span style={{background:'#f1f5f9',color:'#475569',padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:600,whiteSpace:'nowrap' as const}}>{p.category||'—'}</span>
                      </td>
                      <td style={{padding:'13px 12px',textAlign:'center',color:'#64748b',fontWeight:600,fontSize:13}}>{p.unit}</td>
                      <td style={{padding:'13px 12px',textAlign:'center'}}>
                        <span style={{background:isLow?'#fee2e2':'#dcfce7',color:isLow?'#dc2626':'#16a34a',padding:'5px 14px',borderRadius:50,fontWeight:900,fontSize:15}}>{p.qty}</span>
                      </td>
                      <td style={{padding:'13px 12px',textAlign:'center',fontWeight:700,color:'#f59e0b',fontSize:14}}>{p.reorder_point}</td>
                      <td style={{padding:'13px 12px',textAlign:'center',fontWeight:700,color:'#0f172a',fontSize:13,whiteSpace:'nowrap' as const}}>{Number(p.cost_price).toFixed(2)} ﷼</td>
                      <td style={{padding:'13px 12px',textAlign:'center'}}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                          <div style={{width:60,height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${ratio}%`,background:barClr,borderRadius:99}} />
                          </div>
                          <span style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>{Math.round(ratio)}%</span>
                        </div>
                      </td>
                      <td style={{padding:'13px 12px',textAlign:'center'}}>
                        <span style={{background:isLow?'#fee2e2':'#dcfce7',color:isLow?'#dc2626':'#16a34a',padding:'4px 10px',borderRadius:50,fontSize:11,fontWeight:800,whiteSpace:'nowrap' as const}}>
                          {isLow?'⚠️ اطلب':'✅ متوفر'}
                        </span>
                      </td>
                      <td style={{padding:'13px 12px',textAlign:'center'}}>
                        <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                          <button className="action-btn" onClick={() => setEditProduct({...p})} style={{padding:'6px 12px',background:'#eff6ff',color:'#2563eb',border:'1.5px solid #bfdbfe',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',transition:'all 0.2s'}}>✏️</button>
                          <button className="action-btn" onClick={() => deleteProduct(p.id)} style={{padding:'6px 12px',background:'#fff5f5',color:'#ef4444',border:'1.5px solid #fecaca',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',transition:'all 0.2s'}}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'linear-gradient(135deg,#eef2ff,#e0e7ff)',borderTop:'2px solid #c7d2fe'}}>
                  <td colSpan={6} style={{padding:'13px 14px',fontWeight:700,fontSize:13,color:'#475569',textAlign:'right'}}>
                    الإجمالي ({filtered.length} صنف)
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
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal
          title="➕ إضافة صنف جديد"
          sub="أدخل بيانات الصنف بدقة"
          onClose={() => setShowAdd(false)}
          onSubmit={addProduct}
          data={newProduct}
          setData={setNewProduct}
        />
      )}

      {/* Edit Modal */}
      {editProduct && (
        <Modal
          title="✏️ تعديل الصنف"
          sub={editProduct.name}
          onClose={() => setEditProduct(null)}
          onSubmit={saveEdit}
          data={editProduct}
          setData={setEditProduct}
        />
      )}
    </div>
  )
}