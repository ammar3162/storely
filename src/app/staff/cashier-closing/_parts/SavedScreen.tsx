'use client'
import { ct } from './strings'
import type { CashierClosing } from './useCashierClosing'

export default function SavedScreen({ m }: { m: CashierClosing }) {
  const { lang, thankYouMsg, resetForm } = m
  return (
    <>
          <div className="fu" style={{background:'white',borderRadius:20,padding:36,textAlign:'center',boxShadow:'0 4px 24px rgba(0,0,0,.06)',border:'1px solid #eeeeeb'}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'#f0fdfa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,margin:'0 auto 16px'}}>✅</div>
            <div style={{fontSize:18,fontWeight:800,color:'#1c1c1a',marginBottom:10}}>{ct('savedTitle',lang)}</div>
            <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:12,padding:'12px 16px',marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:'#0f766e'}}>{thankYouMsg}</div>
            </div>
            <div style={{fontSize:13,color:'#8b8a84',marginBottom:24}}>{ct('savedSub',lang)}</div>
            <button onClick={resetForm} style={{padding:'13px 28px',background:'#029FA2',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>
              {ct('newClosing',lang)}
            </button>
          </div>
    </>
  )
}
