'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, font, card, btnSecondary, tag, pageTitle, pageSub } from '@/lib/ds'

const TYPE_CFG: Record<string,{icon:string;color:string;bg:string;border:string}> = {
  warning: { icon:'⚠️', color:colors.warning, bg:colors.warningLight, border:colors.warningBorder },
  danger:  { icon:'🚨', color:colors.danger,  bg:colors.dangerLight,  border:colors.dangerBorder  },
  success: { icon:'✅', color:colors.primary, bg:colors.primaryLight, border:colors.primaryBorder },
  info:    { icon:'ℹ️', color:colors.info,    bg:colors.infoLight,    border:colors.infoBorder    },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all'|'unread'>('all')
  const sb = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    let orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) {
      const { data:{ user } } = await sb.auth.getUser()
      if (!user) return
      const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile) return
      orgId = profile.org_id
      sessionStorage.setItem('s_org_id', orgId!)
    }
    const { data } = await sb.from('notifications').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
    setNotifications(data || [])
    setLoading(false)
  }

  async function markRead(id: string) {
    await sb.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n))
  }

  async function markAllRead() {
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) return
    await sb.from('notifications').update({ read: true }).eq('org_id', orgId).eq('read', false)
    setNotifications(prev => prev.map(n => ({...n, read: true})))
  }

  async function del(id: string) {
    await sb.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const unread   = notifications.filter(n => !n.read).length
  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications

  if (loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:800,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.4}}.sk{animation:sk 1.4s infinite}`}</style>
      {[1,2,3].map(i=>(<div key={i} style={{...card,padding:16,marginBottom:10,display:'flex',gap:12}}><div className="sk" style={{width:40,height:40,borderRadius:radius.md,background:colors.border,flexShrink:0}}/><div style={{flex:1}}><div className="sk" style={{height:12,width:'60%',background:colors.border,borderRadius:6,marginBottom:8}}/><div className="sk" style={{height:10,width:'80%',background:colors.border,borderRadius:6}}/></div></div>))}
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:800,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap' as const,gap:12}}>
        <div>
          <h1 style={{...pageTitle}}>الإشعارات</h1>
          <p style={{...pageSub}}>{unread > 0 ? `${unread} إشعار غير مقروء` : 'كل الإشعارات مقروءة'}</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{display:'flex',background:colors.bg,borderRadius:radius.md,padding:3,border:`1px solid ${colors.border2}`}}>
            {(['all','unread'] as const).map(f => (
              <button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 14px',borderRadius:radius.sm,border:'none',background:filter===f?colors.surface:'transparent',color:filter===f?colors.text:colors.text3,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family,boxShadow:filter===f?'0 1px 3px rgba(0,0,0,.08)':'none',transition:'all .15s'}}>
                {f==='all'?'الكل':'غير مقروء'}{f==='unread'&&unread>0&&<span style={{marginRight:4,background:colors.danger,color:'white',fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:99}}>{unread}</span>}
              </button>
            ))}
          </div>
          {unread > 0 && <button onClick={markAllRead} style={{...btnSecondary,padding:'8px 14px',fontSize:font.xs}}>تحديد الكل كمقروء</button>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{...card,padding:'64px 20px',textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:12}}>🔔</div>
          <div style={{fontSize:font.md,fontWeight:600,color:colors.text2,marginBottom:4}}>{filter==='unread'?'لا توجد إشعارات غير مقروءة':'لا توجد إشعارات'}</div>
          <div style={{fontSize:font.sm,color:colors.text4}}>ستظهر إشعارات المخزون هنا</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
          {filtered.map((n) => {
            const c = TYPE_CFG[n.type] || TYPE_CFG.info
            return (
              <div key={n.id} onClick={()=>!n.read&&markRead(n.id)}
                style={{...card,padding:'14px 16px',cursor:n.read?'default':'pointer',display:'flex',alignItems:'flex-start',gap:12,transition:'all .2s',background:n.read?colors.surface:c.bg,borderColor:n.read?colors.border:c.border}}>
                <div style={{width:40,height:40,flexShrink:0,borderRadius:radius.md,background:n.read?colors.bg:c.bg,border:`1.5px solid ${n.read?colors.border2:c.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{c.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:4}}>
                    <div style={{fontSize:font.sm,fontWeight:n.read?500:700,color:n.read?colors.text2:colors.text}}>{n.title}</div>
                    {!n.read && <span style={{...tag('white',c.color,c.color),fontSize:10,flexShrink:0}}>جديد</span>}
                  </div>
                  <div style={{fontSize:font.xs,color:n.read?colors.text4:colors.text3,marginBottom:6,lineHeight:1.6}}>{n.message}</div>
                  <div style={{fontSize:10,color:colors.text4}}>{new Date(n.created_at).toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();del(n.id)}} style={{width:28,height:28,borderRadius:radius.sm,border:`1px solid ${colors.border2}`,background:colors.surface,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:colors.text4,flexShrink:0,fontSize:12}}>✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
