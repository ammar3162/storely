'use client'
import { C } from './nav'
import type { DashboardShell } from './useDashboardShell'

export default function StopBranchConfirm({ m }: { m: DashboardShell }) {
  const { confirmStopBranch, setConfirmStopBranch, stoppingBranch, stopBranch } = m
  return (
    <>
      {/* تأكيد إيقاف الفرع */}
      {confirmStopBranch && (
        <div className="sh-overlay" style={{zIndex:2100}} onClick={()=>{if(!stoppingBranch)setConfirmStopBranch(null)}}>
          <div className="sh-modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:8}}>إيقاف فرع {confirmStopBranch.name}</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.8,marginBottom:20}}>يختفي الفرع من القوائم والتقارير. تبقى بياناته محفوظة، ويمكنك إعادة تفعيله من صفحة الفروع.</div>
            <div style={{display:'flex',gap:8}}>
              <button className="sh-btn" style={{flex:1}} onClick={()=>setConfirmStopBranch(null)} disabled={stoppingBranch}>إلغاء</button>
              <button className="sh-btn sh-btn-danger" style={{flex:1}} onClick={()=>stopBranch(confirmStopBranch)} disabled={stoppingBranch}>{stoppingBranch?'جاري الإيقاف...':'إيقاف الفرع'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
