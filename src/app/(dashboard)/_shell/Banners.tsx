'use client'
import { useState } from 'react'
import { FEATURE_LABEL } from '@/lib/planFeatures'
import type { DashboardShell } from './useDashboardShell'

export default function Banners({ m }: { m: DashboardShell }) {
  const { subDaysLeft, showEnableNotif, setShowEnableNotif, enablingPush, router, enablePush, trialLocked, trialEnds, userRole } = m
  // التجربة: كل المزايا مفتوحة — نوضح وش اللي ينقفل بعدها (يقدر يخفيه لهالجلسة)
  const [hideTrial, setHideTrial] = useState(() => { try { return sessionStorage.getItem('s_hide_trial') === '1' } catch { return false } })
  const endsTxt = trialEnds ? new Date(trialEnds).toLocaleDateString('ar-SA', { numberingSystem: 'latn', month: 'long', day: 'numeric' }) : null
  return (
    <>
      {trialLocked.length > 0 && !hideTrial && userRole !== 'manager' && (
        <div className="sh-banner">
          <span style={{flex:1,lineHeight:1.8}}>
            <b>أنت في التجربة المجانية: كل المزايا مفتوحة لك{endsTxt ? ` لين ${endsTxt}` : ''}.</b>{' '}
            بعد التجربة تنقفل: {trialLocked.map(f => FEATURE_LABEL[f]).join('، ')}. والصفحات اللي عليها «تجربة» بالقائمة من هذي المزايا.
          </span>
          <button className="sh-btn sh-btn-sm sh-btn-primary hide-in-app" onClick={()=>router.push('/addons-market')}>أضفها لاشتراكك</button>
          <button className="sh-btn sh-btn-sm sh-btn-ghost" onClick={()=>{ setHideTrial(true); try { sessionStorage.setItem('s_hide_trial','1') } catch {} }}>إخفاء</button>
        </div>
      )}
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
