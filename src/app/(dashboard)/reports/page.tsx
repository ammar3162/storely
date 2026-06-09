'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, inp, tag, pageTitle, pageSub } from '@/lib/ds'

type FilterPeriod = 'today'|'week'|'month'|'year'|'custom'

function getRange(period: FilterPeriod, from: string, to: string) {
  const now = new Date(); const end = new Date(now); end.setHours(23,59,59,999)
  if (period==='today')  { const s=new Date(now); s.setHours(0,0,0,0); return {start:s,end} }
  if (period==='week')   { const s=new Date(now); s.setDate(now.getDate()-6); s.setHours(0,0,0,0); return {start:s,end} }
  if (period==='month')  { return {start:new Date(now.getFullYear(),now.getMonth(),1),end} }
  if (period==='year')   { return {start:new Date(now.getFullYear(),0,1),end} }
  return { start:from?new Date(from+'T00:00:00'):new Date(2000,0,1), end:to?new Date(to+'T23:59:59'):end }
}

function formatRange(period: FilterPeriod, from: string, to: string) {
  if (period==='today') return 'اليوم'
  if (period==='week')  return 'آخر 7 أيام'
  if (period==='month') return new Date().toLocaleDateString('ar-SA',{month:'long',year:'numeric'})
  if (period==='year')  return new Date().getFullYear().toString()
  if (from&&to) return `${from} — ${to}`
  if (from) return `من ${from}`
  if (to)   return `حتى ${to}`
  return 'كل الوقت'
}

