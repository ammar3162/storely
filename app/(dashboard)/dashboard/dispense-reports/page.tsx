'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DispenseReportsPage() {
  const [dispenses, setDispenses] = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterReason, setFilterReason]     = useState('')
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo, setDateTo]                 = useState('')
  const supabase = createClient()

  useEffect(() => { loadDispenses() }, [])
  useEffect(() => { applyFilters() }, [dispenses, search, filterEmployee, filterReason, dateFrom, dateTo])

  async function loadDispenses() {
    setLoading(true)
    const { data } = await supabase.from('dispenses').select('*').order('created_at', { ascending: false })
    setDispenses(data || [])
    setLoading(false)
  }

  function applyFilters() {
    let result = [...dispenses]
    if (search)         result = result.filter(d => d.product_name?.includes(search) || d.notes?.includes(search))
    if (filterEmployee) result = result.filter(d => d.employee_name === filterEmployee)
    if (filterReason)   result = result.filter(d => d.reason === filterReason)
    if (dateFrom)       result = result.filter(d => new Date(d.created_at) >= new Date(dateFrom))
    if (dateTo)         result = result.filter(d => new Date(d.created_at) <= new Date(dateTo+'T23:59:59'))
    setFiltered(result)
  }

  function exportCSV() {
    const headers = ['التاريخ','المنتج','الكمية','الموظف','السبب','ملاحظات']
    const rows = filtered.map(d => [
      d.created_at ? new Date(d.created_at).toLocaleDateString('ar-SA') : '',
      d.product_name||'', d.qty||'', d.employee_name||'', d.reason||'', d.notes||''
    ])
    const csv = '\ufeff' + [headers,...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'تقرير_الصرف.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const totalQty     = filtered.reduce((s,d) => s + (Number(d.qty)||0), 0)
  const employees    = [...new Set(dispenses.map(d => d.employee_name).filter(Boolean))]
  const reasons      = [...new Set(dispenses.map(d => d.reason).filter(Boolean))]

  // الأكثر صرفاً
  const productMap: Record<string,number> = {}
  filtered.forEach(d => { productMap[d.product_name] = (productMap[d.product_name]||0) + Number(d.qty) })
  const topProducts = Object.entries(productMap).sort((a,b) => b[1]-a[1]).slice(0,5)

  const inp: React.CSSProperties = {
    padding:'9px 14px', border:'1.5px solid #e2e8f0', borderRadius:10,
    fontSize:13, outline:'none', background:'white', color:'#1e293b',
    fontFamily:'system-ui', fontWeight:500
  }

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',marginBottom:4}}>📤 تقرير الصرف</h1>
          <p style={{fontSize:13,color:'#64748b'}}>عرض وتحليل جميع عمليات الصرف</p>
        </div>
        <button onClick={exportCSV} style={{
          display:'flex',alignItems:'center',gap:8,padding:'11px 20px',
          background:'linear-gradient(135deg,#10b981,#059669)',color:'white',
          border:'none',borderRadius:12,fontSize:13,fontWeight:700,
          cursor:'pointer',fontFamily:'system-ui'
        }}>📥 تصدير CSV</button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        {[
          { label:'إجمالي الكميات',  value: totalQty,          color:'#6366f1', bg:'#eef2ff', border:'#c7d2fe' },
          { label:'عدد العمليات',    value: filtered.length,   color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc' },
          { label:'عدد الموظفين',    value: employees.length,  color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' },
          { label:'أسباب مختلفة',    value: reasons.length,    color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
            <div style={{fontSize:24,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div style={{background:'white',borderRadius:16,padding:20,marginBottom:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:16}}>🏆 الأكثر صرفاً</h3>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {topProducts.map(([name,qty],i) => {
              const max = topProducts[0][1]
              const pct = Math.round((qty/max)*100)
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{width:24,height:24,borderRadius:50,background:'#eef2ff',color:'#6366f1',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</span>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{name}</span>
                      <span style={{fontSize:13,fontWeight:800,color:'#6366f1'}}>{qty} وحدة</span>
                    </div>
                    <div style={{height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:99}} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{background:'white',borderRadius:14,padding:'16px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:'1',minWidth:180}}>
          <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}>🔍</span>
          <input type="text" placeholder="ابحث بالمنتج..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{...inp,width:'100%',paddingRight:36,boxSizing:'border-box' as const}} />
        </div>

        <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} style={inp}>
          <option value="">كل الموظفين</option>
          {employees.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <select value={filterReason} onChange={e => setFilterReason(e.target.value)} style={inp}>
          <option value="">كل الأسباب</option>
          {reasons.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />

        {(search||filterEmployee||filterReason||dateFrom||dateTo) && (
          <button onClick={() => { setSearch(''); setFilterEmployee(''); setFilterReason(''); setDateFrom(''); setDateTo('') }}
            style={{...inp,background:'#fef2f2',color:'#ef4444',border:'1.5px solid #fecaca',cursor:'pointer',fontWeight:700}}>
            ✕ مسح
          </button>
        )}
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
            <div style={{fontSize:15,fontWeight:700,color:'#475569'}}>لا توجد نتائج</div>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
              <thead>
                <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                  {['التاريخ','المنتج','الكمية','الموظف','السبب','ملاحظات'].map((h,i) => (
                    <th key={i} style={{padding:'13px 14px',color:'#475569',fontSize:11,fontWeight:700,textAlign:'center',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d,i) => (
                  <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa'}}>
                    <td style={{padding:'12px 14px',textAlign:'center',whiteSpace:'nowrap' as const}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{d.created_at?new Date(d.created_at).toLocaleDateString('ar-SA'):''}</div>
                      <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{d.created_at?new Date(d.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'}):''}</div>
                    </td>
                    <td style={{padding:'12px 14px',textAlign:'right'}}>
                      <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{d.product_name||'—'}</div>
                    </td>
                    <td style={{padding:'12px 14px',textAlign:'center'}}>
                      <span style={{background:'#fee2e2',color:'#ef4444',padding:'4px 14px',borderRadius:50,fontWeight:800,fontSize:14}}>
                        -{d.qty}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',textAlign:'center',color:'#475569',fontSize:13,fontWeight:600}}>{d.employee_name||'—'}</td>
                    <td style={{padding:'12px 14px',textAlign:'center'}}>
                      <span style={{background:'#f1f5f9',color:'#475569',padding:'4px 10px',borderRadius:50,fontSize:12,fontWeight:600}}>
                        {d.reason||'—'}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',textAlign:'center',color:'#94a3b8',fontSize:12}}>{d.notes||'—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:'#eef2ff',borderTop:'2px solid #c7d2fe'}}>
                  <td colSpan={2} style={{padding:'14px 16px',fontWeight:800,fontSize:14,color:'#0f172a',textAlign:'right'}}>
                    الإجمالي ({filtered.length} عملية)
                  </td>
                  <td style={{padding:'14px',textAlign:'center'}}>
                    <span style={{background:'#6366f1',color:'white',padding:'5px 14px',borderRadius:50,fontWeight:900,fontSize:14}}>
                      {totalQty} وحدة
                    </span>
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}