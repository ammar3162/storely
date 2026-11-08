'use client'
import { useState, useEffect } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { currencySymbol } from '@/lib/currencySymbol'
import { FileText, Loader2, Paperclip, Trash2, PartyPopper, Lock, AlertTriangle, Receipt } from 'lucide-react'
import { cache } from '@/lib/cache'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { colors, font, card, btnPrimary, btnSecondary, inp, tag } from '@/lib/ds'
import { toast } from '@/components/toast'
import { ListSkeleton } from '@/components/PageSkeleton'
import { pdfOrgInfo, reportData, getRange, formatRange, BackBtn, PeriodBadge } from './shared'
import type { FilterPeriod } from './shared'
import { fileLink } from '@/lib/invoiceUrl'

export default function PurchaseDetail({ period, from, to, onBack }: { period:FilterPeriod; from:string; to:string; onBack:()=>void }) {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<any|null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [curr, setCurr] = useState('⃁')
  const [showDeletedLog, setShowDeletedLog] = useState(false)
  const [deletedList, setDeletedList] = useState<any[]>([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [restoringId, setRestoringId] = useState<string|null>(null)
  const sb = createClient()
  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null, ['purchases'], ()=>load())
  useEffect(()=>{ load() },[period,from,to])

  async function loadDeletedLog() {
    const orgId=sessionStorage.getItem('s_org_id'); if(!orgId) return
    setLoadingDeleted(true)
    const j=await api.get('/api/reports',{org_id:orgId,type:'deleted_purchases'})
    setDeletedList(j.deleted||[])
    setLoadingDeleted(false)
  }

  function relativeTime(iso:string) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs/60000)
    if(mins<1) return 'الآن'
    if(mins<60) return `قبل ${mins} دقيقة`
    const hrs = Math.floor(mins/60)
    if(hrs<24) return `قبل ${hrs} ساعة`
    const days = Math.floor(hrs/24)
    if(days<30) return `قبل ${days} يوم`
    return new Date(iso).toLocaleDateString('ar-SA', {numberingSystem:'latn'})
  }

  async function restorePurchase(item:any) {
    setRestoringId(item.id)
    // الخادم يرجّع الكمية للمخزون (لو فاتورة مخزون) ويلغي الحذف
    const r=await api.post('/api/purchases/restore',{org_id:sessionStorage.getItem('s_org_id'),id:item.id,branch_id:sessionStorage.getItem('s_branch_id')})
    setRestoringId(null)
    if(!r.success){ toast('فشلت الاستعادة — حاول مرة أخرى','error'); return }
    toast('↩️ تمت استعادة الفاتورة')
    setDeletedList(prev=>prev.filter(d=>d.id!==item.id))
    load()
  }
  useEffect(()=>{
    getMe().then(me=>{ if(me?.org?.currency) setCurr(currencySymbol(me.org.currency)) })
  },[])

  async function confirmDeletePurchase() {
    setDeleteError(''); setDeleting(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user?.email) { setDeleteError('تعذر التحقق من الحساب'); setDeleting(false); return }
    const { error } = await sb.auth.signInWithPassword({ email: user.email, password: deletePassword })
    if (error) { setDeleteError('كلمة المرور غير صحيحة'); setDeleting(false); return }

    // الخادم يطرح كمية الفاتورة من المخزون (لو فاتورة مخزون) ثم يحذفها حذف ناعم
    const delRes=await api.del('/api/purchases',{org_id:sessionStorage.getItem('s_org_id'),id:confirmDelete.id})
    if(!delRes.success){setDeleteError('فشل الحذف — حاول مرة أخرى');setDeleting(false);return}
    setPurchases(prev => prev.filter(p => p.id !== confirmDelete.id))
    setConfirmDelete(null); setDeletePassword(''); setDeleting(false)
  }
  async function load() {
    setLoading(true)
    const orgId=sessionStorage.getItem('s_org_id'); if(!orgId){setLoading(false);return}
    const{start,end}=getRange(period,from,to)
    const j=await reportData('purchases',start,end)
    const data=j.purchases
    setPurchases(data||[]); setLoading(false)
    if(orgId) cache.set('report_purchases:'+orgId, data||[])
  }
  function exportCSV(){
    const csv='\ufeff'+[['التاريخ','الصنف','النوع','بدون ضريبة','الضريبة','الإجمالي','المورد'],...filtered.map(p=>[new Date(p.created_at).toLocaleDateString('en-GB'),p.name||'',p.category||'',Number(p.amount||0).toFixed(2),Number(p.vat_amount||0).toFixed(2),Number(p.total_amount||0).toFixed(2),p.supplier||''])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_المشتريات.csv'}).click()
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
        title: 'تقرير المشتريات',
        subtitle: formatRange(period, from, to),
        orgName: orgDisplayName,
        logoUrl: '/storely-logo.png',
        columns: [
          { header: 'التاريخ', key: 'date' },
          { header: 'الصنف', key: 'name' },
          { header: 'النوع', key: 'category' },
          { header: 'بدون ضريبة', key: 'amount', align: 'left' },
          { header: 'ضريبة', key: 'vat', align: 'left' },
          { header: 'الإجمالي', key: 'total', align: 'left' },
          { header: 'المورد', key: 'supplier' },
          { header: 'فاتورة', key: 'invoice' },
        ],
        rows: filtered.map((p:any) => ({
          date: new Date(p.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn'}),
          name: p.name || '—',
          category: p.category || '—',
          amount: Number(p.amount || 0).toFixed(2) + ' ' + curr,
          vat: Number(p.vat_amount || 0).toFixed(2) + ' ' + curr,
          total: Number(p.total_amount || 0).toFixed(2) + ' ' + curr,
          supplier: p.supplier || '—',
          invoice: p.invoice_image ? 'مرفقة' : 'غير مرفقة',
        })),
        summaryStats: [
          { label: 'بدون ضريبة', value: totalAmount.toFixed(0) + ' ' + curr, color: colors.text2 },
          { label: 'ضريبة 15%', value: totalVat.toFixed(0) + ' ' + curr, color: colors.warning },
          { label: 'الإجمالي', value: totalWithVat.toFixed(0) + ' ' + curr, color: colors.primary },
        ],
        totalsRow: {
          date: '',
          name: `الإجمالي (${filtered.length} فاتورة)`,
          category: '',
          amount: totalAmount.toFixed(2) + ' ' + curr,
          vat: totalVat.toFixed(2) + ' ' + curr,
          total: totalWithVat.toFixed(2) + ' ' + curr,
          supplier: '',
          invoice: '',
        },
        fileName: `تقرير-المشتريات-${new Date().toISOString().slice(0,10)}.pdf`,
      })
    } catch { alert('تعذر تصدير التقرير') }
    setExportingPdf(false)
  }
  const filtered=purchases.filter(p=>(!search||p.name?.includes(search)||p.supplier?.includes(search))&&(!filterCat||p.category===filterCat))
  const totalAmount=filtered.reduce((s,p)=>s+Number(p.amount||0),0)
  const totalVat=filtered.reduce((s,p)=>s+Number(p.vat_amount||0),0)
  const totalWithVat=filtered.reduce((s,p)=>s+Number(p.total_amount||0),0)
  const catTag=(c:string)=>c==='مخزون'?tag(colors.primary,colors.primaryLight,colors.primaryBorder):c==='مشتريات'?tag(colors.info,colors.infoLight,colors.infoBorder):tag(colors.text3,colors.bg,colors.border2)
  return (
    <div>
      <BackBtn onClick={onBack}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap' as const,gap:8}}>
        <PeriodBadge period={period} from={from} to={to}/>
        <button onClick={handleExportPdf} disabled={exportingPdf || filtered.length===0}
          style={{...btnSecondary,padding:'8px 16px',fontSize:font.xs,opacity:exportingPdf||filtered.length===0?0.6:1,cursor:exportingPdf||filtered.length===0?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:6}}>
          {exportingPdf?<span style={{display:'inline-flex',alignItems:'center',gap:6}}><Loader2 size={14} strokeWidth={2.25} className="spin-icon"/> جاري التصدير...</span>:<span style={{display:'inline-flex',alignItems:'center',gap:6}}><FileText size={14} strokeWidth={2.25}/> تصدير PDF</span>}
        </button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:16,marginTop:12}}>
        {[
          {label:'بدون ضريبة',value:totalAmount.toFixed(0)+' '+curr,color:colors.text2,bg:colors.bg,border:colors.border2},
          {label:'ضريبة 15%',value:totalVat.toFixed(0)+' '+curr,color:colors.warning,bg:colors.warningLight,border:colors.warningBorder},
          {label:'الإجمالي',value:totalWithVat.toFixed(0)+' '+curr,color:colors.primary,bg:colors.primaryLight,border:colors.primaryBorder},
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
        {loading?(<ListSkeleton/>
        ):filtered.length===0?(<div style={{padding:56,textAlign:'center'}}><div style={{marginBottom:10,display:'flex',justifyContent:'center',color:colors.text4}}><Receipt size={40} strokeWidth={1.5}/></div><div style={{fontSize:font.base,fontWeight:700,color:colors.text2}}>لا توجد نتائج</div></div>
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
                    <td style={{padding:'11px 12px',fontSize:font.xs,color:colors.text3,whiteSpace:'nowrap' as const}}>{new Date(p.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn',month:'short',day:'numeric'})}</td>
                    <td style={{padding:'11px 12px',fontSize:font.sm,fontWeight:700,color:colors.text,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.name}</td>
                    <td style={{padding:'11px 12px'}}><span style={catTag(p.category)}>{p.category}</span></td>
                    <td style={{padding:'11px 12px',fontSize:font.sm}}>{Number(p.amount||0).toFixed(0)} {curr}</td>
                    <td style={{padding:'11px 12px',fontSize:font.sm,color:colors.warning,fontWeight:600}}>{Number(p.vat_amount||0).toFixed(0)} {curr}</td>
                    <td style={{padding:'11px 12px',fontSize:font.sm,fontWeight:700,color:colors.primary}}>{Number(p.total_amount||0).toFixed(0)} {curr}</td>
                    <td style={{padding:'11px 12px',fontSize:font.xs,color:colors.text4,maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.supplier||'—'}</td>
                    <td style={{padding:'11px 12px',textAlign:'center' as const}}>
                      {p.invoice_image
                        ? <a href={fileLink(p.invoice_image)} target="_blank" rel="noreferrer" style={{background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',borderRadius:6,padding:'3px 10px',fontSize:11,fontWeight:700,textDecoration:'none',whiteSpace:'nowrap' as const,display:'inline-flex',alignItems:'center',gap:4}}><Paperclip size={11} strokeWidth={2.25}/> عرض</a>
                        : <span style={{color:colors.border2}}>—</span>}
                    </td>
                    <td style={{padding:'11px 12px',textAlign:'center' as const}}>
                      <button onClick={()=>{setConfirmDelete(p);setDeletePassword('');setDeleteError('')}}
                        style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        <Trash2 size={12} strokeWidth={2.25} style={{display:'inline',verticalAlign:'-2px',marginLeft:4}}/> حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:colors.primaryLight,borderTop:`2px solid ${colors.primaryBorder}`}}>
                  <td colSpan={3} style={{padding:'11px 12px',fontWeight:800,fontSize:font.sm,color:colors.text}}>الإجمالي ({filtered.length} فاتورة)</td>
                  <td style={{padding:'11px 12px',fontWeight:700,fontSize:font.sm}}>{totalAmount.toFixed(0)} {curr}</td>
                  <td style={{padding:'11px 12px',fontWeight:700,fontSize:font.sm,color:colors.warning}}>{totalVat.toFixed(0)} {curr}</td>
                  <td style={{padding:'11px 12px',fontWeight:900,fontSize:font.md,color:colors.primary}}>{totalWithVat.toFixed(0)} {curr}</td>
                  <td/><td/><td/>
                </tr>
              </tfoot>
            </table>
          </div>
          </>
        )}
      </div>

      {/* سجل الفواتير المحذوفة — تدقيق واسترجاع */}
      <div style={{marginTop:20,background:'white',borderRadius:14,border:`1px solid ${colors.border2}`,overflow:'hidden'}}>
        <button type="button" onClick={()=>{ if(!showDeletedLog) loadDeletedLog(); setShowDeletedLog(v=>!v) }}
          style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{display:'flex',alignItems:'center'}}><Trash2 size={16} strokeWidth={2.25}/></span>
            <span style={{fontSize:13,fontWeight:700,color:colors.text}}>سجل الفواتير المحذوفة</span>
          </div>
          <span style={{fontSize:12,color:colors.text3}}>{showDeletedLog?'إخفاء ▲':'عرض ▼'}</span>
        </button>
        {showDeletedLog && (
          <div style={{borderTop:`1px solid ${colors.border2}`,padding:'12px 18px 18px'}}>
            {loadingDeleted ? (
              <ListSkeleton/>
            ) : deletedList.length===0 ? (
              <div style={{textAlign:'center' as const,padding:20,fontSize:12,color:colors.text4,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><PartyPopper size={14} strokeWidth={2.25}/> لا توجد فواتير محذوفة</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                {deletedList.map((d:any)=>(
                  <div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fef2f2',border:'1px solid #fecaca',borderRight:'3px solid #dc2626',borderRadius:9,padding:'10px 14px'}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:colors.text}}>{d.name}
                        <span style={{fontSize:10,fontWeight:600,color:colors.text4,marginRight:6}}>({d.category||'—'})</span>
                      </div>
                      <div style={{fontSize:10,color:'#991b1b',marginTop:2}}>
                        {Number(d.total_amount||0).toFixed(0)} {curr} — حُذفت {relativeTime(d.deleted_at)} بواسطة {d.deleterName}
                      </div>
                    </div>
                    <button onClick={()=>restorePurchase(d)} disabled={restoringId===d.id}
                      style={{padding:'6px 14px',background:'white',color:'#203640',border:'1.5px solid var(--storely-border)',borderRadius:8,fontSize:11,fontWeight:700,cursor:restoringId===d.id?'not-allowed':'pointer',fontFamily:'inherit',opacity:restoringId===d.id?.6:1,whiteSpace:'nowrap' as const}}>
                      {restoringId===d.id?'...':'↩️ استعادة'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,.4)',backdropFilter:'blur(6px)'}} onClick={()=>{if(!deleting){setConfirmDelete(null);setDeletePassword('');setDeleteError('')}}}/>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:360,position:'relative',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
            <div style={{width:48,height:48,borderRadius:12,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',color:'#dc2626'}}><Lock size={22} strokeWidth={2}/></div>
            <div style={{fontSize:15,fontWeight:800,color:colors.text,textAlign:'center',marginBottom:6}}>تأكيد حذف العملية</div>
            <div style={{fontSize:12,color:colors.text3,textAlign:'center',lineHeight:1.7,marginBottom:16}}>
              سيتم حذف <b style={{color:colors.text}}>{confirmDelete.name}</b> ({Number(confirmDelete.total_amount||0).toFixed(0)} {curr}) من السجل الحالي (يمكنك استرجاعها لاحقاً من "سجل المحذوفات").<br/>أدخل كلمة مرور حسابك للتأكيد
            </div>
            <input type="password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&deletePassword&&!deleting) confirmDeletePurchase()}}
              placeholder="كلمة المرور" autoFocus
              style={{...inp(),width:'100%',marginBottom:10,boxSizing:'border-box' as const}}/>
            {deleteError && <div style={{fontSize:12,color:'#dc2626',fontWeight:600,marginBottom:10,textAlign:'center' as const,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><AlertTriangle size={13} strokeWidth={2.25}/> {deleteError}</div>}
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
