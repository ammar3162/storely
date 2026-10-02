'use client'
export const dynamic = 'force-dynamic'
import PageIcon from '@/components/PageIcon'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { toast } from '@/components/toast'
import { getOrgId } from '@/lib/session'
import { colors, radius, font, card, btnSecondary, tag, pageTitle, pageSub } from '@/lib/ds'
import { cache } from '@/lib/cache'

const TYPE_CFG: Record<string,{icon:string;color:string;bg:string;border:string}> = {
  warning: { icon:'⚠️', color:colors.warning, bg:colors.warningLight, border:colors.warningBorder },
  danger:  { icon:'🚨', color:colors.danger,  bg:colors.dangerLight,  border:colors.dangerBorder  },
  success: { icon:'✅', color:colors.primary, bg:colors.primaryLight, border:colors.primaryBorder },
  info:    { icon:'ℹ️', color:colors.info,    bg:colors.infoLight,    border:colors.infoBorder    },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all'|'unread'|'warning'|'success'|'info'>('all')
  const [deciding, setDeciding] = useState<string|null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const cachedOrgId = sessionStorage.getItem('s_org_id')
    const bid = sessionStorage.getItem('s_branch_id')
    // عرض كاش الإشعارات فوراً لو متوفر
    if (cachedOrgId) {
      const cached = cache.get('notifications:'+cachedOrgId+':'+(bid||'all'))
      if (cached) { setNotifications(cached); setLoading(false) }
      else setLoading(true)
    } else setLoading(true)
    const orgId = await getOrgId()
    if (!orgId) return
    const j = await api.get('/api/notifications', { org_id: orgId, branch_id: bid })
    if (!j.success) { setLoading(false); return }
    setNotifications(j.notifications || [])
    cache.set('notifications:'+orgId+':'+(bid||'all'), j.notifications || [])
    setLoading(false)
  }

  async function markRead(id: string) {
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) return
    await api.patch('/api/notifications', { org_id: orgId, id })
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n))
  }

  // أزرار القرار حسب نوع الطلب — نفس الـAPI اللي تستخدمه صفحة إدارة الموظفين
  const DECISIONS: Record<string, { approve: string; reject: string; approved: string; rejected: string; call: (orgId: string, id: string, ok: boolean) => Promise<any> }> = {
    cashier_deficit: { approve: 'اعتماد الخصم من الراتب', reject: 'رفض', approved: 'تم اعتماد الخصم من راتب الكاشير', rejected: 'تم رفض الخصم — ما انخصم من الراتب',
      call: (orgId, id, ok) => api.post('/api/cashier-deficit-decision', { org_id: orgId, closing_id: id, decision: ok ? 'approved' : 'rejected' }) },
    excuse_request: { approve: 'موافقة', reject: 'رفض', approved: 'تمت الموافقة على الاستئذان', rejected: 'تم رفض الاستئذان',
      call: (orgId, id, ok) => api.put('/api/attendance-permission-request', { org_id: orgId, id, action: ok ? 'approve' : 'reject' }) },
    advance_request: { approve: 'موافقة على السلفة', reject: 'رفض', approved: 'تمت الموافقة على السلفة', rejected: 'تم رفض السلفة',
      call: (orgId, id, ok) => api.patch('/api/staff-payroll-adjustments', { org_id: orgId, adjustment_id: id, decision: ok ? 'approved' : 'rejected' }) },
    leave_request: { approve: 'موافقة على الإجازة', reject: 'رفض', approved: 'تمت الموافقة على الإجازة', rejected: 'تم رفض الإجازة',
      call: (orgId, id, ok) => api.patch('/api/staff-leave', { org_id: orgId, request_id: id, decision: ok ? 'approved' : 'rejected' }) },
  }

  async function decide(n: any, ok: boolean) {
    const orgId = sessionStorage.getItem('s_org_id')
    const cfg = DECISIONS[n.ref_type]
    if (!orgId || !cfg || deciding) return
    setDeciding(n.id)
    const r = await cfg.call(orgId, n.ref_id, ok)
    setDeciding(null)
    if (!r.success) { toast(r.error || 'تعذر حفظ القرار', 'error'); load(); return }
    toast(ok ? cfg.approved : cfg.rejected)
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, decision: ok ? 'approved' : 'rejected', read: true } : x))
    window.dispatchEvent(new Event('notifications-updated'))
  }

  async function markAllRead() {
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) return
    const bidAll = sessionStorage.getItem('s_branch_id')
    await api.patch('/api/notifications', { org_id: orgId, all: true, branch_id: bidAll })
    setNotifications(prev => prev.map(n => ({...n, read: true})))
    window.dispatchEvent(new Event('notifications-updated'))
  }

  async function del(id: string) {
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) return
    await api.del('/api/notifications', { org_id: orgId, id })
    setNotifications(prev => prev.filter(n => n.id !== id))
    window.dispatchEvent(new Event('notifications-updated'))
  }

  const unread   = notifications.filter(n => !n.read).length
  const filtered = filter === 'unread' ? notifications.filter(n => !n.read)
    : filter === 'all' ? notifications
    : notifications.filter(n => n.type === filter)

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
          <h1 style={{...pageTitle}}><PageIcon/>الإشعارات</h1>
          <p style={{...pageSub}}>{unread > 0 ? `${unread} إشعار غير مقروء` : 'كل الإشعارات مقروءة'}</p>
        </div>
        {unread > 0 && <button onClick={markAllRead} style={{...btnSecondary,padding:'8px 14px',fontSize:font.xs,flexShrink:0}}>تحديد الكل كمقروء</button>}
      </div>

      <div style={{display:'flex',gap:6,flexWrap:'wrap' as const,marginBottom:18}}>
        {([
          {key:'all',label:'الكل'},
          {key:'unread',label:'غير مقروء'},
          {key:'warning',label:'⚠️ تحذير'},
          {key:'success',label:'✅ نجاح'},
          {key:'info',label:'ℹ️ معلومة'},
        ] as const).map(f => (
          <button key={f.key} onClick={()=>setFilter(f.key)}
            style={{padding:'7px 13px',borderRadius:99,border:`1.5px solid ${filter===f.key?colors.text:colors.border2}`,background:filter===f.key?colors.text:'white',color:filter===f.key?'white':colors.text3,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family,transition:'all .15s',whiteSpace:'nowrap' as const}}>
            {f.label}{f.key==='unread'&&unread>0&&<span style={{marginRight:4,background:colors.danger,color:'white',fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:99}}>{unread}</span>}
          </button>
        ))}
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
                  {DECISIONS[n.ref_type] && n.decision && (
                    n.decision==='pending' ? (
                      n.can_decide ? (
                        <div style={{display:'flex',gap:8,margin:'4px 0 8px',flexWrap:'wrap' as const}} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>decide(n,true)} disabled={deciding===n.id}
                            style={{padding:'7px 14px',borderRadius:8,border:'none',background:n.ref_type==='cashier_deficit'?colors.danger:colors.primary,color:'white',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:deciding===n.id?.6:1}}>
                            {DECISIONS[n.ref_type].approve}
                          </button>
                          <button onClick={()=>decide(n,false)} disabled={deciding===n.id}
                            style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${colors.border2}`,background:colors.surface,color:colors.text2,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:deciding===n.id?.6:1}}>
                            {DECISIONS[n.ref_type].reject}
                          </button>
                        </div>
                      ) : <div style={{fontSize:11,color:colors.text4,margin:'2px 0 8px'}}>بانتظار قرار المالك</div>
                    ) : (
                      <div style={{fontSize:11,fontWeight:700,color:n.decision==='approved'?(n.ref_type==='cashier_deficit'?colors.danger:colors.primary):colors.text3,margin:'2px 0 8px'}}>
                        {n.decision==='approved' ? `✓ ${DECISIONS[n.ref_type].approved}` : DECISIONS[n.ref_type].rejected}
                      </div>
                    )
                  )}
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
