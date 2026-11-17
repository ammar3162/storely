'use client'
import { C } from './config'
import type { AiToolsPage } from './useAiTools'

export default function BranchCompare({ m }: { m: AiToolsPage }) {
  const { branchComp, setBranchComp, branchLoading, setBranchLoading, isOwner, hasAiAddon } = m
  return (
    <>
      {/* مقارنة الفروع — الباقة الشاملة أو المتقدمة */}
      {hasAiAddon && isOwner && (
      <div className="fu" style={{marginTop:16,background:C.surface,borderRadius:20,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontSize:17,fontWeight:600,color:C.text}}>أي فرع يصرف أكثر؟</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2}}>مقارنة الصرف والمشتريات والأصناف الناقصة بين فروعك</div>
          </div>
          <button onClick={async()=>{
            const orgId=sessionStorage.getItem('s_org_id')
            if(!orgId) return
            setBranchLoading(true)
            const res=await fetch('/api/branch-comparison',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
            const data=await res.json()
            setBranchComp(data.comparison||[])
            setBranchLoading(false)
          }} style={{padding:'8px 16px',background:'var(--storely-navy)',color:'white',border:'none',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            {branchLoading?'⏳ جاري...':'قارن الفروع'}
          </button>
        </div>

        {branchComp.length>0 && (
          <div style={{marginTop:12}}>
            {branchComp.length===1 ? (
              <div style={{textAlign:'center',padding:'20px',color:C.text4,fontSize:15}}>عندك فرع واحد فقط — أضف فروع لتفعيل المقارنة</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {branchComp.map((b:any,i:number)=>(
                  <div key={b.id} style={{padding:'14px',borderRadius:20,background:i===0?'var(--storely-fill)':'var(--storely-background)',border:`1.5px solid ${i===0?'#203640':'var(--storely-border)'}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                                                                                                <span style={{fontSize:17,fontWeight:600,color:C.text}}>{b.name}</span>
                      </div>
                      <span style={{fontSize:12,fontWeight:600,padding:'3px 10px',borderRadius:99,background:i===0?'#203640':'var(--storely-border)',color:i===0?'white':C.text3}}>
                        {b.ops} عملية صرف
                      </span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,textAlign:'center'}}>
                      <div style={{background:'white',borderRadius:12,padding:'8px'}}>
                        <div style={{fontSize:17,fontWeight:600,color:'var(--storely-navy)'}}>{b.dispensed}</div>
                        <div style={{fontSize:12,color:C.text4}}>وحدات صُرفت</div>
                      </div>
                      <div style={{background:'white',borderRadius:12,padding:'8px'}}>
                        <div style={{fontSize:17,fontWeight:600,color:'#203640'}}>{b.added}</div>
                        <div style={{fontSize:12,color:C.text4}}>وحدات أُضيفت</div>
                      </div>
                      <div style={{background:'white',borderRadius:12,padding:'8px'}}>
                        <div style={{fontSize:17,fontWeight:600,color:'var(--storely-navy)'}}>{b.ops}</div>
                        <div style={{fontSize:12,color:C.text4}}>عمليات صرف</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </>
  )
}
