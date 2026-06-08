'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import { colors, radius, font, card, btnPrimary, btnSecondary, inp, tag, pageTitle, pageSub } from '@/lib/ds'

// مكون التبويب المطور مخصص للمس المريح على الجوال
function MobileTab({ label, icon, active, onClick }: { label:string; icon:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, 
      padding:'12px 8px', background: active ? '#ffffff' : 'transparent', border: 'none',
      borderRadius: active ? radius.md : '0',
      boxShadow: active ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
      color: active ? colors.primary : colors.text3,
      fontSize: '12px', fontWeight: active ? 750 : 600, flex: 1,
      cursor: 'pointer', fontFamily: font.family, transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
      whiteSpace: 'nowrap' as const,
    }}>
      <span style={{fontSize:18, transform: active ? 'scale(1.1)' : 'scale(1)', transition:'transform 0.2s'}}>{icon}</span>
      <span style={{letterSpacing:'-0.2px'}}>{label}</span>
    </button>
  )
}

// كروت إحصائيات بنظام الفلو المريح هاتفياً
function MobileStatCard({ label, value, color, bg, border }: any) {
  return (
    <div style={{
      background: bg, borderRadius: radius.md, padding: '14px 12px', 
      border: `1px solid ${border}`, textAlign: 'center' as const, 
      minWidth: '105px', flex: '1 1 0px', display: 'flex', flexDirection: 'column', 
      justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
    }}>
      <div style={{fontSize: '17px', fontWeight: 900, color, lineHeight: 1.1, letterSpacing: '-0.5px'}}>{value}</div>
      <div style={{fontSize: '10.5px', color: colors.text3, marginTop: 5, fontWeight: 600, opacity: 0.9}}>{label}</div>
    </div>
  )
}

