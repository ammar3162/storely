'use client'
import type { StaffDispense, PageVals } from './useStaffDispense'

export default function TabsBar({ m, v }: { m: StaffDispense; v: PageVals }) {
  const { tab, setTab, forcedTab, loadProducts } = m
  const { session, tabs } = v
  return (
    <>
      {/* Tabs — تختفي لو وصلنا برابط مباشر لصلاحية محددة (?tab=) */}
      {tabs.length > 1 && !forcedTab && (
        <div style={{maxWidth:560,margin:'0 auto',padding:'14px 16px 0'}}>
          <div style={{display:'flex',gap:4,background:'#e9edf1',borderRadius:14,padding:4}}>
            {tabs.map(t=>(
              <button key={t.key} className="tab-btn" onClick={()=>{setTab(t.key as any);if(t.key==='inventory'&&session)loadProducts(session)}}
                style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 8px',background:tab===t.key?'white':'transparent',color:tab===t.key?'#0f766e':'#64748b',boxShadow:tab===t.key?'0 1px 3px rgba(15,23,42,.1)':'none',borderRadius:11}}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
