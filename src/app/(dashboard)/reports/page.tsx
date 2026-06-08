'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import { colors, radius, font, card, btnPrimary, btnSecondary, inp, tag, pageTitle, pageSub } from '@/lib/ds'

function Tab({ label, icon, active, onClick }: { label:string; icon:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'14px 16px',
      background: active ? '#fff' : 'transparent', border: 'none',
      borderBottom: active ? `3px solid ${colors.primary}` : '3px solid transparent',
      color: active ? colors.primary : colors.text3,
      fontSize: '13px', fontWeight: active ? 700 : 600, flex: 1,
      cursor: 'pointer', fontFamily: font.family, transition: 'all .2s ease', whiteSpace: 'nowrap' as const,
    }}>
      <span style={{fontSize:16}}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function StatCard({ label, value, color, bg, border }: any) {
  return (
    <div style={{
      background:bg, borderRadius:radius.md, padding:'16px 12px', border:`1px solid ${border}`, 
      textAlign:'center' as const, minWidth:'120px', flex:'1 1 0px',
      boxShadow:'0 2px 4px rgba(0,0,0,0.01)'
    }}>
      <div style={{fontSize:'18px', fontWeight:900, color, lineHeight:1.2, whiteSpace:'nowrap' as const}}>{value}</div>
      <div style={{fontSize:'11px', color:colors.text3, marginTop:4, fontWeight:600, whiteSpace:'nowrap' as const}}>{label}</div>
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
      {/* هيدر الإحصائيات سريع التمرير على الجوال */}
      <div style={{display:'flex', gap:10, marginBottom:16, overflowX:'auto', paddingBottom:4, msOverflowStyle:'none', scrollbarWidth:'none'}}>
        <StatCard label="المصروف"  value={totalQty} color={colors.danger}  bg={colors.dangerLight}  border={colors.dangerBorder}/>
        <StatCard label="العمليات"  value={filtered.length} color={colors.info}    bg={colors.infoLight}    border={colors.infoBorder}/>
        <StatCard label="الأصناف"  value={Object.keys(productMap).length} color='#8b5cf6' bg='#f5f3ff' border='#ddd6fe'/>
      </div>

      {topProducts.length>0&&(
        <div style={{...card, padding:14, marginBottom:16, border:`1px solid ${colors.border}`}}>
          <div style={{fontSize:'12px', fontWeight:700, color:colors.text, marginBottom:12}}>🏆 الأكثر صرفاً</div>
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {topProducts.map(([name,qty],i)=>{
              const pct=Math.round((qty/topProducts[0][1])*100)
              return (<div key={i} style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{width:24, height:24, borderRadius:radius.sm, background:barColors[i]+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}><span style={{fontSize:11, fontWeight:800, color:barColors[i]}}>{i+1}</span></div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}><span style={{fontSize:'12px', fontWeight:600, color:colors.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const}}>{name}</span><span style={{fontSize:'12px', fontWeight:800, color:barColors[i]}}>{qty}</span></div>
                  <div style={{height:4, background:colors.bg, borderRadius:99}}><div style={{height:'100%', width:pct+'%', background:barColors[i], borderRadius:99}}/></div>
                </div>
              </div>)
            })}
          </div>
        </div>
      )}

      {/* شريط الفلاتر متوافق مع شاشات الجوال الصغيرة */}
      <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن منتج أو ملاحظة..." style={{...inp(), width:'100%', height:'42px'}}/>
        <div style={{display:'flex', gap:8}}>
          <button onClick={()=>setShowFilter(!showFilter)} style={{...btnSecondary, flex:1, fontSize:'12px', height:'40px', justifyContent:'center', background:showFilter?colors.primaryLight:colors.surface, borderColor:showFilter?colors.primaryBorder:colors.border2, color:showFilter?colors.primary:colors.text3}}>📅 الفلترة بالتاريخ</button>
          <button onClick={exportCSV} style={{...btnPrimary, flex:1, fontSize:'12px', height:'40px', justifyContent:'center'}}>📥 تصدير ملف Excel</button>
          {hasFilter&&<button onClick={()=>{setSearch('');setDateFrom('');setDateTo('');setShowFilter(false)}} style={{...btnSecondary, width:'40px', height:'40px', padding:0, justifyContent:'center', color:colors.danger, borderColor:colors.dangerBorder}}>✕</button>}
        </div>
      </div>
        
      {showFilter&&(
        <div style={{padding:'12px', borderRadius:radius.md, marginBottom:14, background:colors.bg, border:`1px solid ${colors.border}`, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <div><label style={{fontSize:'11px', fontWeight:700, color:colors.text3, display:'block', marginBottom:4}}>من تاريخ</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp(), height:'36px', fontSize:'11px'}}/></div>
          <div><label style={{fontSize:'11px', fontWeight:700, color:colors.text3, display:'block', marginBottom:4}}>إلى تاريخ</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...inp(), height:'36px', fontSize:'11px'}}/></div>
        </div>
      )}

      {loading?(
        <div style={{padding:40, textAlign:'center'}}><div style={{width:32, height:32, border:`3px solid ${colors.border}`, borderTopColor:colors.primary, borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 12px'}}/></div>
      ):filtered.length===0?(
        <div style={{...card, padding:40, textAlign:'center', border:`1px solid ${colors.border}`}}><div style={{fontSize:36, marginBottom:8}}>📭</div><div style={{fontSize:'13px', fontWeight:600, color:colors.text3}}>لا توجد عمليات صرف</div></div>
      ):(
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {/* تحويل الجدول إلى بطاقات (Cards Layout) مناسبة لتطبيقات الجوال */}
          {filtered.map((m)=>(
            <div key={m.id} style={{...card, padding:12, border:`1px solid ${colors.border}`, display:'flex', flexDirection:'column', gap:8}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:'14px', fontWeight:700, color:colors.text}}>{(m.products as any)?.name}</div>
                  <div style={{fontSize:'11px', color:colors.text4, marginTop:2}}>{new Date(m.created_at).toLocaleDateString('ar-SA')}</div>
                </div>
                <span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder), fontSize:'11px', padding:'4px 8px', fontWeight:700, borderRadius:radius.sm}}>
                  ▼ {Math.abs(m.qty_change)} {(m.products as any)?.unit}
                </span>
              </div>
              {m.note && (
                <div style={{fontSize:'11px', color:colors.text3, background:colors.bg, padding:'6px 10px', borderRadius:radius.sm, borderLeft:`2px solid ${colors.border2}`}}>
                  💬 {m.note}
                </div>
              )}
            </div>
          ))}
          <div style={{padding:'12px', borderRadius:radius.md, background:colors.primaryLight, border:`1px solid ${colors.primaryBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4}}>
            <span style={{fontSize:'12px', fontWeight:700, color:colors.primary}}>{filtered.length} عملية</span>
            <span style={{fontSize:'12px', fontWeight:800, color:colors.primary}}>{totalQty} وحدة مصروفة</span>
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
      {/* كروت الإحصائيات المالية سريعة التمرير العرضي */}
      <div style={{display:'flex', gap:10, marginBottom:16, overflowX:'auto', paddingBottom:4, msOverflowStyle:'none', scrollbarWidth:'none'}}>
        <StatCard label="الصافي" value={totalAmount.toFixed(0)+' ر.س'} color={colors.text2} bg={colors.bg} border={colors.border2}/>
        <StatCard label="الضريبة" value={totalVat.toFixed(0)+' ر.س'} color={colors.warning} bg={colors.warningLight} border={colors.warningBorder}/>
        <StatCard label="الإجمالي" value={totalWithVat.toFixed(0)+' ر.س'} color={colors.primary} bg={colors.primaryLight} border={colors.primaryBorder}/>
        <StatCard label="الفواتير" value={filtered.length} color={colors.info} bg={colors.infoLight} border={colors.infoBorder}/>
      </div>

      {/* عناصر التحكم والتصفية على الموبايل */}
      <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم الصنف أو المورد..." style={{...inp(), width:'100%', height:'42px'}}/>
        <div style={{display:'flex', gap:8}}>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...inp(), flex:1, height:'40px', fontSize:'12px', padding:'0 8px'}}><option value="">كل الفئات</option><option value="مخزون">مخزون</option><option value="صيانة">صيانة</option><option value="أخرى">أخرى</option></select>
          <button onClick={exportCSV} style={{...btnPrimary, flex:1, fontSize:'12px', height:'40px', justifyContent:'center'}}>📥 تصدير Excel</button>
        </div>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp(), flex:1, height:'36px', fontSize:'11px', padding:'0 6px'}}/>
          <span style={{fontSize:11, color:colors.text4}}>إلى</span>
          <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   style={{...inp(), flex:1, height:'36px', fontSize:'11px', padding:'0 6px'}}/>
          {hasFilter&&<button onClick={()=>{setSearch('');setFilterCat('');setDateFrom('');setDateTo('')}} style={{...btnSecondary, width:'36px', height:'36px', padding:0, justifyContent:'center', color:colors.danger, borderColor:colors.dangerBorder}}>✕</button>}
        </div>
      </div>

      {loading?(
        <div style={{padding:40, textAlign:'center'}}><div style={{width:32, height:32, border:`3px solid ${colors.border}`, borderTopColor:colors.primary, borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 12px'}}/></div>
      ):filtered.length===0?(
        <div style={{...card, padding:40, textAlign:'center', border:`1px solid ${colors.border}`}}><div style={{fontSize:36, marginBottom:8}}>🧾</div><div style={{fontSize:'13px', fontWeight:600, color:colors.text3}}>لا توجد فواتير</div></div>
      ):(
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {/* واجهة عرض كروت الفواتير المحسنة بالكامل لتطبيق جوال أصيل */}
          {filtered.map((p)=>(
            <div key={p.id} style={{...card, padding:14, border:`1px solid ${colors.border}`, display:'flex', flexDirection:'column', gap:10}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontSize:'14px', fontWeight:700, color:colors.text}}>{p.name}</div>
                  <div style={{fontSize:'11px', color:colors.text4, marginTop:2}}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</div>
                </div>
                <span style={{...catTag(p.category), fontSize:'11px', padding:'3px 8px', borderRadius:radius.sm}}>{p.category}</span>
              </div>
              
              <div style={{display:'flex', justifyContent:'space-between', background:colors.bg, padding:'8px 12px', borderRadius:radius.sm, border:`1px solid ${colors.border2}`}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'10px', color:colors.text4}}>الصافي</div>
                  <div style={{fontSize:'12px', fontWeight:600, color:colors.text2}}>{Number(p.amount||0).toFixed(1)}</div>
                </div>
                <div style={{textAlign:'center', borderLeft:`1px dashed ${colors.border2}`, borderRight:`1px dashed ${colors.border2}`, padding:'0 14px'}}>
                  <div style={{fontSize:'10px', color:colors.text4}}>الضريبة</div>
                  <div style={{fontSize:'12px', fontWeight:600, color:colors.warning}}>{Number(p.vat_amount||0).toFixed(1)}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'10px', color:colors.text4}}>الإجمالي</div>
                  <div style={{fontSize:'13px', fontWeight:800, color:colors.primary}}>{Number(p.total_amount||0).toFixed(1)} ر.س</div>
                </div>
              </div>

              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'11px', color:colors.text3, borderTop:`1px solid ${colors.bg}`, paddingTop:8}}>
                <div>🏢 المورد: <span style={{fontWeight:600, color:colors.text}}>{p.supplier||'—'}</span></div>
                {p.invoice_image ? (
                  <a href={p.invoice_image} target="_blank" rel="noreferrer" style={{color:colors.info, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:3}}>📎 عرض المرفق</a>
                ) : (
                  <span style={{color:'#cbd5e1'}}>بدون مرفق</span>
                )}
              </div>
            </div>
          ))}
          
          <div style={{padding:'12px', borderRadius:radius.md, background:colors.primaryLight, border:`1px solid ${colors.primaryBorder}`, display:'flex', flexDirection:'column', gap:4, marginTop:4}}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', color:colors.text3}}>
              <span>عدد الفواتير الكلي:</span>
              <span style={{fontWeight:700}}>{filtered.length} فاتورة</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'14px', fontWeight:800, color:colors.primary, borderTop:`1px dashed ${colors.primaryBorder}`, paddingTop:4}}>
              <span>إجمالي المشتريات:</span>
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
    <div style={{fontFamily:font.family, direction:'rtl', maxWidth:500, margin:'0 auto', padding:'12px'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{marginBottom:16, padding:'0 4px'}}>
        <h1 style={{...pageTitle, fontSize:'20px', fontWeight:800, color:colors.text}}>مركز التقارير</h1>
        <p style={{...pageSub, marginTop:2, fontSize:'12px', color:colors.text4}}>حركة مخرجات المخزن والتحليلات المالية والمشتريات</p>
      </div>
      <div style={{...card, padding:0, marginBottom:16, overflow:'hidden', border:`1px solid ${colors.border}`, boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex', borderBottom:`1px solid ${colors.border}`, background:'#f8fafc'}}>
          <Tab label="حركة الصرف" icon="📤" active={tab==='dispense'} onClick={()=>setTab('dispense')}/>
          <Tab label="المشتريات والضريبة" icon="🧾" active={tab==='purchase'} onClick={()=>setTab('purchase')}/>
        </div>
        <div style={{padding:'12px'}}>
          {tab==='dispense' && <DispenseReport/>}
          {tab==='purchase' && <PurchaseReport/>}
        </div>
      </div>
    </div>
  )
}