function DispenseReport() {
  const [movements, setMovements] = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const sb = createClient()

  useEffect(() => { load() }, [])
  useEffect(() => { applyFilter() }, [movements, search, dateFrom, dateTo])
  useVisibilityRefresh(load, 20*60*1000)

  async function load() {
    setLoading(true)
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) { setLoading(false); return }
    const { data } = await sb.from('stock_movements')
      .select('*, products!inner(name,unit,org_id)')
      .eq('type','out').eq('products.org_id', orgId)
      .order('created_at',{ascending:false})
    setMovements(data||[])
    setLoading(false)
  }

  function applyFilter() {
    let r = [...movements]
    if (search)   r = r.filter(m => (m.products as any)?.name?.toLowerCase().includes(search.toLowerCase())||m.note?.toLowerCase().includes(search.toLowerCase()))
    if (dateFrom) r = r.filter(m => new Date(m.created_at)>=new Date(dateFrom))
    if (dateTo)   r = r.filter(m => new Date(m.created_at)<=new Date(dateTo+'T23:59:59'))
    setFiltered(r)
  }

  function exportCSV() {
    const csv = '\ufeff' + [['التاريخ','المنتج','الكمية','الوحدة','الملاحظة'],...filtered.map(m=>[new Date(m.created_at).toLocaleDateString('ar-SA'),(m.products as any)?.name||'',Math.abs(m.qty_change),(m.products as any)?.unit||'',m.note||''])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_الصرف.csv'}).click()
  }

  const totalQty = filtered.reduce((s,m)=>s+Math.abs(m.qty_change),0)
  const productMap: Record<string,number> = {}
  filtered.forEach(m=>{ const n=(m.products as any)?.name||'غير معروف'; productMap[n]=(productMap[n]||0)+Math.abs(m.qty_change) })
  const topProducts = Object.entries(productMap).sort((a,b)=>b[1]-a[1]).slice(0,3)
  const barColors = [colors.primary, colors.info, '#8b5cf6']
  const hasFilter = !!(search||dateFrom||dateTo)

  return (
    <div>
      {/* إحصائيات علوية مرنة وبدون أشرطة تمرير مزعجة */}
      <div style={{display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4, WebkitOverflowScrolling:'touch'}}>
        <MobileStatCard label="إجمالي المصروف" value={totalQty} color={colors.danger} bg={colors.dangerLight} border={colors.dangerBorder}/>
        <MobileStatCard label="العمليات" value={filtered.length} color={colors.info} bg={colors.infoLight} border={colors.infoBorder}/>
        <MobileStatCard label="أصناف فريدة" value={Object.keys(productMap).length} color='#8b5cf6' bg='#f5f3ff' border='#ddd6fe'/>
      </div>

      {topProducts.length > 0 && (
        <div style={{...card, padding:'14px', marginBottom:16, border:`1px solid ${colors.border}`, borderRadius:radius.md, background:'#ffffff'}}>
          <div style={{fontSize:'12px', fontWeight:800, color:colors.text, marginBottom:12, display:'flex', alignItems:'center', gap:6}}>🏆 الأكثر طلباً وصرفاً</div>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            {topProducts.map(([name,qty],i)=>{
              const pct=Math.round((qty/topProducts[0][1])*100)
              return (<div key={i} style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{width:24, height:24, borderRadius:'50%', background:barColors[i]+'12', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}><span style={{fontSize:11, fontWeight:900, color:barColors[i]}}>{i+1}</span></div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}><span style={{fontSize:'12.5px', fontWeight:600, color:colors.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const}}>{name}</span><span style={{fontSize:'12px', fontWeight:800, color:barColors[i]}}>{qty}</span></div>
                  <div style={{height:5, background:'#f1f5f9', borderRadius:99}}><div style={{height:'100%', width:pct+'%', background:barColors[i], borderRadius:99, transition:'width 0.6s ease'}}/></div>
                </div>
              </div>)
            })}
          </div>
        </div>
      )}

      {/* عناصر التحكم والبحث الفوري الفخم */}
      <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:12}}>
        <div style={{position:'relative', width:'100%'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن منتج، كود، أو ملاحظة..." style={{...inp(), width:'100%', height:'44px', paddingRight:'12px', fontSize:'13px', borderRadius:radius.md, border:`1px solid ${colors.border2}`}}/>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={()=>setShowFilter(!showFilter)} style={{...btnSecondary, flex:1, fontSize:'12.5px', height:'42px', justifyContent:'center', borderRadius:radius.md, background:showFilter?colors.primaryLight:colors.surface, borderColor:showFilter?colors.primaryBorder:colors.border2, color:showFilter?colors.primary:colors.text3}}>📅 نطاق التاريخ</button>
          <button onClick={exportCSV} style={{...btnPrimary, flex:1, fontSize:'12.5px', height:'42px', justifyContent:'center', borderRadius:radius.md, boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>📥 تصدير البيانات</button>
          {hasFilter&&<button onClick={()=>{setSearch('');setDateFrom('');setDateTo('');setShowFilter(false)}} style={{...btnSecondary, width:'42px', height:'42px', padding:0, justifyContent:'center', borderRadius:radius.md, color:colors.danger, borderColor:colors.dangerBorder, background:'#fffafb'}}>✕</button>}
        </div>
      </div>
        
      {showFilter&&(
        <div style={{padding:'12px', borderRadius:radius.md, marginBottom:12, background:'#f8fafc', border:`1px solid ${colors.border}`, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, animation:'fadeIn 0.2s ease'}}>
          <div><label style={{fontSize:'11px', fontWeight:700, color:colors.text3, display:'block', marginBottom:4}}>من تاريخ</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp(), height:'38px', fontSize:'12px', borderRadius:radius.sm}}/></div>
          <div><label style={{fontSize:'11px', fontWeight:700, color:colors.text3, display:'block', marginBottom:4}}>إلى تاريخ</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...inp(), height:'38px', fontSize:'12px', borderRadius:radius.sm}}/></div>
        </div>
      )}

      {loading?(
        <div style={{padding:50, textAlign:'center'}}><div style={{width:28, height:28, border:`2.5px solid ${colors.border}`, borderTopColor:colors.primary, borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto'}}/></div>
      ):filtered.length===0?(
        <div style={{...card, padding:'48px 16px', textAlign:'center', border:`1px solid ${colors.border}`, borderRadius:radius.md, background:'#fff'}}><div style={{fontSize:32, marginBottom:6}}>📭</div><div style={{fontSize:'13px', fontWeight:600, color:colors.text3}}>لا توجد نتائج مطابقة للفلاتر</div></div>
      ):(
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {/* كروت الصرف الفاخرة المخصصة بالكامل للموبايل */}
          {filtered.map((m)=>(
            <div key={m.id} style={{...card, padding:'14px 12px', border:`1px solid ${colors.border}`, borderRadius:radius.md, background:'#ffffff', display:'flex', flexDirection:'column', gap:8, boxShadow:'0 1px 3px rgba(0,0,0,0.01)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:'13.5px', fontWeight:750, color:colors.text, textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' as const}}>{(m.products as any)?.name}</div>
                  <div style={{fontSize:'11px', color:colors.text4, marginTop:3, display:'flex', alignItems:'center', gap:4}}>📆 {new Date(m.created_at).toLocaleDateString('ar-SA')}</div>
                </div>
                <span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder), fontSize:'11.5px', padding:'4px 10px', fontWeight:800, borderRadius:radius.sm, flexShrink:0}}>
                  ▼ {Math.abs(m.qty_change)} {(m.products as any)?.unit}
                </span>
              </div>
              {m.note && (
                <div style={{fontSize:'11px', color:colors.text2, background:'#f8fafc', padding:'8px 10px', borderRadius:radius.sm, borderRight:`3px solid ${colors.border2}`, lineHeight:1.4}}>
                  {m.note}
                </div>
              )}
            </div>
          ))}
          <div style={{padding:'14px 12px', borderRadius:radius.md, background:colors.primaryLight, border:`1px solid ${colors.primaryBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6}}>
            <span style={{fontSize:'12.5px', fontWeight:700, color:colors.primary}}>{filtered.length} حركة صرف</span>
            <span style={{fontSize:'12.5px', fontWeight:850, color:colors.primary}}>{totalQty} وحدة إجمالاً</span>
          </div>
        </div>
      )}
    </div>
  )
}

function PurchaseReport() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const sb = createClient()

  useEffect(() => { load() }, [])
  useEffect(() => { applyFilter() }, [purchases, search, filterCat, dateFrom, dateTo])

  async function load() {
    setLoading(true)
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) { setLoading(false); return }
    const { data } = await sb.from('purchases').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
    setPurchases(data || [])
    setLoading(false)
  }

  function applyFilter() {
    let r = [...purchases]
    if (search)    r = r.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.supplier?.toLowerCase().includes(search.toLowerCase()))
    if (filterCat) r = r.filter(p => p.category === filterCat)
    if (dateFrom)  r = r.filter(p => new Date(p.created_at) >= new Date(dateFrom))
    if (dateTo)    r = r.filter(p => new Date(p.created_at) <= new Date(dateTo + 'T23:59:59'))
    setFiltered(r)
  }

  function exportCSV() {
    const csv = '\ufeff' + [['التاريخ','الصنف','النوع','بدون ضريبة','الضريبة','الإجمالي','المورد'],...filtered.map(p=>[new Date(p.created_at).toLocaleDateString('ar-SA'),p.name||'',p.category||'',Number(p.amount||0).toFixed(2),Number(p.vat_amount||0).toFixed(2),Number(p.total_amount||0).toFixed(2),p.supplier||''])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_المشتريات.csv'}).click()
  }

  const totalAmount  = filtered.reduce((s,p)=>s+Number(p.amount||0),0)
  const totalVat     = filtered.reduce((s,p)=>s+Number(p.vat_amount||0),0)
  const totalWithVat = filtered.reduce((s,p)=>s+Number(p.total_amount||0),0)
  const hasFilter    = !!(search||filterCat||dateFrom||dateTo)
  const catTag = (c:string) => c==='مخزون'?tag(colors.primary,colors.primaryLight,colors.primaryBorder):c==='صيانة'?tag(colors.warning,colors.warningLight,colors.warningBorder):tag(colors.text3,colors.bg,colors.border2)

  return (
    <div>
      {/* بطاقات المؤشرات المالية الاحترافية المستوحاة من التطبيقات البنكية */}
      <div style={{display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4, WebkitOverflowScrolling:'touch'}}>
        <MobileStatCard label="الصافي (بدون ضريبة)" value={totalAmount.toFixed(1)+' ر.س'} color={colors.text2} bg={colors.bg} border={colors.border2}/>
        <MobileStatCard label="الضريبة (15%)" value={totalVat.toFixed(1)+' ر.س'} color={colors.warning} bg={colors.warningLight} border={colors.warningBorder}/>
        <MobileStatCard label="الإجمالي الشامل" value={totalWithVat.toFixed(1)+' ر.س'} color={colors.primary} bg={colors.primaryLight} border={colors.primaryBorder}/>
        <MobileStatCard label="الفواتير" value={filtered.length} color={colors.info} bg={colors.infoLight} border={colors.infoBorder}/>
      </div>

      {/* حقول التحكم الذكية */}
      <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم الصنف، الفاتورة أو المورد..." style={{...inp(), width:'100%', height:'44px', fontSize:'13px', borderRadius:radius.md}}/>
        <div style={{display:'flex', gap:8}}>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...inp(), flex:1, height:'42px', fontSize:'12.5px', borderRadius:radius.md, padding:'0 8px', background:'#fff', border:`1px solid ${colors.border2}`}}><option value="">كل الفئات</option><option value="مخزون">مخزون</option><option value="صيانة">صيانة</option><option value="أخرى">أخرى</option></select>
          <button onClick={exportCSV} style={{...btnPrimary, flex:1, fontSize:'12.5px', height:'42px', justifyContent:'center', borderRadius:radius.md}}>📥 تصدير Excel</button>
        </div>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp(), flex:1, height:'38px', fontSize:'11.5px', padding:'0 6px', borderRadius:radius.sm}}/>
          <span style={{fontSize:11, color:colors.text4}}>إلى</span>
          <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   style={{...inp(), flex:1, height:'38px', fontSize:'11.5px', padding:'0 6px', borderRadius:radius.sm}}/>
          {hasFilter&&<button onClick={()=>{setSearch('');setFilterCat('');setDateFrom('');setDateTo('')}} style={{...btnSecondary, width:'38px', height:'38px', padding:0, justifyContent:'center', borderRadius:radius.sm, color:colors.danger, borderColor:colors.dangerBorder}}>✕</button>}
        </div>
      </div>

      {loading?(
        <div style={{padding:50, textAlign:'center'}}><div style={{width:28, height:28, border:`2.5px solid ${colors.border}`, borderTopColor:colors.primary, borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto'}}/></div>
      ):filtered.length===0?(
        <div style={{...card, padding:'48px 16px', textAlign:'center', border:`1px solid ${colors.border}`, borderRadius:radius.md, background:'#fff'}}><div style={{fontSize:32, marginBottom:6}}>🧾</div><div style={{fontSize:'13px', fontWeight:600, color:colors.text3}}>لا توجد فواتير مسجلة</div></div>
      ):(
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {/* كروت الفواتير الفخمة بتوزيع مالي دقيق وجذاب */}
          {filtered.map((p)=>(
            <div key={p.id} style={{...card, padding:'14px', border:`1px solid ${colors.border}`, borderRadius:radius.md, background:'#ffffff', display:'flex', flexDirection:'column', gap:10, boxShadow:'0 1px 3px rgba(0,0,0,0.01)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontSize:'13.5px', fontWeight:750, color:colors.text}}>{p.name}</div>
                  <div style={{fontSize:'11px', color:colors.text4, marginTop:2}}>📅 {new Date(p.created_at).toLocaleDateString('ar-SA')}</div>
                </div>
                <span style={{...catTag(p.category), fontSize:'10.5px', padding:'4px 8px', fontWeight:700, borderRadius:radius.sm}}>{p.category}</span>
              </div>
              
              <div style={{display:'flex', justifyContent:'space-between', background:'#f8fafc', padding:'8px 10px', borderRadius:radius.md, border:`1px solid ${colors.border2}`}}>
                <div style={{textAlign:'center', flex:1}}>
                  <div style={{fontSize:'10px', color:colors.text4, marginBottom:2}}>الصافي</div>
                  <div style={{fontSize:'12px', fontWeight:700, color:colors.text2}}>{Number(p.amount||0).toFixed(2)}</div>
                </div>
                <div style={{textAlign:'center', flex:1, borderLeft:`1px dashed ${colors.border2}`, borderRight:`1px dashed ${colors.border2}`}}>
                  <div style={{fontSize:'10px', color:colors.text4, marginBottom:2}}>الضريبة</div>
                  <div style={{fontSize:'12px', fontWeight:700, color:colors.warning}}>{Number(p.vat_amount||0).toFixed(2)}</div>
                </div>
                <div style={{textAlign:'center', flex:1}}>
                  <div style={{fontSize:'10px', color:colors.text4, marginBottom:2}}>الإجمالي</div>
                  <div style={{fontSize:'13px', fontWeight:850, color:colors.primary}}>{Number(p.total_amount||0).toFixed(2)}</div>
                </div>
              </div>

              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'11.5px', color:colors.text3, borderTop:`1px solid #f1f5f9`, paddingTop:8}}>
                <div style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, paddingLeft:4}}>🏢 {p.supplier||'مورد غير معرف'}</div>
                {p.invoice_image ? (
                  <a href={p.invoice_image} target="_blank" rel="noreferrer" style={{color:colors.info, fontWeight:750, textDecoration:'none', display:'flex', alignItems:'center', gap:2, flexShrink:0, borderBottom:`1px solid ${colors.infoLight}`}}>📎 عرض الفاتورة</a>
                ) : (
                  <span style={{color:'#cbd5e1', flexShrink:0}}>بدون مرفق</span>
                )}
              </div>
            </div>
          ))}
          
          <div style={{padding:'12px 14px', borderRadius:radius.md, background:colors.primaryLight, border:`1px solid ${colors.primaryBorder}`, display:'flex', flexDirection:'column', gap:4, marginTop:4}}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', color:colors.text3}}>
              <span>إجمالي المستندات المفلترة:</span>
              <span style={{fontWeight:700}}>{filtered.length} فاتورة</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'14px', fontWeight:850, color:colors.primary, borderTop:`1px dashed ${colors.primaryBorder}`, paddingTop:6, marginTop:2}}>
              <span>المجموع النهائي شامل الضريبة:</span>
              <span>{totalWithVat.toFixed(2)} ر.س</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'dispense'|'purchase'>('dispense')
  return (
    <div style={{fontFamily:font.family, direction:'rtl', maxWidth:480, margin:'0 auto', padding:'12px 8px'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      
      {/* عنوان الصفحة العصري والمبسط */}
      <div style={{marginBottom:16, padding:'0 4px'}}>
        <h1 style={{...pageTitle, fontSize:'20px', fontWeight:900, color:colors.text, letterSpacing:'-0.5px'}}>مركز التقارير الذكي</h1>
        <p style={{...pageSub, marginTop:2, fontSize:'11.5px', color:colors.text4}}>متابعة حركة المخزون، المصاريف، والضرائب بدقة</p>
      </div>

      {/* حاوية التبويبات والمحتوى المستوحاة من تطبيقات الـ FinTech الحديثة */}
      <div style={{...card, padding:0, marginBottom:16, overflow:'hidden', border:`1px solid ${colors.border}`, boxShadow:'0 4px 14px rgba(0,0,0,0.03)', background:'#ffffff', borderRadius:radius.lg}}>
        <div style={{display:'flex', padding:'4px', background:'#f1f5f9', borderRadius:radius.md, margin:'10px 10px 0'}}>
          <MobileTab label="حركة الصرف" icon="📤" active={tab==='dispense'} onClick={()=>setTab('dispense')}/>
          <MobileTab label="المشتريات والضريبة" icon="🧾" active={tab==='purchase'} onClick={()=>setTab('purchase')}/>
        </div>
        <div style={{padding:'14px 10px 10px'}}>
          {tab==='dispense' && <DispenseReport/>}
          {tab==='purchase' && <PurchaseReport/>}
        </div>
      </div>
    </div>
  )
}
