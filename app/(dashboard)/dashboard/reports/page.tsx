
'use client'
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

  const inp: React.CSSProperties = {
    padding:'9px 14px', border:'1.5px solid #e2e8f0', borderRadius:10,
    fontSize:13, outline:'none', background:'white', color:'#1e293b',
    fontFamily:'system-ui', fontWeight:500
  }

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',marginBottom:4}}>📈 تقرير المشتريات</h1>
          <p style={{fontSize:13,color:'#64748b'}}>عرض وتحليل جميع فواتير الشراء</p>
        </div>
        <button onClick={exportCSV} style={{
          display:'flex',alignItems:'center',gap:8,
          padding:'11px 20px',background:'linear-gradient(135deg,#10b981,#059669)',
          color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:700,
          cursor:'pointer',boxShadow:'0 4px 14px rgba(16,185,129,0.3)',fontFamily:'system-ui'
        }}>
          📥 تصدير CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:24}}>
        {[
          { label:'إجمالي المصروفات', value: totalIncl.toFixed(2)+' ﷼', icon:'💰', color:'#6366f1', bg:'#eef2ff', border:'#c7d2fe' },
          { label:'إجمالي الضريبة', value: totalVat.toFixed(2)+' ﷼', icon:'🧾', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
          { label:'قبل الضريبة', value: totalNoVat.toFixed(2)+' ﷼', icon:'📋', color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc' },
          { label:'عدد الفواتير', value: filtered.length, icon:'📊', color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' },
          { label:'بضريبة', value: withVat, icon:'✅', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
          { label:'بدون ضريبة', value: noVat, icon:'➖', color:'#64748b', bg:'#f8fafc', border:'#e2e8f0' },
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{background:'white',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
        
        <div style={{position:'relative',flex:'1',minWidth:180}}>
          <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}>🔍</span>
          <input type="text" placeholder="ابحث بالمنتج أو المورد..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{...inp,width:'100%',paddingRight:36,boxSizing:'border-box'}} />
        </div>

        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} style={inp}>
          <option value="">كل طرق الدفع</option>
          <option value="نقد">💵 نقد</option>
          <option value="تحويل بنكي">🏦 تحويل بنكي</option>
          <option value="بطاقة ائتمانية">💳 بطاقة ائتمانية</option>
          <option value="آجل">📋 آجل</option>
        </select>

        <select value={filterVat} onChange={e => setFilterVat(e.target.value)} style={inp}>
          <option value="">الكل</option>
          <option value="vat">بضريبة فقط</option>
          <option value="novat">بدون ضريبة</option>
        </select>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:12,color:'#64748b',fontWeight:600}}>من:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:12,color:'#64748b',fontWeight:600}}>إلى:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
        </div>

        {(search||filterPayment||filterVat||dateFrom||dateTo) && (
          <button onClick={() => { setSearch(''); setFilterPayment(''); setFilterVat(''); setDateFrom(''); setDateTo('') }}
            style={{...inp,background:'#fef2f2',color:'#ef4444',border:'1.5px solid #fecaca',cursor:'pointer',fontWeight:700}}>
            ✕ مسح الفلاتر
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{background:'white',borderRadius:16,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',overflow:'hidden'}}>
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:36,marginBottom:12}}>⏳</div>
            <div style={{fontSize:14,fontWeight:600}}>جاري تحميل التقرير...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:40,marginBottom:12}}>📭</div>
            <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:6}}>لا توجد نتائج</div>
            <div style={{fontSize:13}}>جرب تغيير الفلاتر</div>
          </div>
        ) : (
          <>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
                <thead>
                  <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                    {['التاريخ','المنتج','الموظف','المورد','الكمية','طريقة الدفع','VAT','قبل الضريبة','الضريبة','الإجمالي'].map((h,i) => (
                      <th key={i} style={{padding:'13px 14px',color:'#475569',fontSize:11,fontWeight:700,textAlign:'center',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p,i) => (
                    <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa'}}>
                      <td style={{padding:'12px 14px',textAlign:'center',whiteSpace:'nowrap'}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{p.created_at?new Date(p.created_at).toLocaleDateString('ar-SA'):''}</div>
                        <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{p.created_at?new Date(p.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'}):''}</div>
                      </td>
                      <td style={{padding:'12px 14px',textAlign:'right'}}>
                        <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{p.product_name||'—'}</div>
                      </td>
                      <td style={{padding:'12px 14px',textAlign:'center',color:'#475569',fontSize:13,fontWeight:600}}>{p.employee_name||'—'}</td>
                      <td style={{padding:'12px 14px',textAlign:'center',color:'#475569',fontSize:13}}>{p.supplier||'—'}</td>
                      <td style={{padding:'12px 14px',textAlign:'center'}}>
                        <span style={{background:'#f1f5f9',color:'#475569',padding:'3px 10px',borderRadius:50,fontSize:12,fontWeight:700}}>{p.qty||'—'}</span>
                      </td>
                      <td style={{padding:'12px 14px',textAlign:'center'}}>
                        <span style={{
                          padding:'4px 10px',borderRadius:50,fontSize:11,fontWeight:700,
                          background: p.payment_method==='نقد'?'#f0fdf4':p.payment_method==='تحويل بنكي'?'#eff6ff':p.payment_method==='آجل'?'#fef2f2':'#f5f3ff',
                          color: p.payment_method==='نقد'?'#16a34a':p.payment_method==='تحويل بنكي'?'#2563eb':p.payment_method==='آجل'?'#dc2626':'#7c3aed'
                        }}>{p.payment_method||'—'}</span>
                      </td>
                      <td style={{padding:'12px 14px',textAlign:'center'}}>
                        <span style={{
                          padding:'4px 10px',borderRadius:50,fontSize:11,fontWeight:700,
                          background:p.has_vat?'#fffbeb':'#f8fafc',
                          color:p.has_vat?'#d97706':'#94a3b8'
                        }}>{p.has_vat?'15%':'—'}</span>
                      </td>
                      <td style={{padding:'12px 14px',textAlign:'center',color:'#475569',fontWeight:600,fontSize:13}}>{Number(p.unit_price||0).toFixed(2)} ﷼</td>
                      <td style={{padding:'12px 14px',textAlign:'center',color:'#d97706',fontWeight:700,fontSize:13}}>{Number(p.vat_amount||0).toFixed(2)} ﷼</td>
                      <td style={{padding:'12px 14px',textAlign:'center'}}>
                        <span style={{background:'#f0fdf4',color:'#16a34a',padding:'5px 14px',borderRadius:50,fontWeight:800,fontSize:13}}>
                          {Number(p.total_incl_vat||0).toFixed(2)} ﷼
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:'linear-gradient(135deg,#f8fafc,#eef2ff)',borderTop:'2px solid #e2e8f0'}}>
                    <td colSpan={7} style={{padding:'14px 16px',fontWeight:800,fontSize:14,color:'#0f172a',textAlign:'right'}}>
                      الإجمالي ({filtered.length} فاتورة)
                    </td>
                    <td style={{padding:'14px',textAlign:'center',fontWeight:800,color:'#475569'}}>{totalNoVat.toFixed(2)} ﷼</td>
                    <td style={{padding:'14px',textAlign:'center',fontWeight:800,color:'#d97706'}}>{totalVat.toFixed(2)} ﷼</td>
                    <td style={{padding:'14px',textAlign:'center'}}>
                      <span style={{background:'#6366f1',color:'white',padding:'6px 16px',borderRadius:50,fontWeight:900,fontSize:14}}>
                        {totalIncl.toFixed(2)} ﷼
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
