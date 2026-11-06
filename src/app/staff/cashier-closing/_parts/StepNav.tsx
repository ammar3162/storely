'use client'
import { ct } from './strings'
import type { CashierClosing } from './useCashierClosing'

export default function StepNav({ m }: { m: CashierClosing }) {
  const { lang, step, submitting, deficitReasonOk, goNext, goBack, saveClosing } = m
  return (
    <>
            {/* أزرار التنقل */}
            <div className="fu" style={{display:'flex',gap:10}}>
              {step>1 && (
                <button onClick={goBack} style={{flex:1,padding:'15px',background:'white',color:'#5f5e5a',border:'1.5px solid #e5e5e2',borderRadius:14,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {ct('back',lang)}
                </button>
              )}
              {step<4 ? (
                <button onClick={goNext} style={{flex:2,padding:'15px',background:'#029FA2',color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(22,163,74,.28)'}}>
                  {ct('next',lang)}
                </button>
              ) : (
                <button onClick={saveClosing} disabled={submitting||!deficitReasonOk} style={{flex:2,padding:'15px',background:deficitReasonOk?'#029FA2':'#94a3b8',color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:deficitReasonOk?'pointer':'not-allowed',fontFamily:'inherit',opacity:submitting?.7:1,boxShadow:'0 4px 16px rgba(22,163,74,.28)'}}>
                  {submitting ? ct('saving',lang) : ct('confirmSave',lang)}
                </button>
              )}
            </div>
    </>
  )
}
