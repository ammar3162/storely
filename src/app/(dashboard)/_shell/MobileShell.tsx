'use client'
import { useEffect } from 'react'
import PageSkeleton from '@/components/PageSkeleton'
import HelpVideoButton from '@/components/HelpVideoButton'
import { Bell, ChevronDown } from 'lucide-react'
import { C, Icon } from './nav'
import ShellLink from './ShellLink'
import type { DashboardShell } from './useDashboardShell'

export default function MobileShell({ m, banners, children }: { m: DashboardShell; banners: React.ReactNode; children: React.ReactNode }) {
  const { t, orgName, orgLogo, branchName, userInit, lowCount, unread, branches, setShowMore, ready, isDesk, router, isActive, startNav, BOT_NAV, openBranchSelector, navAllowed } = m
  // رجع التطبيق من الخلفية (الجوال انقفل أو كان بتطبيق ثاني): نجدد تجهيز صفحات الشريط السفلي، لأن التجهيز صالح 5 دقائق بس.
  // لو التجهيز لسه صالح ما يصير أي طلب
  useEffect(()=>{
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      document.querySelectorAll<HTMLAnchorElement>('.mob-bottom-nav a.sh-tab').forEach(a => { const h = a.getAttribute('href'); if (h) router.prefetch(h) })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  },[router])
  return (
    <>
        {/* ═══ الجوال ═══ */}
        <div className="mob-layout">
          <header className="mob-header">
            <img src={orgLogo||'/storely-logo.png'} alt="" className="sh-logo"/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:17,fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{orgName||'Storely'}</div>
              {branchName&&(
                <button className="sh-branch-inline" onClick={()=>branches.length>1&&openBranchSelector()} disabled={branches.length<2}>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{branchName}</span>
                  {branches.length>1&&<ChevronDown size={13}/>}
                </button>
              )}
            </div>
            <HelpVideoButton/>
            <ShellLink href="/notifications" className="sh-icon-btn" aria-label="الإشعارات" onGo={startNav}>
              <Bell size={20}/>{unread>0&&<span className="sh-dot"/>}
            </ShellLink>
            <button className="sh-avatar" aria-label="حسابي" onClick={()=>setShowMore(true)}>{userInit}</button>
          </header>

          <div className="mob-content">
            {banners}
            {!ready ? <PageSkeleton/> : isDesk === false ? children : null}
          </div>

          <nav className="mob-bottom-nav">
            {BOT_NAV.filter(item=>navAllowed(item.href)).map(item=>{
              const active=isActive(item.href)
              return (
                // رابط يتجهّز بالخلفية أول ما يظهر الشريط (ShellLink): الضغطة تفتح الصفحة على طول
                <ShellLink key={item.href} href={item.href} className={`sh-tab${active?' on':''}`} aria-current={active?'page':undefined} onGo={startNav}>
                  <span style={{position:'relative',display:'flex'}}>
                    <Icon d={item.icon} size={22} width={active?2:1.75}/>
                    {(item as any).badge>0&&<span className="sh-count sh-count-float">{(item as any).badge}</span>}
                  </span>
                  <span>{t(item.labelKey)}</span>
                </ShellLink>
              )
            })}
            <button className="sh-tab" onClick={()=>setShowMore(true)}>
              <span style={{position:'relative',display:'flex'}}>
                <Icon d="M4 6h16M4 12h16M4 18h16" size={22} width={1.75}/>
                {(unread>0||lowCount>0)&&<span className="sh-dot" style={{top:-2,right:-3}}/>}
              </span>
              <span>المزيد</span>
            </button>
          </nav>
        </div>
    </>
  )
}
