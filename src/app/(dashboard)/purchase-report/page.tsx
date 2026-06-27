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
  const [viewImg, setViewImg]     = useState<string|null>(null)
  const [expanded, setExpanded]   = useState<string|null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [])
  useEffect(() => { applyFilter() }, [purchases, search, filterCat, dateFrom, dateTo])

  async function load() {
    setLoading(true)
    let orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: p } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!p?.org_id) { setLoading(false); return }
      orgId = p.org_id
      sessionStorage.setItem('s_org_id', orgId!)
    }
    const bid = sessionStorage.getItem('s_branch_id')
    let q = supabase.from('purchases').select('*').eq('org_id', orgId!)
    if (bid) q = q.eq('branch_id', bid)
    const { data } = await q.order('created_at', { ascending: false })
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
    const headers = ['التاريخ','الصنف','النوع','المبلغ بدون ضريبة','الضريبة 15%','الإجمالي','المورد','رابط الفاتورة']
    const rows = filtered.map(p => [
      new Date(p.created_at).toLocaleDateString('en-GB'),
      p.name||'', p.category||'',
      Number(p.amount||0).toFixed(2),
      Number(p.vat_amount||0).toFixed(2),
      Number(p.total_amount||0).toFixed(2),
      p.supplier||'',
      p.invoice_image||''
    ])
    const csv = '\ufeff' + [headers,...rows].map(r => r.map(c => '"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_المشتريات.csv'}).click()
  }

  const totalAmount  = filtered.reduce((s,p) => s + Number(p.amount||0), 0)
  const totalVat     = filtered.reduce((s,p) => s + Number(p.vat_amount||0), 0)
  const totalWithVat = filtered.reduce((s,p) => s + Number(p.total_amount||0), 0)
  const withInvoice  = filtered.filter(p => p.invoice_image).length

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',maxWidth:900,margin:'0 auto'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700;800&display=swap');
        *{box-sizing:border-box}
        .pr-card{background:white;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;transition:all .2s}
        .pr-row{border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .1s}
        .pr-row:hover{background:#f8fafc}
        .pr-row:last-child{border-bottom:none}
        input:focus,select:focus{outline:none!important;border-color:#16a34a!important;box-shadow:0 0 0 3px rgba(22,163,74,.1)!important}
        @media(max-width:640px){
          .stats-grid{grid-template-columns:1fr 1fr!important;gap:8px!important}
          .filters-row{flex-direction:column!important;gap:8px!important}
          .filters-row input,.filters-row select{width:100%!important}
          .date-row{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}
          .desk-table{display:none!important}
          .mob-list{display:block!important}
          .page-header{flex-direction:column!important;gap:12px!important;align-items:flex-start!important}
          .page-header button{width:100%!important;justify-content:center!important}
        }
        @media(min-width:641px){.mob-list{display:none!important}}
        .mob-list{display:none}
      `}</style>

      {/* Image Modal */}
      {viewImg && (
        <div style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,.9)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setViewImg(null)}>
          <button onClick={()=>setViewImg(null)} style={{position:'absolute',top:20,left:20,background:'rgba(255,255,255,.1)',border:'none',borderRadius:'50%',width:40,height:40,color:'white',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          <img src={viewImg} alt="فاتورة" style={{maxWidth:'100%',maxHeight:'90vh',borderRadius:12,objectFit:'contain'}} onClick={e=>e.stopPropagation()}/>
          <a href={viewImg} download target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
            style={{position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',background:'#16a34a',color:'white',padding:'10px 24px',borderRadius:10,textDecoration:'none',fontSize:14,fontWeight:700}}>
            ⬇️ تحميل الفاتورة
          </a>
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:2}}>تقرير المشتريات</h1>
          <p style={{fontSize:12,color:'#64748b'}}>{filtered.length} فاتورة · {withInvoice} مع صورة</p>
        </div>
        <button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 18px',background:'#0f172a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          📥 تصدير CSV
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'بدون ضريبة',value:totalAmount.toFixed(2)+' ر.س',color:'#334155',bg:'#f8fafc',border:'#e2e8f0'},
          {label:'ضريبة 15%',value:totalVat.toFixed(2)+' ر.س',color:'#d97706',bg:'#fffbeb',border:'#fde68a'},
          {label:'الإجمالي',value:totalWithVat.toFixed(2)+' ر.س',color:'#16a34a',bg:'#f0fdf4',border:'#bbf7d0'},
          {label:'عدد الفواتير',value:filtered.length,color:'#2563eb',bg:'#eff6ff',border:'#bfdbfe'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:12,padding:'14px 12px',border:`1.5px solid ${s.border}`}}>
            <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:16,fontWeight:900,color:s.color,letterSpacing:'-0.5px'}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="pr-card" style={{marginBottom:14}}>
        <div style={{padding:'12px 14px'}}>
          <div className="filters-row" style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
            <div style={{flex:1,minWidth:160}}>
              <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>بحث</label>
              <div style={{position:'relative'}}>
                <svg style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="13" height="13" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="اسم الصنف أو المورد..."
                  style={{width:'100%',padding:'9px 32px 9px 10px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontFamily:'inherit',background:'#f8fafc',color:'#0f172a'}}/>
              </div>
            </div>
            <div style={{minWidth:130}}>
              <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>النوع</label>
              <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
                style={{width:'100%',padding:'9px 10px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontFamily:'inherit',background:'#f8fafc',color:'#0f172a'}}>
                <option value="">الكل</option>
                <option value="مخزون">مخزون</option>
                <option value="صيانة">صيانة</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div className="date-row" style={{display:'flex',gap:8}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>من</label>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                  style={{padding:'9px 10px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontFamily:'inherit',background:'#f8fafc',color:'#0f172a'}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>إلى</label>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                  style={{padding:'9px 10px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontFamily:'inherit',background:'#f8fafc',color:'#0f172a'}}/>
              </div>
            </div>
            {(search||filterCat||dateFrom||dateTo)&&(
              <button onClick={()=>{setSearch('');setFilterCat('');setDateFrom('');setDateTo('')}}
                style={{padding:'9px 14px',background:'#fef2f2',color:'#ef4444',border:'1.5px solid #fecaca',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                ✕ مسح
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pr-card">
        {loading ? (
          <div style={{padding:48,textAlign:'center',color:'#94a3b8',fontSize:13}}>
            <div style={{width:32,height:32,border:'3px solid #e2e8f0',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 12px'}}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            جاري التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{padding:48,textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>🧾</div>
            <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:4}}>لا توجد نتائج</div>
            <div style={{fontSize:12,color:'#94a3b8'}}>جرب تغيير الفلاتر</div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desk-table" style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
                <thead>
                  <tr style={{background:'#f8fafc',borderBottom:'1.5px solid #e2e8f0'}}>
                    {['التاريخ','الصنف','النوع','بدون ضريبة','ضريبة 15%','الإجمالي','المورد','فاتورة'].map((h,i)=>(
                      <th key={i} style={{padding:'11px 14px',color:'#94a3b8',fontSize:10,fontWeight:700,textAlign:'right',textTransform:'uppercase',letterSpacing:'.04em',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p,i)=>(
                    <tr key={p.id} className="pr-row" style={{background:i%2===0?'white':'#fafafa'}}>
                      <td style={{padding:'12px 14px',color:'#94a3b8',fontSize:11,whiteSpace:'nowrap'}}>{new Date(p.created_at).toLocaleDateString('ar-SA',{day:'numeric',month:'short',year:'numeric'})}</td>
                      <td style={{padding:'12px 14px',fontWeight:600,fontSize:13,color:'#0f172a'}}>{p.name}</td>
                      <td style={{padding:'12px 14px'}}>
                        <span style={{background:p.category==='مخزون'?'#e8f7ee':p.category==='صيانة'?'#fef3c7':'#f1f5f9',color:p.category==='مخزون'?'#166534':p.category==='صيانة'?'#92400e':'#64748b',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>{p.category||'—'}</span>
                      </td>
                      <td style={{padding:'12px 14px',fontSize:13,color:'#334155',whiteSpace:'nowrap'}}>{Number(p.amount||0).toFixed(2)} ر.س</td>
                      <td style={{padding:'12px 14px',fontSize:13,color:'#d97706',fontWeight:600,whiteSpace:'nowrap'}}>{Number(p.vat_amount||0).toFixed(2)} ر.س</td>
                      <td style={{padding:'12px 14px',fontSize:13,fontWeight:800,color:'#16a34a',whiteSpace:'nowrap'}}>{Number(p.total_amount||0).toFixed(2)} ر.س</td>
                      <td style={{padding:'12px 14px',fontSize:12,color:'#94a3b8'}}>{p.supplier||'—'}</td>
                      <td style={{padding:'12px 14px',textAlign:'center'}}>
                        {p.invoice_image
                          ? <button onClick={()=>setViewImg(p.invoice_image)} style={{background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',borderRadius:8,padding:'5px 12px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>📎 عرض</button>
                          : <span style={{color:'#e2e8f0'}}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:'#f0fdf4',borderTop:'2px solid #bbf7d0'}}>
                    <td colSpan={3} style={{padding:'12px 14px',fontWeight:800,fontSize:13,color:'#0f172a'}}>الإجمالي ({filtered.length} فاتورة)</td>
                    <td style={{padding:'12px 14px',fontWeight:700,fontSize:13,color:'#334155',whiteSpace:'nowrap'}}>{totalAmount.toFixed(2)} ر.س</td>
                    <td style={{padding:'12px 14px',fontWeight:700,fontSize:13,color:'#d97706',whiteSpace:'nowrap'}}>{totalVat.toFixed(2)} ر.س</td>
                    <td style={{padding:'12px 14px',fontWeight:900,fontSize:14,color:'#16a34a',whiteSpace:'nowrap'}}>{totalWithVat.toFixed(2)} ر.س</td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile List */}
            <div className="mob-list" style={{padding:'8px'}}>
              {filtered.map((p,i)=>(
                <div key={p.id} onClick={()=>setExpanded(expanded===p.id?null:p.id)}
                  style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,marginBottom:8,overflow:'hidden',transition:'all .2s'}}>
                  {/* Row Header */}
                  <div style={{padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontSize:10,color:'#94a3b8'}}>{new Date(p.created_at).toLocaleDateString('ar-SA',{day:'numeric',month:'short'})}</span>
                        <span style={{background:p.category==='مخزون'?'#e8f7ee':p.category==='صيانة'?'#fef3c7':'#f1f5f9',color:p.category==='مخزون'?'#166534':p.category==='صيانة'?'#92400e':'#64748b',padding:'1px 8px',borderRadius:20,fontSize:10,fontWeight:600}}>{p.category||'—'}</span>
                        {p.invoice_image&&<span style={{background:'#eff6ff',color:'#2563eb',padding:'1px 8px',borderRadius:20,fontSize:10,fontWeight:600}}>📎 فاتورة</span>}
                      </div>
                    </div>
                    <div style={{textAlign:'left',flexShrink:0,marginRight:12}}>
                      <div style={{fontSize:16,fontWeight:900,color:'#16a34a'}}>{Number(p.total_amount||0).toFixed(2)}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>ر.س</div>
                    </div>
                    <svg width={16} height={16} fill="none" stroke="#94a3b8" strokeWidth={2} viewBox="0 0 24 24" style={{transition:'transform .2s',transform:expanded===p.id?'rotate(180deg)':'none',flexShrink:0}}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>

                  {/* Expanded Details */}
                  {expanded===p.id&&(
                    <div style={{borderTop:'1px solid #f1f5f9',padding:'12px 14px',background:'#f8fafc'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                        {[
                          {label:'بدون ضريبة',value:Number(p.amount||0).toFixed(2)+' ر.س',color:'#334155'},
                          {label:'ضريبة 15%',value:Number(p.vat_amount||0).toFixed(2)+' ر.س',color:'#d97706'},
                          {label:'الإجمالي',value:Number(p.total_amount||0).toFixed(2)+' ر.س',color:'#16a34a'},
                          {label:'المورد',value:p.supplier||'—',color:'#64748b'},
                        ].map((item,j)=>(
                          <div key={j} style={{background:'white',borderRadius:8,padding:'8px 10px',border:'1px solid #e2e8f0'}}>
                            <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',marginBottom:3,textTransform:'uppercase'}}>{item.label}</div>
                            <div style={{fontSize:13,fontWeight:700,color:item.color}}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                      {p.note&&<div style={{fontSize:12,color:'#64748b',marginBottom:10,padding:'8px 10px',background:'white',borderRadius:8,border:'1px solid #e2e8f0'}}>📝 {p.note}</div>}
                      {p.invoice_image&&(
                        <div>
                          <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginBottom:8,textTransform:'uppercase'}}>صورة الفاتورة</div>
                          <img src={p.invoice_image} alt="فاتورة" onClick={()=>setViewImg(p.invoice_image)}
                            style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:10,border:'1px solid #e2e8f0',cursor:'pointer'}}/>
                          <div style={{display:'flex',gap:8,marginTop:8}}>
                            <button onClick={()=>setViewImg(p.invoice_image)} style={{flex:1,padding:'9px',background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>🔍 عرض كامل</button>
                            <a href={p.invoice_image} download target="_blank" rel="noreferrer"
                              style={{flex:1,padding:'9px',background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',textDecoration:'none',textAlign:'center',display:'block'}}>
                              ⬇️ تحميل
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {/* Mobile Total */}
              <div style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:12,padding:'14px 16px',marginTop:8}}>
                <div style={{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:8}}>إجمالي {filtered.length} فاتورة</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {[
                    {label:'بدون ضريبة',value:totalAmount.toFixed(2),color:'#334155'},
                    {label:'الضريبة',value:totalVat.toFixed(2),color:'#d97706'},
                    {label:'الإجمالي',value:totalWithVat.toFixed(2),color:'#16a34a'},
                  ].map((s,i)=>(
                    <div key={i} style={{textAlign:'center'}}>
                      <div style={{fontSize:9,color:'#94a3b8',fontWeight:600,marginBottom:3}}>{s.label}</div>
                      <div style={{fontSize:14,fontWeight:900,color:s.color}}>{s.value}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>ر.س</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
