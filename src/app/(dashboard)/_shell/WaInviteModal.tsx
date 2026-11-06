'use client'
import { C } from './nav'
import type { DashboardShell } from './useDashboardShell'

export default function WaInviteModal({ m }: { m: DashboardShell }) {
  const { showWaInvite, confirmWaFirstContact } = m
  return (
    <>
      {showWaInvite && (
        <div className="sh-overlay" style={{zIndex:3000}}>
          <div className="sh-modal" style={{maxWidth:420}}>
            <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>تفعيل تنبيهات واتساب</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.8,marginBottom:18}}>واتساب يطلب إن أول رسالة تكون منك. اضغط "إرسال رسالة التفعيل" (الرسالة جاهزة)، أرسلها، وبعدها ارجع هنا وأكّد.</div>
            <a href="https://wa.me/966594351667?text=أطلب%20تفعيل%20استلام%20تنبيهات%20حسابي%20على%20Storely" target="_blank" rel="noopener noreferrer" className="sh-btn" style={{width:'100%',textDecoration:'none',marginBottom:8}}>إرسال رسالة التفعيل</a>
            <button className="sh-btn sh-btn-primary" style={{width:'100%'}} onClick={confirmWaFirstContact}>أرسلتها، متابعة</button>
          </div>
        </div>
      )}
    </>
  )
}
