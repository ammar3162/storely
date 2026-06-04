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
  const supabase = createClient()

  useEffect(() => { loadMovements() }, [])
  useEffect(() => { applyFilters() }, [movements, search, dateFrom, dateTo])

  async function loadMovements() {
    setLoading(true)
    const { data } = await supabase
      .from('stock_movements')
      .select('*, products(name, unit)')
      .eq('type', 'out')
      .order('created_at', { ascending: false })
    setMovements(data || [])
    setLoading(false)
  }

  function applyFilters() {
    let result = [...movements]
    if (search)   result = result.filter(m => (m.products as any)?.name?.includes(search) || m.note?.includes(search))
    if (dateFrom) result = result.filter(m => new Date(m.created_at) >= new Date(dateFrom))
    if (dateTo)   result = result.filter(m => new Date(m.created_at) <= new Date(dateTo + 'T23:59:59'))
    setFiltered(result)
  }

  function exportCSV() {
    const headers = ['التاريخ','المنتج','الكمية','الوحدة','الملاحظة']
    const rows = filtered.map(m => [
      new Date(m.created_at).toLocaleDateString('ar-SA'),
      (m.products as any)?.name || '',
      Math.abs(m.qty_change),
      (m.products as any)?.unit || '',
      m.note || '',
    ])
    const csv = '\ufeff' + [headers, ...rows].map(r => r.map(c => '"' + c + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'تقرير_الصرف.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const totalQty = filtered.reduce((s, m) => s + Math.abs(m.qty_change), 0)
  const productMap: Record<string, number> = {}
  filtered.forEach(m => {
    const name = (m.products as any)?.name || 'غير معروف'
    productMap[name] = (productMap[name] || 0) + Math.abs(m.qty_change)
  })
  const topProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const inp: React.CSSProperties = {
    padding:'9px 14px', border:'1.5px solid #e2e8f0', borderRadius:10,
    fontSize:13, outline:'none', background:'white', color:'#1e293b',
    fontFamily:'system-ui', fontWeight:500,
  }

  return (
    <div style={{direction:'rtl', fontFamily:'system-ui'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',marginBottom:4}}>التقارير</h1>
          <p style={{fontSize:13,color:'#64748b'}}>تحليل عمليات الصرف</p>
        </div>
        <button onClick={exportCSV} style={{padding:'11px 20px',background:'linear-gradient(135deg,#10b981,#059669)',color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>
          تصدير CSV
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:24}}>
        {[
          { label:'اجمالي الكميات', value:totalQty,        color:'#6366f1', bg:'#eef2ff', border:'#c7d2fe' },
          { label:'عدد العمليات',   value:filtered.length, color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc' },
          { label:'اصناف مختلفة',   value:Object.keys(productMap).length, color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' },
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,border:'1.5px solid ' + s.border,borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:6,textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {topProducts.length > 0 && (
        <div style={{background:'white',borderRadius:16,padding:20,marginBottom:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:16}}>الاكثر صرفا</h3>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {topProducts.map(([name, qty], i) => {
              const max = topProducts[0][1]
              const pct = Math.round((qty / max) * 100)
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{width:24,height:24,borderRadius:50,background:'#eef2ff',color:'#6366f1',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</span>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{name}</span>
                      <span style={{fontSize:13,fontWeight:800,color:'#6366f1'}}>{qty} وحدة</span>
                    </div>
                    <div style={{height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',width:pct+'%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:99}}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{background:'white',borderRadius:14,padding:'16px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <input type="text" placeholder="ابحث..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,flex:1,minWidth:180}}/>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inp}/>
        <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   style={inp}/>
        {(search||dateFrom||dateTo) && (
          <button onClick={() => {setSearch('');setDateFrom('');setDateTo('')}}
            style={{...inp,background:'#fef2f2',color:'#ef4444',border:'1.5px solid #fecaca',cursor:'pointer',fontWeight:700}}>
            مسح
          </button>
        )}
      </div>

      <div style={{background:'white',borderRadius:16,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',overflow:'hidden'}}>
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8',fontSize:14,fontWeight:600}}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:15,fontWeight:700,color:'#475569'}}>لا توجد نتائج</div>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
              <thead>
                <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                  {['التاريخ','المنتج','الكمية','الملاحظة'].map((h,i) => (
                    <th key={i} style={{padding:'13px 14px',color:'#475569',fontSize:11,fontWeight:700,textAlign:'right',textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa'}}>
                    <td style={{padding:'12px 14px',whiteSpace:'nowrap' as const}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{new Date(m.created_at).toLocaleDateString('ar-SA')}</div>
                      <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{new Date(m.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</div>
                    </td>
                    <td style={{padding:'12px 14px',fontWeight:700,fontSize:14,color:'#0f172a'}}>{(m.products as any)?.name||'—'}</td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{background:'#fee2e2',color:'#ef4444',padding:'4px 14px',borderRadius:50,fontWeight:800,fontSize:14}}>
                        -{Math.abs(m.qty_change)} {(m.products as any)?.unit}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',color:'#94a3b8',fontSize:12}}>{m.note||'—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:'#eef2ff',borderTop:'2px solid #c7d2fe'}}>
                  <td colSpan={2} style={{padding:'14px 16px',fontWeight:800,fontSize:14,color:'#0f172a',textAlign:'right'}}>
                    الاجمالي ({filtered.length} عملية)
                  </td>
                  <td style={{padding:'14px'}}>
                    <span style={{background:'#6366f1',color:'white',padding:'5px 14px',borderRadius:50,fontWeight:900,fontSize:14}}>{totalQty} وحدة</span>
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
