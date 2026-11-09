'use client'
import { CheckCircle2, AlertCircle, TrendingUp, X } from 'lucide-react'
import { ListSkeleton } from '@/components/PageSkeleton'
import type { StaffPage } from './useStaffManagement'

export default function ClosingsReportModal({ m }: { m: StaffPage }) {
  const { curr, reportMode, reportStaff, setReportStaff, staffClosings, reportLoading, openReport } = m
  return (
    <>
      {reportStaff && reportMode==='closings' && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:'white',borderRadius:20,width:'100%',maxWidth:560,maxHeight:'85vh',display:'flex',flexDirection:'column',fontFamily:'inherit',direction:'rtl'}}>
            <div style={{padding:'18px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'#1c1c1a'}}>تقارير إقفال {reportStaff.name}</div>
                <div style={{fontSize:11,color:'#888780',marginTop:2}}>آخر 50 تقرير إقفال</div>
                {reportStaff.role!=='cashier' && <button onClick={()=>openReport(reportStaff,'dispense')} style={{marginTop:6,padding:'4px 10px',borderRadius:99,border:'1px solid var(--storely-border)',background:'var(--storely-background)',color:'var(--storely-text)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>عرض عمليات الصرف</button>}
              </div>
              <button onClick={()=>setReportStaff(null)} style={{width:30,height:30,borderRadius:'50%',border:'1px solid var(--storely-border)',background:'var(--storely-background)',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:'#5f5e5a'}}><X size={16}/></button>
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,padding:'14px 20px',borderBottom:'1px solid #f0f0f0',flexShrink:0}}>
              {[
                {label:'عدد التقارير', value:staffClosings.length, color:'#0891b2'},
                {label:'حالات عجز', value:staffClosings.filter((c:any)=>c.status==='deficit').length, color:'#e24b4a'},
                {label:'حالات زيادة', value:staffClosings.filter((c:any)=>c.status==='surplus').length, color:'#378add'},
              ].map((s,i)=>(
                <div key={i} style={{background:'#f9f9f8',borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:700,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
                  <div style={{fontSize:10,color:'#888780',marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* List */}
            <div style={{overflowY:'auto',flex:1}}>
              {reportLoading?(
                <ListSkeleton/>
              ):staffClosings.length===0?(
                <div style={{padding:'40px',textAlign:'center',fontSize:13,color:'#888780'}}>لا توجد تقارير إقفال بعد</div>
              ):staffClosings.map((c:any,i:number)=>{
                const statusLabel:Record<string,string> = {deficit:'عجز',surplus:'زيادة',balanced:'مطابق'}
                const statusColor:Record<string,string> = {deficit:'#e24b4a',surplus:'#378add',balanced:'#203640'}
                return(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 20px',borderBottom:i<staffClosings.length-1?'1px solid #f5f5f4':'none'}}>
                    <div style={{width:36,height:36,borderRadius:10,background:statusColor[c.status]+'15',border:`1px solid ${statusColor[c.status]}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {c.status==='balanced' ? <CheckCircle2 size={16} color={statusColor[c.status]} strokeWidth={2}/> : c.status==='deficit' ? <AlertCircle size={16} color={statusColor[c.status]} strokeWidth={2}/> : <TrendingUp size={16} color={statusColor[c.status]} strokeWidth={2}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#1c1c1a'}}>{new Date(c.closing_date).toLocaleDateString('ar-SA-u-ca-gregory', {numberingSystem:'latn',weekday:'short',month:'short',day:'numeric'})}</div>
                      <div style={{fontSize:10,color:'#888780',marginTop:1}}>مبيعات {Number(c.total_sales).toFixed(0)} {curr} · شبكة {Number(c.network_amount).toFixed(0)} {curr}</div>
                      {c.status==='deficit' && <div style={{fontSize:11,color:'#b42318',marginTop:3,lineHeight:1.5}}>السبب: {c.deficit_reason || <span style={{color:'#a8a7a1'}}>ما انكتب سبب (إقفال قديم)</span>}</div>}
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:statusColor[c.status],flexShrink:0}}>
                      {statusLabel[c.status]}{c.status!=='balanced'?` (${Math.abs(Number(c.difference)).toFixed(0)} ${curr})`:''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
