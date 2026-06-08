'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import { colors, radius, font, card, btnPrimary, btnSecondary, inp, tag, pageTitle, pageSub } from '@/lib/ds'

function Tab({ label, icon, active, onClick }: { label:string; icon:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:8, padding:'12px 20px',
      background: active ? '#fff' : 'transparent', border: 'none',
      borderBottom: active ? `2px solid ${colors.primary}` : '2px solid transparent',
      color: active ? colors.primary : colors.text3,
      fontSize: '12px', fontWeight: active ? 700 : 600,
      cursor: 'pointer', fontFamily: font.family, transition: 'all .15s', whiteSpace: 'nowrap' as const,
    }}>
      <span style={{fontSize:16}}>{icon}</span>{label}
    </button>
  )
}

function StatCard({ label, value, color, bg, border }: any) {
  return (
    <div style={{background:bg,borderRadius:radius.lg,padding:'16px',border:`1.5px solid ${border}`,textAlign:'center' as const}}>
      <div style={{fontSize:'22px',fontWeight:900,color,letterSpacing:'-1px',lineHeight:1}}>{value}</div>
      <div style={{fontSize:'11px',color:colors.text3,marginTop:5,fontWeight:600}}>{label}</div>
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
    if (search)   r = r.filter(m => (m.products as any)?.name?.includes(search)||m.note?.includes(search))
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
  const topProducts = Object.entries(productMap).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const barColors = [colors.primary, colors.info, '#8b5cf6', colors.warning, colors.danger]
  const hasFilter = !!(search||dateFrom||dateTo)

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
        <StatCard label="كميات مصروفة"  value={totalQty}                       color={colors.danger}  bg={colors.dangerLight}  border={colors.dangerBorder}/>
        <StatCard label="عمليات الصرف"  value={filtered.length}                color={colors.info}    bg={colors.infoLight}    border={colors.infoBorder}/>
        <StatCard label="أصناف مختلفة"  value={Object.keys(productMap).length} color='#8b5cf6'        bg='#f5f3ff'             border='#ddd6fe'/>
      </div>
      {topProducts.length>0&&(
        <div style={{...card,padding:18,marginBottom:14}}>
          <div style={{fontSize:'13px',fontWeight:700,color:colors.text,marginBottom:14}}>🏆 الأكثر صرفاً</div>
          {topProducts.map(([name,qty],i)=>{
            const pct=Math.round((qty/topProducts[0][1])*100)
            return (<div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<topProducts.length-1?12:0}}>
              <div style={{width:26,height:26,borderRadius:radius.sm,background:barColors[i]+'22',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:11,fontWeight:800,color:barColors[i]}}>{i+1}</span></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:'13px',fontWeight:600,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{name}</span><span style={{fontSize:'12px',fontWeight:800,color:barColors[i],flexShrink:0,marginRight:8}}>{qty}</span></div>
                <div style={{height:5,background:colors.border,borderRadius:99}}><div style={{height:'100%',width:pct+'%',background:barColors[i],borderRadius:99,transition:'width .5s ease'}}/></div>
              </div>
            </div>)
          })}
        </div>
      )}
      <div style={{...card,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${colors.border}`,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' as const}}>
          <div style={{position:'relative',flex:1,minWidth:160}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن منتج أو ملاحظة..." style={{...inp(),paddingRight:36}}/>
          </div>
          <button onClick={()=>setShowFilter(!showFilter)} style={{...btnSecondary,padding:'10px 14px',fontSize:'11px',background:showFilter?colors.primaryLight:colors.surface,borderColor:showFilter?colors.primaryBorder:colors.border2,color:showFilter?colors.primary:colors.text3}}>📅 تاريخ</button>
          <button onClick={exportCSV} style={{...btnPrimary,padding:'10px 16px',fontSize:'11px'}}>📥 تصدير</button>
          {hasFilter&&<button onClick={()=>{setSearch('');setDateFrom('');setDateTo('');setShowFilter(false)}} style={{...btnSecondary,padding:'10px 12px',fontSize:'11px',color:colors.danger,borderColor:colors.dangerBorder}}>✕</button>}
        </div>
        {showFilter&&(
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${colors.border}`,background:colors.bg,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={{fontSize:'11px',fontWeight:700,color:colors.text4,display:'block',marginBottom:5}}>من تاريخ</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inp()}/></div>
            <div><label style={{fontSize:'11px',fontWeight:700,color:colors.text4,display:'block',marginBottom:5}}>إلى تاريخ</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={inp()}/></div>
          </div>
        )}
        {loading?(<div style={{padding:48,textAlign:'center'}}><div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 12px'}}/><div style={{fontSize:'13px',color:colors.text4}}>جاري التحميل...</div></div>
        ):filtered.length===0?(<div style={{padding:56,textAlign:'center'}}><div style={{fontSize:40,marginBottom:10}}>📭</div><div style={{fontSize:'14px',fontWeight:600,color:colors.text2}}>لا توجد نتائج</div></div>
        ):(
          <>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:400}}>
                <thead><tr style={{background:colors.bg,borderBottom:`1px solid ${colors.border}`}}>{['التاريخ','المنتج','الكمية','الملاحظة'].map((h,i)=>(<th key={i} style={{padding:'10px 16px',color:colors.text4,fontSize:'11px',fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>{h}</th>))}</tr></thead>
                <tbody>{filtered.map((m,i)=>(<tr key={m.id} style={{borderBottom:`1px solid ${colors.border}`,background:i%2===0?colors.surface:colors.bg}}><td style={{padding:'11px 16px',fontSize:'11px',color:colors.text3,whiteSpace:'nowrap' as const}}>{new Date(m.created_at).toLocaleDateString('ar-SA')}</td><td style={{padding:'11px 16px',fontSize:'13px',fontWeight:700,color:colors.text}}>{(m.products as any)?.name}</td><td style={{padding:'11px 16px'}}><span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder),fontSize:'12px',padding:'4px 10px'}}>▼ {Math.abs(m.qty_change)} {(m.products as any)?.unit}</span></td><td style={{padding:'11px 16px',fontSize:'11px',color:colors.text4}}>{m.note||'—'}</td></tr>))}</tbody>
              </table>
            </div>
            <div style={{padding:'12px 16px',background:colors.primaryLight,borderTop:`1px solid ${colors.primaryBorder}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'13px',fontWeight:700,color:colors.primary}}>{filtered.length} عملية</span>
              <span style={{fontSize:'13px',fontWeight:800,color:colors.primary}}>{totalQty} وحدة مصروفة</span>
            </div>
          </>
        )}
      </div>
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
    if (search)    r = r.filter(p => p.name?.includes(search) || p.supplier?.includes(search))
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
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        <StatCard label="بدون ضريبة"           value={totalAmount.toFixed(2)+' ر.س'}    color={colors.text2}   bg={colors.bg}           border={colors.border2}/>
        <StatCard label="ضريبة 15%"             value={totalVat.toFixed(2)+' ر.س'}       color={colors.warning} bg={colors.warningLight} border={colors.warningBorder}/>
        <StatCard label="الإجمالي شامل الضريبة" value={totalWithVat.toFixed(2)+' ر.س'}  color={colors.primary} bg={colors.primaryLight} border={colors.primaryBorder}/>
        <StatCard label="عدد الفواتير"          value={filtered.length}                   color={colors.info}    bg={colors.infoLight}    border={colors.infoBorder}/>
      </div>
      <div style={{...card,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${colors.border}`,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' as const}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم الصنف أو المورد..." style={{...inp(),flex:1,minWidth:160}}/>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...inp(),width:'auto'}}><option value="">كل الأنواع</option><option value="مخزون">مخزون</option><option value="صيانة">صيانة</option><option value="أخرى">أخرى</option></select>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp(),width:'auto'}}/>
          <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   style={{...inp(),width:'auto'}}/>
          <button onClick={exportCSV} style={{...btnPrimary,padding:'10px 16px',fontSize:'11px'}}>📥 تصدير</button>
          {hasFilter&&<button onClick={()=>{setSearch('');setFilterCat('');setDateFrom('');setDateTo('')}} style={{...btnSecondary,padding:'10px 12px',fontSize:'11px',color:colors.danger,borderColor:colors.dangerBorder}}>✕</button>}
        </div>
        {loading?(<div style={{padding:48,textAlign:'center'}}><div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 12px'}}/></div>
        ):filtered.length===0?(<div style={{padding:56,textAlign:'center'}}><div style={{fontSize:40,marginBottom:10}}>🧾</div><div style={{fontSize:'14px',fontWeight:600,color:colors.text2}}>لا توجد نتائج</div></div>
        ):(
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:700}}>
              <thead><tr style={{background:colors.bg,borderBottom:`1px solid ${colors.border}`}}>{['التاريخ','الصنف','النوع','بدون ضريبة','ضريبة 15%','الإجمالي','المورد','فاتورة'].map((h,i)=>(<th key={i} style={{padding:'10px 14px',color:colors.text4,fontSize:'11px',fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.04em'}}>{h}</th>))}</tr></thead>
              <tbody>{filtered.map((p,i)=>(<tr key={p.id} style={{borderBottom:`1px solid ${colors.border}`,background:i%2===0?colors.surface:colors.bg}}><td style={{padding:'11px 14px',fontSize:'11px',color:colors.text3,whiteSpace:'nowrap' as const}}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</td><td style={{padding:'11px 14px',fontSize:'13px',fontWeight:700,color:colors.text}}>{p.name}</td><td style={{padding:'11px 14px'}}><span style={catTag(p.category)}>{p.category}</span></td><td style={{padding:'11px 14px',fontSize:'13px',color:colors.text2}}>{Number(p.amount||0).toFixed(2)} ر.س</td><td style={{padding:'11px 14px',fontSize:'13px',color:colors.warning,fontWeight:600}}>{Number(p.vat_amount||0).toFixed(2)} ر.س</td><td style={{padding:'11px 14px',fontSize:'13px',fontWeight:700,color:colors.primary}}>{Number(p.total_amount||0).toFixed(2)} ر.س</td><td style={{padding:'11px 14px',fontSize:'11px',color:colors.text4}}>{p.supplier||'—'}</td><td style={{padding:'11px 14px',textAlign:'center' as const}}>{p.invoice_image?<a href={p.invoice_image} target="_blank" rel="noreferrer" style={{color:colors.info,fontSize:'11px',fontWeight:600,textDecoration:'none'}}>📎 عرض</a>:<span style={{color:'#cbd5e1'}}>—</span>}</td></tr>))}</tbody>
              <tfoot><tr style={{background:colors.primaryLight,borderTop:`2px solid ${colors.primaryBorder}`}}><td colSpan={3} style={{padding:'12px 14px',fontWeight:800,fontSize:'13px',color:colors.text}}>الإجمالي ({filtered.length} فاتورة)</td><td style={{padding:'12px 14px',fontWeight:700,fontSize:'13px'}}>{totalAmount.toFixed(2)} ر.س</td><td style={{padding:'12px 14px',fontWeight:700,fontSize:'13px',color:colors.warning}}>{totalVat.toFixed(2)} ر.س</td><td style={{padding:'12px 14px',fontWeight:900,fontSize:'14px',color:colors.primary}}>{totalWithVat.toFixed(2)} ر.س</td><td/><td/></tr></tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'dispense'|'purchase'>('dispense')
  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{marginBottom:20}}>
        <h1 style={{...pageTitle}}>التقارير</h1>
        <p style={{...pageSub}}>تقارير الصرف والمشتريات في مكان واحد</p>
      </div>
      <div style={{...card,padding:0,marginBottom:20,overflow:'hidden'}}>
        <div style={{display:'flex',borderBottom:`1px solid ${colors.border}`,background:colors.bg}}>
          <Tab label="تقرير الصرف"      icon="📤" active={tab==='dispense'} onClick={()=>setTab('dispense')}/>
          <Tab label="تقرير المشتريات" icon="🧾" active={tab==='purchase'} onClick={()=>setTab('purchase')}/>
        </div>
        <div style={{padding:20}}>
          {tab==='dispense' && <DispenseReport/>}
          {tab==='purchase' && <PurchaseReport/>}
        </div>
      </div>
    </div>
  )
}
