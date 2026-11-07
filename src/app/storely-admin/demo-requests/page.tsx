'use client'
import { useState, useEffect } from 'react'
import { Building2, Mail, MessageCircle, Phone, Store } from 'lucide-react'
import { StorelyCard, StorelyEmptyState, StorelyPageHeader, StorelyStatusBadge } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

// حالات يدوية — تتحكم فيها أنت لمتابعة التواصل قبل التسجيل
const STATUS_LABELS: Record<string,string> = { new:'جديد', contacted:'تم التواصل', rejected:'مرفوض' }
const STATUS_COLORS: Record<string,string> = { new:storelyTokens.color.info, contacted:storelyTokens.color.warning, rejected:storelyTokens.color.danger }

export default function DemoRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)

  function key() { return sessionStorage.getItem('storely_admin_pass') || '' }

  useEffect(() => {
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key() } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
        load()
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/demo-requests', { headers: { 'x-admin-key': key() } })
    const data = await res.json()
    setRequests(data.requests || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/admin/demo-requests', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': key() },
      body: JSON.stringify({ id, status })
    })
    load()
  }

  if (!authChecked) return null

  return (
    <div className="demo-requests-page" dir="rtl">
      <style>{demoStyles}</style>
      <StorelyPageHeader title="طلبات عرض النظام" description={<>الطلبات اللي وصلت من نموذج "اطلب عرض النظام" بالصفحة الرئيسية ({requests.length}) — الحالة الخضراء تلقائية، تُكتشف من رقم الجوال نفسه لما يسجّل العميل حساب</>} />
      <StorelyCard className="demo-workspace">
        {loading ? <div className="demo-placeholder" aria-busy="true">جاري التحميل...</div> :
          requests.length === 0 ? <StorelyEmptyState className="!border-0" title="لا توجد طلبات بعد" /> : (
            <div>
              {requests.map((r:any) => {
                const isPaid = r.liveStatus && r.liveStatus.subscription_type && r.liveStatus.subscription_type !== 'trial'
                return (
                  <article key={r.id} className="demo-record" data-matched={!!r.matched_org_id}>
                    <div className="demo-record-header">
                      <div className="min-w-0">
                        <h2 className="demo-name">{r.first_name} {r.last_name}</h2>
                        <div className="demo-date">{new Date(r.created_at).toLocaleString('ar-SA', {numberingSystem:'latn'})}</div>
                      </div>
                      {r.matched_org_id ? (
                        <StorelyStatusBadge status={isPaid?'success':'info'} className="!h-auto min-h-6 py-1 leading-5">
                          {isPaid ? 'مشترك مدفوع' : 'أنشأ حساب — في فترة التجربة'}
                        </StorelyStatusBadge>
                      ) : (
                        <select value={r.status} onChange={e=>updateStatus(r.id, e.target.value)} className="demo-status" style={{color:STATUS_COLORS[r.status]||storelyTokens.color.textMuted}}>
                          {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="demo-details">
                      <div><Building2 size={16} aria-hidden="true" /><span>{r.business_name}</span></div>
                      <div><Store size={16} aria-hidden="true" /><span>{r.branch_count || 'غير محدد'}</span></div>
                      <div><Phone size={16} aria-hidden="true" /><a href={`https://wa.me/${r.phone.replace(/[^0-9]/g,'')}`} target="_blank" dir="ltr">{r.phone}</a></div>
                      <div><Mail size={16} aria-hidden="true" /><a href={`mailto:${r.email}`} dir="ltr">{r.email}</a></div>
                    </div>
                    {!r.matched_org_id && (
                      <a href={`https://wa.me/${r.phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent('مرحباً '+r.first_name+'! 🎉\\n\\nشكراً لطلبك عرض Storely لإدارة مخزون "'+r.business_name+'".\\n\\nودّي أوريك النظام مباشرة وأجاوب على أي سؤال عندك — متى يناسبك اتصال سريع 5 دقائق؟\\n\\nأو لو حاب تبدأ فوراً بنفسك، تقدر تسجّل حسابك المجاني (14 يوم بدون بطاقة ائتمان) من هنا:\\nhttps://storely.dev/login?mode=register')}`}
                      target="_blank" rel="noreferrer"
                      className="demo-contact">
                      <MessageCircle size={16} aria-hidden="true" /> تواصل معه عبر واتساب
                    </a>
                    )}
                  </article>
                )
              })}
            </div>
          )}
      </StorelyCard>
    </div>
  )
}

const demoStyles = `
  .demo-requests-page { max-width: 1100px; margin: 0 auto; min-width: 0; font-family: ${storelyTokens.typography.family}; color: ${storelyTokens.color.text}; font-size: ${storelyTokens.typography.body}px; line-height: ${storelyTokens.typography.lineHeight}; }
  .demo-requests-page h1 { font-size: ${storelyTokens.typography.title}px; line-height: 1.5; }
  .demo-requests-page .demo-workspace { border-radius: ${storelyTokens.radius.card}; }
  .demo-requests-page .demo-record { padding: ${storelyTokens.spacing[6]}px; border-bottom: 1px solid ${storelyTokens.color.border}; overflow-wrap: anywhere; }
  .demo-requests-page .demo-record:last-child { border-bottom: 0; }
  .demo-requests-page .demo-record[data-matched=true] { border-inline-start: 3px solid ${storelyTokens.color.successBorder}; }
  .demo-requests-page .demo-record-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: ${storelyTokens.spacing[4]}px; margin-bottom: ${storelyTokens.spacing[5]}px; }
  .demo-requests-page .demo-name { font-size: ${storelyTokens.typography.section}px; font-weight: 600; }
  .demo-requests-page .demo-date { margin-top: ${storelyTokens.spacing[1]}px; font-size: ${storelyTokens.typography.supporting}px; color: ${storelyTokens.color.textMuted}; }
  .demo-requests-page .demo-status { min-height: 36px; max-width: 100%; padding: ${storelyTokens.spacing[2]}px ${storelyTokens.spacing[3]}px; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; background: ${storelyTokens.color.surface}; font: inherit; font-weight: 600; }
  .demo-requests-page .demo-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: ${storelyTokens.spacing[4]}px; margin-bottom: ${storelyTokens.spacing[5]}px; }
  .demo-requests-page .demo-details > div { display: flex; align-items: baseline; gap: ${storelyTokens.spacing[3]}px; min-width: 0; }
  .demo-requests-page .demo-details svg { flex-shrink: 0; align-self: center; color: ${storelyTokens.color.textMuted}; }
  .demo-requests-page .demo-details a { color: ${storelyTokens.color.navy}; text-decoration: underline; text-underline-offset: 4px; overflow-wrap: anywhere; min-width: 0; }
  .demo-requests-page .demo-contact { display: inline-flex; align-items: center; justify-content: center; gap: ${storelyTokens.spacing[2]}px; padding: ${storelyTokens.spacing[2]}px ${storelyTokens.spacing[4]}px; min-height: 40px; background: ${storelyTokens.color.navy}; color: ${storelyTokens.color.surface}; border-radius: ${storelyTokens.radius.control}; font-size: ${storelyTokens.typography.body}px; font-weight: 600; text-decoration: none; }
  .adm-root .demo-requests-page .demo-status:focus, .demo-requests-page .demo-contact:focus-visible { outline: none; border-color: ${storelyTokens.color.navy} !important; box-shadow: ${storelyTokens.shadow.focus} !important; }
  .demo-requests-page .demo-placeholder { padding: ${storelyTokens.spacing[8]}px; color: ${storelyTokens.color.textMuted}; }
  @media (max-width: 640px) { .demo-requests-page .demo-record { padding: ${storelyTokens.spacing[4]}px; } .demo-requests-page .demo-details { grid-template-columns: minmax(0, 1fr); } .demo-requests-page .demo-contact { width: 100%; } }
`
