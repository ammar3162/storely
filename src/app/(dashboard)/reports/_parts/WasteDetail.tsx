'use client'
import { useState, useEffect } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { FileText, Inbox, Loader2, Trash2 } from 'lucide-react'
import { getOrgId } from '@/lib/session'
import { colors, font, card, btnPrimary, btnSecondary, inp, tag } from '@/lib/ds'
import { ListSkeleton } from '@/components/PageSkeleton'
import { pdfOrgInfo, reportData, getRange, formatRange, BackBtn, PeriodBadge } from './shared'
import type { FilterPeriod } from './shared'

export default function WasteDetail({ period, from, to, onBack, filterBar }: { period:FilterPeriod; from:string; to:string; onBack:()=>void; filterBar?: React.ReactNode }) {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [exportingPdf, setExportingPdf] = useState(false)
  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null, ['stock_movements'], ()=>load())
  useEffect(()=>{ load() },[period,from,to])
  async function load() {
    setLoading(true)
    const orgId=await getOrgId()
    if(!orgId){setLoading(false);return}
    const{start,end}=getRange(period,from,to)
    const j=await reportData('movements',start,end,{movement_type:'waste'})
    const data=j.movements
    setMovements(data||[]); setLoading(false)
  }
  function exportCSV(){
    const csv='\ufeff'+[['التاريخ','المنتج','الكمية','الوحدة','السبب','الموظف','الملاحظة'],...filtered.map(m=>[new Date(m.created_at).toLocaleDateString('en-GB'),(m.products as any)?.name||'',Math.abs(m.qty_change),(m.products as any)?.unit||'',(m as any).waste_reason||'',(m.profiles as any)?.full_name||(m.staff_members as any)?.name||(m.note?.match(/بواسطة[^:]*:\s*(.+)/)?.[1])||'—',m.note||''])].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_الهدر.csv'}).click()
  }
  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      const orgId = sessionStorage.getItem('s_org_id')
      const { org, branchRow } = await pdfOrgInfo()
      const orgDisplayName = ((org as any)?.name || 'Storely') + ((branchRow as any)?.name ? ' — فرع ' + (branchRow as any).name : '')
      const { exportReportPdf } = await import('@/lib/pdfExport')
      await exportReportPdf({
        title: 'تقرير الهدر',
        subtitle: formatRange(period, from, to),
        orgName: orgDisplayName,
        logoUrl: '/storely-logo.png',
        columns: [
          { header: 'التاريخ', key: 'date' },
          { header: 'المنتج', key: 'product' },
          { header: 'الكمية', key: 'qty', align: 'left' },
          { header: 'السبب', key: 'reason' },
          { header: 'الموظف', key: 'staff' },
        ],
        rows: filtered.map((m:any) => ({
          date: new Date(m.created_at).toLocaleDateString('ar-SA-u-ca-gregory', {numberingSystem:'latn'}),
          product: (m.products as any)?.name || '—',
          qty: Math.abs(m.qty_change) + ' ' + ((m.products as any)?.unit || ''),
          reason: (m as any).waste_reason || '—',
          staff: (m.profiles as any)?.full_name || (m.staff_members as any)?.name || (m.note?.match(/بواسطة[^:]*:\s*(.+)/)?.[1]) || '—',
        })),
        summaryStats: [
          { label: 'كميات مهدورة', value: String(totalQty), color: colors.danger },
          { label: 'عمليات الهدر', value: String(filtered.length), color: colors.info },
          { label: 'أصناف مختلفة', value: String(Object.keys(productMap).length), color:'#7c3aed' },
        ],
        fileName: `تقرير-الهدر-${new Date().toISOString().slice(0,10)}.pdf`,
      })
    } catch { alert('تعذر تصدير التقرير') }
    setExportingPdf(false)
  }
  const filtered=movements.filter(m=>!search||(m.products as any)?.name?.includes(search)||m.note?.includes(search)||(m as any).waste_reason?.includes(search))
  const totalQty=filtered.reduce((s,m)=>s+Math.abs(m.qty_change),0)
  const productMap:Record<string,number>={}
  filtered.forEach(m=>{const n=(m.products as any)?.name||'—';productMap[n]=(productMap[n]||0)+Math.abs(m.qty_change)})
  const topProducts=Object.entries(productMap).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const reasonMap:Record<string,number>={}
  filtered.forEach(m=>{const r=(m as any).waste_reason||'أخرى';reasonMap[r]=(reasonMap[r]||0)+Math.abs(m.qty_change)})
  const barColors=[colors.primary,colors.info,'#8b5cf6',colors.warning,colors.danger]
  return (
    <div>
      <BackBtn onClick={onBack}/>
      {filterBar}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap' as const,gap:8}}>
        <PeriodBadge period={period} from={from} to={to}/>
        <button onClick={handleExportPdf} disabled={exportingPdf || filtered.length===0}
          style={{...btnSecondary,padding:'8px 16px',fontSize:font.xs,opacity:exportingPdf||filtered.length===0?0.6:1,cursor:exportingPdf||filtered.length===0?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:6}}>
          {exportingPdf?<span style={{display:'inline-flex',alignItems:'center',gap:6}}><Loader2 size={14} strokeWidth={2.25} className="spin-icon"/> جاري التصدير...</span>:<span style={{display:'inline-flex',alignItems:'center',gap:6}}><FileText size={14} strokeWidth={2.25}/> تصدير PDF</span>}
        </button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16,marginTop:12}}>
        {[
          {label:'كميات مهدورة',value:totalQty,color:colors.danger,bg:colors.dangerLight,border:colors.dangerBorder},
          {label:'عمليات الهدر',value:filtered.length,color:colors.info,bg:colors.infoLight,border:colors.infoBorder},
          {label:'أصناف مختلفة',value:Object.keys(productMap).length,color:'#7c3aed',bg:'#f5f3ff',border:'#ddd6fe'},
        ].map((s,i)=>(
          <div key={i} style={{...card,padding:'16px',textAlign:'center' as const,background:s.bg,border:`1.5px solid ${s.border}`}}>
            <div style={{fontSize:28,fontWeight:900,color:s.color,letterSpacing:'-1px'}}>{s.value}</div>
            <div style={{fontSize:font.xs,color:s.color,marginTop:4,fontWeight:700,opacity:.8}}>{s.label}</div>
          </div>
        ))}
      </div>
      {Object.keys(reasonMap).length>0&&(
        <div style={{...card,padding:'16px 18px',marginBottom:16}}>
          <div style={{fontSize:font.base,fontWeight:800,color:colors.text,marginBottom:14,display:'flex',alignItems:'center',gap:6}}><Trash2 size={16} strokeWidth={2.25}/> الهدر حسب السبب</div>
          {Object.entries(reasonMap).sort((a,b)=>b[1]-a[1]).map(([reason,qty],i)=>{
            const maxV = Math.max(...Object.values(reasonMap),1)
            const pct=Math.round((qty/maxV)*100)
            return(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<Object.keys(reasonMap).length-1?12:0}}>
                <div style={{width:26,height:26,borderRadius:8,background:barColors[i%barColors.length]+'22',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${barColors[i%barColors.length]}44`}}>
                  <span style={{fontSize:11,fontWeight:900,color:barColors[i%barColors.length]}}>{i+1}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{reason}</span>
                    <span style={{fontSize:font.sm,fontWeight:900,color:barColors[i%barColors.length]}}>{qty}</span>
                  </div>
                  <div style={{height:5,background:colors.border,borderRadius:99}}>
                    <div style={{height:'100%',width:pct+'%',background:barColors[i%barColors.length],borderRadius:99,transition:'width .6s'}}/>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{...card,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${colors.border}`,display:'flex',gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالمنتج أو السبب أو الملاحظة..." style={{...inp(),flex:1}}/>
          <button onClick={exportCSV} style={{...btnPrimary,padding:'9px 14px',fontSize:font.xs,display:'flex',alignItems:'center',gap:6}}>
            <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            تصدير
          </button>
        </div>
        {loading?(<ListSkeleton/>
        ):filtered.length===0?(<div style={{padding:56,textAlign:'center'}}><div style={{marginBottom:10,display:'flex',justifyContent:'center',color:colors.text4}}><Inbox size={40} strokeWidth={1.5}/></div><div style={{fontSize:font.base,fontWeight:700,color:colors.text2}}>لا توجد نتائج</div></div>
        ):(
          <>
          <div style={{overflowX:'auto'}}>
            <table className="m-cards" style={{width:'100%',borderCollapse:'collapse' as const,minWidth:400}}>
              <thead>
                <tr style={{background:colors.bg,borderBottom:`1.5px solid ${colors.border}`}}>
                  {['التاريخ','المنتج','الكمية','السبب','الموظف','الملاحظة'].map((h,i)=>(
                    <th key={i} style={{padding:'10px 16px',color:colors.text4,fontSize:font.xs,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m,i)=>(
                  <tr key={m.id} style={{borderBottom:`1px solid ${colors.border}`,background:i%2===0?colors.surface:colors.bg}}>
                    <td style={{padding:'11px 16px',fontSize:font.xs,color:colors.text3,whiteSpace:'nowrap' as const}}>{new Date(m.created_at).toLocaleDateString('ar-SA-u-ca-gregory', {numberingSystem:'latn',month:'short',day:'numeric'})}</td>
                    <td data-label="المنتج" style={{padding:'11px 16px',fontSize:font.sm,fontWeight:700,color:colors.text}}>{(m.products as any)?.name}</td>
                    <td data-label="الكمية" style={{padding:'11px 16px'}}><span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder),fontWeight:900}}>▼ {Math.abs(m.qty_change)} {(m.products as any)?.unit}</span></td>
                    <td data-label="السبب" style={{padding:'11px 16px'}}><span style={{display:'inline-flex',alignItems:'center',gap:5,background:'#fffbeb',color:'#b45309',fontSize:font.xs,fontWeight:700,padding:'3px 8px',borderRadius:99,border:'1px solid #fde68a'}}>
{(m as any).waste_reason||'—'}
</span></td>
                    <td data-label="الموظف" style={{padding:'11px 16px'}}><span style={{display:'inline-flex',alignItems:'center',gap:5,background:'var(--storely-background)',color:'#203640',fontSize:font.xs,fontWeight:700,padding:'3px 8px',borderRadius:99,border:'1px solid var(--storely-border)'}}>
{(m.profiles as any)?.full_name||(m.staff_members as any)?.name||(m.note?.match(/بواسطة[^:]*:\s*(.+)/)?.[1])||'—'}
</span></td>
                    <td data-label="الملاحظة" style={{padding:'11px 16px',fontSize:font.xs,color:colors.text4}}>
                      {m.note?.replace(/هدر: .+/, '').trim() || m.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{padding:'12px 16px',background:colors.dangerLight,borderTop:`1.5px solid ${colors.dangerBorder}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:font.sm,fontWeight:700,color:colors.danger}}>{filtered.length} عملية</span>
            <span style={{fontSize:font.base,fontWeight:900,color:colors.danger}}>{totalQty} وحدة مهدورة</span>
          </div>
          </>
        )}
      </div>
    </div>
  )
}
