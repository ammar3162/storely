'use client'
import type { StaffDispense, PageVals } from './useStaffDispense'

export default function TabsBar({ m, v }: { m: StaffDispense; v: PageVals }) {
  const { tab, setTab, forcedTab, loadProducts } = m
  const { session, tabs } = v
  return (
    <>
      {/* تبويبات مقسّمة: مسار رمادي والمختار أبيض — تختفي لو وصلنا برابط مباشر لصلاحية محددة (?tab=) */}
      {tabs.length > 1 && !forcedTab && (
        <div style={{maxWidth:560,margin:'0 auto',padding:'16px 16px 0'}}>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${tabs.length},1fr)`,gap:4,background:'#eceef1',borderRadius:10,padding:4}}>
            {tabs.map(t=>(
              <button key={t.key} className="tab-btn" onClick={()=>{setTab(t.key as any);if(t.key==='inventory'&&session)loadProducts(session)}}
                style={{height:36,display:'flex',alignItems:'center',justifyContent:'center',gap:6,background:tab===t.key?'white':'transparent',color:tab===t.key?'#111827':'#4b5565',boxShadow:tab===t.key?'0 1px 2px rgba(0,0,0,.06)':'none',borderRadius:7}}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
