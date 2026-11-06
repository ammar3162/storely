'use client'
import { Check, Pause, Store } from 'lucide-react'
import { C } from './nav'
import type { DashboardShell } from './useDashboardShell'

export default function BranchPickerSheet({ m }: { m: DashboardShell }) {
  const { branches, showBranch, setShowBranch, branchLowCounts, setConfirmStopBranch, selectBranch } = m
  return (
    <>
      {/* اختيار الفرع */}
      {showBranch && branches.length>1 && (
        <div className="sh-overlay sh-sheet-wrap" onClick={()=>setShowBranch(false)}>
          <div className="sh-sheet" onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,borderRadius:99,background:C.border2,margin:'0 auto 16px'}}/>
            <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:12}}>اختر الفرع</div>
            {branches.map((b:any)=>{
              const current = sessionStorage.getItem('s_branch_id')===b.id
              return (
                <div key={b.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <button onClick={()=>selectBranch(b)}
                    style={{flex:1,display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:10,border:`1px solid ${current?C.primary:C.border}`,background:current?C.primaryL:C.surface,cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                    <Store size={18} color={current?C.primary:C.text4}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:C.text}}>{b.name}</div>
                      {b.location&&<div style={{fontSize:12,color:C.text3}}>{b.location}</div>}
                    </div>
                    {branchLowCounts[b.id]>0&&<span style={{fontSize:12,fontWeight:600,color:C.danger}}>{branchLowCounts[b.id]} ناقص</span>}
                    {current&&<Check size={17} color={C.primary}/>}
                  </button>
                  <button onClick={()=>setConfirmStopBranch(b)} title="إيقاف الفرع" className="sh-icon-btn" style={{border:`1px solid ${C.border}`}}><Pause size={16}/></button>
                </div>
              )
            })}
            <button className="sh-btn" style={{width:'100%',marginTop:4}} onClick={()=>setShowBranch(false)}>إغلاق</button>
          </div>
        </div>
      )}
    </>
  )
}
