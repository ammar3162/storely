'use client'
import { colors, radius } from '@/lib/ds'
import { ThumbsUp, ThumbsDown, CalendarDays } from 'lucide-react'
import { ListSkeleton } from '@/components/PageSkeleton'
import type { HrPage } from './useHrManagement'

export default function LeaveTab({ m, s }: { m: HrPage; s: any }) {
  const { leaveRequests, loadingLeave, hrTab, reviewLeave } = m
  return (
    <>
                    {/* الإجازات */}
                    {hrTab==='leave' && <div>
                      <div style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,fontWeight:800,color:colors.primary,background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,borderRadius:99,padding:'5px 12px',marginBottom:12}}>
                        <CalendarDays size={14} strokeWidth={2.25}/> الرصيد المتبقي: {s.leave_balance_days ?? 21} يوم
                      </div>
                      {loadingLeave ? (
                        <ListSkeleton/>
                      ) : (
                        <>
                          {leaveRequests.filter((l:any)=>l.status==='pending').length>0 && (
                            <div style={{display:'flex',flexDirection:'column' as const,gap:8,marginBottom:12}}>
                              {leaveRequests.filter((l:any)=>l.status==='pending').map((l:any)=>(
                                <div key={l.id} style={{background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 14px'}}>
                                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                                    <span style={{fontSize:13,fontWeight:800,color:colors.warning}}>{l.days_count} يوم</span>
                                    <span style={{fontSize:10,color:colors.text4}}>{l.start_date} → {l.end_date}</span>
                                  </div>
                                  {l.reason && <div style={{fontSize:12,color:colors.text3,marginBottom:10}}>{l.reason}</div>}
                                  <div style={{display:'flex',gap:8}}>
                                    <button onClick={()=>reviewLeave(s.id,l.id,'approved')} style={{flex:1,padding:'7px',background:colors.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsUp size={13} strokeWidth={2.25}/> موافقة</button>
                                    <button onClick={()=>reviewLeave(s.id,l.id,'rejected')} style={{flex:1,padding:'7px',background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsDown size={13} strokeWidth={2.25}/> رفض</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {leaveRequests.length===0 ? (
                            <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:12}}>ما فيه طلبات إجازة بعد</div>
                          ) : (
                            <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                              {leaveRequests.filter((l:any)=>l.status!=='pending').map((l:any)=>(
                                <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:colors.bg,borderRadius:radius.sm}}>
                                  <span style={{fontSize:12,color:colors.text}}>{l.start_date} → {l.end_date} ({l.days_count} يوم)</span>
                                  <span style={{fontSize:11,fontWeight:700,color:l.status==='approved'?colors.primary:colors.danger}}>{l.status==='approved'?'موافَق':'مرفوض'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>}
    </>
  )
}
