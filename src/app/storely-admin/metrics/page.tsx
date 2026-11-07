'use client'
import { useState, useEffect } from 'react'
import { ArrowDown, ArrowUp, Ban, CircleCheck, Gift, Info, RefreshCw } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyMetricStrip, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

const EVENT_LABELS = {
  trial_started: { label:'بدأ تجربة', color:storelyTokens.color.info, icon:Gift },
  activated: { label:'اشترك (مدفوع)', color:storelyTokens.color.success, icon:CircleCheck },
  cancelled: { label:'ألغى/أُوقف', color:storelyTokens.color.danger, icon:Ban },
  upgraded: { label:'رقّى الباقة', color:storelyTokens.color.text, icon:ArrowUp },
  downgraded: { label:'خفّض الباقة', color:storelyTokens.color.warning, icon:ArrowDown },
  renewed: { label:'جدّد الاشتراك', color:storelyTokens.color.success, icon:RefreshCw },
} as const

export default function MetricsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (!d.authenticated || (d.admin?.role !== 'super_admin' && !d.admin?.permissions?.view_metrics)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) load() }, [authChecked])

  async function load() {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/admin/metrics', { headers: { 'x-admin-key': key } })
      const d = await res.json()
      if (!res.ok || !d.success) { setError('حدث خطأ بجلب البيانات'); setLoading(false); return }
      setData(d)
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  if (!authChecked) return (
    <div className="admin-metrics" dir="rtl">
      <style>{metricsStyles}</style>
      <div className="metrics-loading">جاري التحقق...</div>
    </div>
  )

  return (
    <div className="admin-metrics" dir="rtl">
      <style>{metricsStyles}</style>
      <StorelyPageHeader title="مقاييس العمل التجاري" description="الإيراد المتكرر، معدل التحويل، وسجل أحداث الاشتراكات"
        actions={<StorelyButton onClick={load} disabled={loading} icon={!loading && <RefreshCw size={16} />}>{loading?'...':'تحديث'}</StorelyButton>} />
      {error && <div className="metrics-error">{error}</div>}
      {loading && !data ? (
        <div className="metrics-loading">جاري التحميل...</div>
      ) : data && (
        <>
          <StorelyMetricStrip className="metrics-summary" metrics={[
            { label:'الإيراد الشهري (MRR)', value:`${data.mrr.toLocaleString()} ر.س` },
            { label:'الإيراد السنوي المتوقع (ARR)', value:`${data.arr.toLocaleString()} ر.س` },
            { label:'معدل التحويل لمدفوع', value:`${data.conversionRate}%` },
            { label:'مشتركون مدفوعون نشطون', value:data.paidCount },
            { label:'بالتجربة المجانية', value:data.trialCount },
            { label:'موقوفون/ملغيون', value:data.suspendedCount },
          ]} />
          <div className="metrics-notice">
            <Info size={18} className="shrink-0" aria-hidden="true" />
            <span>سجل الأحداث (تفعيل، إلغاء، ترقية) بدأ التسجيل اليوم — كل ما مرّ وقت أكثر، تصير مقاييس زي معدل الإلغاء الشهري (Churn) أدق.</span>
          </div>
          <StorelyCard className="metrics-events" title="آخر أحداث الاشتراكات">
            {(!data.recentEvents || data.recentEvents.length===0) ? (
              <div className="metrics-empty">ما فيه أحداث مسجّلة بعد — بتظهر هنا أول ما تفعّل/تلغي/ترقّي أي اشتراك</div>
            ) : (
              <div>
                {data.recentEvents.map((e:any)=>{
                  const cfg = EVENT_LABELS[e.event_type as keyof typeof EVENT_LABELS] || { label:e.event_type, color:storelyTokens.color.textMuted, icon:Info }
                  const Icon = cfg.icon
                  return (
                    <div key={e.id} className="metrics-event">
                      <div className="metrics-event-detail">
                        <Icon size={18} style={{color:cfg.color}} className="shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <span className="font-semibold" style={{color:cfg.color}}>{cfg.label}</span>
                          <span> — {e.org_name}</span>
                          {e.plan && <span className="metrics-plan"> ({e.plan})</span>}
                        </div>
                      </div>
                      <div className="metrics-date">{new Date(e.created_at).toLocaleString('ar-SA', {numberingSystem:'latn'})}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </StorelyCard>
        </>
      )}
    </div>
  )
}

const metricsStyles = `
  .admin-metrics { min-width: 0; font-family: ${storelyTokens.typography.family}; color: ${storelyTokens.color.text}; font-size: ${storelyTokens.typography.body}px; line-height: ${storelyTokens.typography.lineHeight}; }
  .admin-metrics h1 { font-size: ${storelyTokens.typography.title}px; line-height: 1.5; }
  .admin-metrics h2 { font-size: ${storelyTokens.typography.section}px; }
  .admin-metrics .metrics-summary { margin-bottom: ${storelyTokens.spacing[6]}px; border-radius: ${storelyTokens.radius.card}; }
  .admin-metrics .metrics-notice { display: flex; align-items: flex-start; gap: ${storelyTokens.spacing[3]}px; padding: ${storelyTokens.spacing[4]}px; margin-bottom: ${storelyTokens.spacing[6]}px; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; background: ${storelyTokens.color.surface}; color: ${storelyTokens.color.textMuted}; }
  .admin-metrics .metrics-notice svg { margin-top: ${storelyTokens.spacing[1]}px; }
  .admin-metrics .metrics-events { border-radius: ${storelyTokens.radius.card}; }
  .admin-metrics .metrics-event { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: ${storelyTokens.spacing[4]}px; padding: ${storelyTokens.spacing[5]}px; border-bottom: 1px solid ${storelyTokens.color.border}; }
  .admin-metrics .metrics-event:last-child { border-bottom: 0; }
  .admin-metrics .metrics-event-detail { display: flex; align-items: baseline; gap: ${storelyTokens.spacing[3]}px; flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .admin-metrics .metrics-event-detail > svg { align-self: center; }
  .admin-metrics .metrics-date, .admin-metrics .metrics-plan { color: ${storelyTokens.color.textMuted}; font-size: ${storelyTokens.typography.supporting}px; }
  .admin-metrics .metrics-loading, .admin-metrics .metrics-empty { padding: ${storelyTokens.spacing[8]}px ${storelyTokens.spacing[5]}px; text-align: center; color: ${storelyTokens.color.textMuted}; }
  .admin-metrics .metrics-error { background: ${storelyTokens.color.dangerBg}; border: 1px solid ${storelyTokens.color.dangerBorder}; color: ${storelyTokens.color.danger}; padding: ${storelyTokens.spacing[4]}px; margin-bottom: ${storelyTokens.spacing[4]}px; border-radius: ${storelyTokens.radius.control}; }
  @media (max-width: 640px) { .admin-metrics .metrics-date { width: 100%; padding-inline-start: 30px; } }
`
