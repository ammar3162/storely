'use client'
import { colors, font, card } from '@/lib/ds'
import { ChevronDown } from 'lucide-react'
import type { HrPage, CardVals } from './useHrManagement'
import SalaryTab from './SalaryTab'
import AdjustmentsTab from './AdjustmentsTab'
import LeaveTab from './LeaveTab'
import ExcuseTab from './ExcuseTab'
import TasksTab from './TasksTab'

export default function HrStaffCard({ m, s }: { m: HrPage; s: any }) {
  const { curr, expandedId, adjustments, tasks, leaveRequests, pendingLeaveCounts, pendingAdvanceCounts, cardPayroll, excuseRequests, hrTab, setHrTab, toggleExpand } = m
            const isOpen = expandedId===s.id
            const pendingAdvances = adjustments.filter((a:any)=>a.type==='advance'&&a.status==='pending')
            const totalDeducted = adjustments.filter((a:any)=>a.status==='approved').reduce((sum:number,a:any)=>sum+Number(a.amount),0)
            const savedTotal = (Number(s.monthly_salary)||0)+(Number(s.housing_allowance)||0)+(Number(s.transport_allowance)||0)+(Number(s.food_allowance)||0)
            const c: CardVals = { isOpen, pendingAdvances, totalDeducted, savedTotal }
            return (
              <div key={s.id} style={{...card,padding:'16px 18px'}}>
                <div onClick={()=>toggleExpand(s)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{fontSize:font.base,fontWeight:700,color:colors.text}}>{s.name}</div>
                      {pendingLeaveCounts[s.id] > 0 && (
                        <span style={{background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,fontSize:11,fontWeight:800,borderRadius:99,padding:'2px 9px'}} title="طلب إجازة بانتظار موافقتك">
                          إجازة {pendingLeaveCounts[s.id]}
                        </span>
                      )}
                      {pendingAdvanceCounts[s.id] > 0 && (
                        <span style={{background:colors.warningLight,color:colors.warning,border:`1px solid ${colors.warningBorder}`,fontSize:11,fontWeight:800,borderRadius:99,padding:'2px 9px'}} title="طلب سلفة بانتظار موافقتك">
                          سلفة {pendingAdvanceCounts[s.id]}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:colors.text4,marginTop:2}}>إجمالي الراتب: {savedTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</div>
                  </div>
                  <ChevronDown size={16} color={colors.text3} strokeWidth={2.25} style={{transition:'transform .2s',transform:isOpen?'rotate(180deg)':'none'}}/>
                </div>

                {(() => {
                  // راتب الشهر الحالي — نفس أرقام كشف راتب الموظف
                  const p = cardPayroll[s.id]
                  if (!p) return null
                  const fmtN = (n:number) => Number(n||0).toLocaleString('ar-SA',{numberingSystem:'latn'})
                  const line = (label:string, value:string, color:string) => (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                      <span style={{color:colors.text3}}>{label}</span>
                      <span style={{color,fontWeight:700}}>{value}</span>
                    </div>
                  )
                  const hasAny = p.bonusesTotal>0 || p.overtimePay>0 || p.latePenaltiesTotal>0 || p.otherDeductionsTotal>0 || p.advancesTotal>0 || p.pendingDeficitsTotal>0
                  if (!hasAny) return null
                  return (
                    <div style={{marginTop:10,padding:'10px 12px',background:colors.bg,borderRadius:10,display:'flex',flexDirection:'column' as const,gap:6}}>
                      <div style={{fontSize:10.5,fontWeight:700,color:colors.text4}}>هذا الشهر</div>
                      {p.overtimePay>0 && line('أوفر تايم', `+${fmtN(p.overtimePay)} ${curr}`, colors.primary)}
                      {p.bonusesTotal>0 && line('تعويض أيام إضافية', `+${fmtN(p.bonusesTotal)} ${curr}`, colors.primary)}
                      {p.latePenaltiesTotal>0 && line(`غرامات تأخير (${p.latePenaltiesCount})`, `−${fmtN(p.latePenaltiesTotal)} ${curr}`, colors.danger)}
                      {p.otherDeductionsTotal>0 && line('خصومات', `−${fmtN(p.otherDeductionsTotal)} ${curr}`, colors.danger)}
                      {p.advancesTotal>0 && line('سلف معتمدة', `−${fmtN(p.advancesTotal)} ${curr}`, colors.warning)}
                      {p.pendingDeficitsTotal>0 && line('عجز كاشير بانتظار قرارك', `${fmtN(p.pendingDeficitsTotal)} ${curr}`, colors.text3)}
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:800,paddingTop:6,borderTop:`1px dashed ${colors.border}`}}>
                        <span style={{color:colors.text}}>الصافي حتى الآن</span>
                        <span style={{color:colors.primary}}>{fmtN(p.netSalary)} {curr}</span>
                      </div>
                    </div>
                  )
                })()}

                {isOpen && (
                  <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${colors.border}`,display:'flex',flexDirection:'column' as const,gap:16}}>
                    {(() => {
                      const pend = {
                        adj: adjustments.filter((a:any)=>a.status==='pending').length,
                        leave: leaveRequests.filter((l:any)=>l.status==='pending').length,
                        excuse: excuseRequests.filter((e:any)=>e.status==='pending').length,
                        tasks: tasks.filter((t:any)=>t.status==='completed').length,
                      }
                      const TABS: { k: typeof hrTab; l: string; n?: number }[] = [
                        { k:'salary', l:'الراتب والبدلات' }, { k:'adj', l:'الخصومات والسلف', n:pend.adj },
                        { k:'leave', l:'الإجازات', n:pend.leave }, { k:'excuse', l:'الاستئذان', n:pend.excuse }, { k:'tasks', l:'المهام', n:pend.tasks },
                      ]
                      return (
                        <div role="tablist" style={{display:'flex',gap:6,flexWrap:'wrap' as const,background:colors.bg,padding:5,borderRadius:12}}>
                          {TABS.map(t=>(
                            <button key={t.k} role="tab" aria-selected={hrTab===t.k} onClick={()=>setHrTab(t.k)}
                              style={{flex:'1 1 auto',display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 12px',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,
                                background:hrTab===t.k?'white':'transparent',color:hrTab===t.k?colors.primary:colors.text3,boxShadow:hrTab===t.k?'0 1px 3px rgba(15,23,42,.1)':'none'}}>
                              {t.l}{!!t.n && <span style={{background:colors.warning,color:'white',fontSize:11,fontWeight:800,borderRadius:99,minWidth:18,height:18,padding:'0 5px',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{t.n}</span>}
                            </button>
                          ))}
                        </div>
                      )
                    })()}

                    <SalaryTab m={m} s={s}/>
                    <AdjustmentsTab m={m} s={s} c={c}/>
                    <LeaveTab m={m} s={s}/>
                    <ExcuseTab m={m} s={s}/>
                    <TasksTab m={m} s={s}/>

                  </div>
                )}
              </div>
            )
}
