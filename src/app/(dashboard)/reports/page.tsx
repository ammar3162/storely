'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'

export default function ReportsPage() {
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

  function clearFilter() { setSearch(''); setDateFrom(''); setDateTo(''); setShowFilter(false) }

  function exportCSV() {
    const csv = '\ufeff' + [
      ['التاريخ','المنتج','الكمية','الوحدة','الملاحظة'],
      ...filtered.map(m=>[
        new Date(m.created_at).toLocaleDateString('ar-SA'),
        (m.products as any)?.name||'',
        Math.abs(m.qty_change),
        (m.products as any)?.unit||'',
        m.note||''
      ])
    ].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{
      href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),
      download:'تقرير_الصرف.csv'
    }).click()
  }

  const totalQty = filtered.reduce((s,m)=>s+Math.abs(m.qty_change),0)
  const productMap: Record<string,number> = {}
  filtered.forEach(m=>{ const n=(m.products as any)?.name||'غير معروف'; productMap[n]=(productMap[n]||0)+Math.abs(m.qty_change) })
  const topProducts = Object.entries(productMap).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const hasFilter = !!(search||dateFrom||dateTo)

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',maxWidth:800,margin:'0 auto'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        .ru{animation:fadeUp .25s ease both}
        .trow{transition:background .1s}
        .trow:hover td{background:#fafafa}
        input:focus{outline:none!important;border-color:#16a34a!important;box-shadow:0 0 0 3px rgba(22,163,74,.1)!important}
      `}</style>

      {/* Header */}
      <div className="ru" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,gap:12,flexWrap:'wrap'}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',letterSpacing:'-0.5px'}}>تقرير الصرف</h1>
          <p style={{fontSize:13,color:'#94a3b8',marginTop:2}}>تحليل عمليات الصرف من المخزون</p>
        </div>
        <button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:7,padding:'10px 18px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(22,163,74,.25)'}}>
          <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          تحميل
        </button>
      </div>

      {/* Stats */}
      <div className="ru" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'كميات مصروفة', value:totalQty,                       unit:'وحدة',  color:'#ef4444', bg:'#fef2f2', border:'#fecaca'},
          {label:'عمليات الصرف', value:filtered.length,                unit:'عملية', color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe'},
          {label:'أصناف مختلفة', value:Object.keys(productMap).length, unit:'صنف',   color:'#8b5cf6', bg:'#f5f3ff', border:'#ddd6fe'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:14,padding:'14px',border:`1.5px solid ${s.border}`,textAlign:'center'}}>
            <div style={{fontSize:26,fontWeight:900,color:s.color,letterSpacing:'-1px',lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:11,color:'#64748b',marginTop:4,fontWeight:600}}>{s.label}</div>
            <div style={{fontSize:10,color:s.color,fontWeight:700,marginTop:1}}>{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Top Products */}
      {topProducts.length>0 && (
        <div className="ru" style={{background:'white',borderRadius:16,padding:'16px',marginBottom:14,border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,.05)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <span style={{fontSize:18}}>🏆</span>
            <span style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>الأكثر صرفاً</span>
          </div>
          {topProducts.map(([name,qty],i)=>{
            const colors=['#16a34a','#3b82f6','#8b5cf6','#f59e0b','#ef4444']
            const pct=Math.round((qty/topProducts[0][1])*100)
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<topProducts.length-1?12:0}}>
                <div style={{width:26,height:26,borderRadius:8,background:colors[i]+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:11,fontWeight:800,color:colors[i]}}>{i+1}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{name}</span>
                    <span style={{fontSize:12,fontWeight:800,color:colors[i],flexShrink:0,marginRight:8}}>{qty}</span>
                  </div>
                  <div style={{height:5,background:'#f1f5f9',borderRadius:99}}>
                    <div style={{height:'100%',width:pct+'%',background:colors[i],borderRadius:99,transition:'width .5s ease'}}/>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filter */}
      <div className="ru" style={{background:'white',borderRadius:16,marginBottom:14,border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,.05)',overflow:'hidden'}}>
        <div style={{padding:'12px 14px',display:'flex',gap:8,alignItems:'center'}}>
          <div style={{position:'relative',flex:1}}>
            <svg style={{position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث..."
              style={{width:'100%',padding:'10px 36px 10px 10px',border:'1.5px solid #f1f5f9',borderRadius:11,fontSize:13,background:'#fafafa',color:'#0f172a',fontFamily:'inherit'}}/>
          </div>
          <button onClick={()=>setShowFilter(!showFilter)} style={{
            display:'flex',alignItems:'center',gap:5,padding:'10px 14px',flexShrink:0,
            background:showFilter?'#f0fdf4':'#fafafa',
            border:`1.5px solid ${showFilter?'#86efac':'#f1f5f9'}`,
            borderRadius:11,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
            color:showFilter?'#16a34a':'#64748b',
          }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></svg>
            تاريخ
            {(dateFrom||dateTo)&&<span style={{width:7,height:7,borderRadius:'50%',background:'#ef4444',display:'block'}}/>}
          </button>
          {hasFilter&&<button onClick={clearFilter} style={{padding:'10px 12px',background:'#fef2f2',color:'#ef4444',border:'1.5px solid #fecaca',borderRadius:11,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>✕</button>}
        </div>

        {showFilter&&(
          <div style={{padding:'0 14px 14px',borderTop:'1px solid #f8fafc',paddingTop:12,animation:'slideDown .2s ease'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:5}}>من تاريخ</label>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                  style={{width:'100%',padding:'10px 12px',border:'1.5px solid #f1f5f9',borderRadius:11,fontSize:13,background:'#fafafa',color:'#0f172a',fontFamily:'inherit'}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:5}}>إلى تاريخ</label>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                  style={{width:'100%',padding:'10px 12px',border:'1.5px solid #f1f5f9',borderRadius:11,fontSize:13,background:'#fafafa',color:'#0f172a',fontFamily:'inherit'}}/>
              </div>
            </div>
            {hasFilter&&<div style={{marginTop:10,padding:'8px 12px',background:'#f0fdf4',borderRadius:9,fontSize:12,color:'#16a34a',fontWeight:600,display:'flex',justifyContent:'space-between'}}>
              <span>{filtered.length} نتيجة من {movements.length}</span>
              <button onClick={clearFilter} style={{background:'none',border:'none',color:'#ef4444',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>مسح</button>
            </div>}
          </div>
        )}
      </div>

      {/* List */}
      <div className="ru" style={{background:'white',borderRadius:16,border:'1px solid #f1f5f9',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.05)'}}>
        {loading ? (
          <div style={{padding:56,textAlign:'center'}}>
            <div style={{width:36,height:36,border:'3px solid #f1f5f9',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 12px'}}/>
            <div style={{fontSize:13,color:'#94a3b8'}}>جاري التحميل...</div>
          </div>
        ) : filtered.length===0 ? (
          <div style={{padding:56,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:10}}>📭</div>
            <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:4}}>لا توجد نتائج</div>
            <div style={{fontSize:12,color:'#94a3b8'}}>جرب تغيير معايير البحث</div>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div style={{display:'block'}} className="mob-list">
              <style>{`@media(min-width:640px){.mob-list{display:none!important}.desk-table{display:block!important}}`}</style>
              {filtered.map((m,i)=>(
                <div key={m.id} style={{padding:'14px 16px',borderBottom:i<filtered.length-1?'1px solid #f8fafc':'none',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:42,height:42,borderRadius:12,background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'1px solid #fecaca'}}>
                    <span style={{fontSize:11,fontWeight:800,color:'#ef4444'}}>▼{Math.abs(m.qty_change)}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{(m.products as any)?.name}</div>
                    <div style={{fontSize:11,color:'#94a3b8',marginTop:2,display:'flex',gap:8}}>
                      <span>{new Date(m.created_at).toLocaleDateString('ar-SA')}</span>
                      {m.note&&<span>· {m.note}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'left' as const,flexShrink:0}}>
                    <div style={{fontSize:15,fontWeight:800,color:'#ef4444'}}>{Math.abs(m.qty_change)}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{(m.products as any)?.unit}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="desk-table" style={{display:'none',overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:400}}>
                <thead>
                  <tr style={{background:'#fafafa',borderBottom:'1px solid #f1f5f9'}}>
                    {['التاريخ','المنتج','الكمية','الملاحظة'].map((h,i)=>(
                      <th key={i} style={{padding:'11px 16px',color:'#94a3b8',fontSize:11,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m=>(
                    <tr key={m.id} className="trow" style={{borderBottom:'1px solid #f8fafc'}}>
                      <td style={{padding:'12px 16px',fontSize:12,color:'#64748b',whiteSpace:'nowrap' as const}}>
                        {new Date(m.created_at).toLocaleDateString('ar-SA')}
                        <div style={{fontSize:10,color:'#94a3b8'}}>{new Date(m.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</div>
                      </td>
                      <td style={{padding:'12px 16px',fontSize:13,fontWeight:700,color:'#0f172a'}}>{(m.products as any)?.name}</td>
                      <td style={{padding:'12px 16px'}}>
                        <span style={{background:'#fef2f2',color:'#ef4444',padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:800,border:'1px solid #fecaca'}}>
                          ▼ {Math.abs(m.qty_change)} {(m.products as any)?.unit}
                        </span>
                      </td>
                      <td style={{padding:'12px 16px',fontSize:12,color:'#94a3b8'}}>{m.note||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{padding:'12px 16px',background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',borderTop:'1px solid #bbf7d0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:700,color:'#15803d'}}>{filtered.length} عملية</span>
              <span style={{background:'#16a34a',color:'white',padding:'5px 14px',borderRadius:20,fontSize:13,fontWeight:800}}>{totalQty} وحدة</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
