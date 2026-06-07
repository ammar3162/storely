'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PurchaseReportPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const supabase = createClient()

  useEffect(() => { load() }, [])
  useEffect(() => { filter() }, [purchases, search, filterCat, dateFrom, dateTo])

  async function load() {
    setLoading(true)
    const cachedOrg = sessionStorage.getItem('s_org_id')
    let orgId = cachedOrg
    if (!orgId) {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile?.org_id) { setLoading(false); return }
      orgId = profile.org_id
      sessionStorage.setItem('s_org_id', orgId)
    }
    const { data } = await supabase.from('purchases').select('*')
      .eq('org_id', orgId).order('created_at', { ascending: false })
    setPurchases(data || [])
    setLoading(false)
  }

  function filter() {
    let r = [...purchases]
    if (search)    r = r.filter(p => p.name?.includes(search) || p.supplier?.includes(search))
    if (filterCat) r = r.filter(p => p.category === filterCat)
    if (dateFrom)  r = r.filter(p => new Date(p.created_at) >= new Date(dateFrom))
    if (dateTo)    r = r.filter(p => new Date(p.created_at) <= new Date(dateTo + 'T23:59:59'))
    setFiltered(r)
  }

  function exportCSV() {
    const headers = ['التاريخ','الصنف','النوع','المبلغ بدون ضريبة','الضريبة 15%','الإجمالي','المورد']
    const rows = filtered.map(p => [
      new Date(p.created_at).toLocaleDateString('ar-SA'),
      p.name||'', p.category||'',
      Number(p.amount||0).toFixed(2),
      Number(p.vat_amount||0).toFixed(2),
      Number(p.total_amount||0).toFixed(2),
      p.supplier||''
    ])
    const csv = '\ufeff' + [headers,...rows].map(r => r.map(c => '"'+c+'"').join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'تقرير_المشتريات.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const totalAmount    = filtered.reduce((s,p) => s + Number(p.amount||0), 0)
  const totalVat       = filtered.reduce((s,p) => s + Number(p.vat_amount||0), 0)
  const totalWithVat   = filtered.reduce((s,p) => s + Number(p.total_amount||0), 0)

  const S: React.CSSProperties = { fontFamily:"'Segoe UI',system-ui,sans-serif", direction:'rtl' }
  const inp: React.CSSProperties = { padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:7, fontSize:12, outline:'none', background:'white', color:'#1e293b', fontFamily:'inherit' }

  return (
    <div style={S}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:3 }}>تقرير المشتريات</h1>
          <p style={{ fontSize:12, color:'#64748b' }}>مع حساب ضريبة القيمة المضافة 15%</p>
        </div>
        <button onClick={exportCSV} style={{ padding:'8px 16px', background:'#1a4731', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          📥 تصدير CSV
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'إجمالي بدون ضريبة', value:totalAmount.toFixed(2)+' ر.س', color:'#334155' },
          { label:'ضريبة القيمة المضافة 15%', value:totalVat.toFixed(2)+' ر.س', color:'#f59e0b' },
          { label:'الإجمالي شامل الضريبة', value:totalWithVat.toFixed(2)+' ر.س', color:'#10b981' },
          { label:'عدد الفواتير', value:filtered.length, color:'#3b82f6' },
        ].map((s,i) => (
          <div key={i} style={{ background:'white', borderRadius:10, padding:'14px 16px', border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' as const, letterSpacing:'0.05em', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'white', borderRadius:10, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', gap:8, flexWrap:'wrap' as const, alignItems:'center' }}>
          <input style={{ ...inp, flex:1, minWidth:160 }} placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={inp} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">كل الأنواع</option>
            <option value="مخزون">مخزون</option>
            <option value="صيانة">صيانة</option>
            <option value="أخرى">أخرى</option>
          </select>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{fontSize:10,fontWeight:600,color:"#94a3b8"}}>من تاريخ</label>
          <input type="date" style={inp} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{fontSize:10,fontWeight:600,color:"#94a3b8"}}>إلى تاريخ</label>
          <input type="date" style={inp} value={dateTo}   onChange={e => setDateTo(e.target.value)} />
          </div>
          {(search||filterCat||dateFrom||dateTo) && (
            <button onClick={() => { setSearch(''); setFilterCat(''); setDateFrom(''); setDateTo('') }}
              style={{ ...inp, background:'#fef2f2', color:'#ef4444', border:'1.5px solid #fecaca', cursor:'pointer', fontWeight:700 }}>✕ مسح</button>
          )}
        </div>

        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'#94a3b8', fontSize:13 }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🧾</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#475569' }}>لا توجد نتائج</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['التاريخ','الصنف','النوع','بدون ضريبة','ضريبة 15%','الإجمالي','المورد','فاتورة'].map((h,i) => (
                    <th key={i} style={{ padding:'10px 14px', color:'#94a3b8', fontSize:10, fontWeight:700, textAlign:'right', borderBottom:'1px solid #e2e8f0', textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p,i) => (
                  <tr key={p.id} style={{ borderBottom:'1px solid #f1f5f9', background: i%2===0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding:'11px 14px', color:'#94a3b8', fontSize:11 }}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</td>
                    <td style={{ padding:'11px 14px', fontWeight:600, fontSize:13, color:'#0f172a' }}>{p.name}</td>
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ background: p.category==='مخزون' ? '#e8f7ee' : p.category==='صيانة' ? '#fef3c7' : '#f1f5f9', color: p.category==='مخزون' ? '#166534' : p.category==='صيانة' ? '#92400e' : '#64748b', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>{p.category}</span>
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:13, color:'#334155' }}>{Number(p.amount||0).toFixed(2)} ر.س</td>
                    <td style={{ padding:'11px 14px', fontSize:13, color:'#f59e0b', fontWeight:600 }}>{Number(p.vat_amount||0).toFixed(2)} ر.س</td>
                    <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:'#10b981' }}>{Number(p.total_amount||0).toFixed(2)} ر.س</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#94a3b8' }}>{p.supplier||'—'}</td>
                    <td style={{ padding:'11px 14px', textAlign:'center' }}>
                      {p.invoice_image ? <a href={p.invoice_image} target='_blank' rel='noreferrer' style={{color:'#3b82f6',fontSize:12,fontWeight:600,textDecoration:'none'}}>📎 عرض</a> : <span style={{color:'#cbd5e1'}}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:'#f0faf4', borderTop:'2px solid #bbf7d0' }}>
                  <td colSpan={3} style={{ padding:'12px 14px', fontWeight:800, fontSize:13, color:'#0f172a', textAlign:'right' }}>الإجمالي ({filtered.length} فاتورة)</td>
                  <td style={{ padding:'12px 14px', fontWeight:700, fontSize:13 }}>{totalAmount.toFixed(2)} ر.س</td>
                  <td style={{ padding:'12px 14px', fontWeight:700, fontSize:13, color:'#f59e0b' }}>{totalVat.toFixed(2)} ر.س</td>
                  <td style={{ padding:'12px 14px', fontWeight:900, fontSize:14, color:'#10b981' }}>{totalWithVat.toFixed(2)} ر.س</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
// Fri Jun  5 15:35:07 +03 2026
