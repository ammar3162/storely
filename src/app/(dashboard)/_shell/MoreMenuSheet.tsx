'use client'
import { LogOut, Moon, Sun, Languages } from 'lucide-react'
import { C, navTone, Icon } from './nav'
import ShellLink from './ShellLink'
import type { DashboardShell } from './useDashboardShell'

export default function MoreMenuSheet({ m }: { m: DashboardShell }) {
  const { t, orgName, branchName, userName, userInit, lowCount, unread, branches, showMore, setShowMore, theme, isActive, startNav, visibleGroups, toggleTheme, openBranchSelector, signOut } = m
  return (
    <>
      {/* More — قائمة الجوال */}
      {showMore && (
        <div className="sh-overlay sh-sheet-wrap" onClick={()=>setShowMore(false)}>
          <div data-no-pull className="sh-sheet" onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,borderRadius:99,background:C.border2,margin:'0 auto 16px'}}/>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'4px 4px 16px',borderBottom:`1px solid ${C.border}`,marginBottom:8}}>
              <div className="sh-avatar" style={{width:40,height:40,fontSize:17}}>{userInit}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:17,fontWeight:600,color:C.text}}>{userName}</div>
                <div style={{fontSize:13,color:C.text3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{orgName}{branchName?` · ${branchName}`:''}</div>
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
                  const body = <>
                    <Icon d={item.icon} size={18} width={1.75}/>
                    <span style={{flex:1}}>{t(item.labelKey)}</span>
                    {badge>0&&<span className="sh-count">{badge}</span>}
                  </>
                  const cls = `sh-nav${active?' on':''}`
                  // الدعم الفني يفتح Soul، والروابط الخارجية بتبويب جديد، وصفحات النظام روابط تتجهّز أول ما تنفتح القائمة
                  if (item.href==='#support') return (
                    <button key={item.href} className={cls} style={navTone(item.href)} onClick={()=>{ window.dispatchEvent(new Event('storely:support')); setShowMore(false) }}>{body}</button>
                  )
                  if (external) return (
                    <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={cls} style={navTone(item.href)} onClick={()=>setShowMore(false)}>{body}</a>
                  )
                  return (
                    <ShellLink key={item.href} href={item.href} className={cls} style={navTone(item.href)} aria-current={active?'page':undefined} onGo={startNav} onClick={()=>setShowMore(false)}>{body}</ShellLink>
                  )
                })}
              </div>
            ))}
            {/* اللغة والوضع جنب بعض، وتسجيل الخروج بسطر لحاله — الثلاثة بسطر واحد كانت أعرض من شاشة الجوال فتتحرك القائمة يمين ويسار */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8,marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
              <button className="sh-btn" data-no-translate style={{minWidth:0}} onClick={()=>m.setLang(m.lang==='en'?'ar':'en')}><Languages size={16}/> {m.lang==='en'?'العربية':'English'}</button>
              <button className="sh-btn" style={{minWidth:0}} onClick={toggleTheme}>{theme==='light'?<Moon size={16}/>:<Sun size={16}/>} {theme==='light'?'الوضع الداكن':'الوضع الفاتح'}</button>
              <button className="sh-btn sh-btn-danger" style={{gridColumn:'1 / -1'}} onClick={signOut}><LogOut size={16}/> تسجيل الخروج</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
