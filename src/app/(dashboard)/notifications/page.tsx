'use client'
export const dynamic = 'force-dynamic'
import { Bell, CheckCheck, CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyPageHeader, StorelyStatusBadge } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { cache } from '@/lib/cache'

const TYPE_CFG = {
  warning: { icon: TriangleAlert, color: storelyTokens.color.warning, status: 'warning' },
  danger: { icon: CircleAlert, color: storelyTokens.color.danger, status: 'danger' },
  success: { icon: CircleCheck, color: storelyTokens.color.success, status: 'success' },
  info: { icon: Info, color: storelyTokens.color.info, status: 'info' },
} as const

const notificationStyles = `
  .notifications-page { max-width: 1000px; margin: 0 auto; min-width: 0; font-family: ${storelyTokens.typography.family}; color: ${storelyTokens.color.text}; line-height: ${storelyTokens.typography.lineHeight}; }
  .notifications-page h1 { font-size: ${storelyTokens.typography.title}px; line-height: 1.5; }
  .notifications-page .notification-toolbar { display: flex; flex-wrap: wrap; gap: ${storelyTokens.spacing[2]}px; padding: ${storelyTokens.spacing[4]}px; border-bottom: 1px solid ${storelyTokens.color.border}; }
  .notifications-page .notification-row { display: flex; align-items: flex-start; gap: ${storelyTokens.spacing[4]}px; padding: ${storelyTokens.spacing[6]}px; background: ${storelyTokens.color.surface}; border-bottom: 1px solid ${storelyTokens.color.border}; }
  .notifications-page .notification-row:last-child { border-bottom: 0; }
  .notifications-page .notification-row[data-unread=true] { border-inline-start: 3px solid ${storelyTokens.color.navy}; cursor: pointer; }
  .notifications-page .notification-row[data-unread=true]:hover { background: ${storelyTokens.color.background}; }
  .notifications-page .notification-icon { flex-shrink: 0; margin-top: ${storelyTokens.spacing[1]}px; }
  .notifications-page .notification-copy { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .notifications-page .notification-title { display: flex; flex-wrap: wrap; align-items: flex-start; gap: ${storelyTokens.spacing[2]}px; margin-bottom: ${storelyTokens.spacing[2]}px; }
  .notifications-page .notification-title h2 { flex: 1; min-width: 0; font-size: ${storelyTokens.typography.body}px; }
  .notifications-page .notification-message { font-size: ${storelyTokens.typography.body}px; color: ${storelyTokens.color.textMuted}; margin-bottom: ${storelyTokens.spacing[2]}px; white-space: pre-wrap; }
  .notifications-page .notification-date { font-size: ${storelyTokens.typography.supporting}px; color: ${storelyTokens.color.textMuted}; }
  .notifications-page .notification-empty { padding: ${storelyTokens.spacing[8]}px ${storelyTokens.spacing[5]}px; text-align: center; }
  .notifications-page .notification-empty svg { margin: 0 auto ${storelyTokens.spacing[3]}px; color: ${storelyTokens.color.textMuted}; }
  .notifications-page .notification-empty p { margin-top: ${storelyTokens.spacing[2]}px; font-size: ${storelyTokens.typography.body}px; color: ${storelyTokens.color.textMuted}; }
  .notifications-page .notification-skeleton { height: 12px; background: ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; }
  @media (max-width: 640px) { .notifications-page .notification-row { padding: ${storelyTokens.spacing[4]}px; gap: ${storelyTokens.spacing[3]}px; } }
`

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all'|'unread'|'warning'|'success'|'info'>('all')

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
    <div className="notifications-page" dir="rtl" aria-busy="true">
      <style>{notificationStyles}</style>
      <StorelyCard>
        {[1,2,3].map(i => (
          <div key={i} className="notification-row" aria-hidden="true">
            <Bell size={20} className="notification-icon" />
            <div className="notification-copy">
              <div className="notification-skeleton mb-3 w-3/5" />
              <div className="notification-skeleton w-4/5" />
            </div>
          </div>
        ))}
      </StorelyCard>
    </div>
  )

  return (
    <div className="notifications-page" dir="rtl">
      <style>{notificationStyles}</style>
      <StorelyPageHeader
        title="الإشعارات"
        description={unread > 0 ? `${unread} إشعار غير مقروء` : 'كل الإشعارات مقروءة'}
        actions={unread > 0 && <StorelyButton onClick={markAllRead} icon={<CheckCheck size={16} />}>تحديد الكل كمقروء</StorelyButton>}
      />
      <StorelyCard>
        <div className="notification-toolbar">
          {([
            {key:'all',label:'الكل',icon:null},
            {key:'unread',label:'غير مقروء',icon:null},
            {key:'warning',label:'تحذير',icon:TriangleAlert},
            {key:'success',label:'نجاح',icon:CircleCheck},
            {key:'info',label:'معلومة',icon:Info},
          ] as const).map(f => (
            <StorelyButton key={f.key} onClick={()=>setFilter(f.key)}
              variant={filter===f.key?'primary':'secondary'} aria-pressed={filter===f.key}
              icon={f.icon ? <f.icon size={16} /> : undefined}>
              {f.label}{f.key==='unread'&&unread>0&&<span className="text-xs">{unread}</span>}
            </StorelyButton>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="notification-empty">
            <Bell size={24} aria-hidden="true" />
            <div className="text-sm font-semibold">{filter==='unread'?'لا توجد إشعارات غير مقروءة':'لا توجد إشعارات'}</div>
            <p>ستظهر إشعارات المخزون هنا</p>
          </div>
        ) : (
          <div>
            {filtered.map((n) => {
              const c = TYPE_CFG[n.type as keyof typeof TYPE_CFG] || TYPE_CFG.info
              const Icon = c.icon
              return (
                <div key={n.id} onClick={()=>!n.read&&markRead(n.id)} className="notification-row" data-unread={!n.read}>
                  <Icon size={20} className="notification-icon" style={{color:c.color}} aria-hidden="true" />
                  <div className="notification-copy">
                    <div className="notification-title">
                      <h2 className={n.read?'font-medium':'font-semibold'}>{n.title}</h2>
                      {!n.read && <StorelyStatusBadge status={c.status}>جديد</StorelyStatusBadge>}
                    </div>
                    <div className="notification-message">{n.message}</div>
                    <div className="notification-date" dir="ltr">{new Date(n.created_at).toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
                  </div>
                  <StorelyButton onClick={e=>{e.stopPropagation();del(n.id)}} variant="ghost" size="sm" className="!w-8 !px-0" aria-label="حذف" title="حذف">
                    <X size={16} />
                  </StorelyButton>
                </div>
              )
            })}
          </div>
        )}
      </StorelyCard>
    </div>
  )
}
