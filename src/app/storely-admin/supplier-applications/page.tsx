'use client'
import { useEffect, useState } from 'react'
import { MessageCircle, RefreshCw, Globe } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { adminFetch, fmtDate } from '../_admin/kit'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyPageHeader, StorelyStatusBadge } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

const isSafeUrl = (u?: string | null) => !!u && /^https?:\/\//i.test(u.trim())
const STATUS = { pending: { l: 'بانتظار المراجعة', t: 'warning' }, approved: { l: 'مقبول', t: 'primary' }, rejected: { l: 'مرفوض', t: 'danger' } } as const

export default function SupplierApplicationsPage() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const j = await adminFetch('/api/admin/supplier-applications')
    setApps(j.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function log(action: string, company?: string) {
    await adminFetch('/api/admin/log-action', { method: 'POST', body: { action, details: { company_name: company } } })
  }

  async function approve(a: any) {
    setBusy(a.id)
    await adminFetch('/api/admin/supplier-applications', { method: 'POST', body: { id: a.id, status: 'approved' } })
    await log('supplier_application_approved', a.company_name)
    setBusy(null); load()
  }

  async function remove(a: any, rejected: boolean) {
    if (!(await confirmDialog({ title: rejected ? 'رفض الطلب' : 'حذف الطلب', message: `${rejected ? 'رفض' : 'حذف'} طلب "${a.company_name}"؟ الطلب ينحذف من القائمة.` }))) return
    setBusy(a.id)
    await adminFetch(`/api/admin/supplier-applications?id=${encodeURIComponent(a.id)}`, { method: 'DELETE' })
    await log(rejected ? 'supplier_application_rejected' : 'delete_supplier_application', a.company_name)
    setBusy(null); load()
  }

  const pending = apps.filter(a => a.status === 'pending')
  const shown = tab === 'pending' ? pending : apps

  return (
    <div className="supplier-applications-page" dir="rtl">
      <style>{supplierStyles}</style>
      <StorelyPageHeader title="طلبات الموردين" description="موردون طلبوا الانضمام لسوق Storely"
        actions={<StorelyButton onClick={load} disabled={loading}><RefreshCw size={16} /> تحديث</StorelyButton>} />
      <StorelyCard className="supplier-workspace">
        <div className="supplier-toolbar">
          {([['pending', `بانتظار المراجعة (${pending.length})`], ['all', `الكل (${apps.length})`]] as const).map(([k, l]) => (
            <StorelyButton key={k} onClick={() => setTab(k)} variant={tab === k ? 'primary' : 'secondary'} aria-pressed={tab === k}>{l}</StorelyButton>
          ))}
        </div>
        {loading ? <div className="supplier-placeholder" aria-busy="true">جاري التحميل...</div> : shown.length === 0 ? <StorelyEmptyState className="!border-0" title={tab === 'pending' ? 'ما فيه طلبات تنتظر المراجعة' : 'ما فيه طلبات'} /> : (
          <div>
            {shown.map(a => {
              const st = STATUS[a.status as keyof typeof STATUS] || STATUS.pending
              const phone = String(a.phone || '').replace(/\D/g, '')
              return (
                <article key={a.id} className="supplier-record">
                  <div className="supplier-copy">
                    <div className="supplier-record-heading">
                      <h2>{a.company_name}</h2>
                      <StorelyStatusBadge status={st.t === 'primary' ? 'success' : st.t}>{st.l}</StorelyStatusBadge>
                    </div>
                    <div className="supplier-contact-details">
                      <span>{a.contact_name}</span>
                      <span dir="ltr">{a.phone}</span>
                      {a.email && <span dir="ltr">{a.email}</span>}
                      {isSafeUrl(a.website) && <a href={a.website} target="_blank" rel="noopener noreferrer" className="supplier-website"><Globe size={16} /> الموقع</a>}
                    </div>
                    {a.business_type?.length > 0 && (
                      <div className="supplier-types">
                        {a.business_type.map((t: string) => <span key={t}>{t}</span>)}
                      </div>
                    )}
                    {a.description && <div className="supplier-description">{a.description}</div>}
                    <div className="supplier-date">{fmtDate(a.created_at, true)}</div>
                  </div>
                  <div className="supplier-actions">
                    {phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="supplier-whatsapp"><MessageCircle size={16} /> واتساب</a>}
                    {a.status === 'pending' && <>
                      <StorelyButton variant="primary" disabled={busy === a.id} aria-busy={busy === a.id} onClick={() => approve(a)}>قبول</StorelyButton>
                      <StorelyButton variant="danger" disabled={busy === a.id} onClick={() => remove(a, true)}>رفض</StorelyButton>
                    </>}
                    {a.status !== 'pending' && <StorelyButton variant="ghost" disabled={busy === a.id} onClick={() => remove(a, false)}>حذف</StorelyButton>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </StorelyCard>
    </div>
  )
}

const supplierStyles = `
  .supplier-applications-page { min-width: 0; font-family: ${storelyTokens.typography.family}; color: ${storelyTokens.color.text}; font-size: ${storelyTokens.typography.body}px; line-height: ${storelyTokens.typography.lineHeight}; }
  .supplier-applications-page h1 { font-size: ${storelyTokens.typography.title}px; line-height: 1.5; }
  .supplier-applications-page .supplier-workspace { border-radius: ${storelyTokens.radius.card}; }
  .supplier-applications-page .supplier-toolbar { display: flex; flex-wrap: wrap; gap: ${storelyTokens.spacing[2]}px; padding: ${storelyTokens.spacing[4]}px ${storelyTokens.spacing[5]}px; border-bottom: 1px solid ${storelyTokens.color.border}; }
  .supplier-applications-page .supplier-record { display: flex; align-items: flex-start; flex-wrap: wrap; gap: ${storelyTokens.spacing[6]}px; padding: ${storelyTokens.spacing[6]}px; border-bottom: 1px solid ${storelyTokens.color.border}; }
  .supplier-applications-page .supplier-record:last-child { border-bottom: 0; }
  .supplier-applications-page .supplier-copy { flex: 1 1 320px; min-width: 0; overflow-wrap: anywhere; }
  .supplier-applications-page .supplier-record-heading { display: flex; align-items: center; flex-wrap: wrap; gap: ${storelyTokens.spacing[3]}px; }
  .supplier-applications-page h2 { font-size: ${storelyTokens.typography.section}px; font-weight: 600; }
  .supplier-applications-page .supplier-contact-details { display: flex; flex-wrap: wrap; gap: ${storelyTokens.spacing[3]}px ${storelyTokens.spacing[4]}px; margin-top: ${storelyTokens.spacing[3]}px; color: ${storelyTokens.color.textMuted}; }
  .supplier-applications-page .supplier-contact-details > * { min-width: 0; overflow-wrap: anywhere; }
  .supplier-applications-page .supplier-website { display: inline-flex; align-items: center; gap: ${storelyTokens.spacing[1]}px; color: ${storelyTokens.color.navy}; }
  .supplier-applications-page .supplier-types { display: flex; flex-wrap: wrap; gap: ${storelyTokens.spacing[2]}px; margin-top: ${storelyTokens.spacing[3]}px; }
  .supplier-applications-page .supplier-types span { font-size: 12px; padding: ${storelyTokens.spacing[1]}px ${storelyTokens.spacing[2]}px; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; }
  .supplier-applications-page .supplier-description { color: ${storelyTokens.color.textMuted}; margin-top: ${storelyTokens.spacing[3]}px; }
  .supplier-applications-page .supplier-date { font-size: ${storelyTokens.typography.supporting}px; color: ${storelyTokens.color.textMuted}; margin-top: ${storelyTokens.spacing[3]}px; }
  .supplier-applications-page .supplier-actions { display: flex; flex-wrap: wrap; gap: ${storelyTokens.spacing[2]}px; }
  .supplier-applications-page .supplier-whatsapp { display: inline-flex; align-items: center; justify-content: center; gap: ${storelyTokens.spacing[2]}px; min-height: 36px; padding: ${storelyTokens.spacing[2]}px ${storelyTokens.spacing[4]}px; background: ${storelyTokens.color.surface}; color: ${storelyTokens.color.navy}; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; font-weight: 600; text-decoration: none; }
  .supplier-applications-page .supplier-whatsapp:focus-visible { outline: none; box-shadow: ${storelyTokens.shadow.focus}; }
  .supplier-applications-page .supplier-placeholder { padding: ${storelyTokens.spacing[8]}px; color: ${storelyTokens.color.textMuted}; }
  @media (max-width: 640px) { .supplier-applications-page .supplier-record { padding: ${storelyTokens.spacing[4]}px; gap: ${storelyTokens.spacing[4]}px; } .supplier-applications-page .supplier-actions { width: 100%; } }
`
