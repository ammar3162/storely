'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { C } from './config'
import type { AiToolsPage } from './useAiTools'

export default function ComingSoon({ m }: { m: AiToolsPage }) {
  const { setWeeklyReport, reportLoading, setReportLoading } = m
  return (
    <>
      {/* Coming soon — أدوات متاحة للمتوسطة والمتقدمة */}
      <div className="fu" style={{marginTop:16,background:C.bg,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`,animationDelay:'.2s'}}>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <FeatureIcon name="📅" size={18} />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>التقرير الأسبوعي</div>
              <div style={{fontSize:11,color:C.text3}}>يُرسل كل أحد على واتساب تلقائياً</div>
            </div>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setReportLoading(true)
              const res=await fetch('/api/weekly-report-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
              const data=await res.json()
              setWeeklyReport(data)
              setReportLoading(false)
            }}
              style={{padding:'6px 14px',background:C.primary,color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {reportLoading?'⏳ جاري التحميل...':'عرض التقرير'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
