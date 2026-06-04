'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [org, setOrg] = useState('')
  const [init, setInit] = useState('م')
  const [low, setLow] = useState(0)
  const [col, setCol] = useState(false)
  const router = useRouter()
  const path = usePathname()
  const sb = createClient()

  useEffect(() => {
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data: p } = await sb.from('profiles').select('full_name,org_id,organizations(name)').eq('id', user.id).single()
      if (p?.organizations) setOrg((p.organizations as any).name)
      if (p?.full_name) setInit(p.full_name[0])
      const { data: pr } = await sb.from('products').select('qty,reorder_point')
      if (pr) setLow(pr.filter((x: any) => x.qty <= x.reorder_point).length)
    })
  }, [])

  const logout = async () => { await sb.auth.signOut(); router.replace('/login') }
  const sw = col ? 64 : 220

  const MAIN = [
    { href:'/dashboard', label:'لوحة التحكم' },
    { href:'/inventory',  label:'المخزون' },
    { href:'/purchases',  label:'المشتريات' },
    { href:'/dispense',   label:'الصرف' },
  ]
  const REPORTS = [
    { href:'/reports',         label:'تقرير الصرف' },
    { href:'/purchase-report', label:'تقرير المشتريات' },
  ]
  const SYSTEM = [
    { href:'/settings', label:'الإعدادات' },
  ]

  const icons: Record<string,string> = {
    '/dashboard':'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    '/inventory':'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    '/purchases':'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    '/dispense':'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
    '/reports':'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    '/purchase-report':'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    '/settings':'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  }

  const link = (href: string, label: string) => {
    const on = path === href
    const ic = icons[href] || ''
    return (
      <a key={href} href={href} title={col ? label : undefined}
        style={{display:'flex',alignItems:'center',gap:10,padding:'9px 11px',borderRadius:8,marginBottom:1,textDecoration:'none',background:on?'rgba(255,255,255,0.15)':'transparent',boxShadow:on?'inset 2px 0 0 #4abe7a':'none',transition:'background 0.15s',justifyContent:col?'center':'flex-start'}}>
        <svg width="17" height="17" fill="none" stroke={on?'white':'rgba(255,255,255,0.6)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{flexShrink:0}}>
          {ic.split(' M').map((d,j) => <path key={j} d={(j===0?'':' M')+d}/>)}
        </svg>
        {!col && <span style={{fontSize:12.5,color:on?'white':'rgba(255,255,255,0.7)',fontWeight:on?600:500,flex:1,whiteSpace:'nowrap'}}>{label}</span>}
        {!col && href==='/inventory' && low>0 && <span style={{background:'#ef4444',color:'white',fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:8}}>{low}</span>}
      </a>
    )
  }

  const sep = () => <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'6px 8px'}}/>
  const sec = (label: string) => !col ? <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.25)',letterSpacing:'.12em',textTransform:'uppercase' as const,padding:'8px 12px 3px'}}>{label}</div> : null

  const allNav = [...MAIN,...REPORTS,...SYSTEM]

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f0f2f5',fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl'}}>
      <style>{`*{box-sizing:border-box} a:hover{background:rgba(255,255,255,0.08) !important}`}</style>

      <div style={{width:sw,minHeight:'100vh',background:'linear-gradient(160deg,#1e5438,#0d2818)',display:'flex',flexDirection:'column',position:'fixed',right:0,top:0,bottom:0,zIndex:200,overflow:'hidden',transition:'width 0.2s',boxShadow:'-2px 0 12px rgba(0,0,0,0.2)'}}>
        <div style={{padding:'14px 12px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:10,minHeight:56}}>
          <div style={{width:32,height:32,background:'#2d7a4f',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🏪</div>
          {!col && <div><div style={{fontSize:14,fontWeight:800,color:'white'}}>Storely</div>{org&&<div style={{fontSize:10,color:'rgba(255,255,255,0.38)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>{org}</div>}</div>}
        </div>

        <div style={{flex:1,padding:'8px',overflowY:'auto'}}>
          {sec('الرئيسية')}
          {MAIN.map(n => link(n.href, n.label))}
          {sep()}
          {sec('التقارير')}
          {REPORTS.map(n => link(n.href, n.label))}
          {sep()}
          {sec('النظام')}
          {SYSTEM.map(n => link(n.href, n.label))}
        </div>

        <div style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          {!col && <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',marginBottom:4}}>
            <div style={{width:28,height:28,background:'#2d7a4f',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white',flexShrink:0}}>{init}</div>
            <div><div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.8)'}}>مدير النظام</div><div style={{fontSize:9,color:'rgba(255,255,255,0.3)'}}>owner</div></div>
          </div>}
          <button onClick={logout} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 11px',borderRadius:8,border:'none',width:'100%',background:'transparent',cursor:'pointer',justifyContent:col?'center':'flex-start'}}>
            <svg width="15" height="15" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            {!col && <span style={{fontSize:12,color:'#fca5a5'}}>تسجيل الخروج</span>}
          </button>
          <button onClick={()=>setCol(!col)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 11px',borderRadius:8,border:'none',width:'100%',background:'transparent',cursor:'pointer',justifyContent:col?'center':'flex-start',marginTop:2}}>
            <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{transform:col?'rotate(180deg)':'none',transition:'transform 0.2s'}}><path d="M15 19l-7-7 7-7"/></svg>
            {!col && <span style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>طي القائمة</span>}
          </button>
        </div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',marginRight:sw,transition:'margin 0.2s'}}>
        <div style={{height:52,background:'white',borderBottom:'1px solid #e8ecf0',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',position:'sticky',top:0,zIndex:50,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{allNav.find(n=>n.href===path)?.label||'Storely'}</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:6,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'6px 12px',fontSize:12,color:'#94a3b8'}}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              بحث سريع...
            </div>
          </div>
        </div>
        <div style={{padding:24,flex:1}}>{children}</div>
      </div>
    </div>
  )
}
