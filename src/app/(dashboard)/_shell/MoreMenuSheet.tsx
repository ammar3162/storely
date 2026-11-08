'use client'
import { LogOut, Moon, Sun, Languages } from 'lucide-react'
import { C, navTone, Icon } from './nav'
import type { DashboardShell } from './useDashboardShell'

export default function MoreMenuSheet({ m }: { m: DashboardShell }) {
  const { t, orgName, branchName, userName, userInit, lowCount, unread, branches, showMore, setShowMore, theme, router, isActive, visibleGroups, toggleTheme, openBranchSelector, signOut } = m
  return (
    <>
      {/* More — قائمة الجوال */}
      {showMore && (
        <div className="sh-overlay sh-sheet-wrap" onClick={()=>setShowMore(false)}>
          <div data-no-pull className="sh-sheet" onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,borderRadius:99,background:C.border2,margin:'0 auto 16px'}}/>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'4px 4px 16px',borderBottom:`1px solid ${C.border}`,marginBottom:8}}>
              <div className="sh-avatar" style={{width:40,height:40,fontSize:15}}>{userInit}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{userName}</div>
                <div style={{fontSize:12,color:C.text3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{orgName}{branchName?` · ${branchName}`:''}</div>
              </div>
              {branches.length>1&&<button className="sh-btn sh-btn-sm" onClick={()=>{setShowMore(false);openBranchSelector()}}>تغيير الفرع</button>}
            </div>
            {visibleGroups.map(g=>(
              <div key={g.labelKey} style={{marginTop:10}}>
                <div className="sh-group-label" style={navTone(g.items[0]?.href||'')}>{t(g.labelKey)}</div>
                {g.items.map(item=>{
                  const active=isActive(item.href)
                  const external=item.href.startsWith('http')
                  const badge=item.href==='/inventory'?lowCount:item.href==='/notifications'?unread:0
                  return (
                    <button key={item.href} className={`sh-nav${active?' on':''}`} style={navTone(item.href)}
                      onClick={()=>{ if(external) window.open(item.href,'_blank'); else router.push(item.href); setShowMore(false) }}>
                      <Icon d={item.icon} size={18} width={1.75}/>
                      <span style={{flex:1}}>{t(item.labelKey)}</span>
                      {badge>0&&<span className="sh-count">{badge}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
              <button className="sh-btn" data-no-translate style={{flex:1}} onClick={()=>m.setLang(m.lang==='en'?'ar':'en')}><Languages size={16}/> {m.lang==='en'?'العربية':'English'}</button>
              <button className="sh-btn" style={{flex:1}} onClick={toggleTheme}>{theme==='light'?<Moon size={16}/>:<Sun size={16}/>} {theme==='light'?'الوضع الداكن':'الوضع الفاتح'}</button>
              <button className="sh-btn sh-btn-danger" style={{flex:1}} onClick={signOut}><LogOut size={16}/> تسجيل الخروج</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
