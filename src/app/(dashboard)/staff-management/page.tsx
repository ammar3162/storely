'use client'
export const dynamic = 'force-dynamic'
import PageIcon from '@/components/PageIcon'
import { colors, radius, shadow, font, card, btnPrimary, pageTitle, pageSub } from '@/lib/ds'
import { UserPlus, Users, UserCheck, PauseCircle, AlertTriangle } from 'lucide-react'
import { useStaffManagement } from './_parts/useStaffManagement'
import UnassignedProducts from './_parts/UnassignedProducts'
import RevealedPinCard from './_parts/RevealedPinCard'
import AddStaffModal from './_parts/AddStaffModal'
import AssignProductsModal from './_parts/AssignProductsModal'
import EditNameModal from './_parts/EditNameModal'
import MoveBranchModal from './_parts/MoveBranchModal'
import DayStartModal from './_parts/DayStartModal'
import PermissionsModal from './_parts/PermissionsModal'
import ClosingsReportModal from './_parts/ClosingsReportModal'
import DispenseReportModal from './_parts/DispenseReportModal'
import AddonSuspendedList from './_parts/AddonSuspendedList'
import OrphanStaffList from './_parts/OrphanStaffList'
import StaffCard from './_parts/StaffCard'

export default function StaffManagementPage() {
  const m = useStaffManagement()
  const { staff, orgNotifyClosingWA, loading, setShowAdd, hasCashier, visible, visibleStaff, activeCount, inactiveCount } = m

  if(loading) return (
    <div style={{fontFamily:font.family,direction:'rtl'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}`}</style>
      <div style={{height:20,width:120,background:colors.border2,borderRadius:6,marginBottom:8}} className="sk"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
        {[1,2,3].map(i=>(<div key={i} className="sk" style={{height:80,borderRadius:radius.lg,background:colors.border}}/>))}
      </div>
      <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
        {[1,2,3].map(i=>(<div key={i} className="sk" style={{height:80,borderRadius:radius.lg,background:colors.border}}/>))}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',opacity:visible?1:0,transition:'opacity .4s ease'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(10px)}to{opacity:1;transform:none}}
        .su{animation:slideUp .4s ease both}
        input:focus,select:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px ${colors.primaryLight}!important}
        .staff-card{transition:all .2s cubic-bezier(.4,0,.2,1)}
        .staff-card:hover{box-shadow:${shadow.md}!important}
        .act-btn{border:none;border-radius:8px;padding:6px 12px;font-size:${font.xs};font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
        .act-btn:hover{transform:scale(1.05)}
      `}</style>

      {/* Header */}
      <div style={{marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}} className="su">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:radius.md,background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Users size={20} color={colors.primary} strokeWidth={1.75}/>
          </div>
          <div>
            <h1 style={pageTitle}><PageIcon/>الموظفون</h1>
            <p style={pageSub}>أضف موظفين بصلاحيات صرف فقط — يدخلون برقم جوالهم ورمز PIN</p>
          </div>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{...btnPrimary,padding:'10px 18px',fontSize:font.sm,display:'flex',alignItems:'center',gap:6}}>
          <UserPlus size={16} strokeWidth={2.25}/>
          موظف جديد
        </button>
      </div>

      {hasCashier && !orgNotifyClosingWA && staff.some((s:any)=>s.role==='cashier') && (
        <div style={{background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 16px',marginBottom:16,fontSize:font.sm,color:colors.warning,display:'flex',alignItems:'center',gap:10}}>
          <AlertTriangle size={18} strokeWidth={2} style={{flexShrink:0}}/>
          <div>
            <b>تقارير إقفال الكاشير عبر واتساب موقوفة من الإعدادات العامة.</b> لن تعمل الخيارات أدناه لكل موظف (مفعّل/موقوف) حتى تفعّلها من <a href="/settings" style={{color:colors.warning,textDecoration:'underline',fontWeight:700}}>الإعدادات ← الإشعارات</a>.
          </div>
        </div>
      )}

      <UnassignedProducts m={m}/>

      {/* Stats */}
      <div className="su" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20,animationDelay:'.05s'}}>
        {[
          {label:'إجمالي الموظفين',value:visibleStaff.length,      color:colors.info,    bg:colors.infoLight,    border:colors.infoBorder,    Icon:Users},
          {label:'موظفون نشطون',   value:activeCount,         color:colors.primary, bg:colors.primaryLight, border:colors.primaryBorder, Icon:UserCheck},
          {label:'موقوفون',        value:inactiveCount,       color:colors.danger,  bg:colors.dangerLight,  border:colors.dangerBorder,  Icon:PauseCircle},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:radius.lg,padding:'16px',border:`1.5px solid ${s.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase' as const,letterSpacing:'.06em'}}>{s.label}</div>
              <s.Icon size={18} color={s.color} strokeWidth={1.75}/>
            </div>
            <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>


      <RevealedPinCard m={m}/>

      <AddStaffModal m={m}/>
      <AssignProductsModal m={m}/>
      <EditNameModal m={m}/>
      <MoveBranchModal m={m}/>
      <DayStartModal m={m}/>
      <PermissionsModal m={m}/>
      <ClosingsReportModal m={m}/>
      <DispenseReportModal m={m}/>

      <AddonSuspendedList m={m}/>
      <OrphanStaffList m={m}/>

      {visibleStaff.length===0 ? (
        <div style={{...card,padding:56,textAlign:'center'}} className="su">
          <div style={{display:'flex',justifyContent:'center',marginBottom:14}}><Users size={52} strokeWidth={1.25} color={colors.text4}/></div>
          <div style={{fontSize:font.base,fontWeight:700,color:colors.text2,marginBottom:6}}>لا يوجد موظفين بعد</div>
          <div style={{fontSize:font.sm,color:colors.text4,marginBottom:20}}>أضف أول موظف وشارك معه بيانات الدخول</div>
          <button onClick={()=>setShowAdd(true)} style={{...btnPrimary,padding:'10px 24px',fontSize:font.sm}}>+ إضافة أول موظف</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
          {visibleStaff.map((s:any,i)=>(
            <StaffCard key={s.id} m={m} s={s} i={i}/>
          ))}
        </div>
      )}
    </div>
  )
}
