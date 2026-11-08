'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { FEATURE_LABEL } from '@/lib/planFeatures'
import type { DashboardShell } from './useDashboardShell'

export default function Banners({ m }: { m: DashboardShell }) {
  const { subDaysLeft, showEnableNotif, setShowEnableNotif, enablingPush, router, enablePush, trialLocked, trialEnds, userRole, orgPlan } = m
  // التجربة: كل المزايا مفتوحة — سطر هادي يوضح كم ميزة تنقفل بعدها، والتفاصيل بضغطة (يقدر يخفيه لهالجلسة)
  const [hideTrial, setHideTrial] = useState(() => { try { return sessionStorage.getItem('s_hide_trial') === '1' } catch { return false } })
  const [trialOpen, setTrialOpen] = useState(false)
  const endsTxt = trialEnds ? new Date(trialEnds).toLocaleDateString('ar-SA', { numberingSystem: 'latn', month: 'long', day: 'numeric' }) : null
  const n = trialLocked.length
  const countTxt = n === 1 ? 'ميزة واحدة' : n === 2 ? 'ميزتين' : `${n} مزايا`
  return (
    <>
      {n > 0 && !hideTrial && userRole !== 'manager' && (
        <div className="sh-banner sh-banner-quiet">
          <span style={{flex:1,lineHeight:1.8}}>
            أنت في التجربة: كل المزايا مفتوحة{endsTxt ? ` حتى ${endsTxt}` : ''}. بعدها تُقفل {countTxt} {orgPlan === 'custom' ? 'لم تخترها' : 'لا تشملها باقتك'}.{' '}
            <button type="button" className="sh-link-btn" onClick={()=>setTrialOpen(o=>!o)}>{trialOpen ? 'إخفاء التفاصيل' : 'التفاصيل'}</button>
            {trialOpen && (
              <span style={{display:'block',marginTop:6}}>
                {trialLocked.map(f => FEATURE_LABEL[f]).join('، ')}.{' '}
                <button type="button" className="sh-link-btn hide-in-app" onClick={()=>router.push('/addons-market')}>أضفها لاشتراكك</button>
              </span>
            )}
          </span>
          <button type="button" className="sh-icon-btn sh-icon-sm" aria-label="إخفاء" onClick={()=>{ setHideTrial(true); try { sessionStorage.setItem('s_hide_trial','1') } catch {} }}><X size={16}/></button>
        </div>
      )}
      {subDaysLeft!==null && (
        <div className="sh-banner sh-banner-warn">
          <span style={{flex:1}}>
            {subDaysLeft===0?'ينتهي اشتراكك اليوم.':`ينتهي اشتراكك خلال ${subDaysLeft} ${subDaysLeft===1?'يوم':'أيام'}.`} <span className="hide-in-app">جدّد اشتراكك لتجنّب توقف حسابك.</span>
          </span>
          <button className="sh-btn sh-btn-sm hide-in-app" onClick={()=>router.push('/settings')}>تجديد</button>
        </div>
      )}
      {showEnableNotif && (
        <div className="sh-banner">
          <span style={{flex:1}}>فعّل الإشعارات لتصلك تنبيهات نقص المخزون وإقفال الكاشير حتى لو كان التطبيق مغلقاً.</span>
          <button className="sh-btn sh-btn-sm sh-btn-primary" onClick={enablePush} disabled={enablingPush}>{enablingPush?'جاري التفعيل...':'تفعيل'}</button>
          <button className="sh-btn sh-btn-sm sh-btn-ghost" onClick={()=>setShowEnableNotif(false)}>لاحقاً</button>
        </div>
      )}
    </>
  )
}
