'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/toast'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import Pagination from '@/components/pagination'

interface Product {
  id:string; name:string; sku:string|null; unit:string
  qty:number; reorder_point:number; category:string|null
  org_id:string; is_active:boolean
  created_at:string; updated_at:string
}

const UNITS = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','درزن','رول','غرام','أخرى']
const CATS  = ['مشروبات','قهوة وشاي','مواد غذائية','ألبان وبيض','ورقيات','تغليف','نظافة','توابل','مواد جافة','أخرى']

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [page, setPage]         = useState(1)
  const PER = 15
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [editItem, setEditItem] = useState<Product|null>(null)
  const [addQty, setAddQty]     = useState(0)
  const [confirm, setConfirm]   = useState<{id:string,name:string}|null>(null)
  const [form, setForm]         = useState({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''})
  const sb = createClient()

  useEffect(()=>{ load() },[])
  useVisibilityRefresh(load, 20*60*1000)

  async function load() {
    setLoading(true)
    let oid = sessionStorage.getItem('s_org_id')
    if (!oid) {
      const { data:{user} } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data:p } = await sb.from('profiles').select('org_id').eq('id',user.id).single()
      if (!p) { setLoading(false); return }
      oid = p.org_id; sessionStorage.setItem('s_org_id', oid!)
    }
    const { data } = await sb.from('products')
      .select('*').eq('org_id',oid).eq('is_active',true).order('name')
    setProducts(data||[])
    setLoading(false)
  }

  async function handleSave(e:React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const {data:{user}} = await sb.auth.getUser()
    if (!user) { setSaving(false); return }
    const oid = sessionStorage.getItem('s_org_id')
    if (!oid) { setSaving(false); return }
    if (editItem) {
      await sb.from('products').update({
        name:form.name, sku:form.sku||null, unit:form.unit,
        reorder_point:Number(form.reorder_point), category:form.category||null,
      }).eq('id',editItem.id)
      if (addQty>0) await sb.from('stock_movements').insert({
        product_id:editItem.id, profile_id:user.id,
        type:'in', qty_change:addQty, note:'إضافة مخزون'
      })
      toast('تم حفظ التعديلات ✓')
    } else {
      if (!form.qty) { toast('أدخل كمية أكبر من صفر','warning'); setSaving(false); return }
      const {data:np} = await sb.from('products').insert({
        org_id:oid, name:form.name, sku:form.sku||null, unit:form.unit,
        qty:Number(form.qty), reorder_point:Number(form.reorder_point),
        category:form.category||null, is_active:true,
      }).select().single()
      if (np) await sb.from('stock_movements').insert({
        product_id:np.id, profile_id:user.id,
        type:'in', qty_change:Number(form.qty), note:'إضافة أولية'
      })
      toast('تم إضافة المنتج ✓')
    }
    setShowAdd(false); setEditItem(null); setAddQty(0)
    setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''})
    setSaving(false); load()
  }

  async function doDelete() {
    if (!confirm) return
    await sb.from('products').update({is_active:false}).eq('id',confirm.id)
    toast('تم حذف المنتج'); setConfirm(null); load()
  }

  function openEdit(p:Product) {
    setEditItem(p); setAddQty(0)
    setForm({name:p.name,sku:p.sku||'',unit:p.unit,qty:p.qty,reorder_point:p.reorder_point,category:p.category||''})
    setShowAdd(true)
  }

  function exportCSV() {
    const csv = '\ufeff' + [
      ['اسم المنتج','الفئة','الكمية','الوحدة','الحد الأدنى','الحالة'],
      ...products.map(p=>[p.name,p.category||'—',p.qty,p.unit,p.reorder_point,p.qty<=p.reorder_point?'ناقص':'كافي'])
    ].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{
      href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),
      download:'المخزون.csv'
    }).click()
  }

  const filtered  = products.filter(p=>p.name?.includes(search)||p.category?.includes(search)||p.sku?.includes(search))
  const paginated = filtered.slice((page-1)*PER, page*PER)
  const lowCount  = products.filter(p=>p.qty<=p.reorder_point).length

  const C = {
    green:'#16a34a', greenL:'#f0fdf4', greenB:'#bbf7d0',
    red:'#ef4444', redL:'#fef2f2', redB:'#fecaca',
    border:'#f1f5f9', border2:'#e2e8f0',
    text:'#0f172a', text2:'#64748b', text3:'#94a3b8',
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'11px 14px',
    border:`1.5px solid ${C.border2}`, borderRadius:12,
    fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:C.text, fontFamily:'inherit',
  }

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',maxWidth:1000,margin:'0 auto'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}
        .ru{animation:fadeUp .25s ease both}
        .trow{transition:background .1s}
        .trow:hover td{background:#fafafa}
        input:focus,select:focus{outline:none!important;border-color:#16a34a!important;box-shadow:0 0 0 3px rgba(22,163,74,.1)!important}
        .act-btn{padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .12s}
        .act-btn:hover{opacity:.85}
        @media(max-width:640px){
          .stats{grid-template-columns:1fr 1fr!important}
          .hide-mob{display:none!important}
          .header-row{flex-direction:column!important}
          .header-btns{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important}
          .header-btns>*{width:100%!important;justify-content:center!important}
        }
      `}</style>

      {/* Confirm Modal */}
      {confirm && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}} onClick={()=>setConfirm(null)}/>
          <div style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:340,position:'relative',boxShadow:'0 24px 64px rgba(0,0,0,.2)',animation:'modalIn .2s ease',direction:'rtl'}}>
            <div style={{width:52,height:52,borderRadius:14,background:C.redL,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',border:`1.5px solid ${C.redB}`,fontSize:22}}>🗑️</div>
            <h3 style={{fontSize:16,fontWeight:800,color:C.text,textAlign:'center',marginBottom:8}}>حذف المنتج</h3>
            <p style={{fontSize:13,color:C.text2,textAlign:'center',lineHeight:1.6,marginBottom:22}}>هل تريد حذف <b>"{confirm.name}"</b>؟<br/>لا يمكن التراجع.</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirm(null)} style={{flex:1,padding:'11px',background:'#f8fafc',color:C.text2,border:`1.5px solid ${C.border2}`,borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
              <button onClick={doDelete} style={{flex:2,padding:'11px',background:C.red,color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>حذف نهائياً</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:20,padding:22,width:'100%',maxWidth:460,maxHeight:'92vh',overflowY:'auto',animation:'modalIn .2s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div style={{fontSize:16,fontWeight:800,color:C.text}}>{editItem?'تعديل المنتج':'منتج جديد'}</div>
              <button onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{width:32,height:32,borderRadius:9,border:`1px solid ${C.border2}`,background:'#f8fafc',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:5}}>اسم المنتج *</label>
                  <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp} placeholder="مثال: قهوة عربية"/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:5}}>الفئة</label>
                    <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp}>
                      <option value="">— اختر —</option>
                      {CATS.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:5}}>الوحدة</label>
                    <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={inp}>
                      {UNITS.map(u=><option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:5}}>باركود</label>
                    <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} style={inp} placeholder="اختياري"/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:5}}>الحد الأدنى</label>
                    <input type="number" min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:Number(e.target.value)})} style={inp}/>
                  </div>
                </div>
                {editItem ? (
                  <div style={{background:C.greenL,border:`1.5px solid ${C.greenB}`,borderRadius:12,padding:'14px'}}>
                    <div style={{fontSize:12,color:'#166534',marginBottom:8,fontWeight:600}}>الكمية الحالية: <b style={{fontSize:16}}>{editItem.qty} {form.unit}</b></div>
                    <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:5}}>أضف كمية</label>
                    <input type="number" min="0" value={addQty||''} onChange={e=>setAddQty(Number(e.target.value)||0)}
                      style={{...inp,fontSize:20,fontWeight:800,textAlign:'center'}} placeholder="0"/>
                    {addQty>0&&<div style={{fontSize:12,color:'#166534',marginTop:6,fontWeight:600}}>✓ الإجمالي: {editItem.qty+addQty} {form.unit}</div>}
                  </div>
                ) : (
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:5}}>الكمية الابتدائية *</label>
                    <input type="number" min="1" required value={form.qty||''} onChange={e=>setForm({...form,qty:Number(e.target.value)})}
                      style={{...inp,fontSize:20,fontWeight:800,textAlign:'center'}} placeholder="0"/>
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:10,marginTop:18}}>
                <button type="button" onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{flex:1,padding:'12px',background:'#f1f5f9',color:C.text2,border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                <button type="submit" disabled={saving} style={{flex:2,padding:'12px',background:saving?'#94a3b8':`linear-gradient(135deg,${C.green},#15803d)`,color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:saving?'none':'0 4px 14px rgba(22,163,74,.25)'}}>
                  {saving?'جاري الحفظ...':editItem?'حفظ التعديلات':'إضافة المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="ru header-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,letterSpacing:'-0.4px'}}>المخزون</h1>
          <p style={{fontSize:13,color:C.text3,marginTop:2}}>{products.length} صنف {lowCount>0?`· ${lowCount} ناقص`:''}</p>
        </div>
        <div className="header-btns" style={{display:'flex',gap:8}}>
          <button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',background:'white',color:C.green,border:`1.5px solid ${C.greenB}`,borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            CSV
          </button>
          <button onClick={()=>{setEditItem(null);setAddQty(0);setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:''});setShowAdd(true)}}
            style={{display:'flex',alignItems:'center',gap:6,padding:'10px 18px',background:`linear-gradient(135deg,${C.green},#15803d)`,color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(22,163,74,.25)'}}>
            + إضافة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats ru" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
        {[
          {label:'الأصناف',    value:products.length,             color:'#1d4ed8', border:'#bfdbfe', bg:'#eff6ff'},
          {label:'ناقص',       value:lowCount,                    color:C.red,     border:C.redB,    bg:C.redL},
          {label:'كافي',       value:products.length-lowCount,    color:C.green,   border:C.greenB,  bg:C.greenL},
          {label:'الكميات',    value:products.reduce((s,p)=>s+p.qty,0), color:'#d97706', border:'#fde68a', bg:'#fffbeb'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:14,padding:'14px',border:`1.5px solid ${s.border}`,textAlign:'center'}}>
            <div style={{fontSize:24,fontWeight:900,color:s.color,letterSpacing:'-0.5px'}}>{s.value}</div>
            <div style={{fontSize:11,color:C.text2,marginTop:3,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="ru" style={{background:'white',borderRadius:16,border:`1px solid ${C.border}`,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.05)'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{position:'relative'}}>
            <svg style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="14" height="14" fill="none" stroke={C.text3} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="ابحث بالاسم أو الفئة أو الباركود..."
              style={{...inp,paddingRight:38,background:'#fafafa',border:`1.5px solid ${C.border}`}}/>
          </div>
        </div>

        {loading ? (
          <div style={{padding:56,textAlign:'center'}}>
            <div style={{width:36,height:36,border:'3px solid #f1f5f9',borderTopColor:C.green,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 12px'}}/>
            <div style={{fontSize:13,color:C.text3}}>جاري التحميل...</div>
          </div>
        ) : filtered.length===0 ? (
          <div style={{padding:56,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:10}}>📦</div>
            <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:4}}>{search?'لا توجد نتائج':'المخزون فارغ'}</div>
            <div style={{fontSize:12,color:C.text3}}>{search?'جرب كلمة أخرى':'ابدأ بإضافة منتجك الأول'}</div>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="mob-cards">
              <style>{`@media(min-width:640px){.mob-cards{display:none!important}.desk-table{display:block!important}}`}</style>
              {paginated.map((p,i)=>{
                const isLow=p.qty<=p.reorder_point
                return (
                  <div key={p.id} style={{padding:'14px 16px',borderBottom:i<paginated.length-1?`1px solid ${C.border}`:'none',display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:44,height:44,borderRadius:12,background:isLow?C.redL:C.greenL,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${isLow?C.redB:C.greenB}`}}>
                      <span style={{fontSize:14,fontWeight:900,color:isLow?C.red:C.green}}>{p.qty}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{p.name}</div>
                      <div style={{fontSize:11,color:C.text3,display:'flex',gap:8}}>
                        {p.category&&<span>{p.category}</span>}
                        <span>الحد: {p.reorder_point} {p.unit}</span>
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
                      <span style={{background:isLow?C.redL:C.greenL,color:isLow?C.red:C.green,padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:700,border:`1px solid ${isLow?C.redB:C.greenB}`}}>
                        {isLow?'ناقص':'كافي'}
                      </span>
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={()=>openEdit(p)} className="act-btn" style={{background:'#eff6ff',color:'#2563eb'}}>تعديل</button>
                        <button onClick={()=>setConfirm({id:p.id,name:p.name})} className="act-btn" style={{background:C.redL,color:C.red}}>حذف</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table */}
            <div className="desk-table" style={{display:'none',overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:480}}>
                <thead>
                  <tr style={{background:'#fafafa',borderBottom:`1px solid ${C.border}`}}>
                    {['المنتج','الفئة','الكمية','الحد الأدنى','الحالة',''].map((h,i)=>(
                      <th key={i} className={i===1||i===3?'hide-mob':''} style={{padding:'10px 16px',color:C.text3,fontSize:11,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(p=>{
                    const isLow=p.qty<=p.reorder_point
                    return (
                      <tr key={p.id} className="trow" style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:'13px 16px'}}>
                          <div style={{fontWeight:700,fontSize:14,color:C.text}}>{p.name}</div>
                          {p.sku&&<div style={{fontSize:11,color:C.text3,marginTop:1}}>{p.sku}</div>}
                        </td>
                        <td className="hide-mob" style={{padding:'13px 16px'}}>
                          {p.category?<span style={{background:'#f8fafc',color:'#475569',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>{p.category}</span>:<span style={{color:C.text3}}>—</span>}
                        </td>
                        <td style={{padding:'13px 16px',whiteSpace:'nowrap' as const}}>
                          <span style={{fontWeight:900,fontSize:16,color:isLow?C.red:C.text}}>{p.qty}</span>
                          <span style={{fontSize:11,color:C.text3,marginRight:3}}>{p.unit}</span>
                        </td>
                        <td className="hide-mob" style={{padding:'13px 16px',color:C.text3,fontSize:12}}>{p.reorder_point} {p.unit}</td>
                        <td style={{padding:'13px 16px'}}>
                          <span style={{background:isLow?C.redL:C.greenL,color:isLow?C.red:C.green,padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700,border:`1px solid ${isLow?C.redB:C.greenB}`}}>
                            {isLow?'ناقص':'كافي'}
                          </span>
                        </td>
                        <td style={{padding:'13px 16px'}}>
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>openEdit(p)} className="act-btn" style={{background:'#eff6ff',color:'#2563eb'}}>تعديل</button>
                            <button onClick={()=>setConfirm({id:p.id,name:p.name})} className="act-btn" style={{background:C.redL,color:C.red}}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination total={filtered.length} page={page} perPage={PER} onPage={setPage}/>
          </>
        )}
      </div>
    </div>
  )
}
