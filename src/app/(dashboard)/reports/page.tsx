'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, inp, tag, pageTitle, pageSub } from '@/lib/ds'

function ReportCard({ title, subtitle, icon, color, bg, border, stats, onClick }: any) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{width:'100%',textAlign:'right' as const,border:'none',cursor:'pointer',fontFamily:font.family,padding:0,background:'transparent'}}>
      <div style={{background:hov?bg:colors.surface,borderRadius:radius.xl,border:`2px solid ${hov?color:colors.border2}`,boxShadow:hov?`0 8px 32px ${color}22`:shadow.sm,padding:'20px 18px 16px',transition:'all .25s cubic-bezier(.4,0,.2,1)',transform:hov?'translateY(-3px)':'none'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px',marginBottom:14}}>
          <div>
            <div style={{fontSize:clamp('1.1rem','4vw','1.4rem'),fontWeight:900,color:colors.text,letterSpacing:'-0.3px',marginBottom:4,lineHeight:1.2}}>{title}</div>
            <div style={{fontSize:clamp('0.75rem','2.8vw','0.88rem'),color:colors.text3,lineHeight:1.4}}>{subtitle}</div>
          </div>
          <div style={{width:48,height:48,borderRadius:radius.lg,background:bg,border:`1.5px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{icon}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:`repeat(${stats.length},1fr)`,gap:6,background:colors.bg,borderRadius:radius.md,padding:'12px 10px',marginBottom:14}}>
          {stats.map((s:any,i:number)=>(
            <div key={i} style={{textAlign:'center' as const}}>
              <div style={{fontSize:clamp('1rem','3.5vw','1.2rem'),fontWeight:900,color:s.color,letterSpacing:'-0.5px'}}>{s.value}</div>
              <div style={{fontSize:clamp('0.6rem','2.2vw','0.72rem'),color:colors.text4,marginTop:2,fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:clamp('0.78rem','2.8vw','0.88rem'),fontWeight:700,color:hov?color:colors.text3,transition:'color .2s'}}>اضغط لعرض التفاصيل</span>
          <div style={{width:32,height:32,borderRadius:radius.md,background:hov?color:colors.border,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}>
            <svg width={15} height={15} fill="none" stroke={hov?'white':colors.text3} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          </div>
        </div>
      </div>
    </button>
  )
}

function BackBtn({ onClick }: { onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{...btnSecondary,marginBottom:18,display:'inline-flex',alignItems:'center',gap:8,padding:'10px 18px',fontSize:clamp('0.8rem','3vw','0.9rem')}}>
      <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      العودة للتقارير
    </button>
  )
}

function MobileDispenseCard({ m }: { m: any }) {
  return (
    <div style={{background:'#fafbfc',border:`1px solid ${colors.border}`,borderRadius:14,padding:'14px',marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:10}}>
        <div style={{fontSize:clamp('0.9rem','3.2vw','1rem'),fontWeight:700,color:colors.text,lineHeight:1.3,flex:1,minWidth:0}}>{(m.products as any)?.name||'—'}</div>
        <div style={{fontSize:clamp('0.7rem','2.6vw','0.8rem'),color:colors.text4,whiteSpace:'nowrap' as const,flexShrink:0,textAlign:'left'}}>
          {new Date(m.created_at).toLocaleDateString('ar-SA')}
          <div style={{fontSize:clamp('0.6rem','2.2vw','0.68rem)',marginTop:2}}>{new Date(m.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
      <div style={{display:'flex',flexWrap:'wrap' as const,gap:8,alignItems:'center'}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'5px 12px',background:colors.dangerLight,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:clamp('0.8rem','3vw','0.88rem'),fontWeight:700,color:colors.danger}}>▼ {Math.abs(m.qty_change)} {(m.products as any)?.unit}</span>
        <span style={{fontSize:clamp('0.75rem','2.8vw','0.85rem'),color:colors.text4,flex:1,minWidth:120}}>{m.note||'—'}</span>
      </div>
    </div>
  )
}

function MobilePurchaseCard({ p }: { p: any }) {
  const catStyle = p.category==='مخزون'?{bg:colors.primaryLight,text:colors.primary,border:colors.primaryBorder}:p.category==='صيانة'?{bg:colors.warningLight,text:colors.warning,border:colors.warningBorder}:{bg:colors.bg,text:colors.text3,border:colors.border2}
  return (
    <div style={{background:'#fafbfc',border:`1px solid ${colors.border}`,borderRadius:14,padding:'14px',marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:10}}>
        <div style={{flex:1,minWidth:0}}>
          <span style={{display:'inline-block',padding:'3px 10px',borderRadius:6,fontSize:clamp('0.65rem','2.4vw','0.75rem'),fontWeight:700,background:catStyle.bg,color:catStyle.text,marginBottom:6}}>{p.category||'أخرى'}</span>
          <div style={{fontSize:clamp('0.88rem','3.2vw','1rem'),fontWeight:700,color:colors.text,lineHeight:1.3}}>{p.name||'—'}</div>
        </div>
        <div style={{fontSize:clamp('0.7rem','2.6vw','0.8rem'),color:colors.text4,whiteSpace:'nowrap' as const,flexShrink:0}}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderTop:`1px dashed ${colors.border}`,marginTop:8}}>
        <span style={{fontSize:clamp('0.7rem','2.6vw','0.8rem'),color:colors.text4,fontWeight:600}}>بدون ضريبة</span>
        <span style={{fontSize:clamp('0.85rem','3.2vw','0.95rem'),fontWeight:800,color:colors.text2}}>{Number(p.amount||0).toFixed(2)} ر.س</span>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderTop:`1px dashed ${colors.border}`}>
        <span style={{fontSize:clamp('0.7rem','2.6vw','0.8rem'),color:colors.text4,fontWeight:600}}>الضريبة 15%</span>
        <span style={{fontSize:clamp('0.85rem','3.2vw','0.95rem'),fontWeight:800,color:colors.warning}}>{Number(p.vat_amount||0).toFixed(2)} ر.س</span>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderTop:'none',paddingTop:0}}>
        <span style={{fontSize:clamp('0.7rem','2.6vw','0.8rem'),color:colors.primary,fontWeight:800}}>الإجمالي</span>
        <span style={{fontSize:clamp('0.95rem','3.5vw','1.1rem'),fontWeight:900,color:colors.primary}}>{Number(p.total_amount||0).toFixed(2)} ر.س</span>
      </div>
      {p.supplier && (<div style={{fontSize:clamp('0.72rem','2.7vw','0.82rem'),color:colors.text3,marginTop:8}}>🏭 {p.supplier}</div>)}
    </div>
  )
}

function DispenseDetail({ onBack }: { onBack:()=>void }) {
  const [movements, setMovements] = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const sb = createClient()
  useEffect(()=>{load()},[])
  useEffect(()=>{applyFilter()},[movements,search,dateFrom,dateTo])
  useVisibilityRefresh(load,20*60*1000)
  async function load() {
    setLoading(true)
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId){setLoading(false);return}
    const{data}=await sb.from('stock_movements').select('*,products!inner(name,unit,org_id)').eq('type','out').eq('products.org_id',orgId).order('created_at',{ascending:false})
    setMovements(data||[]);setLoading(false)
  }
  function applyFilter(){
    let r=[...movements]
    if(search) r=r.filter(m=>(m.products as any)?.name?.includes(search)||m.note?.includes(search))
    if(dateFrom) r=r.filter(m=>new Date(m.created_at)>=new Date(dateFrom))
    if(dateTo)   r=r.filter(m=>new Date(m.created_at)<=new Date(dateTo+'T23:59:59'))
    setFiltered(r)
  }
  function exportCSV(){
    const csv='\ufeff'+[['التاريخ','المنتج','الكمية','الوحدة','الملاحظة'],...filtered.map(m=>[new Date(m.created_at).toLocaleDateString('ar-SA'),(m.products as any)?.name||'',Math.abs(m.qty_change),(m.products as any)?.unit||'',m.note||''])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_الصرف.csv'}).click()
  }
  const totalQty=filtered.reduce((s,m)=>s+Math.abs(m.qty_change),0)
  const productMap:Record<string,number>={}
  filtered.forEach(m=>{const n=(m.products as any)?.name||'—';productMap[n]=(productMap[n]||0)+Math.abs(m.qty_change)})
  const topProducts=Object.entries(productMap).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const barColors=[colors.danger,colors.info,'#8b5cf6',colors.warning,'#06b6d4']
  const hasFilter=!!(search||dateFrom||dateTo)
  return (
    <div>
      <BackBtn onClick={onBack}/>
      <h1 style={{...pageTitle,fontSize:clamp('1.3rem','5vw','1.6rem'),marginBottom:16}}>تقرير الصرف</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:16}}>
        {[{label:'كميات مصروفة',value:totalQty,color:colors.danger,bg:colors.dangerLight,border:colors.dangerBorder},{label:'عمليات الصرف',value:filtered.length,color:colors.info,bg:colors.infoLight,border:colors.infoBorder},{label:'أصناف مختلفة',value:Object.keys(productMap).length,color:'#8b5cf6',bg:'#f5f3ff',border:'#ddd6fe'}].map((s,i)=>(
          <div key={i} style={{...card,padding:'14px 12px',textAlign:'center' as const,borderColor:s.border,background:s.bg}}>
            <div style={{fontSize:clamp('1.1rem','4.5vw','1.5rem'),fontWeight:900,color:s.color,letterSpacing:'-1px',lineHeight:1.2}}>{s.value}</div>
            <div style={{fontSize:clamp('0.65rem','2.5vw','0.75rem'),color:colors.text3,marginTop:5,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>
      {topProducts.length>0&&(<div style={{...card,padding:16,marginBottom:14}}>
        <div style={{fontSize:clamp('0.85rem','3.2vw','1rem'),fontWeight:700,color:colors.text,marginBottom:14}}>🏆 الأكثر صرفاً</div>
        {topProducts.map(([name,qty],i)=>{
          const pct=Math.round((qty/topProducts[0][1])*100)
          return(<div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<topProducts.length-1?12:0}}>
            <div style={{width:24,height:24,borderRadius:radius.sm,background:barColors[i]+'22',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:11,fontWeight:800,color:barColors[i]}}>{i+1}</span></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:clamp('0.82rem','3vw','0.92rem'),fontWeight:600,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{name}</span><span style={{fontSize:clamp('0.82rem','3vw','0.92rem'),fontWeight:800,color:barColors[i],marginRight:8}}>{qty}</span></div>
              <div style={{height:6,background:colors.border,borderRadius:99}}><div style={{height:'100%',width:pct+'%',background:barColors[i],borderRadius:99,transition:'width .5s'}}/></div>
            </div>
          </div>)
        })}
      </div>)}
      <div style={{...card,overflow:'hidden',marginBottom:14}}>
        <div style={{padding:'12px',borderBottom:`1px solid ${colors.border}`,display:'flex',flexWrap:'wrap' as const,gap:8,alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن منتج أو ملاحظة..." style={{...inp(),flex:'1 1 160px',minWidth:0,fontSize:clamp('0.82rem','3vw','0.9rem'),padding:'10px 14px'}}/>
          <button onClick={()=>setShowFilter(!showFilter)} style={{...btnSecondary,padding:'10px 14px',fontSize:clamp('0.7rem','2.6vw','0.82rem'),background:showFilter?colors.primaryLight:colors.surface,borderColor:showFilter?colors.primaryBorder:colors.border2,color:showFilter?colors.primary:colors.text3,whiteSpace:'nowrap'}}>📅 تاريخ</button>
          <button onClick={exportCSV} style={{...btnPrimary,padding:'10px 16px',fontSize:clamp('0.7rem','2.6vw','0.82rem'),whiteSpace:'nowrap'}}>📥 تصدير</button>
          {hasFilter&&<button onClick={()=>{setSearch('');setDateFrom('');setDateTo('');setShowFilter(false)}} style={{...btnSecondary,padding:'10px 12px',fontSize:clamp('0.7rem','2.6vw','0.82rem'),color:colors.danger,borderColor:colors.dangerBorder}}>✕</button>}
        </div>
        {showFilter&&(<div style={{padding:'14px 12px',borderBottom:`1px solid ${colors.border}`,background:colors.bg,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><label style={{fontSize:clamp('0.68rem','2.5vw','0.78rem'),fontWeight:700,color:colors.text4,display:'block',marginBottom:5}}>من تاريخ</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp(),width:'100%',padding:'9px 10px',fontSize:clamp('0.8rem','3vw','0.88rem')}}/></div>
          <div><label style={{fontSize:clamp('0.68rem','2.5vw','0.78rem'),fontWeight:700,color:colors.text4,display:'block',marginBottom:5}}>إلى تاريخ</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...inp(),width:'100%',padding:'9px 10px',fontSize:clamp('0.8rem','3vw','0.88rem')}}/></div>
        </div>)}
      </div>
      <div style={{...card,overflow:'hidden',padding:0}}>
        {loading?(<div style={{padding:50,textAlign:'center'}}><div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 14px'}}/><div style={{fontSize:clamp('0.85rem','3.2vw','0.95rem'),color:colors.text4}}>جاري التحميل...</div></div>):filtered.length===0?(<div style={{padding:50,textAlign:'center'}}><div style={{fontSize:42,marginBottom:12}}>📭</div><div style={{fontSize:clamp('0.95rem','3.5vw','1.1rem'),fontWeight:600,color:colors.text2}}>لا توجد نتائج</div></div>):(<>
          <div className="mobile-list-only" style={{padding:8}}>{filtered.map((m:any)=><MobileDispenseCard key={m.id} m={m}/>)}</div>
          <div className="desktop-table-only" style={{display:'none',overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:400}}>
              <thead><tr style={{background:colors.bg,borderBottom:`2px solid ${colors.border}`}}>{['التاريخ','المنتج','الكمية','الملاحظة'].map((h,i:number)=>(<th key={i} style={{padding:'10px 14px',color:colors.text4,fontSize:clamp('0.68rem','2.5vw','0.78rem'),fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>{h}</th>))}</tr></thead>
              <tbody>{filtered.map((m:any,i:number)=>(<tr key={m.id} style={{borderBottom:`1px solid ${colors.border}`,background:i%2===0?colors.surface:colors.bg}}>
                <td style={{padding:'11px 14px',fontSize:clamp('0.78rem','2.9vw','0.88rem'),color:colors.text3,whiteSpace:'nowrap' as const}}>{new Date(m.created_at).toLocaleDateString('ar-SA')}<div style={{fontSize:10,color:colors.text4}}>{new Date(m.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</div></td>
                <td style={{padding:'11px 14px',fontSize:clamp('0.82rem','3vw','0.92rem'),fontWeight:700,color:colors.text}}>{(m.products as any)?.name}</td>
                <td style={{padding:'11px 14px'}}><span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder),fontSize:clamp('0.78rem','2.9vw','0.88rem'),padding:'4px 10px'}}>▼ {Math.abs(m.qty_change)} {(m.products as any)?.unit}</span></td>
                <td style={{padding:'11px 14px',fontSize:clamp('0.75rem','2.8vw','0.85rem'),color:colors.text4}}>{m.note||'—'}</td>
              </tr>))}</tbody>
            </table>
          </div>
          <div style={{padding:'12px 16px',background:colors.primaryLight,borderTop:`2px solid ${colors.primaryBorder}`,display:'flex',justifyContent:'space-between',flexWrap:'wrap' as const,gap:8}}>
            <span style={{fontSize:clamp('0.8rem','3vw','0.9rem'),fontWeight:700,color:colors.primary}}>{filtered.length} عملية</span>
            <span style={{fontSize:clamp('0.8rem','3vw','0.9rem'),fontWeight:800,color:colors.primary}}>{totalQty} وحدة مصروفة</span>
          </div>
        </>)}
      </div>
      <style dangerouslySetInnerHTML={{__html:`@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:767px){.mobile-list-only{display:block!important;padding:8px}.desktop-table-only{display:none!important}}@media(min-width:768px){.mobile-list-only{display:none!important}.desktop-table-only{display:block!important;overflow-x:auto}}`}}/>
    </div>
  )
}

function PurchaseDetail({ onBack }: { onBack:()=>void }) {
  const [purchases, setPurchases] = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const sb = createClient()
  useEffect(()=>{load()},[])
  useEffect(()=>{applyFilter()},[purchases,search,filterCat,dateFrom,dateTo])
  async function load(){
    setLoading(true)
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId){setLoading(false);return}
    const{data}=await sb.from('purchases').select('*').eq('org_id',orgId).order('created_at',{ascending:false})
    setPurchases(data||[]);setLoading(false)
  }
  function applyFilter(){
    let r=[...purchases]
    if(search)    r=r.filter((p:any)=>p.name?.includes(search)||p.supplier?.includes(search))
    if(filterCat) r=r.filter((p:any)=>p.category===filterCat)
    if(dateFrom)  r=r.filter((p:any)=>new Date(p.created_at)>=new Date(dateFrom))
    if(dateTo)    r=r.filter((p:any)=>new Date(p.created_at)<=new Date(dateTo+'T23:59:59'))
    setFiltered(r)
  }
  function exportCSV(){
    const csv='\ufeff'+[['التاريخ','الصنف','النوع','بدون ضريبة','الضريبة','الإجمالي','المورد'],...filtered.map((p:any)=>[new Date(p.created_at).toLocaleDateString('ar-SA'),p.name||'',p.category||'',Number(p.amount||0).toFixed(2),Number(p.vat_amount||0).toFixed(2),Number(p.total_amount||0).toFixed(2),p.supplier||''])].map((r:string[])=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_المشتريات.csv'}).click()
  }
  const totalAmount=filtered.reduce((s:number,p:any)=>s+Number(p.amount||0),0)
  const totalVat=filtered.reduce((s:number,p:any)=>s+Number(p.vat_amount||0),0)
  const totalWithVat=filtered.reduce((s:number,p:any)=>s+Number(p.total_amount||0),0)
  const hasFilter=!!(search||filterCat||dateFrom||dateTo)
  const catTag=(c:string)=>c==='مخزون'?tag(colors.primary,colors.primaryLight,colors.primaryBorder):c==='صيانة'?tag(colors.warning,colors.warningLight,colors.warningBorder):tag(colors.text3,colors.bg,colors.border2)
  return (
    <div>
      <BackBtn onClick={onBack}/>
      <h1 style={{...pageTitle,fontSize:clamp('1.3rem','5vw','1.6rem'),marginBottom:16}}>تقرير المشتريات</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:16}}>
        {[{label:'بدون ضريبة',value:totalAmount.toFixed(2)+' ر.س',color:colors.text2,bg:colors.bg,border:colors.border2},{label:'ضريبة 15%',value:totalVat.toFixed(2)+' ر.س',color:colors.warning,bg:colors.warningLight,border:colors.warningBorder},{label:'الإجمالي شامل الضريبة',value:totalWithVat.toFixed(2)+' ر.س',color:colors.primary,bg:colors.primaryLight,border:colors.primaryBorder},{label:'عدد الفواتير',value:filtered.length,color:colors.info,bg:colors.infoLight,border:colors.infoBorder}].map((s,i:number)=>(
          <div key={i} style={{...card,padding:'14px 12px',textAlign:'center' as const,borderColor:s.border,background:s.bg}}>
            <div style={{fontSize:clamp('1rem','4vw','1.3rem'),fontWeight:900,color:s.color,letterSpacing:'-0.5px',lineHeight:1.2}}>{s.value}</div>
            <div style={{fontSize:clamp('0.65rem','2.5vw','0.75rem'),color:colors.text3,marginTop:5,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{...card,overflow:'hidden',marginBottom:14}}>
        <div style={{padding:'12px',borderBottom:`1px solid ${colors.border}`,display:'flex',flexWrap:'wrap' as const,gap:8,alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم الصنف أو المورد..." style={{...inp(),flex:'1 1 150px',minWidth:0,fontSize:clamp('0.82rem','3vw','0.9rem'),padding:'10px 14px'}}/>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...inp(),width:'auto',minWidth:110,padding:'10px 12px',fontSize:clamp('0.8rem','3vw','0.88rem)'}}><option value="">كل الأنواع</option><option value="مخزون">مخزون</option><option value="صيانة">صيانة</option><option value="أخرى">أخرى</option></select>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp(),width:'auto',minWidth:130,padding:'10px 10px',fontSize:clamp('0.78rem','2.9vw','0.86rem)'}}/>
          <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   style={{...inp(),width:'auto',minWidth:130,padding:'10px 10px',fontSize:clamp('0.78rem','2.9vw','0.86rem)'}}/>
          <button onClick={exportCSV} style={{...btnPrimary,padding:'10px 16px',fontSize:clamp('0.7rem','2.6vw','0.82rem'),whiteSpace:'nowrap'}}>📥 تصدير</button>
          {hasFilter&&<button onClick={()=>{setSearch('');setFilterCat('');setDateFrom('');setDateTo('')}} style={{...btnSecondary,padding:'10px 12px',fontSize:clamp('0.7rem','2.6vw','0.82rem'),color:colors.danger,borderColor:colors.dangerBorder}}>✕</button>}
        </div>
      </div>
      <div style={{...card,overflow:'hidden',padding:0}}>
        {loading?(<div style={{padding:50,textAlign:'center'}}><div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 14px'}}/></div>):filtered.length===0?(<div style={{padding:50,textAlign:'center'}}><div style={{fontSize:42,marginBottom:12}}>🧾</div><div style={{fontSize:clamp('0.95rem','3.5vw','1.1rem'),fontWeight:600,color:colors.text2}}>لا توجد نتائج</div></div>):(<>
          <div className="mobile-list-only" style={{padding:8}}>{filtered.map((p:any)=><MobilePurchaseCard key={p.id} p={p}/>)}</div>
          <div className="desktop-table-only" style={{display:'none',overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:700}}>
              <thead><tr style={{background:colors.bg,borderBottom:`2px solid ${colors.border}`}}>{['التاريخ','الصنف','النوع','بدون ضريبة','ضريبة 15%','الإجمالي','المورد','فاتورة'].map((h,i:number)=>(<th key={i} style={{padding:'10px 12px',color:colors.text4,fontSize:clamp('0.65rem','2.4vw','0.76rem'),fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.04em'}}>{h}</th>))}</tr></thead>
              <tbody>{filtered.map((p:any,i:number)=>(<tr key={p.id} style={{borderBottom:`1px solid ${colors.border}`,background:i%2===0?colors.surface:colors.bg}}>
                <td style={{padding:'11px 12px',fontSize:clamp('0.75rem','2.8vw','0.85rem'),color:colors.text3,whiteSpace:'nowrap' as const}}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</td>
                <td style={{padding:'11px 12px',fontSize:clamp('0.82rem','3vw','0.92rem'),fontWeight:700,color:colors.text}}>{p.name}</td>
                <td style={{padding:'11px 12px'}}><span style={catTag(p.category)}>{p.category}</span></td>
                <td style={{padding:'11px 12px',fontSize:clamp('0.8rem','3vw','0.9rem'),color:colors.text2}}>{Number(p.amount||0).toFixed(2)} ر.س</td>
                <td style={{padding:'11px 12px',fontSize:clamp('0.8rem','3vw','0.9rem'),color:colors.warning,fontWeight:600}}>{Number(p.vat_amount||0).toFixed(2)} ر.س</td>
                <td style={{padding:'11px 12px',fontSize:clamp('0.8rem','3vw','0.9rem'),fontWeight:700,color:colors.primary}}>{Number(p.total_amount||0).toFixed(2)} ر.س</td>
                <td style={{padding:'11px 12px',fontSize:clamp('0.72rem','2.7vw','0.82rem'),color:colors.text4}}>{p.supplier||'—'}</td>
                <td style={{padding:'11px 12px',textAlign:'center' as const}}>{p.invoice_image?<a href={p.invoice_image} target="_blank" rel="noreferrer" style={{color:colors.info,fontSize:clamp('0.7rem','2.6vw','0.8rem'),fontWeight:600,textDecoration:'none'}}>📎 عرض</a>:<span style={{color:colors.text5}}>—</span>}</td>
              </tr>))}</tbody>
              <tfoot><tr style={{background:colors.primaryLight,borderTop:`2px solid ${colors.primaryBorder}`}>
                <td colSpan={3} style={{padding:'12px 12px',fontWeight:800,fontSize:clamp('0.8rem','3vw','0.9rem'),color:colors.text}}>الإجمالي ({filtered.length} فاتورة)</td>
                <td style={{padding:'12px 12px',fontWeight:700,fontSize:clamp('0.8rem','3vw','0.9rem')}}>{totalAmount.toFixed(2)} ر.س</td>
                <td style={{padding:'12px 12px',fontWeight:700,fontSize:clamp('0.8rem','3vw','0.9rem'),color:colors.warning}}>{totalVat.toFixed(2)} ر.س</td>
                <td colSpan={3} style={{padding:'12px 12px',fontWeight:900,fontSize:clamp('0.9rem','3.4vw','1.05rem'),color:colors.primary}}>{totalWithVat.toFixed(2)} ر.س</td>
              </tr></tfoot>
            </table>
          </div>
        </>)}
      </div>
      <style dangerouslySetInnerHTML={{__html:`@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:767px){.mobile-list-only{display:block!important;padding:8px}.desktop-table-only{display:none!important}}@media(min-width:768px){.mobile-list-only{display:none!important}.desktop-table-only{display:block!important;overflow-x:auto}}`}}/>
    </div>
  )
}

export default function ReportsPage() {
  const [view, setView] = useState<'home'|'dispense'|'purchase'>('home')
  const [dispenseStats, setDispenseStats] = useState({ops:0,qty:0,items:0})
  const [purchaseStats, setPurchaseStats] = useState({invoices:0,total:0,vat:0})
  const sb = createClient()
  useEffect(()=>{loadStats()},[])
  async function loadStats(){
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId) return
    const [{data:mv},{data:pu}]=await Promise.all([
      sb.from('stock_movements').select('qty_change,products!inner(name,org_id)').eq('type','out').eq('products.org_id',orgId),
      sb.from('purchases').select('amount,total_amount,vat_amount').eq('org_id',orgId),
    ])
    const items=new Set((mv||[]).map((m:any)=>m.products?.name)).size
    setDispenseStats({ops:(mv||[]).length,qty:(mv||[]).reduce((s:number,m:any)=>s+Math.abs(m.qty_change),0),items})
    setPurchaseStats({invoices:(pu||[]).length,total:(pu||[]).reduce((s:number,p:any)=>s+Number(p.total_amount||0),0),vat:(pu||[]).reduce((s:number,p:any)=>s+Number(p.vat_amount||0),0)})
  }
  if(view==='dispense') return (<div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto',padding:'0 12px'}}><style>@keyframes spin{to{transform:rotate(360deg)}}</style><DispenseDetail onBack={()=>setView('home')}/></div>)
  if(view==='purchase') return (<div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto',padding:'0 12px'}}><style>@keyframes spin{to{transform:rotate(360deg)}}</style><PurchaseDetail onBack={()=>setView('home')}/></div>)
  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:680,margin:'0 auto',padding:'0 12px'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{...pageTitle,fontSize:clamp('1.5rem','5.5vw','2rem')}}>التقارير</h1>
        <p style={{...pageSub,fontSize:clamp('0.85rem','3.2vw','1rem')}}>اختر التقرير الذي تريد عرضه</p>
      </div>
      <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
        <ReportCard title="تقرير الصرف" subtitle="عمليات الصرف من المخزون مع تفاصيل الكميات والأسباب" icon="📤" color={colors.danger} bg={colors.dangerLight} border={colors.dangerBorder} stats={[{label:'عمليات الصرف',value:dispenseStats.ops,color:colors.danger},{label:'وحدات مصروفة',value:dispenseStats.qty,color:colors.danger},{label:'أصناف مختلفة',value:dispenseStats.items,color:colors.danger}]} onClick={()=>setView('dispense')}/>
        <ReportCard title="تقرير المشتريات" subtitle="فواتير المشتريات مع حساب ضريبة القيمة المضافة 15%" icon="🧾" color={colors.primary} bg={colors.primaryLight} border={colors.primaryBorder} stats={[{label:'عدد الفواتير',value:purchaseStats.invoices,color:colors.primary},{label:'إجمالي شامل الضريبة',value:purchaseStats.total.toLocaleString('ar-SA',{maximumFractionDigits:0})+' ر.س',color:colors.primary},{label:'ضريبة القيمة المضافة',value:purchaseStats.vat.toLocaleString('ar-SA',{maximumFractionDigits:0})+' ر.س',color:colors.warning}]} onClick={()=>setView('purchase')}/>
      </div>
    </div>
  )
}
