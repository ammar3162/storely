'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile) return
    const { data } = await sb.from('notifications')
      .select('*').eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
    setNotifications(data || [])
    setLoading(false)
  }

  async function markRead(id: string) {
    await sb.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n))
  }

  async function markAllRead() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    await sb.from('notifications').update({ read: true }).eq('org_id', profile?.org_id).eq('read', false)
    setNotifications(prev => prev.map(n => ({...n, read: true})))
  }

  async function del(id: string) {
    await sb.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const unread = notifications.filter(n => !n.read).length

  const cfg: Record<string,{icon:string,bg:string,border:string,color:string}> = {
    warning: {icon:'⚠️', bg:'#fffbeb', border:'#fcd34d', color:'#92400e'},
    danger:  {icon:'🚨', bg:'#fef2f2', border:'#fecaca', color:'#991b1b'},
    success: {icon:'✅', bg:'#f0fdf4', border:'#86efac', color:'#166534'},
    info:    {icon:'ℹ️', bg:'#eff6ff', border:'#bfdbfe', color:'#1e40af'},
  }

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',maxWidth:800,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap' as const,gap:12}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:3}}>الإشعارات</h1>
          <p style={{fontSize:12,color:'#64748b'}}>{unread>0?`${unread} إشعار غير مقروء`:'كل الإشعارات مقروءة'}</p>
        </div>
        {unread>0 && <button onClick={markAllRead} style={{padding:'8px 16px',background:'#1a4731',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>تحديد الكل كمقروء</button>}
      </div>

      {loading ? (
        <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}>جاري التحميل...</div>
      ) : notifications.length===0 ? (
        <div style={{padding:64,textAlign:'center',color:'#94a3b8'}}>
          <div style={{fontSize:48,marginBottom:12}}>🔔</div>
          <div style={{fontSize:15,fontWeight:600,color:'#475569',marginBottom:4}}>لا توجد إشعارات</div>
          <div style={{fontSize:12}}>ستظهر إشعارات المخزون هنا</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
          {notifications.map(n => {
            const c = cfg[n.type]||cfg.info
            return (
              <div key={n.id} onClick={()=>!n.read&&markRead(n.id)}
                style={{background:n.read?'white':c.bg,border:'1.5px solid '+(n.read?'#e8ecf0':c.border),borderRadius:12,padding:'14px 16px',cursor:n.read?'default':'pointer',display:'flex',alignItems:'flex-start',gap:12,transition:'all 0.2s'}}>
                <div style={{width:40,height:40,background:n.read?'#f1f5f9':c.bg,border:'1.5px solid '+(n.read?'#e2e8f0':c.border),borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                  {c.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:4}}>
                    <div style={{fontSize:14,fontWeight:n.read?500:700,color:n.read?'#475569':'#0f172a'}}>{n.title}</div>
                    {!n.read && <span style={{background:c.color,color:'white',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:10,flexShrink:0}}>جديد</span>}
                  </div>
                  <div style={{fontSize:13,color:n.read?'#94a3b8':'#475569',marginBottom:6,lineHeight:1.5}}>{n.message}</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>{new Date(n.created_at).toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();del(n.id)}}
                  style={{width:28,height:28,borderRadius:7,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',flexShrink:0,fontSize:13}}>✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
