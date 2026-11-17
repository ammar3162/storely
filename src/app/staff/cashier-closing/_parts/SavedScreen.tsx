'use client'
import { ct } from './strings'
import type { CashierClosing } from './useCashierClosing'
import { CheckCircle2 } from 'lucide-react'

export default function SavedScreen({ m }: { m: CashierClosing }) {
  const { lang, thankYouMsg, resetForm } = m
  return (
    <>
          <div className="fu" style={{background:'white',borderRadius:20,padding:'32px 20px',textAlign:'center',border:'none'}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'var(--storely-fill)',display:'flex',alignItems:'center',justifyContent:'center',color:'#203640',margin:'0 auto 16px'}}><CheckCircle2 size={34}/></div>
            <div style={{fontSize:20,fontWeight:600,color:'var(--storely-text)',marginBottom:10}}>{ct('savedTitle',lang)}</div>
            <div style={{padding:'0 8px',marginBottom:8}}>
              <div style={{fontSize:17,color:'var(--storely-text)'}}>{thankYouMsg}</div>
            </div>
            <div style={{fontSize:15,color:'var(--storely-muted)',marginBottom:24}}>{ct('savedSub',lang)}</div>
            <button onClick={resetForm} style={{height:48,padding:'0 28px',background:'#203640',color:'white',border:'none',borderRadius:999,fontSize:17,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              {ct('newClosing',lang)}
            </button>
          </div>
    </>
  )
}
