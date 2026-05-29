'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReportsPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [filterVat, setFilterVat]         = useState('')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [view, setView]                   = useState<'table'|'cards'>('table')
  const supabase = createClient()

  useEffect(() => { loadPurchases() }, [])
  useEffect(() => { applyFilters() }, [purchases, search, filterPayment, filterVat, dateFrom, dateTo])

  async function loadPurchases() {
    setLoading(true)
    const { data } = await supabase.from('purchases').select('*').order('created_at', { ascending: false })
    setPurchases(data || [])
    setLoading(false)
  }

  function applyFilters() {
    let result = [...purchases]
    if (search)        result = result.filter(p => p.product_name?.includes(search) || p.supplier?.includes(search) || p.employee_name?.includes(search))
    if (filterPayment) result = result.filter(p => p.payment_method === filterPayment)
    if (filterVat)     result = result.filter(p => filterVat === 'vat' ? p.has_vat : !p.has_vat)
    if (dateFrom)      result = result.filter(p => new Date(p.created_at) >= new Date(dateFrom))
    if (dateTo)        result = result.filter(p => new Date(p.created_at) <= new Date(dateTo+'T23:59:59'))
    setFiltered(result)
  }

  function clearFilters() {
    setSearch(''); setFilterPayment(''); setFilterVat(''); setDateFrom(''); setDateTo('')
  }

  function exportCSV() {
    const headers = ['التاريخ','المنتج','الموظف','المورد','الكمية','طريقة الدفع','VAT','قبل الضريبة','الضريبة','الإجمالي']
    const rows = filtered.map(p => [
      p.created_at ? new Date(p.created_at).toLocaleDateString('ar-SA') : '',
      p.product_name||'', p.employee_name||'', p.supplier||'', p.qty||'',
      p.payment_method||'', p.has_vat?'نعم':'لا',
      Number(p.unit_price||0).toFixed(2),
      Number(p.vat_amount||0).toFixed(2),
      Number(p.total_incl_vat||0).toFixed(2)
    ])
    const csv = '\ufeff' + [headers,...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'تقرير_المشتريات.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const totalIncl  = filtered.reduce((s,p) => s + (Number(p.total_incl_vat)||0), 0)
  const totalVat   = filtered.reduce((s,p) => s + (Number(p.vat_amount)||0), 0)
  const totalNoVat = filtered.reduce((s,p) => s + (Number(p.unit_price||0) * Number(p.qty||0)), 0)
  const withVat    = filtered.filter(p => p.has_vat).length
  const noVat      = filtered.filter(p => !p.has_vat).length
  const hasFilters = !!(search||filterPayment||filterVat||dateFrom||dateTo)

  const paymentColors: Record<string,{bg:string,color:string}> = {
    'نقد':            {bg:'#f0fdf4',color:'#16a34a'},
    'تحويل بنكي':    {bg:'#eff6ff',color:'#2563eb'},
    'بطاقة ائتمانية':{bg:'#f5f3ff',color:'#7c3aed'},
    'آجل':            {bg:'#fef2f2',color:'#dc2626'},
  }

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>
      <style>{`
        @media(max-width:768px){
          .stats-grid{grid-template-columns:1fr 1fr !important}
          .filters-wrap{flex-direction:column !important}
          .filters-wrap > *{width:100% !important;min-width:unset !important}
          .header-row{flex-direction:column !important;align-items:flex-start !important}
          .date-row{flex-direction:column !important}
        }
        .row-hover:hover{background:#f8faff !important}
      `}</style>

      {/* Header */}
      <div className="header-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,gap:12,flexWrap:'wrap'}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:900,color:'#0f172a',marginBottom:4,letterSpacing:'-0.5px'}}>📈 تقرير المشتريات</h1>
          <p style={{fontSize:13,color:'#64748b',margin:0}}>
            {filtered.length} فاتورة • إجمالي {totalIncl.toFixed(2)} ﷼
          </p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <div style={{display:'flex',background:'#f1f5f9',borderRadius:10,padding:3,gap:3}}>
            <button onClick={() => setView('table')} style={{padding:'7px 12px',borderRadius:8,border:'none',cursor:'pointer',background:view==='table'?'white':'transparent',color:view==='table'?'#6366f1':'#64748b',fontWeight:700,fontSize:12,fontFamily:'system-ui',boxShadow:view==='table'?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>جدول</button>
            <button onClick={() => setView('cards')} style={{padding:'7px 12px',borderRadius:8,border:'none',cursor:'pointer',background:view==='cards'?'white':'transparent',color:view==='cards'?'#6366f1':'#64748b',fontWeight:700,fontSize:12,fontFamily:'system-ui',boxShadow:view==='cards'?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>بطاقات</button>
          </div>
          <button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:'linear-gradient(135deg,#10b981,#059669)',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',boxShadow:'0 4px 12px rgba(16,185,129,0.3)'}}>
            📥 تصدير CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:20}}>
        {[
          { label:'إجمالي المصروفات', value:totalIncl.toFixed(2)+' ﷼', icon:'💰', color:'#6366f1', bg:'#eef2ff', border:'#c7d2fe' },
          { label:'إجمالي الضريبة',   value:totalVat.toFixed(2)+' ﷼',  icon:'🧾', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
          { label:'قبل الضريبة',      value:totalNoVat.toFixed(2)+' ﷼', icon:'📋', color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc' },
          { label:'عدد الفواتير',     value:filtered.length,             icon:'📊', color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' },
          { label:'بضريبة',           value:withVat,                     icon:'✅', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
          { label:'بدون ضريبة',       value:noVat,                       icon:'➖', color:'#64748b', bg:'#f8fafc', border:'#e2e8f0' },
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:14,padding:'14px 16px',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:18,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{background:'white',borderRadius:14,padding:'16px 18px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>🔍 الفلاتر</span>
          {hasFilters && (
            <button onClick={clearFilters} style={{background:'#fef2f2',color:'#ef4444',border:'1.5px solid #fecaca',borderRadius:8,padding:'4px 12px',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'system-ui'}}>
              ✕ مسح الكل
            </button>
          )}
        </div>
        <div className="filters-wrap" style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:'1',minWidth:180}}>
            <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}>🔍</span>
            <input type="text" placeholder="ابحث بالمنتج أو المورد أو الموظف..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{width:'100%',padding:'10px 14px 10px 14px',paddingRight:36,border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',background:'white',color:'#1e293b',fontFamily:'system-ui',fontWeight:500,boxSizing:'border-box' as const}} />
          </div>
          <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} style={{padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',background:'white',color:'#1e293b',fontFamily:'system-ui',fontWeight:500,minWidth:150}}>
            <option value="">💳 كل طرق الدفع</option>
            <option value="نقد">💵 نقد</option>
            <option value="تحويل بنكي">🏦 تحويل بنكي</option>
            <option value="بطاقة ائتمانية">💳 بطاقة ائتمانية</option>
            <option value="آجل">📋 آجل</option>
          </select>
          <select value={filterVat} onChange={e => setFilterVat(e.target.value)} style={{padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',background:'white',color:'#1e293b',fontFamily:'system-ui',fontWeight:500,minWidth:130}}>
            <option value="">🧾 الكل</option>
            <option value="vat">بضريبة فقط</option>
            <option value="novat">بدون ضريبة</option>
          </select>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:12,color:'#64748b',fontWeight:600,whiteSpace:'nowrap' as const}}>من:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',background:'white',fontFamily:'system-ui'}} />
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:12,color:'#64748b',fontWeight:600,whiteSpace:'nowrap' as const}}>إلى:</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',background:'white',fontFamily:'system-ui'}} />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{background:'white',borderRadius:16,padding:60,textAlign:'center',color:'#94a3b8',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <div style={{fontSize:40,marginBottom:12}}>⏳</div>
          <div style={{fontSize:14,fontWeight:600}}>جاري تحميل التقرير...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{background:'white',borderRadius:16,padding:60,textAlign:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <div style={{fontSize:48,marginBottom:12}}>📭</div>
          <div style={{fontSize:16,fontWeight:800,color:'#475569',marginBottom:6}}>لا توجد نتائج</div>
          <div style={{fontSize:13,color:'#94a3b8'}}>{hasFilters ? 'جرب تغيير الفلاتر' : 'لا توجد فواتير بعد'}</div>
          {hasFilters && (
            <button onClick={clearFilters} style={{marginTop:16,padding:'10px 20px',background:'#6366f1',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>
              مسح الفلاتر
            </button>
          )}
        </div>
      ) : view === 'cards' ? (
        /* Cards View */
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {filtered.map((p,i) => {
            const pc = paymentColors[p.payment_method] || {bg:'#f8fafc',color:'#475569'}
            return (
              <div key={i} style={{background:'white',borderRadius:16,padding:18,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:'1.5px solid #f1f5f9'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:4}}>{p.product_name||'—'}</div>
                    <div style={{fontSize:11,color:'#94a3b8'}}>{p.created_at?new Date(p.created_at).toLocaleDateString('ar-SA'):''}</div>
                  </div>
                  <span style={{background:'#f0fdf4',color:'#16a34a',padding:'6px 14px',borderRadius:50,fontWeight:900,fontSize:15,border:'1.5px solid #bbf7d0'}}>
                    {Number(p.total_incl_vat||0).toFixed(2)} ﷼
                  </span>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                  <span style={{...pc,padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:600}}>{p.payment_method||'—'}</span>
                  {p.has_vat && <span style={{background:'#fffbeb',color:'#d97706',padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:600}}>VAT 15%</span>}
                  {p.supplier && <span style={{background:'#f1f5f9',color:'#475569',padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:600}}>🏭 {p.supplier}</span>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  <div style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px'}}>
                    <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{p.qty||'—'}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>الكمية</div>
                  </div>
                  <div style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#475569'}}>{Number(p.unit_price||0).toFixed(2)}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>سعر الوحدة</div>
                  </div>
                  <div style={{textAlign:'center',background:'#fffbeb',borderRadius:8,padding:'8px'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#d97706'}}>{Number(p.vat_amount||0).toFixed(2)}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>الضريبة</div>
                  </div>
                </div>
                {p.employee_name && (
                  <div style={{marginTop:10,fontSize:12,color:'#6366f1',background:'#eef2ff',padding:'6px 12px',borderRadius:8,fontWeight:600}}>
                    👤 {p.employee_name}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div style={{background:'white',borderRadius:16,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:750}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f8fafc,#f1f5f9)',borderBottom:'2px solid #e2e8f0'}}>
                  {['التاريخ','المنتج','الموظف','المورد','الكمية','طريقة الدفع','VAT','قبل الضريبة','الضريبة','الإجمالي'].map((h,i) => (
                    <th key={i} style={{padding:'13px 12px',color:'#475569',fontSize:11,fontWeight:700,textAlign:'center',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap' as const}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p,i) => {
                  const pc = paymentColors[p.payment_method] || {bg:'#f8fafc',color:'#475569'}
                  return (
                    <tr key={i} className="row-hover" style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa',transition:'background 0.1s'}}>
                      <td style={{padding:'12px',textAlign:'center',whiteSpace:'nowrap' as const}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{p.created_at?new Date(p.created_at).toLocaleDateString('ar-SA'):''}</div>
                        <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{p.created_at?new Date(p.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'}):''}</div>
                      </td>
                      <td style={{padding:'12px',textAlign:'right'}}>
                        <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{p.product_name||'—'}</div>
                      </td>
                      <td style={{padding:'12px',textAlign:'center',color:'#475569',fontSize:13,fontWeight:600}}>{p.employee_name||'—'}</td>
                      <td style={{padding:'12px',textAlign:'center',color:'#475569',fontSize:13}}>{p.supplier||'—'}</td>
                      <td style={{padding:'12px',textAlign:'center'}}>
                        <span style={{background:'#f1f5f9',color:'#475569',padding:'3px 10px',borderRadius:50,fontSize:12,fontWeight:700}}>{p.qty||'—'}</span>
                      </td>
                      <td style={{padding:'12px',textAlign:'center'}}>
                        <span style={{...pc,padding:'4px 10px',borderRadius:50,fontSize:11,fontWeight:700,whiteSpace:'nowrap' as const}}>{p.payment_method||'—'}</span>
                      </td>
                      <td style={{padding:'12px',textAlign:'center'}}>
                        <span style={{padding:'4px 10px',borderRadius:50,fontSize:11,fontWeight:700,background:p.has_vat?'#fffbeb':'#f8fafc',color:p.has_vat?'#d97706':'#94a3b8'}}>
                          {p.has_vat?'15%':'—'}
                        </span>
                      </td>
                      <td style={{padding:'12px',textAlign:'center',color:'#475569',fontWeight:600,fontSize:13}}>{Number(p.unit_price||0).toFixed(2)} ﷼</td>
                      <td style={{padding:'12px',textAlign:'center',color:'#d97706',fontWeight:700,fontSize:13}}>{Number(p.vat_amount||0).toFixed(2)} ﷼</td>
                      <td style={{padding:'12px',textAlign:'center'}}>
                        <span style={{background:'#f0fdf4',color:'#16a34a',padding:'5px 14px',borderRadius:50,fontWeight:800,fontSize:13,whiteSpace:'nowrap' as const}}>
                          {Number(p.total_incl_vat||0).toFixed(2)} ﷼
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'linear-gradient(135deg,#eef2ff,#e0e7ff)',borderTop:'2px solid #c7d2fe'}}>
                  <td colSpan={7} style={{padding:'14px 16px',fontWeight:800,fontSize:14,color:'#0f172a',textAlign:'right'}}>
                    الإجمالي ({filtered.length} فاتورة)
                  </td>
                  <td style={{padding:'14px',textAlign:'center',fontWeight:800,color:'#475569',whiteSpace:'nowrap' as const}}>{totalNoVat.toFixed(2)} ﷼</td>
                  <td style={{padding:'14px',textAlign:'center',fontWeight:800,color:'#d97706',whiteSpace:'nowrap' as const}}>{totalVat.toFixed(2)} ﷼</td>
                  <td style={{padding:'14px',textAlign:'center'}}>
                    <span style={{background:'#6366f1',color:'white',padding:'6px 16px',borderRadius:50,fontWeight:900,fontSize:14,whiteSpace:'nowrap' as const}}>
                      {totalIncl.toFixed(2)} ﷼
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}