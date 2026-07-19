'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { cache } from '@/lib/cache'
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
  const PERIODS = [
    {key:'custom',label:'مخصص',icon:'📅'},
    {key:'year',label:'هذه السنة'},
    {key:'month',label:'هذا الشهر'},
    {key:'week',label:'الأسبوع'},
    {key:'today',label:'اليوم'},
  ]
  return (
    <div style={{marginBottom:24}}>
      <div style={{display:'flex',gap:10,flexWrap:'wrap' as const,marginBottom:period==='custom'?16:0}}>
        {PERIODS.map(p=>{
          const active = period===p.key
          return (
            <button key={p.key} onClick={()=>setPeriod(p.key as FilterPeriod)}
              style={{
                padding:'12px 22px',borderRadius:99,fontFamily:font.family,
                border:active?`2px solid ${colors.primary}`:`1.5px solid ${colors.border2}`,
                background:'white',
                color:active?colors.primary:colors.text2,
                fontSize:14,fontWeight:700,cursor:'pointer',
                display:'flex',alignItems:'center',gap:6,
                transition:'all .15s',
              }}>
              {p.icon && <span>{p.icon}</span>}
              {p.label}
            </button>
          )
        })}
      </div>
      {period==='custom'&&(
        <div style={{...card,padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><label style={{fontSize:font.xs,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>من تاريخ</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={inp()}/></div>
          <div><label style={{fontSize:font.xs,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>إلى تاريخ</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={inp()}/></div>
        </div>
      )}
    </div>
  )
}

function MiniChart({ data, color }: { data:number[]; color:string }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height:36}}>
      {data.map((v,i)=>(
        <div key={i} style={{flex:1,background:colors.border,borderRadius:'3px 3px 0 0',height:32,display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
          <div style={{width:'100%',background:i===data.length-1?color:color+'55',height:`${Math.max((v/max)*100,4)}%`,borderRadius:'3px 3px 0 0',transition:'height .6s'}}/>
        </div>
      ))}
    </div>
  )
}

function ReportCard({ title, subtitle, icon, color, bg, border, stats, onClick, loading, chartData }: any) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{width:'100%',textAlign:'right' as const,border:'none',cursor:'pointer',fontFamily:font.family,padding:0,background:'transparent'}}>
      <div style={{
        background:colors.surface,borderRadius:radius.xl,
        border:`1.5px solid ${hov?color:colors.border}`,
        boxShadow:hov?`0 12px 36px ${color}22`:shadow.sm,
        padding:'22px 24px',transition:'all .25s cubic-bezier(.4,0,.2,1)',
        transform:hov?'translateY(-4px)':'none',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
              <div style={{width:42,height:42,borderRadius:12,background:bg,border:`1.5px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{icon}</div>
              <div>
                <div style={{fontSize:font.md,fontWeight:900,color:colors.text}}>{title}</div>
                <div style={{fontSize:font.xs,color:colors.text3,marginTop:1}}>{subtitle}</div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,background:hov?color:colors.bg,borderRadius:20,padding:'6px 12px',border:`1px solid ${hov?color:colors.border}`,transition:'all .2s'}}>
            <span style={{fontSize:font.xs,fontWeight:700,color:hov?'white':colors.text3}}>التفاصيل</span>
            <svg width={12} height={12} fill="none" stroke={hov?'white':colors.text3} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:`repeat(${stats.length},1fr)`,gap:10,marginBottom:chartData?16:0}}>
          {loading?[...Array(stats.length)].map((_,i)=>(
            <div key={i} style={{background:colors.bg,borderRadius:radius.md,padding:'12px',textAlign:'center' as const}}>
              <div style={{height:22,background:colors.border2,borderRadius:6,marginBottom:6,animation:'sk 1.4s infinite'}}/>
              <div style={{height:10,background:colors.border,borderRadius:4,animation:'sk 1.4s infinite'}}/>
            </div>
          )):stats.map((s:any,i:number)=>(
            <div key={i} style={{background:s.highlight?bg:colors.bg,borderRadius:radius.md,padding:'12px 10px',textAlign:'center' as const,border:`1px solid ${s.highlight?border:colors.border}`}}>
              <div style={{fontSize:18,fontWeight:900,color:s.color,letterSpacing:'-0.5px'}}>{s.value}</div>
              <div style={{fontSize:10,color:colors.text4,marginTop:3,fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>

        {chartData && chartData.length > 0 && (
          <div style={{marginTop:4}}>
            <MiniChart data={chartData} color={color}/>
          </div>
        )}
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
    <div style={{...card,padding:'10px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:8,background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`}}>
      <span style={{fontSize:16}}>📅</span>
      <span style={{fontSize:font.sm,fontWeight:700,color:colors.primary}}>{formatRange(period,from,to)}</span>
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
    let orgId=sessionStorage.getItem('s_org_id')
    if(!orgId){
      const{data:{user}}=await sb.auth.getUser()
      if(!user){setLoading(false);return}
      const{data:p}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
      if(!p){setLoading(false);return}
      orgId=p.org_id; sessionStorage.setItem('s_org_id',orgId!)
    }
    const{start,end}=getRange(period,from,to)
    const _bid1 = sessionStorage.getItem('s_branch_id')
    let _mq1 = sb.from('stock_movements').select('*,products!inner(name,unit,org_id,branch_id),profiles!profile_id(full_name),staff_members!staff_id(name)').eq('type','out').eq('products.org_id',orgId).gte('created_at',start.toISOString()).lte('created_at',end.toISOString())
    if (_bid1) _mq1 = _mq1.eq('products.branch_id', _bid1)
    const{data}=await _mq1.order('created_at',{ascending:false})
    setMovements(data||[]); setLoading(false)
    if(orgId) cache.set('report_movements:'+orgId, data||[])
  }
  function exportCSV(){
    const csv='\ufeff'+[['التاريخ','المنتج','الكمية','الوحدة','الموظف','الملاحظة'],...filtered.map(m=>[new Date(m.created_at).toLocaleDateString('en-GB'),(m.products as any)?.name||'',Math.abs(m.qty_change),(m.products as any)?.unit||'',(m.profiles as any)?.full_name||(m.staff_members as any)?.name||(m.note?.match(/بواسطة الموظف: (.+)/)?.[1])||'—',m.note||''])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
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
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'كميات مصروفة',value:totalQty,color:colors.danger,bg:colors.dangerLight,border:colors.dangerBorder},
          {label:'عمليات الصرف',value:filtered.length,color:colors.info,bg:colors.infoLight,border:colors.infoBorder},
          {label:'أصناف مختلفة',value:Object.keys(productMap).length,color:'#7c3aed',bg:'#f5f3ff',border:'#ddd6fe'},
        ].map((s,i)=>(
          <div key={i} style={{...card,padding:'16px',textAlign:'center' as const,background:s.bg,border:`1.5px solid ${s.border}`}}>
            <div style={{fontSize:28,fontWeight:900,color:s.color,letterSpacing:'-1px'}}>{s.value}</div>
            <div style={{fontSize:font.xs,color:s.color,marginTop:4,fontWeight:700,opacity:.8}}>{s.label}</div>
          </div>
        ))}
      </div>
      {topProducts.length>0&&(
        <div style={{...card,padding:'16px 18px',marginBottom:16}}>
          <div style={{fontSize:font.base,fontWeight:800,color:colors.text,marginBottom:14}}>🏆 الأكثر صرفاً</div>
          {topProducts.map(([name,qty],i)=>{
            const pct=Math.round((qty/topProducts[0][1])*100)
            return(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<topProducts.length-1?12:0}}>
                <div style={{width:26,height:26,borderRadius:8,background:barColors[i]+'22',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${barColors[i]}44`}}>
                  <span style={{fontSize:11,fontWeight:900,color:barColors[i]}}>{i+1}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontSize:font.sm,fontWeight:700,color:colors.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,maxWidth:200}}>{name}</span>
                    <span style={{fontSize:font.sm,fontWeight:900,color:barColors[i]}}>{qty}</span>
                  </div>
                  <div style={{height:5,background:colors.border,borderRadius:99}}>
                    <div style={{height:'100%',width:pct+'%',background:barColors[i],borderRadius:99,transition:'width .6s'}}/>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{...card,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${colors.border}`,display:'flex',gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالمنتج أو الملاحظة..." style={{...inp(),flex:1}}/>
          <button onClick={exportCSV} style={{...btnPrimary,padding:'9px 14px',fontSize:font.xs,display:'flex',alignItems:'center',gap:6}}>
            <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            تصدير
          </button>
        </div>
        {loading?(<div style={{padding:48,textAlign:'center'}}><div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto'}}/></div>
        ):filtered.length===0?(<div style={{padding:56,textAlign:'center'}}><div style={{fontSize:44,marginBottom:10}}>📭</div><div style={{fontSize:font.base,fontWeight:700,color:colors.text2}}>لا توجد نتائج</div></div>
        ):(
          <>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:400}}>
              <thead>
                <tr style={{background:colors.bg,borderBottom:`1.5px solid ${colors.border}`}}>
                  {['التاريخ','المنتج','الكمية','الموظف','الملاحظة'].map((h,i)=>(
                    <th key={i} style={{padding:'10px 16px',color:colors.text4,fontSize:font.xs,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m,i)=>(
                  <tr key={m.id} style={{borderBottom:`1px solid ${colors.border}`,background:i%2===0?colors.surface:colors.bg}}>
                    <td style={{padding:'11px 16px',fontSize:font.xs,color:colors.text3,whiteSpace:'nowrap' as const}}>{new Date(m.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</td>
                    <td style={{padding:'11px 16px',fontSize:font.sm,fontWeight:700,color:colors.text}}>{(m.products as any)?.name}</td>
                    <td style={{padding:'11px 16px'}}><span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder),fontWeight:900}}>▼ {Math.abs(m.qty_change)} {(m.products as any)?.unit}</span></td>
                    <td style={{padding:'11px 16px'}}><span style={{display:'inline-flex',alignItems:'center',gap:5,background:'#f0fdf4',color:'#16a34a',fontSize:font.xs,fontWeight:700,padding:'3px 8px',borderRadius:99,border:'1px solid #bbf7d0'}}>
{(m.profiles as any)?.full_name||(m.staff_members as any)?.name||(m.note?.match(/بواسطة[^:]*:\s*(.+)/)?.[1])||'—'}
</span></td>
                    <td style={{padding:'11px 16px',fontSize:font.xs,color:colors.text4}}>
                      {m.note?.replace(/صرف بواسطة الموظف: .+/, '').trim() || m.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{padding:'12px 16px',background:colors.dangerLight,borderTop:`1.5px solid ${colors.dangerBorder}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:font.sm,fontWeight:700,color:colors.danger}}>{filtered.length} عملية</span>
            <span style={{fontSize:font.base,fontWeight:900,color:colors.danger}}>{totalQty} وحدة مصروفة</span>
          </div>
          </>
        )}
      </div>
    </div>
  )
}

function PurchaseDetail({ period, from, to, onBack }: { period:FilterPeriod; from:string; to:string; onBack:()=>void }) {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<any|null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const sb = createClient()
  useEffect(()=>{ load() },[period,from,to])

  async function confirmDeletePurchase() {
    setDeleteError(''); setDeleting(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user?.email) { setDeleteError('تعذر التحقق من الحساب'); setDeleting(false); return }
    const { error } = await sb.auth.signInWithPassword({ email: user.email, password: deletePassword })
    if (error) { setDeleteError('كلمة المرور غير صحيحة'); setDeleting(false); return }
    await sb.from('purchases').delete().eq('id', confirmDelete.id)
    setPurchases(prev => prev.filter(p => p.id !== confirmDelete.id))
    setConfirmDelete(null); setDeletePassword(''); setDeleting(false)
  }
  async function load() {
    setLoading(true)
    const orgId=sessionStorage.getItem('s_org_id'); if(!orgId){setLoading(false);return}
    const{start,end}=getRange(period,from,to)
    const{data}=await sb.from('purchases').select('*').eq('org_id',orgId).gte('created_at',start.toISOString()).lte('created_at',end.toISOString()).order('created_at',{ascending:false})
    setPurchases(data||[]); setLoading(false)
    if(orgId) cache.set('report_purchases:'+orgId, data||[])
  }
  function exportCSV(){
    const csv='\ufeff'+[['التاريخ','الصنف','النوع','بدون ضريبة','الضريبة','الإجمالي','المورد'],...filtered.map(p=>[new Date(p.created_at).toLocaleDateString('en-GB'),p.name||'',p.category||'',Number(p.amount||0).toFixed(2),Number(p.vat_amount||0).toFixed(2),Number(p.total_amount||0).toFixed(2),p.supplier||''])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_المشتريات.csv'}).click()
  }
  const filtered=purchases.filter(p=>(!search||p.name?.includes(search)||p.supplier?.includes(search))&&(!filterCat||p.category===filterCat))
  const totalAmount=filtered.reduce((s,p)=>s+Number(p.amount||0),0)
  const totalVat=filtered.reduce((s,p)=>s+Number(p.vat_amount||0),0)
  const totalWithVat=filtered.reduce((s,p)=>s+Number(p.total_amount||0),0)
  const catTag=(c:string)=>c==='مخزون'?tag(colors.primary,colors.primaryLight,colors.primaryBorder):c==='مشتريات'?tag(colors.info,colors.infoLight,colors.infoBorder):tag(colors.text3,colors.bg,colors.border2)
  return (
    <div>
      <BackBtn onClick={onBack}/>
      <PeriodBadge period={period} from={from} to={to}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'بدون ضريبة',value:totalAmount.toFixed(0)+' ر.س',color:colors.text2,bg:colors.bg,border:colors.border2},
          {label:'ضريبة 15%',value:totalVat.toFixed(0)+' ر.س',color:colors.warning,bg:colors.warningLight,border:colors.warningBorder},
          {label:'الإجمالي',value:totalWithVat.toFixed(0)+' ر.س',color:colors.primary,bg:colors.primaryLight,border:colors.primaryBorder},
          {label:'الفواتير',value:String(filtered.length),color:colors.info,bg:colors.infoLight,border:colors.infoBorder},
        ].map((s,i)=>(
          <div key={i} style={{...card,padding:'14px',textAlign:'center' as const,background:s.bg,border:`1.5px solid ${s.border}`}}>
            <div style={{fontSize:i===2?20:16,fontWeight:900,color:s.color,letterSpacing:'-0.5px'}}>{s.value}</div>
            <div style={{fontSize:font.xs,color:s.color,marginTop:4,fontWeight:600,opacity:.8}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{...card,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${colors.border}`,display:'flex',gap:8,flexWrap:'wrap' as const,alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالاسم أو المورد..." style={{...inp(),flex:1,minWidth:120}}/>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...inp(),width:'auto'}}>
            <option value="">الكل</option>
            <option value="مخزون">مخزون</option>
            <option value="مشتريات">مشتريات</option>
            <option value="أخرى">أخرى</option>
          </select>
          <button onClick={exportCSV} style={{...btnPrimary,padding:'9px 14px',fontSize:font.xs,display:'flex',alignItems:'center',gap:6}}>
            <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            تصدير
          </button>
        </div>
        {loading?(<div style={{padding:48,textAlign:'center'}}><div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto'}}/></div>
        ):filtered.length===0?(<div style={{padding:56,textAlign:'center'}}><div style={{fontSize:44,marginBottom:10}}>🧾</div><div style={{fontSize:font.base,fontWeight:700,color:colors.text2}}>لا توجد نتائج</div></div>
        ):(
          <>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:600}}>
              <thead>
                <tr style={{background:colors.bg,borderBottom:`1.5px solid ${colors.border}`}}>
                  {['التاريخ','الصنف','النوع','بدون ضريبة','ضريبة','الإجمالي','المورد','فاتورة','إجراء'].map((h,i)=>(
                    <th key={i} style={{padding:'10px 12px',color:colors.text4,fontSize:font.xs,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p,i)=>(
                  <tr key={p.id} style={{borderBottom:`1px solid ${colors.border}`,background:i%2===0?colors.surface:colors.bg}}>
                    <td style={{padding:'11px 12px',fontSize:font.xs,color:colors.text3,whiteSpace:'nowrap' as const}}>{new Date(p.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</td>
                    <td style={{padding:'11px 12px',fontSize:font.sm,fontWeight:700,color:colors.text,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.name}</td>
                    <td style={{padding:'11px 12px'}}><span style={catTag(p.category)}>{p.category}</span></td>
                    <td style={{padding:'11px 12px',fontSize:font.sm}}>{Number(p.amount||0).toFixed(0)} ر.س</td>
                    <td style={{padding:'11px 12px',fontSize:font.sm,color:colors.warning,fontWeight:600}}>{Number(p.vat_amount||0).toFixed(0)} ر.س</td>
                    <td style={{padding:'11px 12px',fontSize:font.sm,fontWeight:700,color:colors.primary}}>{Number(p.total_amount||0).toFixed(0)} ر.س</td>
                    <td style={{padding:'11px 12px',fontSize:font.xs,color:colors.text4,maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.supplier||'—'}</td>
                    <td style={{padding:'11px 12px',textAlign:'center' as const}}>
                      {p.invoice_image
                        ? <a href={p.invoice_image} target="_blank" rel="noreferrer" style={{background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',borderRadius:6,padding:'3px 10px',fontSize:11,fontWeight:700,textDecoration:'none',whiteSpace:'nowrap' as const}}>📎 عرض</a>
                        : <span style={{color:colors.border2}}>—</span>}
                    </td>
                    <td style={{padding:'11px 12px',textAlign:'center' as const}}>
                      <button onClick={()=>{setConfirmDelete(p);setDeletePassword('');setDeleteError('')}}
                        style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:colors.primaryLight,borderTop:`2px solid ${colors.primaryBorder}`}}>
                  <td colSpan={3} style={{padding:'11px 12px',fontWeight:800,fontSize:font.sm,color:colors.text}}>الإجمالي ({filtered.length} فاتورة)</td>
                  <td style={{padding:'11px 12px',fontWeight:700,fontSize:font.sm}}>{totalAmount.toFixed(0)} ر.س</td>
                  <td style={{padding:'11px 12px',fontWeight:700,fontSize:font.sm,color:colors.warning}}>{totalVat.toFixed(0)} ر.س</td>
                  <td style={{padding:'11px 12px',fontWeight:900,fontSize:font.md,color:colors.primary}}>{totalWithVat.toFixed(0)} ر.س</td>
                  <td/><td/><td/>
                </tr>
              </tfoot>
            </table>
          </div>
          </>
        )}
      </div>

      {confirmDelete && (
        <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,.4)',backdropFilter:'blur(6px)'}} onClick={()=>{if(!deleting){setConfirmDelete(null);setDeletePassword('');setDeleteError('')}}}/>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:360,position:'relative',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
            <div style={{width:48,height:48,borderRadius:12,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:22}}>🔒</div>
            <div style={{fontSize:15,fontWeight:800,color:colors.text,textAlign:'center',marginBottom:6}}>تأكيد حذف العملية</div>
            <div style={{fontSize:12,color:colors.text3,textAlign:'center',lineHeight:1.7,marginBottom:16}}>
              سيتم حذف <b style={{color:colors.text}}>{confirmDelete.name}</b> ({Number(confirmDelete.total_amount||0).toFixed(0)} ر.س) نهائياً.<br/>أدخل كلمة مرور حسابك للتأكيد
            </div>
            <input type="password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&deletePassword&&!deleting) confirmDeletePurchase()}}
              placeholder="كلمة المرور" autoFocus
              style={{...inp(),width:'100%',marginBottom:10,boxSizing:'border-box' as const}}/>
            {deleteError && <div style={{fontSize:12,color:'#dc2626',fontWeight:600,marginBottom:10,textAlign:'center' as const}}>⚠️ {deleteError}</div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!deleting){setConfirmDelete(null);setDeletePassword('');setDeleteError('')}}}
                style={{flex:1,padding:'11px',background:colors.bg,color:colors.text3,border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                إلغاء
              </button>
              <button onClick={confirmDeletePurchase} disabled={!deletePassword||deleting}
                style={{flex:2,padding:'11px',background:!deletePassword||deleting?colors.border2:'#dc2626',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:!deletePassword||deleting?'not-allowed':'pointer',fontFamily:'inherit'}}>
                {deleting?'جاري الحذف...':'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function InventoryDetail({ period, from, to, onBack }: { period:FilterPeriod; from:string; to:string; onBack:()=>void }) {
  const [products, setProducts] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<'all'|'low'|'out'>('all')
  const sb = createClient()

  useEffect(()=>{ load() },[period,from,to])

  async function load() {
    setLoading(true)
    const orgId=sessionStorage.getItem('s_org_id'); if(!orgId){setLoading(false);return}
    const branchId=sessionStorage.getItem('s_branch_id')
    const {start,end}=getRange(period,from,to)

    // products
    let pq=sb.from('products').select('id,name,unit,qty,reorder_point,category').eq('org_id',orgId).eq('is_active',true)
    if(branchId) pq=pq.eq('branch_id',branchId)
    const{data:prods}=await pq.order('name')

    // movements in period
    let mq=sb.from('stock_movements').select('qty_change,type,products!inner(name,org_id,branch_id)').eq('products.org_id',orgId).gte('created_at',start.toISOString()).lte('created_at',end.toISOString())
    if(branchId) mq=mq.eq('products.branch_id',branchId)
    const{data:mvs}=await mq

    // purchases in period
    let puq=sb.from('purchases').select('name,qty,unit,category').eq('org_id',orgId).eq('category','مخزون').gte('created_at',start.toISOString()).lte('created_at',end.toISOString())
    const{data:pus}=await puq

    setProducts(prods||[])
    setMovements(mvs||[])
    setPurchases(pus||[])
    setLoading(false)
  }

  function exportCSV() {
    const csv='\ufeff'+[['الصنف','الفئة','الكمية المتبقية','الوحدة','الحد الأدنى','الحالة'],...filtered.map(p=>[p.name,p.category||'—',p.qty,p.unit,p.reorder_point,p.qty===0?'نفد':p.qty<=p.reorder_point?'ناقص':'كافٍ'])].map(r=>r.map((cc:any)=>'"'+cc+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_الجرد.csv'}).click()
  }

  // dispensed map
  const dispensedMap:Record<string,number>={}
  movements.filter(m=>m.type==='out').forEach(m=>{const n=(m.products as any)?.name||'—';dispensedMap[n]=(dispensedMap[n]||0)+Math.abs(m.qty_change)})

  // purchased map
  const purchasedMap:Record<string,number>={}
  purchases.forEach(p=>{if(p.name&&p.qty) purchasedMap[p.name]=(purchasedMap[p.name]||0)+Number(p.qty)})

  const filtered=products
    .filter(p=>!search||p.name?.includes(search)||p.category?.includes(search))
    .filter(p=>filter==='all'||(filter==='out'?p.qty===0:p.qty<=p.reorder_point))

  const lowCount=products.filter(p=>p.qty>0&&p.qty<=p.reorder_point).length
  const outCount=products.filter(p=>p.qty===0).length
  const totalDispensed=Object.values(dispensedMap).reduce((s,v)=>s+v,0)
  const totalPurchased=Object.values(purchasedMap).reduce((s,v)=>s+v,0)

  return (
    <div>
      <BackBtn onClick={onBack}/>
      <PeriodBadge period={period} from={from} to={to}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'إجمالي الأصناف',value:products.length,color:'#7c3aed',bg:'#f5f3ff',border:'#ddd6fe'},
          {label:'وحدات مصروفة',value:totalDispensed,color:colors.danger,bg:colors.dangerLight,border:colors.dangerBorder},
          {label:'وحدات مشتراة',value:totalPurchased,color:colors.primary,bg:colors.primaryLight,border:colors.primaryBorder},
          {label:'أصناف ناقصة',value:lowCount+outCount,color:colors.warning,bg:colors.warningLight,border:colors.warningBorder},
        ].map((s,i)=>(
          <div key={i} style={{...card,padding:'14px',textAlign:'center' as const,background:s.bg,border:`1.5px solid ${s.border}`}}>
            <div style={{fontSize:24,fontWeight:900,color:s.color}}>{s.value}</div>
            <div style={{fontSize:font.xs,color:s.color,marginTop:4,fontWeight:600,opacity:.8}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{...card,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${colors.border}`,display:'flex',gap:8,flexWrap:'wrap' as const,alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالاسم أو الفئة..." style={{...inp(),flex:1,minWidth:120}}/>
          <div style={{display:'flex',gap:6}}>
            {(['all','low','out'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 12px',borderRadius:20,border:`1.5px solid ${filter===f?colors.primary:colors.border}`,background:filter===f?colors.primaryLight:colors.surface,color:filter===f?colors.primary:colors.text3,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family,transition:'all .15s'}}>
                {f==='all'?'الكل':f==='low'?'ناقص':'نفد'}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} style={{...btnPrimary,padding:'9px 14px',fontSize:font.xs}}>📥 تصدير</button>
        </div>
        {loading?(<div style={{padding:48,textAlign:'center'}}><div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto'}}/></div>
        ):filtered.length===0?(<div style={{padding:56,textAlign:'center'}}><div style={{fontSize:44,marginBottom:10}}>📋</div><div style={{fontSize:font.base,fontWeight:700,color:colors.text2}}>لا توجد نتائج</div></div>
        ):(
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:600}}>
              <thead>
                <tr style={{background:colors.bg,borderBottom:`1.5px solid ${colors.border}`}}>
                  {['الصنف','الفئة','مصروف','مشترى','المتبقي','الحالة'].map((h,i)=>(
                    <th key={i} style={{padding:'10px 14px',color:colors.text4,fontSize:font.xs,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p,i)=>{
                  const isOut=p.qty===0; const isLow=p.qty<=p.reorder_point&&p.qty>0
                  const statusColor=isOut?colors.danger:isLow?colors.warning:colors.primary
                  const statusLabel=isOut?'نفد':isLow?'ناقص':'كافٍ'
                  const dispensed=dispensedMap[p.name]||0
                  const purchased=purchasedMap[p.name]||0
                  return (
                    <tr key={p.id} style={{borderBottom:`1px solid ${colors.border}`,background:isOut?colors.dangerLight:isLow?colors.warningLight:i%2===0?colors.surface:colors.bg}}>
                      <td style={{padding:'11px 14px',fontSize:font.sm,fontWeight:700,color:colors.text}}>{p.name}</td>
                      <td style={{padding:'11px 14px',fontSize:font.xs,color:colors.text3}}>{p.category||'—'}</td>
                      <td style={{padding:'11px 14px'}}>{dispensed>0?<span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder)}}>▼ {dispensed}</span>:<span style={{color:colors.text4}}>—</span>}</td>
                      <td style={{padding:'11px 14px'}}>{purchased>0?<span style={{...tag(colors.primary,colors.primaryLight,colors.primaryBorder)}}>▲ {purchased}</span>:<span style={{color:colors.text4}}>—</span>}</td>
                      <td style={{padding:'11px 14px',fontWeight:900,fontSize:18,color:statusColor}}>{p.qty} <span style={{fontSize:font.xs,fontWeight:400,color:colors.text4}}>{p.unit}</span></td>
                      <td style={{padding:'11px 14px'}}><span style={{...tag(statusColor,isOut?colors.dangerLight:isLow?colors.warningLight:colors.primaryLight,isOut?colors.dangerBorder:isLow?colors.warningBorder:colors.primaryBorder)}}>{statusLabel}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

function RecentOpsSection({ recentOps, colors }: { recentOps:any[]; colors:any }) {
  const [sheet, setSheet] = useState<'dispense'|'purchase'|'add'|null>(null)

  const dispense  = recentOps.filter(m=>m.type==='out')
  const additions = recentOps.filter(m=>m.type==='in')

  function OpsSheet({ items, title, color, bg, border, onClose }:any) {
    return (
      <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'flex-end'}}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}} onClick={onClose}/>
        <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'80vh',display:'flex',flexDirection:'column' as const,position:'relative',fontFamily:'inherit',direction:'rtl'}}>
          <div style={{padding:'14px 20px',borderBottom:`1px solid #f0f0f0`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
            <div style={{width:32,height:3,borderRadius:99,background:'#e5e7eb',position:'absolute',top:8,left:'50%',transform:'translateX(-50%)'}}/>
            <span style={{fontSize:15,fontWeight:800,color:'#111827'}}>{title}</span>
            <button onClick={onClose} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#9ca3af',padding:4}}>✕</button>
          </div>
          <div style={{overflowY:'auto',flex:1}}>
            {items.length===0?(
              <div style={{padding:'40px',textAlign:'center',color:'#9ca3af',fontSize:13}}>لا توجد عمليات</div>
            ):items.map((m:any,i:number)=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:i<items.length-1?'1px solid #f3f4f6':'none'}}>
                <div style={{width:36,height:36,borderRadius:10,background:bg,border:`1px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:14,fontWeight:900,color}}>{Math.abs(m.qty_change)}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(m.products as any)?.name}</div>
                  <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{new Date(m.created_at).toLocaleDateString('ar-SA',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
                <span style={{fontSize:13,fontWeight:800,color,flexShrink:0}}>{m.type==='out'?'-':'+'}{Math.abs(m.qty_change)} <span style={{fontSize:10,fontWeight:400,color:'#9ca3af'}}>{(m.products as any)?.unit}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {sheet==='dispense'&&<OpsSheet items={dispense} title="آخر عمليات الصرف" color={colors.danger} bg={colors.dangerLight} border={colors.dangerBorder} onClose={()=>setSheet(null)}/>}
      {sheet==='add'&&<OpsSheet items={additions} title="آخر عمليات الإضافة" color={colors.primary} bg={colors.primaryLight} border={colors.primaryBorder} onClose={()=>setSheet(null)}/>}
      {sheet==='purchase'&&<OpsSheet items={recentOps} title="آخر العمليات" color={colors.info} bg={colors.infoLight} border={colors.infoBorder} onClose={()=>setSheet(null)}/>}

      <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {[
          {key:'dispense' as const, title:'آخر الصرف',    count:dispense.length,  color:colors.danger,  bg:colors.dangerLight,  border:colors.dangerBorder,  icon:'📤'},
          {key:'add' as const,      title:'آخر الإضافات', count:additions.length, color:colors.primary, bg:colors.primaryLight, border:colors.primaryBorder, icon:'📥'},
          {key:'purchase' as const, title:'آخر العمليات', count:recentOps.length, color:colors.info,    bg:colors.infoLight,    border:colors.infoBorder,    icon:'📋'},
        ].map(s=>(
          <button key={s.key} onClick={()=>setSheet(s.key)}
            style={{background:'white',borderRadius:12,padding:'14px 10px',border:`1.5px solid ${s.border}`,cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all .15s',boxShadow:`0 2px 8px ${s.color}10`}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform='none'}>
            <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:s.color,marginBottom:4}}>{s.count}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#374151'}}>{s.title}</div>
          </button>
        ))}
      </div>
    </>
  )
}


function CashierClosingDetail({ period, from, to, onBack }: { period:FilterPeriod; from:string; to:string; onBack:()=>void }) {
  const [closings, setClosings] = useState<any[]>([])
  const [expandedReasons, setExpandedReasons] = useState<Record<string,boolean>>({})
  const [loading, setLoading]   = useState(true)
  const [editingDateId, setEditingDateId] = useState<string|null>(null)
  const [editDateValue, setEditDateValue] = useState('')
  const [savingDate, setSavingDate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<any|null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [monthComp, setMonthComp] = useState<any>(null)
  useEffect(()=>{ load() },[period,from,to])
  useEffect(()=>{
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId) return
    fetch('/api/month-comparison?org_id='+orgId).then(r=>r.json()).then(d=>{ if(d.success) setMonthComp(d) }).catch(()=>{})
  },[])

  async function saveClosingDate(id: string) {
    setSavingDate(true)
    const sb = createClient()
    await (sb as any).from('cashier_closings').update({ closing_date: editDateValue }).eq('id', id)
    setClosings(prev => prev.map(c => c.id===id ? {...c, closing_date: editDateValue} : c))
    setEditingDateId(null); setSavingDate(false)
  }

  async function confirmDeleteClosing() {
    setDeleteError(''); setDeleting(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user?.email) { setDeleteError('تعذر التحقق من الحساب'); setDeleting(false); return }
    const { error } = await sb.auth.signInWithPassword({ email: user.email, password: deletePassword })
    if (error) { setDeleteError('كلمة المرور غير صحيحة'); setDeleting(false); return }
    await sb.from('cashier_closings' as any).delete().eq('id', confirmDelete.id)
    setClosings(prev => prev.filter(c => c.id !== confirmDelete.id))
    setConfirmDelete(null); setDeletePassword(''); setDeleting(false)
  }
  async function load() {
    setLoading(true)
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId){setLoading(false);return}
    const{start,end}=getRange(period,from,to)
    try {
      const res = await fetch(`/api/cashier-closing?org_id=${orgId}&from=${start.toISOString().slice(0,10)}&to=${end.toISOString().slice(0,10)}`)
      const data = await res.json()
      setClosings(data.closings||[])
    } catch { setClosings([]) }
    setLoading(false)
  }
  const totalDeficit = closings.filter(c=>c.status==='deficit').reduce((s,c)=>s+Math.abs(Number(c.difference)),0)
  const totalSurplus = closings.filter(c=>c.status==='surplus').reduce((s,c)=>s+Number(c.difference),0)
  const balancedCount = closings.filter(c=>c.status==='balanced').length
  const statusLabel: Record<string,string> = {deficit:'عجز',surplus:'زيادة',balanced:'مطابق'}
  const statusColor: Record<string,string> = {deficit:colors.danger,surplus:colors.info,balanced:colors.primary}
  return (
    <div>
      <BackBtn onClick={onBack}/>
      <PeriodBadge period={period} from={from} to={to}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'إجمالي التقارير',value:closings.length,color:'#0891b2',bg:'#ecfeff',border:'#a5f3fc'},
          {label:'إجمالي العجز',value:totalDeficit.toFixed(0)+' ر.س',color:colors.danger,bg:colors.dangerLight,border:colors.dangerBorder},
          {label:'إجمالي الزيادة',value:totalSurplus.toFixed(0)+' ر.س',color:colors.info,bg:colors.infoLight,border:colors.infoBorder},
        ].map((s,i)=>(
          <div key={i} style={{...card,padding:'16px',textAlign:'center' as const,background:s.bg,border:`1.5px solid ${s.border}`}}>
            <div style={{fontSize:22,fontWeight:900,color:s.color,letterSpacing:'-1px'}}>{s.value}</div>
            <div style={{fontSize:font.xs,color:s.color,marginTop:4,fontWeight:700,opacity:.8}}>{s.label}</div>
          </div>
        ))}
      </div>

      {monthComp && (
        <div style={{...card,padding:'16px',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:700,color:colors.text}}>📊 مقارنة الأداء الشهري</span>
            <span style={{fontSize:10,color:colors.text4}}>مقابل الشهر السابق</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              {label:'المبيعات', val:monthComp.current.sales, change:monthComp.changes.sales, unit:'ر.س'},
              {label:'المشتريات', val:monthComp.current.purchasesTotal, change:monthComp.changes.purchases, unit:'ر.س'},
              {label:'الصافي', val:monthComp.current.net, change:monthComp.changes.net, unit:'ر.س'},
            ].map((m,i)=>{
              const up = m.change !== null && m.change >= 0
              const color = m.change===null ? colors.text4 : up ? colors.primary : colors.danger
              return (
                <div key={i} style={{textAlign:'center' as const}}>
                  <div style={{fontSize:9,color:colors.text4,marginBottom:4}}>{m.label}</div>
                  <div style={{fontSize:16,fontWeight:700,color:colors.text,fontVariantNumeric:'tabular-nums' as const}}>{m.val.toLocaleString()} <span style={{fontSize:9,fontWeight:400}}>{m.unit}</span></div>
                  {m.change !== null && (
                    <div style={{fontSize:10,fontWeight:700,color,marginTop:2}}>
                      {up?'▲':'▼'} {Math.abs(m.change)}%
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{...card,overflow:'hidden'}}>
        {loading?(<div style={{padding:48,textAlign:'center'}}><div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto'}}/></div>
        ):closings.length===0?(<div style={{padding:56,textAlign:'center'}}><div style={{fontSize:44,marginBottom:10}}>📭</div><div style={{fontSize:font.base,fontWeight:700,color:colors.text2}}>لا توجد تقارير إقفال</div></div>
        ):(
          <div style={{overflowX:'auto',overflowY:'auto',maxHeight:480}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:600}}>
              <thead>
                <tr style={{background:colors.bg,borderBottom:`1.5px solid ${colors.border}`,position:'sticky' as const,top:0,zIndex:2}}>
                  {['التاريخ','الكاشير','المبيعات','الشبكة','الكاش الفعلي','المسحوبات','الكاش بعد الخصم','الصافي','النتيجة','المرفقات','إجراء'].map((h,i)=>(
                    <th key={i} style={{padding:'10px 16px',color:colors.text4,fontSize:font.xs,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.05em',background:colors.bg}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closings.map((c:any)=>(
                  <tr key={c.id} style={{borderBottom:`1px solid ${colors.border}`}}>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text2}}>
                      {editingDateId===c.id ? (
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <input type="date" value={editDateValue} onChange={e=>setEditDateValue(e.target.value)}
                            style={{...inp(),padding:'4px 8px',fontSize:font.xs,width:140}}/>
                          <button onClick={()=>saveClosingDate(c.id)} disabled={savingDate}
                            style={{background:colors.primary,color:'white',border:'none',borderRadius:6,padding:'4px 8px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            {savingDate?'...':'حفظ'}
                          </button>
                          <button onClick={()=>setEditingDateId(null)}
                            style={{background:colors.bg,color:colors.text3,border:'none',borderRadius:6,padding:'4px 8px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <div onClick={()=>{setEditingDateId(c.id);setEditDateValue(c.closing_date)}} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                          {new Date(c.closing_date).toLocaleDateString('ar-SA')}
                          <span style={{fontSize:11,opacity:.4}}>✏️</span>
                        </div>
                      )}
                    </td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text,fontWeight:700}}>{c.staff_name}</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text2}}>{Number(c.total_sales).toFixed(0)} ر.س</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text2}}>{Number(c.network_amount).toFixed(0)} ر.س</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text2}}>{Number(c.cash_amount).toFixed(0)} ر.س</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:Number(c.total_purchases)>0?colors.danger:colors.text4}}>
                      {Number(c.total_purchases)>0 ? (
                        <div onClick={()=>setExpandedReasons(prev=>({...prev,[c.id]:!prev[c.id]}))} style={{cursor:'pointer'}}>
                          <div style={{fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
                            −{Number(c.total_purchases).toFixed(0)} ر.س
                            <span style={{fontSize:9,color:colors.text4}}>{expandedReasons[c.id]?'▲':'▼'}</span>
                          </div>
                          {expandedReasons[c.id] && (c.purchases||[]).map((p:any,pi:number)=>(
                            <div key={pi} style={{fontSize:10,color:colors.text4,fontWeight:500,marginTop:2}}>
                              {p.reason||'بدون سبب'} ({Number(p.amount).toFixed(0)} ر.س)
                            </div>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text,fontWeight:700}}>{(Number(c.cash_amount)-Number(c.total_purchases)).toFixed(0)} ر.س</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.primary}}>{(Number(c.network_amount)+Number(c.cash_amount)-Number(c.total_purchases)).toFixed(0)} ر.س</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:statusColor[c.status]}}>
                      {statusLabel[c.status]}{c.status!=='balanced'?` (${Math.abs(Number(c.difference)).toFixed(0)} ر.س)`:''}
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{display:'flex',gap:6}}>
                        {c.sales_image && (
                          <a href={c.sales_image} target="_blank" rel="noopener noreferrer" title="صورة تقرير المبيعات" style={{width:28,height:28,borderRadius:7,background:colors.infoLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none'}}>📊</a>
                        )}
                        {c.network_image && (
                          <a href={c.network_image} target="_blank" rel="noopener noreferrer" title="صورة موازنة الشبكة" style={{width:28,height:28,borderRadius:7,background:colors.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none'}}>💳</a>
                        )}
                        {!c.sales_image && !c.network_image && (
                          <span style={{fontSize:11,color:colors.text4}}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <button onClick={()=>{setConfirmDelete(c);setDeletePassword('');setDeleteError('')}}
                        style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{position:'sticky' as const,bottom:0,zIndex:2}}>
                <tr style={{background:colors.primaryLight,borderTop:`2px solid ${colors.primaryBorder}`,boxShadow:'0 -2px 8px rgba(0,0,0,.06)'}}>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}} colSpan={2}>الإجمالي ({closings.length})</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}}>{closings.reduce((s:number,c:any)=>s+Number(c.total_sales),0).toFixed(0)} ر.س</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}}>{closings.reduce((s:number,c:any)=>s+Number(c.network_amount),0).toFixed(0)} ر.س</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}}>{closings.reduce((s:number,c:any)=>s+Number(c.cash_amount),0).toFixed(0)} ر.س</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.danger}}>{closings.reduce((s:number,c:any)=>s+Number(c.total_purchases),0)>0?'−'+closings.reduce((s:number,c:any)=>s+Number(c.total_purchases),0).toFixed(0)+' ر.س':'—'}</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}}>{closings.reduce((s:number,c:any)=>s+(Number(c.cash_amount)-Number(c.total_purchases)),0).toFixed(0)} ر.س</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.primary}}>{closings.reduce((s:number,c:any)=>s+Number(c.network_amount)+Number(c.cash_amount)-Number(c.total_purchases),0).toFixed(0)} ر.س</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.danger}}>{closings.reduce((s:number,c:any)=>s+Number(c.difference),0).toFixed(0)} ر.س</td>
                  <td/><td/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,.4)',backdropFilter:'blur(6px)'}} onClick={()=>{if(!deleting){setConfirmDelete(null);setDeletePassword('');setDeleteError('')}}}/>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:360,position:'relative',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
            <div style={{width:48,height:48,borderRadius:12,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:22}}>🔒</div>
            <div style={{fontSize:15,fontWeight:800,color:colors.text,textAlign:'center',marginBottom:6}}>تأكيد حذف تقرير الإقفال</div>
            <div style={{fontSize:12,color:colors.text3,textAlign:'center',lineHeight:1.7,marginBottom:16}}>
              سيتم حذف إقفال <b style={{color:colors.text}}>{confirmDelete.staff_name}</b> بتاريخ {confirmDelete?.closing_date ? new Date(confirmDelete.closing_date).toLocaleDateString('ar-SA') : ''} نهائياً.<br/>أدخل كلمة مرور حسابك للتأكيد
            </div>
            <input type="password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&deletePassword&&!deleting) confirmDeleteClosing()}}
              placeholder="كلمة المرور" autoFocus
              style={{...inp(),width:'100%',marginBottom:10,boxSizing:'border-box' as const}}/>
            {deleteError && <div style={{fontSize:12,color:'#dc2626',fontWeight:600,marginBottom:10,textAlign:'center' as const}}>⚠️ {deleteError}</div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!deleting){setConfirmDelete(null);setDeletePassword('');setDeleteError('')}}}
                style={{flex:1,padding:'11px',background:colors.bg,color:colors.text3,border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                إلغاء
              </button>
              <button onClick={confirmDeleteClosing} disabled={!deletePassword||deleting}
                style={{flex:2,padding:'11px',background:!deletePassword||deleting?colors.border2:'#dc2626',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:!deletePassword||deleting?'not-allowed':'pointer',fontFamily:'inherit'}}>
                {deleting?'جاري الحذف...':'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [view, setView]           = useState<'home'|'dispense'|'purchase'|'inventory'|'cashier'>('home')
  const [period, setPeriod]       = useState<FilterPeriod>('today')
  const [from, setFrom]           = useState('')
  const [to, setTo]               = useState('')
  const [dispenseStats, setDS]    = useState({ops:0,qty:0,items:0})
  const [purchaseStats, setPS]    = useState({invoices:0,total:0,vat:0})
  const [statsLoading, setSL]     = useState(true)
  const [weeklyD, setWD]          = useState<number[]>([])
  const [inventoryStats, setIS]   = useState({low:0,out:0,total:0})
  const [weeklyP, setWP]          = useState<number[]>([])
  const [visible, setVisible]     = useState(false)
  const [recentOps, setRecentOps] = useState<any[]>([])
  const [cashierStats, setCS]     = useState({count:0,deficit:0,surplus:0})
  const [topMovements, setTopMovements] = useState<any[]>([])
  const sb = createClient()

  useEffect(()=>{ loadStats() },[period,from,to])

  async function loadStats() {
    setSL(true)
    const orgId=sessionStorage.getItem('s_org_id'); if(!orgId){setSL(false);return}
    const{start,end}=getRange(period,from,to)
    const[{data:mv},{data:pu}]=await Promise.all([
      (()=>{const _bid2=sessionStorage.getItem('s_branch_id');let _mq2=sb.from('stock_movements').select('qty_change,created_at,products!inner(name,org_id,branch_id)').eq('type','out').eq('products.org_id',orgId).gte('created_at',start.toISOString()).lte('created_at',end.toISOString());if(_bid2)_mq2=_mq2.eq('products.branch_id',_bid2);return _mq2})(),
      (()=>{const _bidP=sessionStorage.getItem('s_branch_id');let _pq=sb.from('purchases').select('amount,total_amount,vat_amount,created_at,branch_id').eq('org_id',orgId).gte('created_at',start.toISOString()).lte('created_at',end.toISOString());if(_bidP)_pq=_pq.eq('branch_id',_bidP);return _pq})(),
    ])
    const items=new Set((mv||[]).map((m:any)=>m.products?.name)).size
    setDS({ops:(mv||[]).length,qty:(mv||[]).reduce((s:number,m:any)=>s+Math.abs(m.qty_change),0),items})
    setPS({invoices:(pu||[]).length,total:(pu||[]).reduce((s:number,p:any)=>s+Number(p.total_amount||0),0),vat:(pu||[]).reduce((s:number,p:any)=>s+Number(p.vat_amount||0),0)})
    // weekly chart
    const wd:number[]=[], wp:number[]=[]
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i); const ds=d.toDateString()
      wd.push((mv||[]).filter((m:any)=>new Date(m.created_at).toDateString()===ds).length)
      wp.push((pu||[]).filter((p:any)=>new Date(p.created_at).toDateString()===ds).length)
    }
    setWD(wd); setWP(wp)
    setTopMovements(mv||[])
    const _bidI=sessionStorage.getItem('s_branch_id')
    let _invQ=sb.from('products').select('qty,reorder_point').eq('org_id',orgId).eq('is_active',true)
    if(_bidI)_invQ=_invQ.eq('branch_id',_bidI)
    const{data:inv}=await _invQ
    const invData=inv||[]
    setIS({total:invData.length,low:invData.filter((p:any)=>p.qty>0&&p.qty<=p.reorder_point).length,out:invData.filter((p:any)=>p.qty===0).length})
    const _bidC=sessionStorage.getItem('s_branch_id')
    let _closQ=sb.from('cashier_closings' as any).select('status').eq('org_id',orgId).gte('closing_date',start.toISOString().slice(0,10)).lte('closing_date',end.toISOString().slice(0,10))
    if(_bidC)_closQ=(_closQ as any).eq('branch_id',_bidC)
    const{data:closings}=await _closQ
    const closingsData=(closings||[]) as any[]
    setCS({count:closingsData.length,deficit:closingsData.filter(c=>c.status==='deficit').length,surplus:closingsData.filter(c=>c.status==='surplus').length})
    setSL(false)
    // آخر العمليات
    const _bidR=sessionStorage.getItem('s_branch_id')
    let _recentQ=sb.from('stock_movements')
      .select('id,qty_change,type,created_at,products!inner(name,unit,org_id,branch_id)')
      .eq('products.org_id',orgId)
      .order('created_at',{ascending:false})
      .limit(10)
    if(_bidR)_recentQ=_recentQ.eq('products.branch_id',_bidR)
    const{data:recent}=await _recentQ
    setRecentOps(recent||[])
    setTimeout(()=>setVisible(true),50)
  }

  if (view==='inventory') return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h1 style={{...pageTitle,marginBottom:16}}>تقرير الجرد اليومي</h1>
      <InventoryDetail period={period} from={from} to={to} onBack={()=>setView('home')}/>
    </div>
  )

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

  if (view==='cashier') return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h1 style={{...pageTitle,marginBottom:16}}>إقفال الكاشير اليومي</h1>
      <CashierClosingDetail period={period} from={from} to={to} onBack={()=>setView('home')}/>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:680,margin:'0 auto',opacity:visible?1:0,transition:'opacity .4s ease'}}>
      <style>{`
        @keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .su{animation:slideUp .4s ease both}
      `}</style>

      <div style={{marginBottom:20}} className="su">
        <h1 style={{...pageTitle}}>التقارير</h1>
        <p style={{...pageSub}}>اختر الفترة ثم اضغط على التقرير لعرض التفاصيل</p>
      </div>

      <div className="su" style={{animationDelay:'.05s'}}>
        <FilterBar period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo}/>
      </div>

      <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
        <div className="su" style={{animationDelay:'.1s'}}>
          <ReportCard
            title="تقرير الصرف"
            subtitle="عمليات الصرف من المخزون"
            icon="📤"
            color={colors.danger}
            bg={colors.dangerLight}
            border={colors.dangerBorder}
            loading={statsLoading}
            chartData={weeklyD}
            stats={[
              {label:'عمليات الصرف',value:dispenseStats.ops,color:colors.danger,highlight:true},
              {label:'وحدات مصروفة',value:dispenseStats.qty,color:colors.danger},
              {label:'أصناف مختلفة',value:dispenseStats.items,color:colors.danger},
            ]}
            onClick={()=>setView('dispense')}
          />
        </div>
        <div className="su" style={{animationDelay:'.15s'}}>
          <ReportCard
            title="تقرير المشتريات"
            subtitle="فواتير المشتريات مع الضريبة 15%"
            icon="🧾"
            color={colors.primary}
            bg={colors.primaryLight}
            border={colors.primaryBorder}
            loading={statsLoading}
            chartData={weeklyP}
            stats={[
              {label:'عدد الفواتير',value:purchaseStats.invoices,color:colors.primary,highlight:true},
              {label:'إجمالي شامل',value:purchaseStats.total.toFixed(0)+' ر.س',color:colors.primary},
              {label:'ضريبة القيمة',value:purchaseStats.vat.toFixed(0)+' ر.س',color:colors.warning},
            ]}
            onClick={()=>setView('purchase')}
          />
        </div>
        <div className="su" style={{animationDelay:'.2s'}}>
          <ReportCard
            title="تقرير الجرد اليومي"
            subtitle="ملخص المخزون الحالي والأصناف الناقصة"
            icon="📋"
            color={'#7c3aed'}
            bg={'#f5f3ff'}
            border={'#ddd6fe'}
            loading={statsLoading}
            chartData={[]}
            stats={[
              {label:'إجمالي الأصناف',value:inventoryStats.total,color:'#7c3aed',highlight:true},
              {label:'مخزون ناقص',value:inventoryStats.low,color:colors.warning},
              {label:'نفد المخزون',value:inventoryStats.out,color:colors.danger},
            ]}
            onClick={()=>setView('inventory')}
          />
        </div>
        <div className="su" style={{animationDelay:'.25s'}}>
          <ReportCard
            title="إقفال الكاشير اليومي"
            subtitle="تقارير إقفال الكاشير والفروقات"
            icon="💰"
            color={'#0891b2'}
            bg={'#ecfeff'}
            border={'#a5f3fc'}
            loading={statsLoading}
            chartData={[]}
            stats={[
              {label:'عدد التقارير',value:cashierStats.count,color:'#0891b2',highlight:true},
              {label:'حالات عجز',value:cashierStats.deficit,color:colors.danger},
              {label:'حالات زيادة',value:cashierStats.surplus,color:colors.info},
            ]}
            onClick={()=>setView('cashier')}
          />
        </div>
      </div>

      {/* أكثر المنتجات صرفاً */}


      {/* أكثر المنتجات صرفاً ومقارنة الأشهر */}
      {(()=>{
        const productMap: Record<string,{name:string,qty:number,unit:string}> = {}
        topMovements.filter((m:any)=>m.type==='out').forEach((m:any)=>{
          const name = (m.products as any)?.name||'—'
          const unit = (m.products as any)?.unit||''
          if(!productMap[name]) productMap[name]={name,qty:0,unit}
          productMap[name].qty += Math.abs(m.qty_change||0)
        })
        const top = Object.values(productMap).sort((a,b)=>b.qty-a.qty).slice(0,8)
        const maxVal = Math.max(...top.map(p=>p.qty),1)
        if(top.length===0) return null
        return (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
            <div style={{...card,padding:'20px 24px'}}>
              <div style={{fontSize:font.md,fontWeight:900,color:colors.text,marginBottom:4}}>🔥 أكثر المنتجات صرفاً</div>
              <div style={{fontSize:font.xs,color:colors.text3,marginBottom:16}}>الفترة المحددة</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {top.map((p,i)=>(
                  <div key={i}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:11,fontWeight:800,color:i<3?colors.primary:colors.text4,width:18}}>{i+1}</span>
                        <span style={{fontSize:12,fontWeight:700,color:colors.text}}>{p.name}</span>
                      </div>
                      <span style={{fontSize:12,fontWeight:800,color:colors.primary}}>{p.qty} {p.unit}</span>
                    </div>
                    <div style={{height:6,background:colors.border,borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${(p.qty/maxVal)*100}%`,background:i===0?colors.primary:i===1?'#2563eb':i===2?'#7c3aed':colors.border2,borderRadius:99}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{...card,padding:'20px 24px'}}>
              <div style={{fontSize:font.md,fontWeight:900,color:colors.text,marginBottom:4}}>📊 الصرف الشهري</div>
              <div style={{fontSize:font.xs,color:colors.text3,marginBottom:16}}>توزيع الكميات</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120}}>
                {(()=>{
                  const monthMap: Record<string,number> = {}
                  topMovements.filter((m:any)=>m.type==='out').forEach((m:any)=>{
                    const d=new Date(m.created_at)
                    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
                    monthMap[key]=(monthMap[key]||0)+Math.abs(m.qty_change||0)
                  })
                  const months=Object.entries(monthMap).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)
                  const maxM=Math.max(...months.map(m=>m[1]),1)
                  return months.map(([key,val],i)=>{
                    const [y,m]=key.split('-')
                    const mn=new Date(Number(y),Number(m)-1).toLocaleDateString('ar-SA',{month:'short'})
                    return (
                      <div key={key} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                        <span style={{fontSize:9,color:colors.text4,fontWeight:700}}>{val}</span>
                        <div style={{width:'100%',background:colors.border,borderRadius:'6px 6px 0 0',height:90,display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
                          <div style={{width:'100%',background:i===months.length-1?colors.primary:`${colors.primary}66`,height:`${Math.max((val/maxM)*100,4)}%`,borderRadius:'6px 6px 0 0'}}/>
                        </div>
                        <span style={{fontSize:9,color:colors.text4}}>{mn}</span>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>
        )
      })()}

      {/* آخر العمليات — 3 أقسام */}
      <RecentOpsSection recentOps={recentOps} colors={colors}/>
    </div>
  )
}