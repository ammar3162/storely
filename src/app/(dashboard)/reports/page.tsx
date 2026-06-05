'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReportsPage() {
  const [movements, setMovements] = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const sb = createClient()

  useEffect(() => { load() }, [])
  useEffect(() => { filter() }, [movements, search, dateFrom, dateTo])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('stock_movements')
      .select('*, products(name,unit)').eq('type','out')
      .order('created_at',{ascending:false})
    setMovements(data||[])
    setLoading(false)
  }

  function filter() {
    let r = [...movements]
    if (search)   r = r.filter(m => (m.products as any)?.name?.includes(search)||m.note?.includes(search))
    if (dateFrom) r = r.filter(m => new Date(m.created_at)>=new Date(dateFrom))
    if (dateTo)   r = r.filter(m => new Date(m.created_at)<=new Date(dateTo+'T23:59:59'))
    setFiltered(r)
  }

  function exportCSV() {
    const headers = ['التاريخ','المنتج','الكمية','الوحدة','الملاحظة']
    const rows = filtered.map(m=>[
      new Date(m.created_at).toLocaleDateString('ar-SA'),
      (m.products as any)?.name||'',
      Math.abs(m.qty_change),
      (m.products as any)?.unit||'',
      m.note||'',
    ])
    const csv = '\ufeff'+[headers,...rows].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download='تقرير_الصرف.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const totalQty = filtered.reduce((s,m)=>s+Math.abs(m.qty_change),0)
  const productMap: Record<string,number> = {}
  filtered.forEach(m=>{
    const name=(m.products as any)?.name||'غير معروف'
    productMap[name]=(productMap[name]||0)+Math.abs(m.qty_change)
  })
  const topProducts = Object.entries(productMap).sort((a,b)=>b[1]-a[1]).slice(0,5)

  const inp: React.CSSProperties = {
    padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8,
    fontSize:13, outline:'none', background:'white', color:'#1e293b',
    fontFamily:'inherit', transition:'border 0.15s', width:'100%',
  }

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`
        .r-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
        .r-filters{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
        @media(max-width:640px){.r-stats{grid-template-columns:1fr 1fr}.r-filters{grid-template-columns:1fr}}
        input:focus{border-color:#1a4731!important;box-shadow:0 0 0 3px rgba(26,71,49,0.08)!important}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap' as const,gap:12}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:3}}>تقرير الصرف</h1>
          <p style={{fontSize:12,color:'#64748b'}}>تحليل جميع عمليات الصرف</p>
        </div>
        <button onClick={exportCSV} style={{padding:'10px 18px',background:'#1a4731',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit'}}>
          <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          تصدير CSV
        </button>
      </div>

      {/* Stats */}
      <div className="r-stats">
        {[
          {label:'إجمالي الكميات', value:totalQty,                        color:'#1e40af', bg:'#dbeafe'},
          {label:'عدد العمليات',   value:filtered.length,                 color:'#0891b2', bg:'#ecfeff'},
          {label:'أصناف مختلفة',   value:Object.keys(productMap).length,  color:'#166534', bg:'#dcfce7'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:10,padding:'14px 16px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Top Products */}
      {topProducts.length>0 && (
        <div style={{background:'white',borderRadius:12,padding:'16px 18px',marginBottom:16,border:'1px solid #e8ecf0',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:14}}>الأكثر صرفاً</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {topProducts.map(([name,qty],i)=>{
              const max = topProducts[0][1]
              const pct = Math.round((qty/max)*100)
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{width:22,height:22,borderRadius:6,background:'#dbeafe',color:'#1e40af',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{name}</span>
                      <span style={{fontSize:12,fontWeight:700,color:'#1e40af',flexShrink:0,marginRight:8}}>{qty} وحدة</span>
                    </div>
                    <div style={{height:5,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',width:pct+'%',background:'#3b82f6',borderRadius:99}}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{background:'white',borderRadius:12,padding:'14px 16px',marginBottom:14,border:'1px solid #e8ecf0',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,alignItems:'center'}}>
          <div style={{position:'relative',flex:'1',minWidth:160}}>
            <svg style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="13" height="13" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="ابحث بالمنتج أو الملاحظة..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,paddingRight:32}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{fontSize:10,fontWeight:600,color:"#94a3b8"}}>من تاريخ</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp,width:'auto',minWidth:130}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{fontSize:10,fontWeight:600,color:"#94a3b8"}}>إلى تاريخ</label>
          <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   style={{...inp,width:'auto',minWidth:130}}/>
          </div>
          {(search||dateFrom||dateTo) && (
            <button onClick={()=>{setSearch('');setDateFrom('');setDateTo('')}}
              style={{padding:'9px 14px',background:'#fef2f2',color:'#ef4444',border:'1.5px solid #fecaca',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit',whiteSpace:'nowrap' as const}}>
              ✕ مسح
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
        {loading ? (
          <div style={{padding:48,textAlign:'center',color:'#94a3b8',fontSize:13}}>جاري التحميل...</div>
        ) : filtered.length===0 ? (
          <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:32,marginBottom:10}}>📭</div>
            <div style={{fontSize:14,fontWeight:600,color:'#475569'}}>لا توجد نتائج</div>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:480}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['التاريخ','المنتج','الكمية','الملاحظة'].map((h,i)=>(
                    <th key={i} style={{padding:'11px 14px',color:'#94a3b8',fontSize:10,fontWeight:700,textAlign:'right',borderBottom:'1px solid #e8ecf0',textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m,i)=>(
                  <tr key={m.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa'}}>
                    <td style={{padding:'11px 14px',whiteSpace:'nowrap' as const}}>
                      <div style={{fontSize:12,fontWeight:600,color:'#0f172a'}}>{new Date(m.created_at).toLocaleDateString('ar-SA')}</div>
                      <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{new Date(m.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</div>
                    </td>
                    <td style={{padding:'11px 14px',fontWeight:600,fontSize:13,color:'#0f172a'}}>{(m.products as any)?.name||'—'}</td>
                    <td style={{padding:'11px 14px'}}>
                      <span style={{background:'#fef2f2',color:'#ef4444',padding:'3px 10px',borderRadius:20,fontWeight:700,fontSize:13,border:'1px solid #fecaca'}}>
                        -{Math.abs(m.qty_change)} {(m.products as any)?.unit}
                      </span>
                    </td>
                    <td style={{padding:'11px 14px',color:'#94a3b8',fontSize:12}}>{m.note||'—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:'#f0fdf4',borderTop:'2px solid #bbf7d0'}}>
                  <td colSpan={2} style={{padding:'12px 14px',fontWeight:700,fontSize:13,color:'#0f172a',textAlign:'right'}}>الإجمالي ({filtered.length} عملية)</td>
                  <td style={{padding:'12px 14px'}}>
                    <span style={{background:'#1a4731',color:'white',padding:'4px 12px',borderRadius:20,fontWeight:700,fontSize:13}}>{totalQty} وحدة</span>
                  </td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
