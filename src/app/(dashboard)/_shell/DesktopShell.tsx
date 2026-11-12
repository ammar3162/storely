'use client'
import PageSkeleton from '@/components/PageSkeleton'
import HelpVideoButton from '@/components/HelpVideoButton'
import { Bell, ChevronDown, HelpCircle, LogOut, Moon, Settings, Store, Sun } from 'lucide-react'
import { C, navTone, Icon } from './nav'
import type { DashboardShell } from './useDashboardShell'

export default function DesktopShell({ m, banners, children }: { m: DashboardShell; banners: React.ReactNode; children: React.ReactNode }) {
  const { t, orgName, orgLogo, branchName, userName, userInit, lowCount, unread, branches, ready, theme, isDesk, router, navRef, isActive, visibleGroups, toggleTheme, openBranchSelector, signOut } = m
  return (
    <>
        {/* ═══ الكمبيوتر ═══ */}
        <div className="desk-layout">
          <aside className="desk-sidebar">
            <div style={{padding:'16px 14px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <img src={orgLogo||'/storely-logo.png'} alt="" className="sh-logo"/>
                <div style={{fontSize:14,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{orgName||'Storely'}</div>
              </div>
              {branchName&&(
                <button className="sh-branch" onClick={()=>branches.length>1&&openBranchSelector()} disabled={branches.length<2}>
                  <Store size={15}/>
                  <span style={{flex:1,textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{branchName}</span>
                  {branches.length>1&&<ChevronDown size={15}/>}
                </button>
              )}
            </div>

            <nav ref={navRef} className="sh-nav-scroll">
              {visibleGroups.map(g=>(
                <div key={g.labelKey} style={{marginBottom:12}}>
                  <div className="sh-group-label" style={navTone(g.items[0]?.href||'')}>{t(g.labelKey)}</div>
                  {g.items.map(item=>{
                    const active=isActive(item.href)
                    const external=item.href.startsWith('http')
                    const badge=item.href==='/inventory'?lowCount:item.href==='/notifications'?unread:0
                    return (
                      <button key={item.href} className={`sh-nav${active?' on':''}`} style={navTone(item.href)}
                        onClick={()=>item.href==='#support'?window.dispatchEvent(new Event('storely:support')):external?window.open(item.href,'_blank'):router.push(item.href)}
                        onMouseEnter={()=>!external&&router.prefetch(item.href)}>
                        <Icon d={item.icon} size={18} width={1.75}/>
                        <span style={{flex:1}}>{t(item.labelKey)}</span>
                        {badge>0&&<span className="sh-count">{badge}</span>}
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>

            <div style={{padding:'10px 12px',borderTop:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',gap:10}}>
              <div className="sh-avatar">{userInit}</div>
              <div style={{flex:1,minWidth:0,fontSize:13,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName}</div>
              <button className="sh-icon-btn sh-icon-sm" title={theme==='light'?'الوضع الداكن':'الوضع الفاتح'} onClick={toggleTheme}>{theme==='light'?<Moon size={16}/>:<Sun size={16}/>}</button>
              <button className="sh-icon-btn sh-icon-sm" title="تسجيل الخروج" onClick={signOut}><LogOut size={16}/></button>
            </div>
          </aside>

          <header className="desk-topbar">
            <div style={{fontSize:13,color:C.text3,display:'flex',alignItems:'center',gap:6,minWidth:0}}>
              <span style={{fontWeight:600,color:C.text2}}>{orgName}</span>{branchName&&<><span>/</span><span>{branchName}</span></>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <button className="sh-icon-btn" data-no-translate title={m.lang==='en'?'العربية':'English'} onClick={()=>m.setLang(m.lang==='en'?'ar':'en')} style={{fontSize:12.5,fontWeight:700,width:'auto',padding:'0 10px'}}>{m.lang==='en'?'عربي':'EN'}</button>
              <HelpVideoButton/>
              <button className="sh-icon-btn" title="الدعم الفني" onClick={()=>window.dispatchEvent(new Event('storely:support'))}><HelpCircle size={19}/></button>
              <button className="sh-icon-btn" title="الإعدادات" onClick={()=>router.push('/settings')}><Settings size={19}/></button>
              <button className="sh-icon-btn" title="الإشعارات" onClick={()=>router.push('/notifications')}><Bell size={19}/>{unread>0&&<span className="sh-dot"/>}</button>
            </div>
          </header>

          <main className="desk-content">
            {banners}
            {!ready ? <PageSkeleton/> : isDesk ? children : null}
          </main>
        </div>
    </>
  )
}
