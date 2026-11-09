'use client'
import { colors, shadow, card } from '@/lib/ds'
import type { HrPage } from './useHrManagement'

export default function PayslipVisibility({ m }: { m: HrPage }) {
  const { salaryVisible, isOwner, toggleSalaryVisible } = m
  return (
    <>
      {/* كشف الراتب للموظف */}
      {isOwner && salaryVisible !== null && (
        <div style={{...card,padding:'14px 16px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:colors.text}}>كشف الراتب للموظف</div>
            <div style={{fontSize:12,color:colors.text3,marginTop:3,lineHeight:1.6}}>يطّلع الموظف بلغته على: الراتب والبدلات، والعمل الإضافي، وكل خصم بسببه وتاريخه (غرامات التأخير، وخصوماتك، وعجز الكاشير الذي تعتمده، والسلف)، والصافي</div>
          </div>
          <button onClick={toggleSalaryVisible} role="switch" aria-checked={!!salaryVisible} aria-label="كشف الراتب للموظف"
            style={{width:52,height:30,borderRadius:99,border:'none',cursor:'pointer',flexShrink:0,position:'relative' as const,background:salaryVisible?colors.primary:colors.border2,transition:'background .2s'}}>
            <span style={{position:'absolute' as const,top:3,width:24,height:24,borderRadius:'50%',background:'white',boxShadow:shadow.md,transition:'right .2s',right:salaryVisible?3:25}}/>
          </button>
        </div>
      )}
    </>
  )
}
