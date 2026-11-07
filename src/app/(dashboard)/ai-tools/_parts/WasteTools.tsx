'use client'
import { C } from './config'
import type { AiToolsPage } from './useAiTools'

export default function WasteTools({ m }: { m: AiToolsPage }) {
  const { setWasteReport, wasteLoading, setWasteLoading, setRealWasteReport, realWasteLoading, setRealWasteLoading, hasAiAddon } = m
  return (
    <>
      {/* أدوات الهدر — الباقة الشاملة أو المتقدمة */}
      {hasAiAddon && (
      <div className="fu" style={{marginTop:16,background:C.bg,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div id="waste" style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:10,scrollMarginTop:80}}>وين تخسر فلوس؟</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>🐌</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>مخزون ما ينصرف (راكد)</div>
              <div style={{fontSize:11,color:C.text3}}>يكتشف ما تشتريه ولا تصرفه (بطيء الحركة)</div>
            </div>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setWasteLoading(true)
              const res=await fetch('/api/waste-detection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
              const data=await res.json()
              setWasteReport(data.waste||[])
              setWasteLoading(false)
            }} style={{padding:'6px 14px',background:'#f59e0b',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {wasteLoading?'⏳ جاري...':'فحص الراكد'}
            </button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>🗑️</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>الهدر: تالف ومنتهي</div>
              <div style={{fontSize:11,color:C.text3}}>من عمليات الهدر المسجّلة فعلياً (تالف، منتهي، كسر...)</div>
            </div>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setRealWasteLoading(true)
              const res=await fetch('/api/waste-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id')})})
              const data=await res.json()
              setRealWasteReport(data)
              setRealWasteLoading(false)
            }} style={{padding:'6px 14px',background:'#dc2626',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {realWasteLoading?'⏳ جاري...':'كشف الهدر'}
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  )
}
