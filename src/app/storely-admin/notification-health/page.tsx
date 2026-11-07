'use client'
import { useState, useEffect } from 'react'
import { CircleCheck, RefreshCw, TriangleAlert } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyPageHeader, StorelyStatusBadge } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

export default function NotificationHealthPage() {
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (!d.authenticated || (d.admin?.role !== 'super_admin' && !d.admin?.permissions?.view_health)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) load() }, [authChecked])

  async function load() {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/admin/notification-health', { headers: { 'x-admin-key': key } })
      const d = await res.json()
      if (!res.ok || !d.success) { setError('حدث خطأ بجلب البيانات'); setLoading(false); return }
      setOrgs(d.orgs || [])
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  if (!authChecked) return (
    <div className="storely-loading" dir="rtl">جاري التحقق...</div>
  )

  const problemOrgs = orgs.filter(o => o.failed > 0 && o.sent === 0)

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <StorelyPageHeader title="صحة توصيل واتساب لكل عميل" description="آخر 7 أيام — يُحدّث تلقائياً مع كل إشعار حقيقي يُرسل لأصحاب الحسابات"
        actions={<StorelyButton onClick={load} disabled={loading} icon={<RefreshCw size={16}/>}>{loading?'...':'تحديث'}</StorelyButton>} />
      {error && <div className="storely-notice" style={{color:storelyTokens.color.danger,borderColor:storelyTokens.color.dangerBorder}}>{error}</div>}
      {loading ? (
        <div className="storely-loading">جاري التحميل...</div>
      ) : orgs.length === 0 ? (
        <StorelyEmptyState title="ما فيه إشعارات مسجّلة آخر 7 أيام بعد" />
      ) : (
        <>
          <StorelyCard>
            <div className="divide-y divide-[var(--storely-border)]">
              {orgs.map((o) => {
                const total = o.sent + o.failed
                const allFailed = o.sent === 0 && o.failed > 0
                return (
                  <div key={o.org_id} className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
                    <div className="min-w-0 flex-1 basis-48 break-words">
                      <div className="text-base font-semibold">{o.org_name}</div>
                      <div className="mt-2 text-sm text-[var(--storely-muted)]" dir="ltr">{o.phone}</div>
                    </div>
                    <div className="min-w-0 space-y-3">
                      <StorelyStatusBadge status={allFailed?'danger':'success'}>
                        {allFailed?<TriangleAlert size={14} className="me-2 shrink-0"/>:<CircleCheck size={14} className="me-2 shrink-0"/>} {o.sent}/{total} وصلت
                      </StorelyStatusBadge>
                      <div className="text-[13px] leading-6 text-[var(--storely-muted)]">آخر محاولة: {new Date(o.last_at).toLocaleString('ar-SA', {numberingSystem:'latn'})}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </StorelyCard>
          {problemOrgs.length > 0 && (
            <div className="storely-notice" style={{color:storelyTokens.color.danger,borderColor:storelyTokens.color.dangerBorder}}>
              <div className="storely-notice-body space-y-4">
                {problemOrgs.map(o => (
                  <div key={o.org_id} className="flex items-start gap-3">
                    <TriangleAlert size={18} className="mt-1 shrink-0" aria-hidden="true"/>
                    <div className="min-w-0 break-words">{o.org_name} — كل المحاولات فشلت ({o.failed}) آخر 7 أيام. رقمه غالباً غلط أو غير نشط — يستحق تواصل مباشر.</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
