'use client'
import { colors, radius } from '@/lib/ds'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { ListSkeleton } from '@/components/PageSkeleton'
import type { HrPage } from './useHrManagement'

export default function ExcuseTab({ m, s }: { m: HrPage; s: any }) {
  const { excuseRequests, loadingExcuse, hrTab, reviewExcuse } = m
  return (
    <>
                    {/* طلبات الاستئذان */}
                    {hrTab==='excuse' && <div>
                      <div style={{fontSize:12.5,color:colors.text3,marginBottom:10}}>طلبات الانصراف المبكر من الدوام</div>
                      {loadingExcuse ? (
                        <ListSkeleton/>
                      ) : excuseRequests.filter((e:any)=>e.status==='pending').length===0 ? (
                        <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:12}}>ما فيه طلبات استئذان معلّقة</div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                          {excuseRequests.filter((e:any)=>e.status==='pending').map((e:any)=>(
                            <div key={e.id} style={{background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 14px'}}>
                              <div style={{fontSize:12,color:colors.text3,marginBottom:10}}>{e.reason || 'بدون سبب محدد'}</div>
                              <div style={{display:'flex',gap:8}}>
                                <button onClick={()=>reviewExcuse(s.id,e.id,'approve')} style={{flex:1,padding:'7px',background:colors.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsUp size={13} strokeWidth={2.25}/> موافقة</button>
                                <button onClick={()=>reviewExcuse(s.id,e.id,'reject')} style={{flex:1,padding:'7px',background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsDown size={13} strokeWidth={2.25}/> رفض</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>}
    </>
  )
}
