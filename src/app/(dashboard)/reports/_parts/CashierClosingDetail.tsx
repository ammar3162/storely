'use client'
import { useState, useEffect, Suspense, lazy } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { currencySymbol } from '@/lib/currencySymbol'
import { FileText, Inbox, Loader2, Trash2, Pencil, Lock, AlertTriangle, BarChart3, CreditCard, Bike } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { colors, font, card, btnSecondary } from '@/lib/ds'
import { toast } from '@/components/toast'
import { ListSkeleton } from '@/components/PageSkeleton'
import { netOf, pdfOrgInfo, getRange, formatRange, BackBtn, PeriodBadge } from './shared'
import type { FilterPeriod } from './shared'
import { fileLink } from '@/lib/invoiceUrl'

const CashierClosingEditor = lazy(() => import('@/components/CashierClosingEditor'))
const EditHistoryDialog = lazy(() => import('@/components/EditHistoryDialog'))
const PasswordBox = lazy(() => import('@/components/CashierClosingEditor').then(m => ({ default: m.PasswordBox })))

export default function CashierClosingDetail({ period, from, to, onBack }: { period:FilterPeriod; from:string; to:string; onBack:()=>void }) {
  const [closings, setClosings] = useState<any[]>([])
  const [expandedReasons, setExpandedReasons] = useState<Record<string,boolean>>({})
  const [loading, setLoading]   = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<any|null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [editing, setEditing] = useState<any|null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [monthComp, setMonthComp] = useState<any>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [curr, setCurr] = useState('⃁')
  const [isOwner, setIsOwner] = useState(false)
  const [deciding, setDeciding] = useState<string|null>(null)
  const [history, setHistory] = useState<any|null>(null)   // سجل تعديلات إقفال (والترجيع)
  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null, ['cashier_closings'], ()=>load())
  useEffect(()=>{
    getMe().then(me=>{ if(me?.org?.currency) setCurr(currencySymbol(me.org.currency)); setIsOwner(me?.role==='owner') })
  },[])

  // قرار عجز الكاشير — اعتماد = خصم من راتب الكاشير، رفض = ما ينخصم
  async function decideDeficit(id: string, decision: 'approved'|'rejected') {
    if (deciding) return
    setDeciding(id)
    const r = await api.post('/api/cashier-deficit-decision', { org_id: sessionStorage.getItem('s_org_id'), closing_id: id, decision })
    setDeciding(null)
    if (!r.success) { toast(r.error || 'تعذر حفظ القرار', 'error'); return }
    setClosings(prev => prev.map(c => c.id === id ? { ...c, deficit_decision: decision } : c))
    toast(decision === 'approved' ? 'تم اعتماد الخصم من راتب الكاشير' : 'تم رفض الخصم')
  }

  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      const orgId = sessionStorage.getItem('s_org_id')
      const { org, branchRow } = await pdfOrgInfo()
      const curr = currencySymbol((org as any)?.currency)
      const orgDisplayName = ((org as any)?.name || 'Storely') + ((branchRow as any)?.name ? ' — فرع ' + (branchRow as any).name : '')
      const { exportReportPdf } = await import('@/lib/pdfExport')
      await exportReportPdf({
        title: 'تقرير إقفال الكاشير اليومي',
        subtitle: formatRange(period, from, to),
        orgName: orgDisplayName,
        logoUrl: '/storely-logo.png',
        columns: [
          { header: 'التاريخ', key: 'date' },
          { header: 'الكاشير', key: 'staff' },
          { header: 'المبيعات', key: 'sales', align: 'left' },
          { header: 'الشبكة', key: 'network', align: 'left' },
          ...(hasDelivery ? [{ header: 'التوصيل', key: 'delivery', align: 'left' as const }] : []),
          { header: 'الكاش الفعلي', key: 'cash', align: 'left' },
          { header: 'المسحوبات', key: 'withdrawals', align: 'left' },
          { header: 'الكاش بعد الخصم', key: 'cashAfter', align: 'left' },
          { header: 'الصافي', key: 'net', align: 'left' },
          { header: 'النتيجة', key: 'result' },
          { header: 'سبب العجز', key: 'reason' },
        ],
        rows: closings.map((c: any) => ({
          date: new Date(c.closing_date+'T12:00:00Z').toLocaleDateString('ar-SA', {numberingSystem:'latn',calendar:'gregory',timeZone:'UTC'}) + (c.created_at ? ' · ' + new Date(c.created_at).toLocaleTimeString('ar-SA',{numberingSystem:'latn',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Riyadh'}) : ''),
          staff: c.staff_name || '—',
          sales: Number(c.total_sales || 0).toFixed(2) + ' ' + curr,
          network: Number(c.network_amount || 0).toFixed(2) + ' ' + curr,
          delivery: Number(c.delivery_amount || 0) > 0 ? Number(c.delivery_amount).toFixed(2) + ' ' + curr : '—',
          cash: Number(c.cash_amount || 0).toFixed(2) + ' ' + curr,
          withdrawals: Number(c.total_purchases || 0) > 0 ? '−' + Number(c.total_purchases).toFixed(2) + ' ' + curr : '—',
          cashAfter: (Number(c.cash_amount||0)-Number(c.total_purchases||0)).toFixed(2) + ' ' + curr,
          net: netOf(c).toFixed(2) + ' ' + curr,
          result: c.difference > 0 ? `زيادة ${c.difference.toFixed(2)}` : c.difference < 0 ? `عجز ${Math.abs(c.difference).toFixed(2)}` : 'مطابق',
          reason: c.status === 'deficit' ? (c.deficit_reason || '—') : '',
        })),
        summaryStats: [
          { label: 'إجمالي التقارير', value: String(closings.length), color:'#0891b2' },
          { label: 'إجمالي العجز', value: totalDeficit.toFixed(0) + ' ' + curr, color: colors.danger },
          { label: 'إجمالي الزيادة', value: totalSurplus.toFixed(0) + ' ' + curr, color: colors.info },
        ],
        totalsRow: {
          date: 'الإجمالي',
          staff: '—',
          sales: closings.reduce((s:number,c:any)=>s+Number(c.total_sales||0),0).toFixed(2) + ' ' + curr,
          network: closings.reduce((s:number,c:any)=>s+Number(c.network_amount||0),0).toFixed(2) + ' ' + curr,
          delivery: totalDelivery.toFixed(2) + ' ' + curr,
          cash: closings.reduce((s:number,c:any)=>s+Number(c.cash_amount||0),0).toFixed(2) + ' ' + curr,
          withdrawals: closings.reduce((s:number,c:any)=>s+Number(c.total_purchases||0),0) > 0 ? '−' + closings.reduce((s:number,c:any)=>s+Number(c.total_purchases||0),0).toFixed(2) + ' ' + curr : '—',
          cashAfter: closings.reduce((s:number,c:any)=>s+(Number(c.cash_amount||0)-Number(c.total_purchases||0)),0).toFixed(2) + ' ' + curr,
          net: closings.reduce((s:number,c:any)=>s+netOf(c),0).toFixed(2) + ' ' + curr,
          result: '—',
          reason: '',
        },
        fileName: `تقرير-اقفال-الكاشير-${new Date().toISOString().slice(0,10)}.pdf`,
      })
    } catch { alert('تعذر تصدير التقرير') }
    setExportingPdf(false)
  }
  useEffect(()=>{ load() },[period,from,to])
  useEffect(()=>{
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId) return
    fetch('/api/month-comparison?org_id='+orgId+'&branch_id='+(sessionStorage.getItem('s_branch_id')||'')).then(r=>r.json()).then(d=>{ if(d.success) setMonthComp(d) }).catch(()=>{})
  },[])

  async function confirmDeleteClosing() {
    setDeleteError(''); setDeleting(true)
    // كلمة مرور الحساب يتحقق منها الخادم (مو المتصفح)
    const delRes=await api.del('/api/cashier-closing',{org_id:sessionStorage.getItem('s_org_id'),id:confirmDelete.id},{password:deletePassword})
    if(!delRes.success){setDeleteError(delRes.error||'فشل الحذف — حاول مرة أخرى');setDeleting(false);return}
    setClosings(prev => prev.filter(c => c.id !== confirmDelete.id))
    setConfirmDelete(null); setDeletePassword(''); setDeleting(false)
    toast('تم حذف الإقفال')
  }
  async function load() {
    setLoading(true)
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId){setLoading(false);return}
    const{start,end}=getRange(period,from,to)
    try {
      const bidCC=sessionStorage.getItem('s_branch_id'); const res = await fetch(`/api/cashier-closing?org_id=${orgId}&from=${start.toISOString().slice(0,10)}&to=${end.toISOString().slice(0,10)}${bidCC?`&branch_id=${bidCC}`:''}`)
      const data = await res.json()
      setClosings(data.closings||[])
    } catch { setClosings([]) }
    setLoading(false)
  }
  const totalDeficit = closings.filter(c=>c.status==='deficit').reduce((s,c)=>s+Math.abs(Number(c.difference)),0)
  const totalSurplus = closings.filter(c=>c.status==='surplus').reduce((s,c)=>s+Number(c.difference),0)
  const balancedCount = closings.filter(c=>c.status==='balanced').length
  // التوصيل: العمود والملخص يطلعون بس لو فيه إقفالات فيها مبالغ تطبيقات
  const totalDelivery = closings.reduce((s,c)=>s+Number(c.delivery_amount||0),0)
  const hasDelivery = totalDelivery > 0
  const deliveryByApp = Object.entries(closings.reduce((m:Record<string,number>,c:any)=>{ for(const d of (c.delivery||[])) m[d.name]=(m[d.name]||0)+Number(d.amount||0); return m },{})).sort((a,b)=>b[1]-a[1])
  const statusLabel: Record<string,string> = {deficit:'عجز',surplus:'زيادة',balanced:'مطابق'}
  const statusColor: Record<string,string> = {deficit:colors.danger,surplus:colors.info,balanced:colors.primary}
  return (
    <div>
      <BackBtn onClick={onBack}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap' as const,gap:8}}>
        <PeriodBadge period={period} from={from} to={to}/>
        <button onClick={handleExportPdf} disabled={exportingPdf || closings.length===0}
          style={{...btnSecondary,padding:'8px 16px',fontSize:font.xs,opacity:exportingPdf||closings.length===0?0.6:1,cursor:exportingPdf||closings.length===0?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:6}}>
          {exportingPdf?<span style={{display:'inline-flex',alignItems:'center',gap:6}}><Loader2 size={14} strokeWidth={2.25} className="spin-icon"/> جاري التصدير...</span>:<span style={{display:'inline-flex',alignItems:'center',gap:6}}><FileText size={14} strokeWidth={2.25}/> تصدير PDF</span>}
        </button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16,marginTop:12}}>
        {[
          {label:'إجمالي التقارير',value:closings.length,color:'#0891b2',bg:'#ecfeff',border:'#a5f3fc'},
          {label:'إجمالي العجز',value:totalDeficit.toFixed(0)+' '+curr,color:colors.danger,bg:colors.dangerLight,border:colors.dangerBorder},
          {label:'إجمالي الزيادة',value:totalSurplus.toFixed(0)+' '+curr,color:colors.info,bg:colors.infoLight,border:colors.infoBorder},
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
            <span style={{fontSize:13,fontWeight:700,color:colors.text,display:'inline-flex',alignItems:'center',gap:6}}><BarChart3 size={15} strokeWidth={2.25}/> مقارنة الأداء الشهري</span>
            <span style={{fontSize:10,color:colors.text4}}>مقابل الشهر السابق</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              {label:'المبيعات', val:monthComp.current.sales, change:monthComp.changes.sales, unit:curr},
              {label:'المشتريات', val:monthComp.current.purchasesTotal, change:monthComp.changes.purchases, unit:curr},
              {label:'الصافي', val:monthComp.current.net, change:monthComp.changes.net, unit:curr},
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

      {hasDelivery && (
        <div style={{...card,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' as const}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:font.sm,fontWeight:800,color:colors.text}}><Bike size={15} strokeWidth={2.25}/> التوصيل بالفترة: {totalDelivery.toFixed(0)} {curr}</span>
          {deliveryByApp.map(([name,amt])=>(
            <span key={name} style={{fontSize:font.xs,fontWeight:700,color:colors.text2,background:colors.bg,borderRadius:999,padding:'4px 10px'}}>{name} {amt.toFixed(0)} {curr}</span>
          ))}
        </div>
      )}

      <div style={{...card,overflow:'hidden'}}>
        {loading?(<ListSkeleton/>
        ):closings.length===0?(<div style={{padding:56,textAlign:'center'}}><div style={{marginBottom:10,display:'flex',justifyContent:'center',color:colors.text4}}><Inbox size={40} strokeWidth={1.5}/></div><div style={{fontSize:font.base,fontWeight:700,color:colors.text2}}>لا توجد تقارير إقفال</div></div>
        ):(
          <div style={{overflowX:'auto',overflowY:'auto',maxHeight:480}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:600}}>
              <thead>
                <tr style={{background:colors.bg,borderBottom:`1.5px solid ${colors.border}`,position:'sticky' as const,top:0,zIndex:2}}>
                  {['التاريخ','الكاشير','المبيعات','الشبكة',...(hasDelivery?['التوصيل']:[]),'الكاش الفعلي','المسحوبات','الكاش بعد الخصم','الصافي','النتيجة','المرفقات','إجراء'].map((h,i)=>(
                    <th key={i} style={{padding:'10px 16px',color:colors.text4,fontSize:font.xs,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.05em',background:colors.bg}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closings.map((c:any)=>(
                  <tr key={c.id} style={{borderBottom:`1px solid ${colors.border}`}}>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text2}}>
                      <div style={{fontWeight:600,color:colors.text}}>{new Date(c.closing_date+'T12:00:00Z').toLocaleDateString('ar-SA', {numberingSystem:'latn',calendar:'gregory',timeZone:'UTC'})}</div>
                      {c.edited_at && (()=>{ const acc = c.edited_source==='accountant'
                        return <button onClick={()=>isOwner&&setHistory(c)} title={`عدّله ${c.edited_by||'المالك'} — ${new Date(c.edited_at).toLocaleString('ar-SA',{numberingSystem:'latn',timeZone:'Asia/Riyadh'})}${isOwner?' — اضغط لعرض السجل':''}`}
                          style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:800,color:acc?'#7c3aed':colors.warning,background:acc?'#f5f3ff':colors.warningLight,border:'none',borderRadius:5,padding:'2px 7px',marginTop:3,cursor:isOwner?'pointer':'default',fontFamily:'inherit'}}>
                          <Pencil size={10} strokeWidth={2.5}/> {acc?'معدّل من المحاسب':'معدّل'}{c.edit_count>1?` (${c.edit_count})`:''}</button> })()}
                      {c.created_at && (
                        <div style={{fontSize:11,color:colors.text4,marginTop:2,whiteSpace:'nowrap' as const}}>
                          قُفل {new Date(c.created_at).toLocaleTimeString('ar-SA',{numberingSystem:'latn',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Riyadh'})}
                          {new Date(c.created_at).toLocaleDateString('en-CA',{timeZone:'Asia/Riyadh'}) !== c.closing_date && <> · {new Date(c.created_at).toLocaleDateString('ar-SA',{numberingSystem:'latn',day:'numeric',month:'short',calendar:'gregory',timeZone:'Asia/Riyadh'})}</>}
                        </div>
                      )}
                    </td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text,fontWeight:700}}>{c.staff_name}</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text2}}>{Number(c.total_sales).toFixed(0)} {curr}</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text2}}>{Number(c.network_amount).toFixed(0)} {curr}</td>
                    {hasDelivery && (
                      <td style={{padding:'12px 16px',fontSize:font.sm,color:Number(c.delivery_amount)>0?colors.text2:colors.text4}}>
                        {Number(c.delivery_amount)>0 ? (
                          <div title={(c.delivery||[]).map((d:any)=>`${d.name}: ${Number(d.amount).toFixed(2)}`).join('\n')}>
                            {Number(c.delivery_amount).toFixed(0)} {curr}
                            {(c.delivery||[]).map((d:any,di:number)=>(<div key={di} style={{fontSize:10,color:colors.text4,marginTop:2,whiteSpace:'nowrap' as const}}>{d.name} {Number(d.amount).toFixed(0)}</div>))}
                          </div>
                        ) : '—'}
                      </td>
                    )}
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text2}}>{Number(c.cash_amount).toFixed(0)} {curr}</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:Number(c.total_purchases)>0?colors.danger:colors.text4}}>
                      {Number(c.total_purchases)>0 ? (
                        <div onClick={()=>setExpandedReasons(prev=>({...prev,[c.id]:!prev[c.id]}))} style={{cursor:'pointer'}}>
                          <div style={{fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
                            −{Number(c.total_purchases).toFixed(0)} {curr}
                            <span style={{fontSize:9,color:colors.text4}}>{expandedReasons[c.id]?'▲':'▼'}</span>
                          </div>
                          {expandedReasons[c.id] && (c.purchases||[]).map((p:any,pi:number)=>(
                            <div key={pi} style={{fontSize:10,color:colors.text4,fontWeight:500,marginTop:2}}>
                              {p.reason||'بدون سبب'} ({Number(p.amount).toFixed(0)} {curr})
                            </div>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,color:colors.text,fontWeight:700}}>{(Number(c.cash_amount)-Number(c.total_purchases)).toFixed(0)} {curr}</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.primary}}>{netOf(c).toFixed(0)} {curr}</td>
                    <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:statusColor[c.status],minWidth:150}}>
                      {statusLabel[c.status]}{c.status!=='balanced'?` (${Math.abs(Number(c.difference)).toFixed(0)} ${curr})`:''}
                      {c.status==='deficit' && (
                        <div style={{fontSize:11,fontWeight:600,marginTop:4,lineHeight:1.5,color:c.deficit_reason?colors.text2:colors.text4,background:c.deficit_reason?colors.dangerLight:'transparent',borderRadius:6,padding:c.deficit_reason?'4px 8px':0,maxWidth:220,whiteSpace:'normal' as const}}>
                          {c.deficit_reason ? <>السبب: {c.deficit_reason}</> : 'بدون سبب (إقفال قديم)'}
                        </div>
                      )}
                      {c.status==='deficit' && c.deficit_decision==='pending' && (
                        isOwner ? (
                          <div style={{display:'flex',gap:6,marginTop:6}}>
                            <button onClick={()=>decideDeficit(c.id,'approved')} disabled={deciding===c.id}
                              style={{padding:'4px 10px',borderRadius:6,border:'none',background:colors.danger,color:'white',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>خصم من الراتب</button>
                            <button onClick={()=>decideDeficit(c.id,'rejected')} disabled={deciding===c.id}
                              style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${colors.border2}`,background:colors.surface,color:colors.text2,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>رفض</button>
                          </div>
                        ) : <div style={{fontSize:11,fontWeight:600,color:colors.warning,marginTop:4}}>بانتظار قرار المالك</div>
                      )}
                      {c.status==='deficit' && c.deficit_decision==='approved' && <div style={{fontSize:11,fontWeight:700,color:colors.danger,marginTop:4}}>خُصم من الراتب</div>}
                      {c.status==='deficit' && c.deficit_decision==='rejected' && <div style={{fontSize:11,fontWeight:600,color:colors.text4,marginTop:4}}>رُفض الخصم</div>}
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{display:'flex',gap:6}}>
                        {c.sales_image && (
                          <a href={fileLink(c.sales_image)} target="_blank" rel="noopener noreferrer" title="صورة تقرير المبيعات" style={{width:28,height:28,borderRadius:7,background:colors.infoLight,display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',color:colors.info}}><BarChart3 size={13} strokeWidth={2.25}/></a>
                        )}
                        {c.network_image && (
                          <a href={fileLink(c.network_image)} target="_blank" rel="noopener noreferrer" title="صورة موازنة الشبكة" style={{width:28,height:28,borderRadius:7,background:colors.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',color:colors.primary}}><CreditCard size={13} strokeWidth={2.25}/></a>
                        )}
                        {!c.sales_image && !c.network_image && (
                          <span style={{fontSize:11,color:colors.text4}}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      {isOwner ? (<div style={{display:'flex',gap:6}}>
                      <button onClick={()=>setEditing(c)}
                        style={{background:colors.primaryLight,color:colors.primary,border:`1px solid ${colors.primaryBorder}`,borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>
                        <Pencil size={12} strokeWidth={2.25} style={{display:'inline',verticalAlign:'-2px',marginLeft:4}}/> تعديل
                      </button>
                      <button onClick={()=>{setConfirmDelete(c);setDeletePassword('');setDeleteError('')}}
                        style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>
                        <Trash2 size={12} strokeWidth={2.25} style={{display:'inline',verticalAlign:'-2px',marginLeft:4}}/> حذف
                      </button>
                      </div>) : <span style={{fontSize:11,color:colors.text4}}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{position:'sticky' as const,bottom:0,zIndex:2}}>
                <tr style={{background:colors.primaryLight,borderTop:`2px solid ${colors.primaryBorder}`,boxShadow:'0 -2px 8px rgba(0,0,0,.06)'}}>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}} colSpan={2}>الإجمالي ({closings.length})</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}}>{closings.reduce((s:number,c:any)=>s+Number(c.total_sales),0).toFixed(0)} {curr}</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}}>{closings.reduce((s:number,c:any)=>s+Number(c.network_amount),0).toFixed(0)} {curr}</td>
                  {hasDelivery && <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}}>{totalDelivery.toFixed(0)} {curr}</td>}
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}}>{closings.reduce((s:number,c:any)=>s+Number(c.cash_amount),0).toFixed(0)} {curr}</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.danger}}>{closings.reduce((s:number,c:any)=>s+Number(c.total_purchases),0)>0?'−'+closings.reduce((s:number,c:any)=>s+Number(c.total_purchases),0).toFixed(0)+' '+curr:'—'}</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.text}}>{closings.reduce((s:number,c:any)=>s+(Number(c.cash_amount)-Number(c.total_purchases)),0).toFixed(0)} {curr}</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.primary}}>{closings.reduce((s:number,c:any)=>s+netOf(c),0).toFixed(0)} {curr}</td>
                  <td style={{padding:'12px 16px',fontSize:font.sm,fontWeight:800,color:colors.danger}}>{closings.reduce((s:number,c:any)=>s+Number(c.difference),0).toFixed(0)} {curr}</td>
                  <td/><td/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {history && (
        <Suspense fallback={null}><EditHistoryDialog orgId={sessionStorage.getItem('s_org_id')||''} kind="closing" id={history.id}
          title={`إقفال ${history.staff_name||''} · ${history.closing_date}`} onClose={()=>setHistory(null)} onReverted={()=>load()}/></Suspense>
      )}
      {editing && (
        <Suspense fallback={null}><CashierClosingEditor orgId={sessionStorage.getItem('s_org_id')||''} closing={editing} curr={curr} onClose={()=>setEditing(null)}
          onSaved={()=>{ setEditing(null); load() }}/></Suspense>
      )}
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,.4)',backdropFilter:'blur(6px)'}} onClick={()=>{if(!deleting){setConfirmDelete(null);setDeletePassword('');setDeleteError('')}}}/>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:360,position:'relative',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
            <div style={{width:48,height:48,borderRadius:12,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',color:'#dc2626'}}><Lock size={22} strokeWidth={2}/></div>
            <div style={{fontSize:15,fontWeight:800,color:colors.text,textAlign:'center',marginBottom:6}}>تأكيد حذف تقرير الإقفال</div>
            <div style={{fontSize:12,color:colors.text3,textAlign:'center',lineHeight:1.7,marginBottom:16}}>
              سيتم حذف إقفال <b style={{color:colors.text}}>{confirmDelete.staff_name}</b> بتاريخ {confirmDelete?.closing_date ? new Date(confirmDelete.closing_date).toLocaleDateString('ar-SA', {numberingSystem:'latn'}) : ''} نهائياً.<br/>أدخل كلمة مرور حسابك للتأكيد
            </div>
            <div style={{marginBottom:10}}><Suspense fallback={null}><PasswordBox value={deletePassword} onChange={setDeletePassword} onEnter={()=>{ if(!deleting) confirmDeleteClosing() }}/></Suspense></div>
            {deleteError && <div style={{fontSize:12,color:'#dc2626',fontWeight:600,marginBottom:10,textAlign:'center' as const,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><AlertTriangle size={13} strokeWidth={2.25}/> {deleteError}</div>}
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
