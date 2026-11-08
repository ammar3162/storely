'use client'
import { colors, card, inp } from '@/lib/ds'
import type { HrPage } from './useHrManagement'

export default function HrReportModal({ m }: { m: HrPage }) {
  const { curr, reportMonth, setReportMonth, reportData, loadingReport, showReport } = m
  return (
    <>
      {showReport && (
        <div style={{...card,padding:'18px 20px',marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap' as const,gap:10}}>
            <div style={{fontSize:14,fontWeight:800,color:colors.text}}>تقرير الموظفين الشهري</div>
            <input type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} style={{...inp(),width:'auto',fontSize:13,padding:'8px 12px'}}/>
          </div>
          {loadingReport ? (
            <div style={{fontSize:12,color:colors.text4}}>جاري تحميل التقرير...</div>
          ) : reportData.length===0 ? (
            <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:16}}>لا توجد بيانات لهذا الشهر</div>
          ) : (
            <div style={{overflowX:'auto' as const}}>
              <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:12,minWidth:820}}>
                <thead>
                  <tr style={{borderBottom:`2px solid ${colors.border}`}}>
                    {['الموظف','الراتب الإجمالي','العمل الإضافي','الخصومات','السلف','صافي الراتب','الحضور','التأخير','الإجازات','المهام','التقييم'].map(h=>(
                      <th key={h} style={{padding:'8px 10px',textAlign:'right' as const,color:colors.text4,fontWeight:700,whiteSpace:'nowrap' as const}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r:any)=>{
                    const ratingColor = r.rating>=80?colors.primary:r.rating>=50?colors.warning:colors.danger
                    return (
                      <tr key={r.staffId} style={{borderBottom:`1px solid ${colors.border}`}}>
                        <td style={{padding:'10px',fontWeight:700,color:colors.text,whiteSpace:'nowrap' as const}}>{r.name}</td>
                        <td style={{padding:'10px',color:colors.text2}}>{r.grossSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</td>
                        <td style={{padding:'10px',color:colors.primary,whiteSpace:'nowrap' as const}}>{r.overtimePay>0?`+${r.overtimePay.toLocaleString('ar-SA',{numberingSystem:'latn'})} (${Math.round(r.overtimeMinutes/6)/10} س)`:'—'}</td>
                        <td style={{padding:'10px',color:colors.danger}}>{r.deductionsTotal>0?`-${r.deductionsTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})}`:'—'}</td>
                        <td style={{padding:'10px',color:colors.danger}}>{r.advancesTotal>0?`-${r.advancesTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})}`:'—'}</td>
                        <td style={{padding:'10px',fontWeight:800,color:colors.primary}}>{r.netSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</td>
                        <td style={{padding:'10px',color:colors.text2,whiteSpace:'nowrap' as const}}>{r.daysPresent}/{r.daysInMonth} ({r.attendanceRate}%)</td>
                        <td style={{padding:'10px',color:r.lateCount>0?colors.warning:colors.text2}}>{r.lateCount} مرة</td>
                        <td style={{padding:'10px',color:colors.text2,whiteSpace:'nowrap' as const}}>{r.leaveDaysTaken} يوم (متبقي {r.leaveBalance})</td>
                        <td style={{padding:'10px',color:colors.text2}}>{r.tasksConfirmed}/{r.tasksTotal} ({r.taskCompletionRate}%)</td>
                        <td style={{padding:'10px'}}>
                          <span style={{display:'inline-block',padding:'4px 10px',borderRadius:99,fontWeight:800,color:'white',background:ratingColor}}>{r.rating}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}
