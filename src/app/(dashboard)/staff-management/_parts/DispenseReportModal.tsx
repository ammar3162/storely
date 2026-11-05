'use client'
import { ListSkeleton } from '@/components/PageSkeleton'
import type { StaffPage } from './useStaffManagement'

export default function DispenseReportModal({ m }: { m: StaffPage }) {
  const { reportMode, reportStaff, setReportStaff, staffReport, reportLoading, openReport } = m
  return (
    <>
      {reportStaff && reportMode==='dispense' && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:'white',borderRadius:20,width:'100%',maxWidth:540,maxHeight:'85vh',display:'flex',flexDirection:'column',fontFamily:'inherit',direction:'rtl'}}>
            <div style={{padding:'18px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'#1c1c1a'}}>تقرير {reportStaff.name}</div>
                <div style={{fontSize:11,color:'#888780',marginTop:2}}>آخر 50 عملية صرف</div>
                {reportStaff.permissions?.cashier && <button onClick={()=>openReport(reportStaff,'closings')} style={{marginTop:6,padding:'4px 10px',borderRadius:99,border:'1px solid #99f6e4',background:'#f0fdfa',color:'#0f766e',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>عرض إقفالات الكاشير</button>}
              </div>
              <button onClick={()=>setReportStaff(null)} style={{width:30,height:30,borderRadius:'50%',border:'1px solid #e0e0dd',background:'#f5f5f4',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:'#5f5e5a'}}>✕</button>
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,padding:'14px 20px',borderBottom:'1px solid #f0f0f0',flexShrink:0}}>
              {[
                {label:'عمليات الصرف', value:staffReport.length, color:'#378add'},
                {label:'أصناف مختلفة', value:new Set(staffReport.map((m:any)=>(m.products as any)?.name)).size, color:'#029FA2'},
                {label:'إجمالي الكميات', value:staffReport.reduce((s:number,m:any)=>s+Math.abs(m.qty_change),0), color:'#ba7517'},
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
              ):staffReport.length===0?(
                <div style={{padding:'40px',textAlign:'center',fontSize:13,color:'#888780'}}>لا توجد عمليات صرف بعد</div>
              ):staffReport.map((m:any,i:number)=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 20px',borderBottom:i<staffReport.length-1?'1px solid #f5f5f4':'none'}}>
                  <div style={{width:36,height:36,borderRadius:10,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#e24b4a'}}>{Math.abs(m.qty_change)}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#1c1c1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(m.products as any)?.name||'—'}</div>
                    <div style={{fontSize:10,color:'#888780',marginTop:1}}>{new Date(m.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn',weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:'#e24b4a',flexShrink:0}}>
                    -{Math.abs(m.qty_change)} <span style={{fontSize:10,color:'#888780',fontWeight:400}}>{(m.products as any)?.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