function FilterBar({ period, setPeriod, from, setFrom, to, setTo }: any) {
  const PERIODS = [{key:'today',label:'اليوم'},{key:'week',label:'الأسبوع'},{key:'month',label:'هذا الشهر'},{key:'year',label:'هذه السنة'},{key:'custom',label:'تخصيص'}]
  return (
    <div style={{...card,padding:16,marginBottom:20}}>
      <div style={{display:'flex',gap:6,flexWrap:'wrap' as const,marginBottom:period==='custom'?12:0}}>
        {PERIODS.map(p=>(
          <button key={p.key} onClick={()=>setPeriod(p.key as FilterPeriod)} style={{padding:'8px 14px',borderRadius:radius.md,border:'none',background:period===p.key?colors.primary:colors.bg,color:period===p.key?'white':colors.text3,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family,transition:'all .15s'}}>
            {p.label}
          </button>
        ))}
      </div>
      {period==='custom'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><label style={{fontSize:font.xs,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>من تاريخ</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={inp()}/></div>
          <div><label style={{fontSize:font.xs,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>إلى تاريخ</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={inp()}/></div>
        </div>
      )}
    </div>
  )
}

function ReportCard({ title, subtitle, icon, color, bg, border, stats, onClick, loading }: any) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{width:'100%',textAlign:'right' as const,border:'none',cursor:'pointer',fontFamily:font.family,padding:0,background:'transparent'}}>
      <div style={{background:hov?bg:colors.surface,borderRadius:radius.xl,border:`2px solid ${hov?color:colors.border2}`,boxShadow:hov?`0 8px 32px ${color}22`:shadow.sm,padding:'24px 24px 20px',transition:'all .2s cubic-bezier(.4,0,.2,1)',transform:hov?'translateY(-3px)':'none'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <div style={{fontSize:font.xl,fontWeight:900,color:colors.text,letterSpacing:'-0.5px',marginBottom:3}}>{title}</div>
            <div style={{fontSize:font.sm,color:colors.text3}}>{subtitle}</div>
          </div>
          <div style={{width:52,height:52,borderRadius:radius.lg,background:bg,border:`1.5px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>{icon}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:`repeat(${stats.length},1fr)`,gap:8,background:colors.bg,borderRadius:radius.md,padding:'12px 14px',marginBottom:16}}>
          {loading?[...Array(stats.length)].map((_,i)=>(<div key={i} style={{textAlign:'center' as const}}><div style={{height:22,background:colors.border2,borderRadius:6,marginBottom:4,animation:'sk 1.4s infinite'}}/><div style={{height:10,background:colors.border,borderRadius:4,animation:'sk 1.4s infinite'}}/></div>))
          :stats.map((s:any,i:number)=>(<div key={i} style={{textAlign:'center' as const}}><div style={{fontSize:font.lg,fontWeight:900,color:s.color,letterSpacing:'-0.5px'}}>{s.value}</div><div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>{s.label}</div></div>))}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:font.sm,fontWeight:700,color:hov?color:colors.text3,transition:'color .2s'}}>اضغط لعرض التفاصيل</span>
          <div style={{width:32,height:32,borderRadius:radius.md,background:hov?color:colors.border,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}>
            <svg width={14} height={14} fill="none" stroke={hov?'white':colors.text3} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          </div>
        </div>
      </div>
    </button>
  )
}

function BackBtn({ onClick }: { onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{...btnSecondary,marginBottom:16,display:'flex',alignItems:'center',gap:8,padding:'9px 16px',fontSize:font.sm}}>
      <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      العودة للتقارير
    </button>
  )
}

function PeriodBadge({ period, from, to }: any) {
  return (
    <div style={{...card,padding:'10px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
      <span style={{fontSize:16}}>📅</span>
      <span style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{formatRange(period,from,to)}</span>
    </div>
  )
}

function DispenseDetail({ period, from, to, onBack }: { period:FilterPeriod; from:string; to:string; onBack:()=>void }) {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const sb = createClient()
  useEffect(()=>{ load() },[period,from,to])
  async function load() {
    setLoading(true)
    const orgId=sessionStorage.getItem('s_org_id'); if(!orgId){setLoading(false);return}
    const {start,end}=getRange(period,from,to)
    const{data}=await sb.from('stock_movements').select('*,products!inner(name,unit,org_id)').eq('type','out').eq('products.org_id',orgId).gte('created_at',start.toISOString()).lte('created_at',end.toISOString()).order('created_at',{ascending:false})
    setMovements(data||[]); setLoading(false)
  }
  function exportCSV(){
    const csv='\ufeff'+[['التاريخ','المنتج','الكمية','الوحدة','الملاحظة'],...filtered.map(m=>[new Date(m.created_at).toLocaleDateString('ar-SA'),(m.products as any)?.name||'',Math.abs(m.qty_change),(m.products as any)?.unit||'',m.note||''])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_الصرف.csv'}).click()
  }
  const filtered=movements.filter(m=>!search||(m.products as any)?.name?.includes(search)||m.note?.includes(search))
  const totalQty=filtered.reduce((s,m)=>s+Math.abs(m.qty_change),0)
  const productMap:Record<string,number>={}
  filtered.forEach(m=>{const n=(m.products as any)?.name||'—';productMap[n]=(productMap[n]||0)+Math.abs(m.qty_change)})
  const topProducts=Object.entries(productMap).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const barColors=[colors.primary,colors.info,'#8b5cf6',colors.warning,colors.danger]
  return (
    <div>
      <BackBtn onClick={onBack}/>
      <PeriodBadge period={period} from={from} to={to}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
        {[{label:'كميات مصروفة',value:totalQty,color:colors.danger,bg:colors.dangerLight,border:colors.dangerBorder},{label:'عمليات الصرف',value:filtered.length,color:colors.info,bg:colors.infoLight,border:colors.infoBorder},{label:'أصناف مختلفة',value:Object.keys(productMap).length,color:'#8b5cf6',bg:'#f5f3ff',border:'#ddd6fe'}].map((s,i)=>(
          <div key={i} style={{...card,padding:'12px',textAlign:'center' as const,borderColor:s.border,background:s.bg}}>
            <div style={{fontSize:font.xl,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:font.xs,color:colors.text3,marginTop:3,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>
      {topProducts.length>0&&(
        <div style={{...card,padding:14,marginBottom:14}}>
          <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,marginBottom:10}}>🏆 الأكثر صرفاً</div>
          {topProducts.map(([name,qty],i)=>{
            const pct=Math.round((qty/topProducts[0][1])*100)
            return(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:i<topProducts.length-1?8:0}}>
                <div style={{width:22,height:22,borderRadius:radius.sm,background:barColors[i]+'22',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:10,fontWeight:800,color:barColors[i]}}>{i+1}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:font.sm,fontWeight:600,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{name}</span>
                    <span style={{fontSize:font.sm,fontWeight:800,color:barColors[i],marginRight:4}}>{qty}</span>
                  </div>
                  <div style={{height:4,background:colors.border,borderRadius:99}}>
                    <div style={{height:'100%',width:pct+'%',background:barColors[i],borderRadius:99}}/>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{...card,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${colors.border}`,display:'flex',gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث..." style={{...inp(),flex:1}}/>
          <button onClick={exportCSV} style={{...btnPrimary,padding:'9px 14px',fontSize:font.xs}}>📥 تصدير</button>
        </div>
        {loading?(<div style={{padding:40,textAlign:'center'}}><div style={{width:28,height:28,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto'}}/></div>
        ):filtered.length===0?(<div style={{padding:48,textAlign:'center'}}><div style={{fontSize:36,marginBottom:8}}>📭</div><div style={{fontSize:font.sm,fontWeight:600,color:colors.text2}}>لا توجد نتائج</div></div>
        ):(<><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:400}}><thead><tr style={{background:colors.bg,borderBottom:`1px solid ${colors.border}`}}>{['التاريخ','المنتج','الكمية','الملاحظة'].map((h,i)=>(<th key={i} style={{padding:'9px 14px',color:colors.text4,fontSize:font.xs,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const}}>{h}</th>))}</tr></thead><tbody>{filtered.map((m,i)=>(<tr key={m.id} style={{borderBottom:`1px solid ${colors.border}`,background:i%2===0?colors.surface:colors.bg}}><td style={{padding:'10px 14px',fontSize:font.xs,color:colors.text3,whiteSpace:'nowrap' as const}}>{new Date(m.created_at).toLocaleDateString('ar-SA')}</td><td style={{padding:'10px 14px',fontSize:font.sm,fontWeight:700,color:colors.text}}>{(m.products as any)?.name}</td><td style={{padding:'10px 14px'}}><span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder)}}>▼ {Math.abs(m.qty_change)} {(m.products as any)?.unit}</span></td><td style={{padding:'10px 14px',fontSize:font.xs,color:colors.text4}}>{m.note||'—'}</td></tr>))}</tbody></table></div><div style={{padding:'10px 14px',background:colors.primaryLight,borderTop:`1px solid ${colors.primaryBorder}`,display:'flex',justifyContent:'space-between'}}><span style={{fontSize:font.sm,fontWeight:700,color:colors.primary}}>{filtered.length} عملية</span><span style={{fontSize:font.sm,fontWeight:800,color:colors.primary}}>{totalQty} وحدة</span></div></>)}
      </div>
    </div>
  )
}

function PurchaseDetail({ period, from, to, onBack }: { period:FilterPeriod; from:string; to:string; onBack:()=>void }) {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const sb = createClient()
  useEffect(()=>{ load() },[period,from,to])
  async function load() {
    setLoading(true)
    const orgId=sessionStorage.getItem('s_org_id'); if(!orgId){setLoading(false);return}
    const{start,end}=getRange(period,from,to)
    const bid=sessionStorage.getItem('s_branch_id')
    let pq=sb.from('purchases').select('*').eq('org_id',orgId).gte('created_at',start.toISOString()).lte('created_at',end.toISOString()).order('created_at',{ascending:false})
    if(bid) pq=(pq as any).eq('branch_id',bid)
    const{data}=await pq
    setPurchases(data||[]); setLoading(false)
  }
  function exportCSV(){
    const csv='\ufeff'+[['التاريخ','الصنف','النوع','بدون ضريبة','الضريبة','الإجمالي','المورد'],...filtered.map(p=>[new Date(p.created_at).toLocaleDateString('ar-SA'),p.name||'',p.category||'',Number(p.amount||0).toFixed(2),Number(p.vat_amount||0).toFixed(2),Number(p.total_amount||0).toFixed(2),p.supplier||''])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_المشتريات.csv'}).click()
  }
  const filtered=purchases.filter(p=>(!search||p.name?.includes(search)||p.supplier?.includes(search))&&(!filterCat||p.category===filterCat))
  const totalAmount=filtered.reduce((s,p)=>s+Number(p.amount||0),0)
  const totalVat=filtered.reduce((s,p)=>s+Number(p.vat_amount||0),0)
  const totalWithVat=filtered.reduce((s,p)=>s+Number(p.total_amount||0),0)
  const catTag=(c:string)=>c==='مخزون'?tag(colors.primary,colors.primaryLight,colors.primaryBorder):c==='صيانة'?tag(colors.warning,colors.warningLight,colors.warningBorder):tag(colors.text3,colors.bg,colors.border2)
  return (
    <div>
      <BackBtn onClick={onBack}/>
      <PeriodBadge period={period} from={from} to={to}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {[{label:'بدون ضريبة',value:totalAmount.toFixed(0)+' ر.س',color:colors.text2,bg:colors.bg,border:colors.border2},{label:'ضريبة 15%',value:totalVat.toFixed(0)+' ر.س',color:colors.warning,bg:colors.warningLight,border:colors.warningBorder},{label:'الإجمالي',value:totalWithVat.toFixed(0)+' ر.س',color:colors.primary,bg:colors.primaryLight,border:colors.primaryBorder},{label:'الفواتير',value:filtered.length,color:colors.info,bg:colors.infoLight,border:colors.infoBorder}].map((s,i)=>(
          <div key={i} style={{...card,padding:'12px',textAlign:'center' as const,borderColor:s.border,background:s.bg}}>
            <div style={{fontSize:font.md,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:font.xs,color:colors.text3,marginTop:3,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{...card,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${colors.border}`,display:'flex',gap:8,flexWrap:'wrap' as const,alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث..." style={{...inp(),flex:1,minWidth:120}}/>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...inp(),width:'auto'}}><option value="">الكل</option><option value="مخزون">مخزون</option><option value="صيانة">صيانة</option><option value="أخرى">أخرى</option></select>
          <button onClick={exportCSV} style={{...btnPrimary,padding:'9px 14px',fontSize:font.xs}}>📥 تصدير</button>
        </div>
        {loading?(<div style={{padding:40,textAlign:'center'}}><div style={{width:28,height:28,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto'}}/></div>
        ):filtered.length===0?(<div style={{padding:48,textAlign:'center'}}><div style={{fontSize:36,marginBottom:8}}>🧾</div><div style={{fontSize:font.sm,fontWeight:600,color:colors.text2}}>لا توجد نتائج</div></div>
        ):(<><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:600}}><thead><tr style={{background:colors.bg,borderBottom:`1px solid ${colors.border}`}}>{['التاريخ','الصنف','النوع','بدون ضريبة','ضريبة','الإجمالي','المورد'].map((h,i)=>(<th key={i} style={{padding:'9px 12px',color:colors.text4,fontSize:font.xs,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const}}>{h}</th>))}</tr></thead><tbody>{filtered.map((p,i)=>(<tr key={p.id} style={{borderBottom:`1px solid ${colors.border}`,background:i%2===0?colors.surface:colors.bg}}><td style={{padding:'10px 12px',fontSize:font.xs,color:colors.text3,whiteSpace:'nowrap' as const}}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</td><td style={{padding:'10px 12px',fontSize:font.sm,fontWeight:700,color:colors.text}}>{p.name}</td><td style={{padding:'10px 12px'}}><span style={catTag(p.category)}>{p.category}</span></td><td style={{padding:'10px 12px',fontSize:font.sm}}>{Number(p.amount||0).toFixed(2)} ر.س</td><td style={{padding:'10px 12px',fontSize:font.sm,color:colors.warning,fontWeight:600}}>{Number(p.vat_amount||0).toFixed(2)} ر.س</td><td style={{padding:'10px 12px',fontSize:font.sm,fontWeight:700,color:colors.primary}}>{Number(p.total_amount||0).toFixed(2)} ر.س</td><td style={{padding:'10px 12px',fontSize:font.xs,color:colors.text4}}>{p.supplier||'—'}</td></tr>))}</tbody><tfoot><tr style={{background:colors.primaryLight,borderTop:`2px solid ${colors.primaryBorder}`}}><td colSpan={3} style={{padding:'10px 12px',fontWeight:800,fontSize:font.sm,color:colors.text}}>الإجمالي ({filtered.length} فاتورة)</td><td style={{padding:'10px 12px',fontWeight:700,fontSize:font.sm}}>{totalAmount.toFixed(2)} ر.س</td><td style={{padding:'10px 12px',fontWeight:700,fontSize:font.sm,color:colors.warning}}>{totalVat.toFixed(2)} ر.س</td><td style={{padding:'10px 12px',fontWeight:900,fontSize:font.md,color:colors.primary}}>{totalWithVat.toFixed(2)} ر.س</td><td/></tr></tfoot></table></div></>)}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [view, setView]           = useState<'home'|'dispense'|'purchase'>('home')
  const [period, setPeriod]       = useState<FilterPeriod>('month')
  const [from, setFrom]           = useState('')
  const [to, setTo]               = useState('')
  const [dispenseStats, setDS]    = useState({ops:0,qty:0,items:0})
  const [purchaseStats, setPS]    = useState({invoices:0,total:0,vat:0})
  const [statsLoading, setSL]     = useState(true)
  const sb = createClient()

  useEffect(()=>{ loadStats() },[period,from,to])

  async function loadStats() {
    setSL(true)
    const orgId=sessionStorage.getItem('s_org_id'); if(!orgId){setSL(false);return}
    const{start,end}=getRange(period,from,to)
    const[{data:mv},{data:pu}]=await Promise.all([
      sb.from('stock_movements').select('qty_change,products!inner(name,org_id)').eq('type','out').eq('products.org_id',orgId).gte('created_at',start.toISOString()).lte('created_at',end.toISOString()),
      (()=>{ const bid=sessionStorage.getItem('s_branch_id'); let q=sb.from('purchases').select('amount,total_amount,vat_amount').eq('org_id',orgId).gte('created_at',start.toISOString()).lte('created_at',end.toISOString()); if(bid) q=(q as any).eq('branch_id',bid); return q })(),
    ])
    const items=new Set((mv||[]).map((m:any)=>m.products?.name)).size
    setDS({ops:(mv||[]).length,qty:(mv||[]).reduce((s:number,m:any)=>s+Math.abs(m.qty_change),0),items})
    setPS({invoices:(pu||[]).length,total:(pu||[]).reduce((s:number,p:any)=>s+Number(p.total_amount||0),0),vat:(pu||[]).reduce((s:number,p:any)=>s+Number(p.vat_amount||0),0)})
    setSL(false)
  }

  if (view==='dispense') return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h1 style={{...pageTitle,marginBottom:16}}>تقرير الصرف</h1>
      <DispenseDetail period={period} from={from} to={to} onBack={()=>setView('home')}/>
    </div>
  )

  if (view==='purchase') return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h1 style={{...pageTitle,marginBottom:16}}>تقرير المشتريات</h1>
      <PurchaseDetail period={period} from={from} to={to} onBack={()=>setView('home')}/>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:680,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.4}}.sk{animation:sk 1.4s infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{marginBottom:20}}>
        <h1 style={{...pageTitle}}>التقارير</h1>
        <p style={{...pageSub}}>اختر الفترة ثم اضغط على التقرير</p>
      </div>
      <FilterBar period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo}/>
      <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
        <ReportCard title="تقرير الصرف" subtitle="عمليات الصرف من المخزون" icon="📤" color={colors.danger} bg={colors.dangerLight} border={colors.dangerBorder} loading={statsLoading}
          stats={[{label:'عمليات الصرف',value:dispenseStats.ops,color:colors.danger},{label:'وحدات مصروفة',value:dispenseStats.qty,color:colors.danger},{label:'أصناف مختلفة',value:dispenseStats.items,color:colors.danger}]}
          onClick={()=>setView('dispense')}/>
        <ReportCard title="تقرير المشتريات" subtitle="فواتير المشتريات مع الضريبة 15%" icon="🧾" color={colors.primary} bg={colors.primaryLight} border={colors.primaryBorder} loading={statsLoading}
          stats={[{label:'عدد الفواتير',value:purchaseStats.invoices,color:colors.primary},{label:'إجمالي شامل الضريبة',value:purchaseStats.total.toLocaleString('ar-SA',{maximumFractionDigits:0})+' ر.س',color:colors.primary},{label:'ضريبة القيمة المضافة',value:purchaseStats.vat.toLocaleString('ar-SA',{maximumFractionDigits:0})+' ر.س',color:colors.warning}]}
          onClick={()=>setView('purchase')}/>
      </div>
    </div>
  )
}
