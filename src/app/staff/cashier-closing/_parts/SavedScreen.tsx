'use client'
import { ct } from './strings'
import type { CashierClosing } from './useCashierClosing'
import { CheckCircle2 } from 'lucide-react'

export default function SavedScreen({ m }: { m: CashierClosing }) {
  const { lang, thankYouMsg, resetForm } = m
  return (
    <>
          <div className="fu" style={{background:'white',borderRadius:14,padding:'32px 20px',textAlign:'center',border:'1px solid #e5e7eb'}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'#e7f3f1',display:'flex',alignItems:'center',justifyContent:'center',color:'#0f766e',margin:'0 auto 16px'}}><CheckCircle2 size={34}/></div>
            <div style={{fontSize:18,fontWeight:600,color:'#111827',marginBottom:10}}>{ct('savedTitle',lang)}</div>
            <div style={{padding:'0 8px',marginBottom:8}}>
              <div style={{fontSize:15,color:'#111827'}}>{thankYouMsg}</div>
            </div>
            <div style={{fontSize:13,color:'#4b5565',marginBottom:24}}>{ct('savedSub',lang)}</div>
            <button onClick={resetForm} style={{height:48,padding:'0 28px',background:'#0f766e',color:'white',border:'none',borderRadius:10,fontSize:16,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              {ct('newClosing',lang)}
            </button>
          </div>
    </>
  )
}
