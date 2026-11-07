'use client'
import { useState, useEffect } from 'react'
import { Activity, CircleAlert, CircleCheck } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyPageHeader, StorelyStatusBadge } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

export default function HealthPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated || (data.admin?.role !== 'super_admin' && !data.admin?.permissions?.view_health)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) load() }, [authChecked])

  async function load() {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/admin/health-logs', { headers: { 'x-admin-key': key } })
      const data = await res.json()
      if (!res.ok || !data.success) { setError('حدث خطأ بجلب البيانات'); setLoading(false); return }
      setLogs(data.logs || [])
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  async function runNow() {
    setRunning(true)
    try { await fetch('/api/health-check', { headers: { 'x-admin-key': sessionStorage.getItem('storely_admin_pass') || '' } }) } catch {}
    setRunning(false)
    load()
  }

  const latest = logs[0]

  if (!authChecked) return (
    <div className="system-health-page" dir="rtl">
      <style>{healthStyles}</style>
      <div className="health-placeholder">جاري التحقق...</div>
    </div>
  )

  return (
    <div className="system-health-page" dir="rtl">
      <style>{healthStyles}</style>
      <StorelyPageHeader title="فحص صحة النظام" description="فحص تلقائي دوري لمشاكل البيانات (منتجات بدون فرع، مؤسسات بدون فرع فعّال، تكرارات، إلخ)"
        actions={<StorelyButton onClick={runNow} disabled={running} variant="primary" icon={<Activity size={16} />}>{running?'جاري الفحص...':'فحص الآن'}</StorelyButton>} />
      {error && <div className="health-error">{error}</div>}
      {latest && (
        <div className="health-latest" data-issues={latest.issues_count>0}>
          <div className="health-latest-heading">
            {latest.issues_count>0 ? <CircleAlert size={20} className="shrink-0" /> : <CircleCheck size={20} className="shrink-0" />}
            <span>{latest.issues_count>0 ? `${latest.issues_count} مشكلة مكتشفة` : 'كل شي سليم'}</span>
          </div>
          <div className="health-date mt-2">آخر فحص: {new Date(latest.checked_at).toLocaleString('ar-SA', {numberingSystem:'latn'})}</div>
        </div>
      )}
      {loading ? (
        <div className="health-placeholder">جاري التحميل...</div>
      ) : logs.length === 0 ? (
        <StorelyEmptyState title="ما فيه سجلات فحص بعد" />
      ) : (
        <StorelyCard className="health-workspace">
          {logs.map((log)=>(
            <div key={log.id} className="health-record">
              <div className="health-record-header">
                <StorelyStatusBadge status={log.issues_count>0?'danger':'success'}>
                  {log.issues_count>0 ? `${log.issues_count} مشكلة` : 'سليم'}
                </StorelyStatusBadge>
                <div className="health-date">{new Date(log.checked_at).toLocaleString('ar-SA', {numberingSystem:'latn'})}</div>
              </div>
              {(log.issues||[]).map((issue:any,i:number)=>(
                <div key={i} className="health-issue" data-critical={issue.severity==='critical'}>
                  <CircleAlert size={16} className="shrink-0 mt-1" aria-hidden="true" />
                  <div className="min-w-0"><b>{issue.type}:</b> {issue.detail}</div>
                </div>
              ))}
            </div>
          ))}
        </StorelyCard>
      )}
    </div>
  )
}

const healthStyles = `
  .system-health-page { min-width: 0; font-family: ${storelyTokens.typography.family}; color: ${storelyTokens.color.text}; font-size: ${storelyTokens.typography.body}px; line-height: ${storelyTokens.typography.lineHeight}; }
  .system-health-page h1 { font-size: ${storelyTokens.typography.title}px; line-height: 1.5; }
  .system-health-page .health-workspace { border-radius: ${storelyTokens.radius.card}; }
  .system-health-page .health-latest { background: ${storelyTokens.color.surface}; border: 1px solid ${storelyTokens.color.successBorder}; border-radius: ${storelyTokens.radius.card}; padding: ${storelyTokens.spacing[5]}px; margin-bottom: ${storelyTokens.spacing[6]}px; }
  .system-health-page .health-latest[data-issues=true] { border-color: ${storelyTokens.color.dangerBorder}; }
  .system-health-page .health-latest-heading { display: flex; align-items: center; gap: ${storelyTokens.spacing[3]}px; color: ${storelyTokens.color.success}; font-size: ${storelyTokens.typography.section}px; font-weight: 600; overflow-wrap: anywhere; }
  .system-health-page .health-latest[data-issues=true] .health-latest-heading { color: ${storelyTokens.color.danger}; }
  .system-health-page .health-date { color: ${storelyTokens.color.textMuted}; font-size: ${storelyTokens.typography.supporting}px; }
  .system-health-page .health-record { padding: ${storelyTokens.spacing[5]}px; border-bottom: 1px solid ${storelyTokens.color.border}; }
  .system-health-page .health-record:last-child { border-bottom: 0; }
  .system-health-page .health-record-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: ${storelyTokens.spacing[3]}px; }
  .system-health-page .health-issue { display: flex; align-items: flex-start; gap: ${storelyTokens.spacing[3]}px; padding: ${storelyTokens.spacing[3]}px 0; margin-top: ${storelyTokens.spacing[3]}px; border-top: 1px solid ${storelyTokens.color.border}; color: ${storelyTokens.color.warning}; overflow-wrap: anywhere; }
  .system-health-page .health-issue[data-critical=true] { color: ${storelyTokens.color.danger}; }
  .system-health-page .health-error { background: ${storelyTokens.color.dangerBg}; color: ${storelyTokens.color.danger}; border: 1px solid ${storelyTokens.color.dangerBorder}; border-radius: ${storelyTokens.radius.control}; padding: ${storelyTokens.spacing[4]}px; margin-bottom: ${storelyTokens.spacing[4]}px; overflow-wrap: anywhere; }
  .system-health-page .health-placeholder { padding: ${storelyTokens.spacing[8]}px ${storelyTokens.spacing[5]}px; text-align: center; color: ${storelyTokens.color.textMuted}; }
  @media (max-width: 640px) { .system-health-page .health-latest, .system-health-page .health-record { padding: ${storelyTokens.spacing[4]}px; } }
`
