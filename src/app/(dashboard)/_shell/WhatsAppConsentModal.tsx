'use client'
import { C } from './nav'
import type { DashboardShell } from './useDashboardShell'

export default function WhatsAppConsentModal({ m }: { m: DashboardShell }) {
  const { showConsent, consentChecked, setConsentChecked, consentSaving, acceptConsent } = m
  return (
    <>
      {/* موافقة استلام رسائل واتساب */}
      {showConsent && (
        <div className="sh-overlay" style={{zIndex:3000}}>
          <div className="sh-modal" style={{maxWidth:420}}>
            <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>تنبيهات واتساب</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.8,marginBottom:18}}>نرسل لك على واتساب تنبيهات نقص المخزون وإقفال الكاشير اليومي وطلبات التوريد. نحتاج موافقتك قبل الإرسال.</div>
            <label style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,cursor:'pointer',marginBottom:16,fontSize:13,color:C.text2,lineHeight:1.7}}>
              <input type="checkbox" checked={consentChecked} onChange={e=>setConsentChecked(e.target.checked)} style={{marginTop:3,width:17,height:17,flexShrink:0,accentColor:C.primary}}/>
              <span>أوافق على استلام رسائل واتساب من Storely المتعلقة بإدارة منشأتي</span>
            </label>
            <button className="sh-btn sh-btn-primary" style={{width:'100%'}} onClick={acceptConsent} disabled={!consentChecked||consentSaving}>{consentSaving?'جاري الحفظ...':'متابعة'}</button>
          </div>
        </div>
      )}
    </>
  )
}
