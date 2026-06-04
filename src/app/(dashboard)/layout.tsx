'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

const NAV = [
  { href:'/dashboard', label:'لوحة التحكم', section:'main', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href:'/inventory',  label:'المخزون',    section:'main', icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { href:'/purchases',  label:'المشتريات',  section:'main', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
  { href:'/dispense',   label:'الصرف',      section:'main', icon:'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' },
  { href:'/reports',         label:'تقرير الصرف',      section:'reports', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href:'/purchase-report', label:'تقرير المشتريات',  section:'reports', icon:'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href:'/settings',   label:'الإعدادات',  section:'system', icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [orgName, setOrgName]   = useState('')
  const [userInit, setUserInit] = useState('م')
  const [lowCount, setLowCount] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data: p } = await supabase.from('profiles').select('org_id,full_name,organizations(name)').eq('id',user.id).single()
      if (p?.organizations) setOrgName((p.organizations as any).name)
      if (p?.full_name) setUserInit(p.full_name[0])
      const { data: prods } = await supabase.from('products').select('qty,reorder_point')
      if (prods) setLowCount(prods.filter(x => x.qty <= x.reorder_point).length)
    })
  }, [])

  async function logout() { await supabase.auth.signOut(); router.replace('/login') }

  const sw = collapsed ? 64 : 220

  const sections = [
    { key:'main',    label:'الرئيسية' },
    { key:'reports', label:'التقارير' },
    { key:'system',  label:'النظام' },
  ]

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f0f2f5',fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl'}}>
      <style>{`
        *{box-sizing:border-box}
        .ni{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;cursor:pointer;margin-bottom:1px;border:none;background:transparent;width:100%;text-align:right;transition:all 0.15s;text-decoration:none;position:relative}
        .ni:hover{background:rgba(255,255,255,0.09)}
        .ni.on{background:rgba(255,255,255,0.15);box-shadow:inset 2px 0 0 #4abe7a}
        .ni svg{flex-shrink:0;opacity:0.55;transition:opacity 0.15s}
        .ni.on svg{opacity:1}
        .ni-t{font-size:12.5px;color:rgba(255,255,255,0.7);font-weight:500;white-space:nowrap;overflow:hidden;transition:opacity 0.2s}
        .ni.on .ni-t{color:white;font-weight:650}
        .ni-b{position:absolute;left:10px;top:50%;transform:translateY(-50%);background:#ef4444;color:white;font-size:9px;font-weight:700;padding:1px 5px;border-radius:8px}
        .ng{font-size:9px;font-weight:700;color:rgba(255,255,255,0.25);letter-spacing:.12em;text-transform:uppercase;padding:10px 12px 4px}
        .sep{height:1px;background:rgba(255,255,255,0.06);margin:6px 8px}
        .mw{flex:1;display:flex;flex-direction:column;min-width:0;transition:margin 0.2s}
        .tb{height:52px;background:white;border-bottom:1px solid #e8ecf0;display:flex;align-items:center;justify-content:space-between;padding:0 24px;flex-shrink:0;position:sticky;top:0;z-index:50;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
        .btnp{background:#1a4731;color:white;border:none;padding:7px 14px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background 0.15s}
        .btnp:hover{background:#2d7a4f}
        .btng{background:#f1f5f9;color:#64748b;border:none;padding:7px 12px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.15s}
        .btng:hover{background:#e2e8f0}
        .cont{padding:24px;flex:1}
      `}</style>

      {/* ── Sidebar ── */}
      <div style={{width:sw,minHeight:'100vh',background:'linear-gradient(160deg,#1e5438 0%,#0d2818 100%)',display:'flex',flexDirection:'column',position:'fixed',right:0,top:0,bottom:0,zIndex:200,overflow:'hidden',transition:'width 0.2s',boxShadow:'2px 0 12px rgba(0,0,0,0.15)'}}>

        {/* Logo */}
        <div style={{padding:'14px 12px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:10,minHeight:56}}>
          <div style={{width:32,height:32,background:'#2d7a4f',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🏪</div>
          {!collapsed && <div>
            <div style={{fontSize:14,fontWeight:800,color:'white',letterSpacing:'-0.3px'}}>Storely</div>
            {orgName && <div style={{fontSize:10,color:'rgba(255,255,255,0.38)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>{orgName}</div>}
          </div>}
        </div>

        {/* Nav */}
        <div style={{flex:1,padding:'8px',overflowY:'auto',overflowX:'hidden'}}>
          {sections.map(sec => {
            const items = NAV.filter(n => n.section === sec.key)
            return (
              <div key={sec.key}>
                {!collapsed && <div className="ng">{sec.label}</div>}
                {collapsed && sec.key !== 'main' && <div className="sep"/>}
                {items.map(n => (
                  <a key={n.href} href={n.href} className={'ni'+(pathname===n.href?' on':'')} title={collapsed?n.label:undefined}>
                    <svg width="17" height="17" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      {n.icon.split(' M').map((d,j)=><path key={j} d={(j===0?'':' M')+d}/>)}
                    </svg>
                    {!collapsed && <span className="ni-t">{n.label}</span>}
                    {!collapsed && n.href==='/inventory' && lowCount>0 && <span className="ni-b">{lowCount}</span>}
                  </a>
                ))}
              </div>
            )
          })}
        </div>

        {/* Bottom */}
        <div style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          {!collapsed && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',marginBottom:4}}>
              <div style={{width:28,height:28,background:'#2d7a4f',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white',flexShrink:0}}>{userInit}</div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.8)'}}>مدير النظام</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.32)'}}>owner</div>
              </div>
            </div>
          )}
          <button onClick={logout} className="ni" style={{justifyContent:collapsed?'center':'flex-start'}}>
            <svg width="15" height="15" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            {!collapsed && <span className="ni-t" style={{color:'#fca5a5',fontSize:12}}>تسجيل الخروج</span>}
          </button>
          <button onClick={()=>setCollapsed(!collapsed)} className="ni" style={{justifyContent:collapsed?'center':'flex-start'}}>
            <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{transform:collapsed?'rotate(180deg)':'none',transition:'transform 0.2s'}}><path d="M15 19l-7-7 7-7"/></svg>
            {!collapsed && <span className="ni-t" style={{color:'rgba(255,255,255,0.3)',fontSize:11}}>طي القائمة</span>}
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="mw" style={{marginRight:sw}}>
        <div className="tb">
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>
            {NAV.find(n=>n.href===pathname)?.label||'Storely'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:6,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'6px 12px',fontSize:12,color:'#94a3b8',cursor:'pointer'}}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              بحث سريع...
            </div>
            {lowCount>0 && (
              <a href="/inventory" style={{position:'relative',display:'inline-flex'}}>
                <button className="btng" style={{padding:'7px 10px',position:'relative'}}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                  <span style={{position:'absolute',top:-4,left:-4,background:'#ef4444',color:'white',fontSize:9,fontWeight:700,padding:'1px 4px',borderRadius:8}}>{lowCount}</span>
                </button>
              </a>
            )}
          </div>
        </div>
        <div className="cont">{children}</div>
      </div>
    </div>
  )
}
// force
// force
