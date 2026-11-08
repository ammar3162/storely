'use client'
import { C } from './nav'
import type { DashboardShell } from './useDashboardShell'

export default function TermsConsentModal({ m }: { m: DashboardShell }) {
  const { showTermsConsent, termsChecked, setTermsChecked, termsSaving, acceptTermsConsent } = m
  return (
    <>
      {/* موافقة الشروط المحدّثة (المالك فقط) */}
      {showTermsConsent && (
        <div className="sh-overlay" style={{zIndex:3100}}>
          <div className="sh-modal" style={{maxWidth:440}}>
            <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>تحديث على الشروط والأحكام</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.8,marginBottom:18}}>حدّثنا الشروط والأحكام وسياسة الخصوصية. يرجى الموافقة عليها لمتابعة استخدام حسابك.</div>
            <label style={{display:'flex',alignItems:'flex-start',gap:10,fontSize:13,color:C.text2,cursor:'pointer',marginBottom:18,lineHeight:1.7}}>
              <input type="checkbox" checked={termsChecked} onChange={e=>setTermsChecked(e.target.checked)} style={{marginTop:3,width:17,height:17,flexShrink:0,accentColor:C.primary}}/>
              <span>أوافق على <a href="/terms" target="_blank" rel="noopener noreferrer" style={{color:C.primary,fontWeight:600,textDecoration:'underline'}}>الشروط والأحكام</a> و<a href="/privacy" target="_blank" rel="noopener noreferrer" style={{color:C.primary,fontWeight:600,textDecoration:'underline'}}>سياسة الخصوصية</a></span>
            </label>
            <button className="sh-btn sh-btn-primary" style={{width:'100%'}} onClick={acceptTermsConsent} disabled={!termsChecked||termsSaving}>{termsSaving?'جاري الحفظ...':'موافق، متابعة'}</button>
          </div>
        </div>
      )}
    </>
  )
}
