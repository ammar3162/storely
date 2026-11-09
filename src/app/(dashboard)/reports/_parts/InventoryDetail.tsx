'use client'
import { useState, useEffect } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Download, ClipboardList } from 'lucide-react'
import { colors, font, card, btnPrimary, btnSecondary, inp, tag } from '@/lib/ds'
import { ListSkeleton } from '@/components/PageSkeleton'
import { pdfOrgInfo, reportData, getRange, formatRange, BackBtn, PeriodBadge } from './shared'
import type { FilterPeriod } from './shared'

export default function InventoryDetail({ period, from, to, onBack, filterBar }: { period:FilterPeriod; from:string; to:string; onBack:()=>void; filterBar?: React.ReactNode }) {
  const [products, setProducts] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<'all'|'low'|'out'>('all')
  const [exportingPdf, setExportingPdf] = useState(false)

  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null, ['products','stock_movements'], ()=>load())
  useEffect(()=>{ load() },[period,from,to])

  async function load() {
    setLoading(true)
    const orgId=sessionStorage.getItem('s_org_id'); if(!orgId){setLoading(false);return}
    const {start,end}=getRange(period,from,to)

    // الأصناف + حركات وفواتير الفترة
    const j=await reportData('inventory',start,end)
    const prods=j.products, mvs=j.movements, pus=j.purchases

    setProducts(prods||[])
    setMovements(mvs||[])
    setPurchases(pus||[])
    setLoading(false)
  }

  function exportCSV() {
    const csv='\ufeff'+[['الصنف','الفئة','الكمية المتبقية','الوحدة','الحد الأدنى','الحالة'],...filtered.map(p=>[p.name,p.category||'—',p.qty,p.unit,p.reorder_point,p.qty===0?'نفد':p.qty<=p.reorder_point?'ناقص':'كافٍ'])].map(r=>r.map((cc:any)=>'"'+cc+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'تقرير_الجرد.csv'}).click()
  }

  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      const orgId = sessionStorage.getItem('s_org_id')
      const { org, branchRow } = await pdfOrgInfo()
      const orgDisplayName = ((org as any)?.name || 'Storely') + ((branchRow as any)?.name ? ' — فرع ' + (branchRow as any).name : '')
      const { exportReportPdf } = await import('@/lib/pdfExport')
      await exportReportPdf({
        title: 'تقرير الجرد اليومي',
        subtitle: formatRange(period, from, to),
        orgName: orgDisplayName,
        logoUrl: '/storely-logo.png',
        columns: [
          { header: 'الصنف', key: 'name' },
          { header: 'الفئة', key: 'category' },
          { header: 'المتبقي', key: 'qty', align: 'left' },
          { header: 'الحالة', key: 'status' },
        ],
        rows: filtered.map((p:any) => ({
          name: p.name || '—',
          category: p.category || '—',
          qty: p.qty + ' ' + (p.unit || ''),
          status: p.qty===0 ? 'نفد' : p.qty<=p.reorder_point ? 'ناقص' : 'كافٍ',
        })),
        summaryStats: [
          { label: 'إجمالي الأصناف', value: String(products.length), color:'#7c3aed' },
          { label: 'مخزون ناقص', value: String(lowCount), color: colors.warning },
          { label: 'نفد المخزون', value: String(outCount), color: colors.danger },
        ],
        fileName: `تقرير-الجرد-${new Date().toISOString().slice(0,10)}.pdf`,
      })
    } catch { alert('تعذر تصدير التقرير') }
    setExportingPdf(false)
  }

  // dispensed map
  const dispensedMap:Record<string,number>={}
  movements.filter(m=>m.type==='out').forEach(m=>{const n=(m.products as any)?.name||'—';dispensedMap[n]=(dispensedMap[n]||0)+Math.abs(m.qty_change)})

  const purchasedMap:Record<string,number>={}
  movements.filter(m=>m.type==='in').forEach(m=>{const n=(m.products as any)?.name||'—';purchasedMap[n]=(purchasedMap[n]||0)+Math.abs(m.qty_change)})

  const router = useRouter()
  const transferOutMap:Record<string,number>={}
  movements.filter(m=>m.type==='transfer_out').forEach(m=>{const n=(m.products as any)?.name||'—';transferOutMap[n]=(transferOutMap[n]||0)+Math.abs(m.qty_change)})

  const transferInMap:Record<string,number>={}
  movements.filter(m=>m.type==='transfer_in').forEach(m=>{const n=(m.products as any)?.name||'—';transferInMap[n]=(transferInMap[n]||0)+Math.abs(m.qty_change)})

  const filtered=products
    .filter(p=>!search||p.name?.includes(search)||p.category?.includes(search))
    .filter(p=>filter==='all'||(filter==='out'?p.qty===0:p.qty<=p.reorder_point))

  const lowCount=products.filter(p=>p.qty>0&&p.qty<=p.reorder_point).length
  const outCount=products.filter(p=>p.qty===0).length
  const totalDispensed=Object.values(dispensedMap).reduce((s,v)=>s+v,0)
  const totalPurchased=Object.values(purchasedMap).reduce((s,v)=>s+v,0)
  const totalTransferredOut=Object.values(transferOutMap).reduce((s,v)=>s+v,0)
  const totalTransferredIn=Object.values(transferInMap).reduce((s,v)=>s+v,0)

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
      <div style={{display:'grid',gridTemplateColumns:(totalTransferredOut+totalTransferredIn)>0?'repeat(5,1fr)':'repeat(4,1fr)',gap:10,marginBottom:16,marginTop:12}}>
        {[
          {label:'إجمالي الأصناف',value:products.length,color:'#7c3aed',bg:'#f5f3ff',border:'#ddd6fe',clickable:false},
          {label:'وحدات مصروفة',value:totalDispensed,color:colors.danger,bg:colors.dangerLight,border:colors.dangerBorder,clickable:false},
          {label:'وحدات مشتراة',value:totalPurchased,color:colors.primary,bg:colors.primaryLight,border:colors.primaryBorder,clickable:false},
          {label:'أصناف ناقصة',value:lowCount+outCount,color:colors.warning,bg:colors.warningLight,border:colors.warningBorder,clickable:false},
          ...((totalTransferredOut+totalTransferredIn)>0?[{label:'نقل بين الفروع (صادر/وارد) — التفاصيل ←',value:`${totalTransferredOut}/${totalTransferredIn}`,color:colors.info,bg:colors.infoLight,border:colors.infoBorder,clickable:true}]:[]),
        ].map((s,i)=>(
          <div key={i} onClick={()=>{if((s as any).clickable) router.push('/transfer-stock')}}
            style={{...card,padding:'14px',textAlign:'center' as const,background:s.bg,border:`1.5px solid ${s.border}`,cursor:(s as any).clickable?'pointer':'default'}}>
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
          <button onClick={exportCSV} style={{...btnPrimary,padding:'9px 14px',fontSize:font.xs,display:'inline-flex',alignItems:'center',gap:6}}><Download size={13} strokeWidth={2.25}/> تصدير</button>
        </div>
        {loading?(<ListSkeleton/>
        ):filtered.length===0?(<div style={{padding:56,textAlign:'center'}}><div style={{marginBottom:10,display:'flex',justifyContent:'center',color:colors.text4}}><ClipboardList size={40} strokeWidth={1.5}/></div><div style={{fontSize:font.base,fontWeight:700,color:colors.text2}}>لا توجد نتائج</div></div>
        ):(
          <div style={{overflowX:'auto'}}>
            <table className="m-cards" style={{width:'100%',borderCollapse:'collapse' as const,minWidth:600}}>
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
                      <td data-label="الفئة" style={{padding:'11px 14px',fontSize:font.xs,color:colors.text3}}>{p.category||'—'}</td>
                      <td data-label="مصروف" style={{padding:'11px 14px'}}>{dispensed>0?<span style={{...tag(colors.danger,colors.dangerLight,colors.dangerBorder)}}>▼ {dispensed}</span>:<span style={{color:colors.text4}}>—</span>}</td>
                      <td data-label="مشترى" style={{padding:'11px 14px'}}>{purchased>0?<span style={{...tag(colors.primary,colors.primaryLight,colors.primaryBorder)}}>▲ {purchased}</span>:<span style={{color:colors.text4}}>—</span>}</td>
                      <td data-label="المتبقي" style={{padding:'11px 14px',fontWeight:900,fontSize:18,color:statusColor}}>{p.qty} <span style={{fontSize:font.xs,fontWeight:400,color:colors.text4}}>{p.unit}</span></td>
                      <td data-label="الحالة" style={{padding:'11px 14px'}}><span style={{...tag(statusColor,isOut?colors.dangerLight:isLow?colors.warningLight:colors.primaryLight,isOut?colors.dangerBorder:isLow?colors.warningBorder:colors.primaryBorder)}}>{statusLabel}</span></td>
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
