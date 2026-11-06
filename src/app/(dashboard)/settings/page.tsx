'use client'
export const dynamic = 'force-dynamic'
import PageIcon from '@/components/PageIcon'
import { colors, radius, font, card, pageTitle, pageSub } from '@/lib/ds'
import AccountantHub from '@/components/AccountantHub'
import { TABS } from './_parts/constants'
import { useSettings } from './_parts/useSettings'
import AccountTab from './_parts/AccountTab'
import OrgTab from './_parts/OrgTab'
import NotifyTab from './_parts/NotifyTab'
import BackupTab from './_parts/BackupTab'
import SecurityTab from './_parts/SecurityTab'
import DeleteAccountModal from './_parts/DeleteAccountModal'

export default function SettingsPage() {
  const m = useSettings()
  const { loading, saveOk, orgId, isOwner, branches, maxBranches, activeTab, setActiveTab, visible, planLabel } = m

  if(loading) return (
    <div style={{fontFamily:font.family,direction:'rtl'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}`}</style>
      <div className="sk" style={{height:20,width:120,background:colors.border2,borderRadius:6,marginBottom:8}}/>
      <div className="sk" style={{height:12,width:200,background:colors.border,borderRadius:6,marginBottom:24}}/>
      <div className="sk" style={{height:52,borderRadius:radius.lg,background:colors.border,marginBottom:16}}/>
      {[1,2,3].map(i=>(<div key={i} className="sk" style={{height:160,borderRadius:radius.lg,background:colors.border,marginBottom:12}}/>))}
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',opacity:visible?1:0,transition:'opacity .4s ease',position:'relative'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .su{animation:slideUp .4s ease both}
        input:focus,select:focus,textarea:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px ${colors.primaryLight}!important}
        .tab-btn{padding:10px 0;border:none;cursor:pointer;font-family:inherit;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;border-bottom:2.5px solid transparent}
        .tab-btn.active{border-bottom-color:${colors.primary}}
        /* الكمبيوتر: التبويبات قائمة جانبية والمحتوى بعرض كامل */
        .set-shell{display:block}
        .set-body{padding:22px}
        .set-narrow{max-width:760px}
        .acc-grid{display:block}
        @media (min-width:1000px){
          .set-shell{display:grid;grid-template-columns:220px 1fr}
          .set-tabs{flex-direction:column!important;border-bottom:none!important;border-left:1px solid ${colors.border};padding:12px 10px;gap:2px;overflow:visible!important}
          .set-tabs .tab-btn{flex:none;flex-direction:row;justify-content:flex-start;gap:10px;padding:11px 14px;border-bottom:none;border-radius:10px}
          .set-tabs .tab-btn span:last-child{font-size:13.5px!important}
          .set-tabs .tab-btn:hover{background:${colors.bg}}
          .set-tabs .tab-btn.active{background:${colors.primaryLight};border-bottom:none}
          .set-body{padding:26px 30px}
        }
        @media (min-width:1280px){
          .acc-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
        }
        .day-btn{padding:8px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${colors.border};background:${colors.surface};color:${colors.text3};font-family:inherit;transition:all .15s}
        .day-btn.active{border-color:${colors.primary};background:${colors.primaryLight};color:${colors.primary}}
        .sched-btn{padding:14px 8px;border-radius:${radius.md};cursor:pointer;border:1.5px solid ${colors.border};background:${colors.surface};color:${colors.text3};font-size:${font.sm};font-weight:700;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;transition:all .2s}
        .sched-btn:hover{border-color:${colors.primary};transform:translateY(-1px)}
        .sched-btn.active{border-color:${colors.primary};background:${colors.primaryLight};color:${colors.primary};box-shadow:0 4px 12px ${colors.primary}22}
      `}</style>

      {/* Header */}
      <div style={{marginBottom:20}} className="su">
        <h1 style={{...pageTitle}}><PageIcon/>الإعدادات</h1>
        <p style={{...pageSub}}>إعدادات المؤسسة وجدولة التنبيهات والنسخ الاحتياطي</p>
      </div>

      {/* Plan badge */}
      <div className="su" style={{...card,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:12,animationDelay:'.05s',background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`}}>
        <div style={{width:40,height:40,borderRadius:12,background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,boxShadow:`0 2px 8px ${colors.primary}22`}}>⭐</div>
        <div>
          <div style={{fontSize:font.sm,fontWeight:800,color:colors.primary}}>{planLabel}</div>
          <div style={{fontSize:font.xs,color:colors.primary,opacity:.7,marginTop:1}}>الفروع: {branches.length} / {maxBranches} مسموح</div>
        </div>
      </div>

      {/* Save success */}
      {saveOk&&(
        <div className="su" style={{background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:radius.md,padding:'12px 16px',marginBottom:16,fontSize:font.sm,fontWeight:700,color:colors.primary,display:'flex',alignItems:'center',gap:8}}>
          ✅ تم حفظ الإعدادات بنجاح
        </div>
      )}

      {/* Tabs */}
      <div className="su set-shell" style={{...card,overflow:'hidden',marginBottom:16,animationDelay:'.1s'}}>
        <div className="set-tabs" style={{display:'flex',borderBottom:`1px solid ${colors.border}`,overflowX:'auto',scrollbarWidth:'none'}}>
          {TABS.filter((t:any)=>!t.ownerOnly||isOwner).map(t=>(
            <button key={t.key} className={`tab-btn${activeTab===t.key?' active':''}`}
              onClick={()=>setActiveTab(t.key)}
              style={{background:'none',color:activeTab===t.key?colors.primary:colors.text3}}>
              <span style={{fontSize:18}}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:700}}>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="set-body">

          {activeTab==='accountant'&&isOwner&&orgId&&<div>
            <AccountantHub orgId={orgId}/>
          </div>}

          <div className="set-narrow">

          <AccountTab m={m}/>

          <OrgTab m={m}/>

          <NotifyTab m={m}/>

          <BackupTab m={m}/>

          <SecurityTab m={m}/>
          </div>

        </div>
      </div>

    <DeleteAccountModal m={m}/>
    </div>
  )
}
