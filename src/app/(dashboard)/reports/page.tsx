'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense, lazy } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import PageIcon from '@/components/PageIcon'
import { currencySymbol } from '@/lib/currencySymbol'
import { CalendarDays, Trash2, BarChart3, Upload, Receipt, ClipboardList, Wallet, Flame } from 'lucide-react'
import { getMe } from '@/lib/session'
import { colors, font, card, pageTitle, pageSub } from '@/lib/ds'
import { ListSkeleton } from '@/components/PageSkeleton'
import { reportData, getRange, FilterBar, ReportCard } from './_parts/shared'
import type { FilterPeriod } from './_parts/shared'
import DispenseDetail from './_parts/DispenseDetail'
import WasteDetail from './_parts/WasteDetail'
import PurchaseDetail from './_parts/PurchaseDetail'
import InventoryDetail from './_parts/InventoryDetail'
import RecentOpsSection from './_parts/RecentOpsSection'
import AttendanceDetail from './_parts/AttendanceDetail'
import CashierClosingDetail from './_parts/CashierClosingDetail'

const StaffMonthlyDetail = lazy(() => import('@/components/reports/StaffMonthlyReport'))

export default function ReportsPage() {
  const orgPlan = typeof window!=='undefined' ? (sessionStorage.getItem('s_plan')||'basic') : 'basic'
  // تبويب الكاشير: الشاملة/المتقدمة أو إضافة «إقفال الكاشير»
  const [hasCashier, setHasCashier] = useState(orgPlan!=='basic')
  const [view, setView]           = useState<'home'|'dispense'|'purchase'|'inventory'|'cashier'|'waste'|'attendance'|'staffMonthly'>('home')
  const [period, setPeriod]       = useState<FilterPeriod>('today')
  const [from, setFrom]           = useState('')
  const [to, setTo]               = useState('')
  const [dispenseStats, setDS]    = useState({ops:0,qty:0,items:0})
  const [wasteStats, setWS]       = useState({ops:0,qty:0,items:0})
  const [purchaseStats, setPS]    = useState({invoices:0,total:0,vat:0})
  const [homeCurr, setHomeCurr]   = useState('⃁')
  const [statsLoading, setSL]     = useState(true)
  const [weeklyD, setWD]          = useState<number[]>([])
  const [inventoryStats, setIS]   = useState({low:0,out:0,total:0})
  const [weeklyP, setWP]          = useState<number[]>([])
  const [visible, setVisible]     = useState(false)
  const [recentOps, setRecentOps] = useState<any[]>([])
  const [cashierStats, setCS]     = useState({count:0,deficit:0,surplus:0})
  const [topMovements, setTopMovements] = useState<any[]>([])

  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null, ['stock_movements','purchases','cashier_closings','products'], ()=>loadStats())
  useEffect(()=>{ loadStats() },[period,from,to])

  async function loadStats() {
    setSL(true)
    const orgId=sessionStorage.getItem('s_org_id'); if(!orgId){setSL(false);return}
    getMe().then(me=>{ if(me?.org?.currency) setHomeCurr(currencySymbol(me.org.currency)); if(me?.org?.features) setHasCashier(!!me.org.features.cashier) })
    const{start,end}=getRange(period,from,to)
    const sum=await reportData('summary',start,end)
    if(!sum.success){setSL(false);return}
    const mv=sum.dispense, pu=sum.purchases, wv=sum.waste
    const wasteItems=new Set((wv||[]).map((m:any)=>m.products?.name)).size
    setWS({ops:(wv||[]).length,qty:(wv||[]).reduce((s:number,m:any)=>s+Math.abs(m.qty_change),0),items:wasteItems})
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
    const invData=sum.inventory||[]
    setIS({total:invData.length,low:invData.filter((p:any)=>p.qty>0&&p.qty<=p.reorder_point).length,out:invData.filter((p:any)=>p.qty===0).length})
    const closingsData=(sum.closings||[]) as any[]
    setCS({count:closingsData.length,deficit:closingsData.filter(c=>c.status==='deficit').length,surplus:closingsData.filter(c=>c.status==='surplus').length})
    setSL(false)
    // آخر العمليات
    setRecentOps(sum.recent||[])
    setTimeout(()=>setVisible(true),50)
  }

  if (view==='inventory') return (
    <div style={{fontFamily:font.family,direction:'rtl'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin-icon{animation:spin .8s linear infinite}`}</style>
      <h1 style={{...pageTitle,marginBottom:16}}><PageIcon/>تقرير الجرد اليومي</h1>
      <InventoryDetail period={period} from={from} to={to} onBack={()=>setView('home')}/>
    </div>
  )

  if (view==='dispense') return (
    <div style={{fontFamily:font.family,direction:'rtl'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h1 style={{...pageTitle,marginBottom:16}}><PageIcon/>تقرير الصرف</h1>
      <DispenseDetail period={period} from={from} to={to} onBack={()=>setView('home')}/>
    </div>
  )

  if (view==='purchase') return (
    <div style={{fontFamily:font.family,direction:'rtl'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h1 style={{...pageTitle,marginBottom:16}}><PageIcon/>تقرير المشتريات</h1>
      <PurchaseDetail period={period} from={from} to={to} onBack={()=>setView('home')}/>
    </div>
  )

  if (view==='staffMonthly') return (
    <div style={{fontFamily:font.family,direction:'rtl'}}>
      <Suspense fallback={<ListSkeleton/>}><StaffMonthlyDetail onBack={()=>setView('home')}/></Suspense>
    </div>
  )

  if (view==='attendance') return (
    <div style={{fontFamily:font.family,direction:'rtl'}}>
      <AttendanceDetail onBack={()=>setView('home')}/>
    </div>
  )

  if (view==='cashier' && !hasCashier) { setView('home'); return null }

  if (view==='cashier') return (
    <div style={{fontFamily:font.family,direction:'rtl'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h1 style={{...pageTitle,marginBottom:16}}><PageIcon/>إقفال الكاشير اليومي</h1>
      <CashierClosingDetail period={period} from={from} to={to} onBack={()=>setView('home')}/>
    </div>
  )

  if (view==='waste') return (
    <div style={{fontFamily:font.family,direction:'rtl'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h1 style={{...pageTitle,marginBottom:16}}><PageIcon/>تقرير الهدر</h1>
      <WasteDetail period={period} from={from} to={to} onBack={()=>setView('home')}/>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',opacity:visible?1:0,transition:'opacity .4s ease'}}>
      <style>{`
        @keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .su{animation:slideUp .4s ease both}
      `}</style>

      <div style={{marginBottom:20}} className="su">
        <h1 style={{...pageTitle}}><PageIcon/>التقارير</h1>
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
            icon={<Upload size={20} strokeWidth={1.75}/>}
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
            icon={<Receipt size={20} strokeWidth={1.75}/>}
            color={colors.primary}
            bg={colors.primaryLight}
            border={colors.primaryBorder}
            loading={statsLoading}
            chartData={weeklyP}
            stats={[
              {label:'عدد الفواتير',value:purchaseStats.invoices,color:colors.primary,highlight:true},
              {label:'إجمالي شامل',value:purchaseStats.total.toFixed(0)+' '+homeCurr,color:colors.primary},
              {label:'ضريبة القيمة',value:purchaseStats.vat.toFixed(0)+' '+homeCurr,color:colors.warning},
            ]}
            onClick={()=>setView('purchase')}
          />
        </div>
        <div className="su" style={{animationDelay:'.2s'}}>
          <ReportCard
            title="تقرير الجرد اليومي"
            subtitle="ملخص المخزون الحالي والأصناف الناقصة"
            icon={<ClipboardList size={20} strokeWidth={1.75}/>}
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
        {hasCashier && (
        <div className="su" style={{animationDelay:'.25s'}}>
          <ReportCard
            title="إقفال الكاشير اليومي"
            subtitle="تقارير إقفال الكاشير والفروقات"
            icon={<Wallet size={20} strokeWidth={1.75}/>}
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
        )}
        <div className="su" style={{animationDelay:'.28s'}}>
          <ReportCard
            title="الحضور والانصراف"
            subtitle="الحضور والتأخير والأوفر تايم لكل موظف"
            icon={<CalendarDays size={20} strokeWidth={1.75}/>}
            color={'#0f766e'}
            bg={'#f0fdfa'}
            border={'#99f6e4'}
            loading={false}
            chartData={[]}
            stats={[]}
            onClick={()=>setView('attendance')}
          />
        </div>
        <div className="su" style={{animationDelay:'.29s'}}>
          <ReportCard
            title="تقرير الموظف الشهري"
            subtitle="الرواتب والأوفر تايم والتأخير والخصومات والسلف"
            icon={<Wallet size={20} strokeWidth={1.75}/>}
            color={'#b45309'}
            bg={'#fffbeb'}
            border={'#fde68a'}
            loading={false}
            chartData={[]}
            stats={[]}
            onClick={()=>setView('staffMonthly')}
          />
        </div>
        <div className="su" style={{animationDelay:'.3s'}}>
          <ReportCard
            title="تقرير الهدر"
            subtitle="الأصناف المهدورة وأسبابها"
            icon={<Trash2 size={20} strokeWidth={1.75}/>}
            color={colors.danger}
            bg={colors.dangerLight}
            border={colors.dangerBorder}
            loading={statsLoading}
            chartData={[]}
            stats={[
              {label:'عمليات الهدر',value:wasteStats.ops,color:colors.danger,highlight:true},
              {label:'وحدات مهدورة',value:wasteStats.qty,color:colors.danger},
              {label:'أصناف مختلفة',value:wasteStats.items,color:colors.danger},
            ]}
            onClick={()=>setView('waste')}
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
              <div style={{fontSize:font.md,fontWeight:900,color:colors.text,marginBottom:4,display:'flex',alignItems:'center',gap:6}}><Flame size={17} strokeWidth={2.25}/> أكثر المنتجات صرفاً</div>
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
              <div style={{fontSize:font.md,fontWeight:900,color:colors.text,marginBottom:4,display:'flex',alignItems:'center',gap:6}}><BarChart3 size={17} strokeWidth={2.25}/> الصرف الشهري</div>
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
                    const mn=new Date(Number(y),Number(m)-1).toLocaleDateString('ar-SA', {numberingSystem:'latn',month:'short'})
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
