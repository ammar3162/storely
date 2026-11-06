'use client'
import NumberInput from '@/components/NumberInput'
import { colors, radius, btnPrimary, inp } from '@/lib/ds'
import type { HrPage } from './useHrManagement'

export default function SalaryTab({ m, s }: { m: HrPage; s: any }) {
  const { curr, salaryForm, setSalaryForm, savingSalary, hrTab, totalSalary, saveSalary } = m
  return (
    <>
                    {/* الراتب والبدلات */}
                    {hrTab==='salary' && <div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginBottom:12}}>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>الراتب الأساسي</label>
                          <NumberInput value={salaryForm.base} onChange={e=>setSalaryForm({...salaryForm,base:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>بدل السكن</label>
                          <NumberInput value={salaryForm.housing} onChange={e=>setSalaryForm({...salaryForm,housing:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>بدل المواصلات</label>
                          <NumberInput value={salaryForm.transport} onChange={e=>setSalaryForm({...salaryForm,transport:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>بدل الأكل</label>
                          <NumberInput value={salaryForm.food} onChange={e=>setSalaryForm({...salaryForm,food:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap' as const,background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,borderRadius:radius.md,padding:'10px 14px'}}>
                        <span style={{fontSize:13,fontWeight:700,color:colors.primary}}>الإجمالي الشهري: <b style={{fontSize:18,fontWeight:900}}>{totalSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</b></span>
                        <button onClick={()=>saveSalary(s.id)} disabled={savingSalary} style={{...btnPrimary,padding:'9px 22px',fontSize:13,opacity:savingSalary?0.6:1}}>{savingSalary?'جاري الحفظ…':'حفظ الراتب'}</button>
                      </div>
                    </div>}
    </>
  )
}
