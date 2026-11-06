'use client'
import type { DashboardShell } from './useDashboardShell'

export default function Banners({ m }: { m: DashboardShell }) {
  const { subDaysLeft, showEnableNotif, setShowEnableNotif, enablingPush, router, enablePush } = m
  return (
    <>
      {subDaysLeft!==null && (
        <div className="sh-banner sh-banner-warn">
          <span style={{flex:1}}>
            {subDaysLeft===0?'ينتهي اشتراكك اليوم.':`ينتهي اشتراكك خلال ${subDaysLeft} ${subDaysLeft===1?'يوم':'أيام'}.`} <span className="hide-in-app">جدّد عشان ما يتوقف حسابك.</span>
          </span>
          <button className="sh-btn sh-btn-sm hide-in-app" onClick={()=>router.push('/settings')}>تجديد</button>
        </div>
      )}
      {showEnableNotif && (
        <div className="sh-banner">
          <span style={{flex:1}}>فعّل الإشعارات عشان توصلك تنبيهات نقص المخزون وإقفال الكاشير حتى لو التطبيق مقفول.</span>
          <button className="sh-btn sh-btn-sm sh-btn-primary" onClick={enablePush} disabled={enablingPush}>{enablingPush?'جاري التفعيل...':'تفعيل'}</button>
          <button className="sh-btn sh-btn-sm sh-btn-ghost" onClick={()=>setShowEnableNotif(false)}>لاحقاً</button>
        </div>
      )}
    </>
  )
}
