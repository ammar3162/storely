'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { toast } from '@/components/toast'
import { Bell, Check, Megaphone } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyFormField, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

export default function AdminNotificationsPage() {
  const [orgs, setOrgs]         = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [title, setTitle]       = useState('')
  const [message, setMessage]   = useState('')
  const [type, setType]         = useState<'info'|'warning'|'success'|'danger'>('info')
  const [deliveryType, setDeliveryType] = useState<'internal'|'banner'>('internal')
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'send'|'history'>('send')
  const [orgSearch, setOrgSearch] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated || data.admin?.role !== 'super_admin') { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(()=>{ if(authChecked) load() },[authChecked])

  async function load() {
    setLoading(true)
    const adminKey = sessionStorage.getItem('storely_admin_pass') || ''
    try {
      const res = await fetch('/api/admin/list-orgs', { headers: { 'x-admin-key': adminKey } })
      const j = await res.json()
      setOrgs(j.orgs || [])
    } catch { setOrgs([]) }
    try {
      const res = await fetch('/api/admin/notifications', { headers: { 'x-admin-key': adminKey } })
      const j = await res.json()
      setSent(j.notifications || [])
    } catch { setSent([]) }
    setLoading(false)
  }

  function toggleOrg(id:string) {
    setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])
  }

  async function sendNotification() {
    if(!title.trim()||!message.trim()){toast('أدخل العنوان والرسالة','warning');return}
    setSending(true)
    const targets = selected.length===0 ? orgs.map(o=>o.id) : selected
    const isBanner = deliveryType==='banner'
    let j:any = {}
    try {
      const res = await fetch('/api/admin/notifications',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-admin-key':sessionStorage.getItem('storely_admin_pass')||''},
        body:JSON.stringify({ title:title.trim(), message:message.trim(), type, target_orgs:selected.length===0?null:selected, org_ids:targets, with_org_notifications:!isBanner }),
      })
      j = await res.json()
    } catch { j = { error: 'خطأ بالاتصال' } }
    if(!j.success){toast((j.stage==='notifications'?'خطأ في الإشعارات: ':'خطأ: ')+(j.error||''),'error');setSending(false);return}
    if(isBanner) {
      const version = 'admin-'+Date.now()
      await fetch('/api/admin/feature-announcement',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-admin-key':sessionStorage.getItem('storely_admin_pass')||''},
        body:JSON.stringify({version,title:title.trim(),description:message.trim(),type:'banner',color:type==='danger'?'#ef4444':type==='warning'?'#f59e0b':type==='success'?'#029FA2':'#7c3aed',target_orgs:targets})
      })
      toast('تم إرسال البانر'); setTitle(''); setMessage(''); setSending(false); return
    }
    toast(`تم الإرسال لـ ${targets.length} منشأة`)
    setTitle('');setMessage('');setSelected([]);setSending(false);load()
  }

  const TC = {
    info:    {label:'معلومة', color:storelyTokens.color.info,    bg:storelyTokens.color.infoBg,    border:storelyTokens.color.infoBorder},
    warning: {label:'تحذير',  color:storelyTokens.color.warning, bg:storelyTokens.color.warningBg, border:storelyTokens.color.warningBorder},
    success: {label:'نجاح',   color:storelyTokens.color.success, bg:storelyTokens.color.successBg, border:storelyTokens.color.successBorder},
    danger:  {label:'خطر',    color:storelyTokens.color.danger,  bg:storelyTokens.color.dangerBg,  border:storelyTokens.color.dangerBorder},
  }

  return (
    <div className="admin-notifications-page" dir="rtl">
      <style>{notificationStyles}</style>
      <StorelyPageHeader title="إشعارات المنشآت" description="أرسل إشعارات تظهر في Storely مباشرة" />
      <div className="notification-tabs">
        {[{v:'send',l:'إرسال'},{v:'history',l:'السجل'}].map(t=>(
          <StorelyButton key={t.v} onClick={()=>setTab(t.v as any)} variant={tab===t.v?'primary':'secondary'} aria-pressed={tab===t.v}>{t.l}</StorelyButton>
        ))}
      </div>
      {tab==='send'&&(
        <div className="notification-workspace">
          <StorelyCard className="notification-panel" title="تفاصيل الإشعار">
            <div className="notification-form">
              <fieldset className="notification-fieldset">
                <legend>طريقة الإرسال</legend>
                <div className="notification-delivery">
                  <StorelyButton onClick={()=>setDeliveryType('internal')} variant={deliveryType==='internal'?'primary':'secondary'} aria-pressed={deliveryType==='internal'} className="!h-auto min-h-16 whitespace-normal py-3">
                    <Bell size={16} className="shrink-0" /><span>إشعار داخلي<br/><span className="text-xs font-normal">في جرس الإشعارات</span></span>
                  </StorelyButton>
                  <StorelyButton onClick={()=>setDeliveryType('banner')} variant={deliveryType==='banner'?'primary':'secondary'} aria-pressed={deliveryType==='banner'} className="!h-auto min-h-16 whitespace-normal py-3">
                    <Megaphone size={16} className="shrink-0" /><span>بانر عام<br/><span className="text-xs font-normal">شريط في الداشبورد</span></span>
                  </StorelyButton>
                </div>
              </fieldset>
              <fieldset className="notification-fieldset">
                <legend>النوع</legend>
                <div className="notification-types">
                  {Object.entries(TC).map(([k,v])=>(
                    <StorelyButton key={k} onClick={()=>setType(k as any)} variant={type===k?'primary':'secondary'} aria-pressed={type===k}>{v.label}</StorelyButton>
                  ))}
                </div>
              </fieldset>
              <StorelyFormField label="العنوان *" htmlFor="admin-notification-title">
                <input id="admin-notification-title" value={title} onChange={e=>setTitle(e.target.value)} className="notification-control" placeholder="مثال: تحديث جديد في Storely"/>
              </StorelyFormField>
              <StorelyFormField label="الرسالة *" htmlFor="admin-notification-message">
                <textarea id="admin-notification-message" value={message} onChange={e=>setMessage(e.target.value)} rows={4} className="notification-control" placeholder="اكتب تفاصيل الإشعار هنا..."/>
              </StorelyFormField>
              {(title||message)&&(
                <div className="notification-preview" style={{borderColor:TC[type].border}}>
                  <div className="notification-supporting font-semibold" style={{color:TC[type].color}}>معاينة</div>
                  <div className="font-semibold mt-2">{title||'العنوان'}</div>
                  <div className="notification-body mt-2">{message||'الرسالة...'}</div>
                </div>
              )}
              <StorelyButton onClick={sendNotification} disabled={sending} variant="primary" className="w-full !h-auto min-h-10 whitespace-normal py-2">
                {sending?'جاري الإرسال...':`إرسال ${selected.length===0?`للكل (${orgs.length})`:` لـ ${selected.length} منشأة`}`}
              </StorelyButton>
            </div>
          </StorelyCard>
          <StorelyCard className="notification-panel" title="المنشآت" description={selected.length===0?'سيُرسل للجميع':`${selected.length} محددة`}
            actions={<div className="flex flex-wrap gap-2">
              <StorelyButton size="sm" onClick={()=>setSelected(orgs.map(o=>o.id))}>الكل</StorelyButton>
              <StorelyButton size="sm" onClick={()=>setSelected([])}>إلغاء</StorelyButton>
            </div>}>
            <div className="notification-search">
              <input value={orgSearch} onChange={e=>setOrgSearch(e.target.value)} placeholder="بحث بالاسم..." className="notification-control"/>
            </div>
            <div className="notification-orgs">
              {loading?(
                <div className="notification-placeholder">جاري التحميل...</div>
              ):orgs.length===0?(
                <div className="notification-placeholder">ما فيه منشآت — تأكد من صلاحياتك أو حاول تحديث الصفحة</div>
              ):orgs.filter((o:any)=>o.name?.includes(orgSearch)).map((org,i,arr)=>{
                const isSel=selected.includes(org.id)
                return(
                  <div key={org.id} className="notification-org" onClick={()=>toggleOrg(org.id)} data-selected={isSel}
                    style={{borderBottomWidth:i<arr.length-1?1:0}}>
                    <div className="notification-checkbox">{isSel&&<Check size={14} aria-hidden="true" />}</div>
                    <span className="min-w-0 flex-1 font-medium">{org.name}</span>
                  </div>
                )
              })}
            </div>
          </StorelyCard>
        </div>
      )}
      {tab==='history'&&(
        <StorelyCard className="notification-panel" title="سجل الإشعارات">
          {sent.length===0?(
            <div className="notification-placeholder">لا توجد إشعارات بعد</div>
          ):sent.map((n,i)=>{
            const tc=TC[n.type as keyof typeof TC]||TC.info
            return(
              <div key={n.id} className="notification-history-row" style={{borderBottomWidth:i<sent.length-1?1:0}}>
                <div className="min-w-0 flex-1">
                  <div className="notification-history-meta">
                    <span className="notification-badge" style={{background:tc.bg,color:tc.color,borderColor:tc.border}}>{tc.label}</span>
                    <span className="notification-supporting">{new Date(n.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                  <div className="font-semibold mt-3">{n.title}</div>
                  <div className="notification-body mt-2">{n.message}</div>
                </div>
                <span className="notification-count">{n.sent_to_count} منشأة</span>
              </div>
            )
          })}
        </StorelyCard>
      )}
    </div>
  )
}

const notificationStyles = `
  .admin-notifications-page { max-width: 1100px; margin: 0 auto; min-width: 0; font-family: ${storelyTokens.typography.family}; color: ${storelyTokens.color.text}; font-size: ${storelyTokens.typography.body}px; line-height: ${storelyTokens.typography.lineHeight}; }
  .admin-notifications-page h1 { font-size: ${storelyTokens.typography.title}px; line-height: 1.5; }
  .admin-notifications-page h2 { font-size: ${storelyTokens.typography.section}px; }
  .admin-notifications-page .notification-tabs, .admin-notifications-page .notification-types { display: flex; flex-wrap: wrap; gap: ${storelyTokens.spacing[2]}px; }
  .admin-notifications-page .notification-tabs { margin-bottom: ${storelyTokens.spacing[6]}px; }
  .admin-notifications-page .notification-workspace { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: ${storelyTokens.spacing[6]}px; }
  .admin-notifications-page .notification-panel { min-width: 0; border-radius: ${storelyTokens.radius.card}; }
  .admin-notifications-page .notification-panel > div:first-child { flex-wrap: wrap; }
  .admin-notifications-page .notification-form { display: flex; flex-direction: column; gap: ${storelyTokens.spacing[5]}px; padding: ${storelyTokens.spacing[6]}px; }
  .admin-notifications-page .notification-fieldset { min-width: 0; border: 0; padding: 0; margin: 0; }
  .admin-notifications-page .notification-fieldset legend { font-size: 13px; font-weight: 600; margin-bottom: ${storelyTokens.spacing[2]}px; }
  .admin-notifications-page .notification-delivery { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: ${storelyTokens.spacing[2]}px; }
  .admin-notifications-page .notification-control { width: 100%; min-width: 0; min-height: 40px; padding: ${storelyTokens.spacing[2]}px ${storelyTokens.spacing[3]}px; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; background: ${storelyTokens.color.surface}; color: ${storelyTokens.color.text}; font: inherit; }
  .admin-notifications-page textarea { resize: vertical; }
  .adm-root .admin-notifications-page .notification-control:focus { outline: none; border-color: ${storelyTokens.color.navy} !important; box-shadow: ${storelyTokens.shadow.focus} !important; }
  .admin-notifications-page .notification-preview { padding: ${storelyTokens.spacing[4]}px; border: 1px solid; border-radius: ${storelyTokens.radius.control}; overflow-wrap: anywhere; background: ${storelyTokens.color.surface}; }
  .admin-notifications-page .notification-supporting { color: ${storelyTokens.color.textMuted}; font-size: ${storelyTokens.typography.supporting}px; }
  .admin-notifications-page .notification-body { color: ${storelyTokens.color.textMuted}; overflow-wrap: anywhere; white-space: pre-wrap; }
  .admin-notifications-page .notification-search { padding: ${storelyTokens.spacing[4]}px; border-bottom: 1px solid ${storelyTokens.color.border}; }
  .admin-notifications-page .notification-orgs { max-height: 400px; overflow-y: auto; }
  .admin-notifications-page .notification-org { display: flex; align-items: center; gap: ${storelyTokens.spacing[3]}px; padding: ${storelyTokens.spacing[4]}px; border-bottom-style: solid; border-color: ${storelyTokens.color.border}; cursor: pointer; overflow-wrap: anywhere; }
  .admin-notifications-page .notification-org:hover, .admin-notifications-page .notification-org[data-selected=true] { background: ${storelyTokens.color.background}; }
  .admin-notifications-page .notification-checkbox { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 20px; height: 20px; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; }
  .admin-notifications-page .notification-org[data-selected=true] .notification-checkbox { background: ${storelyTokens.color.navy}; border-color: ${storelyTokens.color.navy}; color: ${storelyTokens.color.surface}; }
  .admin-notifications-page .notification-placeholder { padding: ${storelyTokens.spacing[8]}px ${storelyTokens.spacing[5]}px; text-align: center; color: ${storelyTokens.color.textMuted}; }
  .admin-notifications-page .notification-history-row { display: flex; align-items: flex-start; flex-wrap: wrap; gap: ${storelyTokens.spacing[4]}px; padding: ${storelyTokens.spacing[5]}px; border-bottom-style: solid; border-color: ${storelyTokens.color.border}; }
  .admin-notifications-page .notification-history-meta { display: flex; align-items: center; flex-wrap: wrap; gap: ${storelyTokens.spacing[3]}px; }
  .admin-notifications-page .notification-badge { padding: ${storelyTokens.spacing[1]}px ${storelyTokens.spacing[2]}px; border: 1px solid; border-radius: ${storelyTokens.radius.control}; font-size: 12px; font-weight: 600; }
  .admin-notifications-page .notification-count { font-size: 13px; color: ${storelyTokens.color.textMuted}; }
  @media (max-width: 900px) { .admin-notifications-page .notification-workspace { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 640px) { .admin-notifications-page .notification-form { padding: ${storelyTokens.spacing[4]}px; } .admin-notifications-page .notification-delivery { grid-template-columns: minmax(0, 1fr); } }
`
