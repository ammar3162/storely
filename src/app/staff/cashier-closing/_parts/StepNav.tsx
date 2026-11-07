'use client'
import { ct } from './strings'
import { useEffect } from 'react'
import type { CashierClosing } from './useCashierClosing'

export default function StepNav({ m }: { m: CashierClosing }) {
  const { lang, step, sub, submitting, deficitReasonOk, goNext, goBack, saveClosing } = m
  // زر فيديو المساعدة العائم يرتفع فوق الشريط
  useEffect(() => {
    document.documentElement.style.setProperty('--sticky-footer', '72px')
    return () => { document.documentElement.style.removeProperty('--sticky-footer') }
  }, [])
  return (
    <>
            {/* أزرار التنقل — شريط ثابت أسفل الشاشة */}
            <div style={{position:'sticky',bottom:0,zIndex:40,background:'rgba(244,245,246,.96)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',borderTop:'1px solid #e5e7eb',padding:'12px 16px calc(12px + env(safe-area-inset-bottom))'}}>
            <div style={{display:'flex',gap:8,maxWidth:520,margin:'0 auto'}}>
              {(step>1 || sub>0) && (
                <button onClick={goBack} style={{flex:1,height:48,background:'white',color:'#111827',border:'1px solid #e5e7eb',borderRadius:10,fontSize:16,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                  {ct('back',lang)}
                </button>
              )}
              {step<4 ? (
                <button onClick={goNext} style={{flex:2,height:48,background:'#0f766e',color:'white',border:'none',borderRadius:10,fontSize:16,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                  {ct('next',lang)}
                </button>
              ) : (
                <button onClick={saveClosing} disabled={submitting||!deficitReasonOk} style={{flex:2,height:48,background:deficitReasonOk?'#0f766e':'#eceef1',color:deficitReasonOk?'white':'#6b7487',border:'none',borderRadius:10,fontSize:16,fontWeight:600,cursor:deficitReasonOk?'pointer':'not-allowed',fontFamily:'inherit',opacity:submitting?.7:1}}>
                  {submitting ? ct('saving',lang) : ct('confirmSave',lang)}
                </button>
              )}
            </div>
            </div>
    </>
  )
}
