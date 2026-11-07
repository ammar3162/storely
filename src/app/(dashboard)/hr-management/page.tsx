'use client'
import PageIcon from '@/components/PageIcon'
import { colors, font, card, btnSecondary, pageTitle, pageSub } from '@/lib/ds'
import { BarChart3, Lock } from 'lucide-react'
import { useHrManagement } from './_parts/useHrManagement'
import ExtraDaysAlert from './_parts/ExtraDaysAlert'
import PayslipVisibility from './_parts/PayslipVisibility'
import BranchLocationNote from './_parts/BranchLocationNote'
import HrReportModal from './_parts/HrReportModal'
import HrStaffCard from './_parts/HrStaffCard'
import { planIncludes } from '@/lib/planFeatures'

export default function HRManagementPage() {
  const m = useHrManagement()
  const { orgPlan, hasHrAddon, staff, loading, setShowReport } = m

  if (loading || orgPlan === null) return (
    <div style={{minHeight:'50vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'3px solid #e5e5e2',borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!planIncludes(orgPlan, 'hr') && !hasHrAddon) return (
    <div style={{minHeight:'50vh',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center' as const,padding:20}}>
      <div>
        <div style={{display:'flex',justifyContent:'center',marginBottom:12,color:colors.text3}}><Lock size={40}/></div>
        <div style={{fontSize:16,fontWeight:800,color:colors.text,marginBottom:8}}>الحضور والرواتب متاحة بالباقة الكاملة أو بإضافة «الحضور والرواتب»</div>
        <div className="hide-in-app" style={{fontSize:13,color:colors.text3}}>رقّي باقتك عشان تفعّل إدارة الرواتب والمهام لفريقك</div>
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl'}}>
      <div style={{marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' as const}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div>
            <h1 style={pageTitle}><PageIcon/>إدارة الموظفين</h1>
            <p style={pageSub}>الرواتب والبدلات، الخصومات والسلف، والمهام لكل موظف</p>
          </div>
        </div>
        <button onClick={()=>setShowReport(v=>!v)} style={{...btnSecondary,display:'flex',alignItems:'center',gap:6}}>
          <BarChart3 size={15} strokeWidth={2.25}/> تقرير الموظفين
        </button>
      </div>

      <ExtraDaysAlert m={m}/>

      <PayslipVisibility m={m}/>

      <BranchLocationNote m={m}/>

      <HrReportModal m={m}/>

      {staff.length===0 ? (
        <div style={{...card,padding:56,textAlign:'center' as const}}>
          <div style={{fontSize:13,color:colors.text4}}>ما فيه موظفين بعد — أضفهم من صفحة "الموظفون" أول</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
          {staff.map((s:any)=>(
            <HrStaffCard key={s.id} m={m} s={s}/>
          ))}
        </div>
      )}
    </div>
  )
}
