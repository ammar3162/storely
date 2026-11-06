'use client'
import NumberInput from '@/components/NumberInput'
import { colors, radius, btnPrimary, inp } from '@/lib/ds'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { ListSkeleton } from '@/components/PageSkeleton'
import type { HrPage, CardVals } from './useHrManagement'

export default function AdjustmentsTab({ m, s, c }: { m: HrPage; s: any; c: CardVals }) {
  const { curr, adjustments, loadingAdjustments, newAdjAmount, setNewAdjAmount, newAdjReason, setNewAdjReason, savingAdj, hrTab, addDeduction, reviewAdvance } = m
  const { pendingAdvances } = c
  return (
    <>
                    {/* السلف والخصومات */}
                    {hrTab==='adj' && <div>
                      {loadingAdjustments ? (
                        <ListSkeleton/>
                      ) : (
                        <>
                          {pendingAdvances.length>0 && (
                            <div style={{marginBottom:14}}>
                              <div style={{fontSize:11,fontWeight:700,color:colors.warning,marginBottom:8}}>طلبات سلفة بانتظار الموافقة</div>
                              <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                                {pendingAdvances.map((a:any)=>(
                                  <div key={a.id} style={{background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 14px'}}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                                      <span style={{fontSize:15,fontWeight:800,color:colors.warning}}>{a.amount} {curr}</span>
                                      <span style={{fontSize:10,color:colors.text4}}>{new Date(a.created_at).toLocaleDateString('ar-SA',{numberingSystem:'latn'})}</span>
                                    </div>
                                    {a.reason && <div style={{fontSize:12,color:colors.text3,marginBottom:10}}>{a.reason}</div>}
                                    <div style={{display:'flex',gap:8}}>
                                      <button onClick={()=>reviewAdvance(s.id,a.id,'approved')} style={{flex:1,padding:'7px',background:colors.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsUp size={13} strokeWidth={2.25}/> موافقة</button>
                                      <button onClick={()=>reviewAdvance(s.id,a.id,'rejected')} style={{flex:1,padding:'7px',background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsDown size={13} strokeWidth={2.25}/> رفض</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{display:'flex',flexWrap:'wrap' as const,gap:8,background:colors.bg,borderRadius:radius.md,padding:10,marginBottom:12}}>
                            <NumberInput value={newAdjAmount} onChange={e=>setNewAdjAmount(e.target.value)} placeholder="مبلغ الخصم" style={{...inp(),fontSize:13,flex:'1 1 120px'}}/>
                            <input value={newAdjReason} onChange={e=>setNewAdjReason(e.target.value)} placeholder="السبب (اختياري)" style={{...inp(),fontSize:13,flex:'3 1 200px'}}/>
                            <button onClick={()=>addDeduction(s.id)} disabled={savingAdj||!newAdjAmount} style={{...btnPrimary,padding:'10px 18px',flex:'1 0 auto',fontSize:13,opacity:(savingAdj||!newAdjAmount)?0.5:1,whiteSpace:'nowrap' as const}}>{savingAdj?'…':'+ أضف خصم'}</button>
                          </div>
                          {adjustments.length>0 && (
                            <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                              {adjustments.map((a:any)=>(
                                <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:colors.bg,borderRadius:radius.sm,opacity:a.status==='rejected'?0.5:1}}>
                                  <div>
                                    <span style={{fontSize:12,fontWeight:700,color:colors.text}}>{a.type==='advance'?'سلفة':'خصم'}</span>
                                    {a.reason && <span style={{fontSize:11,color:colors.text4,marginRight:6}}>— {a.reason}</span>}
                                    {a.status==='pending' && <span style={{fontSize:9,color:colors.warning,marginRight:6,fontWeight:700}}>(معلّق)</span>}
                                  </div>
                                  <span style={{fontSize:12,fontWeight:700,color:colors.danger}}>-{a.amount} {curr}</span>
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
