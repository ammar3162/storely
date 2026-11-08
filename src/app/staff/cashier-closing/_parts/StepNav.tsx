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
                <button onClick={goBack} style={{flex:1,height:48,background:'white',color:'var(--storely-text)',border:'1px solid var(--storely-border)',borderRadius:10,fontSize:16,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                  {ct('back',lang)}
                </button>
              )}
              {step<4 ? (
                <button onClick={goNext} style={{flex:2,height:48,background:'#203640',color:'white',border:'none',borderRadius:10,fontSize:16,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                  {ct('next',lang)}
                </button>
              ) : (
                <button onClick={saveClosing} disabled={submitting||!deficitReasonOk} style={{flex:2,height:48,background:deficitReasonOk?'#203640':'#eceef1',color:deficitReasonOk?'white':'#6b7487',border:'none',borderRadius:10,fontSize:16,fontWeight:600,cursor:deficitReasonOk?'pointer':'not-allowed',fontFamily:'inherit',opacity:submitting?.7:1}}>
                  {submitting ? ct('saving',lang) : ct('confirmSave',lang)}
                </button>
              )}
            </div>
    </>
  )
}
