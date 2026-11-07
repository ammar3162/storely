'use client'
import PageSkeleton from '@/components/PageSkeleton'
import HelpVideoButton from '@/components/HelpVideoButton'
import { Bell, ChevronDown } from 'lucide-react'
import { C, Icon } from './nav'
import type { DashboardShell } from './useDashboardShell'

export default function MobileShell({ m, banners, children }: { m: DashboardShell; banners: React.ReactNode; children: React.ReactNode }) {
  const { t, orgName, orgLogo, branchName, userInit, lowCount, unread, branches, setShowMore, ready, isDesk, router, isActive, BOT_NAV, openBranchSelector, navAllowed } = m
  return (
    <>
        {/* ═══ الجوال ═══ */}
        <div className="mob-layout">
          <header className="mob-header">
            <img src={orgLogo||'/storely-logo.png'} alt="" className="sh-logo"/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{orgName||'Storely'}</div>
              {branchName&&(
                <button className="sh-branch-inline" onClick={()=>branches.length>1&&openBranchSelector()} disabled={branches.length<2}>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{branchName}</span>
                  {branches.length>1&&<ChevronDown size={13}/>}
                </button>
              )}
            </div>
            <HelpVideoButton/>
            <button className="sh-icon-btn" aria-label="الإشعارات" onClick={()=>router.push('/notifications')}>
              <Bell size={20}/>{unread>0&&<span className="sh-dot"/>}
            </button>
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
                <button key={item.href} className={`sh-tab${active?' on':''}`} onClick={()=>router.push(item.href)} onMouseEnter={()=>router.prefetch(item.href)}>
                  <span style={{position:'relative',display:'flex'}}>
                    <Icon d={item.icon} size={22} width={active?2:1.75}/>
                    {(item as any).badge>0&&<span className="sh-count sh-count-float">{(item as any).badge}</span>}
                  </span>
                  <span>{t(item.labelKey)}</span>
                </button>
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
